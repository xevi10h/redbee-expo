-- Create payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_payment_method_id varchar NOT NULL,
    type varchar NOT NULL DEFAULT 'card', -- 'card', 'bank_account', etc.
    card_brand varchar, -- 'visa', 'mastercard', etc.
    card_last4 varchar(4),
    card_exp_month integer,
    card_exp_year integer,
    bank_last4 varchar(4),
    bank_name varchar,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create earnings table for creators
CREATE TABLE IF NOT EXISTS creator_earnings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
    amount decimal(10,2) NOT NULL,
    currency varchar(3) NOT NULL DEFAULT 'USD',
    commission_rate decimal(5,2) NOT NULL DEFAULT 30.00, -- Platform commission percentage
    net_amount decimal(10,2) NOT NULL, -- Amount after commission
    payment_date timestamp with time zone DEFAULT now(),
    status varchar DEFAULT 'pending', -- 'pending', 'available', 'paid'
    stripe_transfer_id varchar,
    created_at timestamp with time zone DEFAULT now()
);

-- Create withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    amount decimal(10,2) NOT NULL,
    currency varchar(3) NOT NULL DEFAULT 'USD',
    status varchar DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    withdrawal_method varchar NOT NULL, -- 'bank_account', 'paypal'
    bank_account_details jsonb, -- Store encrypted bank details
    paypal_email varchar,
    stripe_payout_id varchar,
    requested_at timestamp with time zone DEFAULT now(),
    processed_at timestamp with time zone,
    completed_at timestamp with time zone,
    failure_reason text,
    created_at timestamp with time zone DEFAULT now()
);

-- Create payment transactions table for tracking all payments
CREATE TABLE IF NOT EXISTS payment_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
    payer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    recipient_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    stripe_payment_intent_id varchar,
    stripe_invoice_id varchar,
    amount decimal(10,2) NOT NULL,
    currency varchar(3) NOT NULL DEFAULT 'USD',
    status varchar DEFAULT 'pending', -- 'pending', 'succeeded', 'failed', 'canceled'
    type varchar DEFAULT 'subscription', -- 'subscription', 'one_time'
    description text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Add balance tracking to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS available_balance decimal(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS pending_balance decimal(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_earned decimal(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS stripe_account_id varchar,
ADD COLUMN IF NOT EXISTS stripe_onboarding_complete boolean DEFAULT false;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON payment_methods(user_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_creator_earnings_creator_id ON creator_earnings(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_earnings_status ON creator_earnings(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_creator_id ON withdrawals(creator_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_subscription ON payment_transactions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payer ON payment_transactions(payer_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_recipient ON payment_transactions(recipient_id);

-- Create function to calculate available balance for withdrawal
CREATE OR REPLACE FUNCTION calculate_available_balance(user_id uuid)
RETURNS decimal(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    balance decimal(10,2) DEFAULT 0.00;
BEGIN
    -- Sum all completed earnings that haven't been withdrawn
    SELECT COALESCE(SUM(net_amount), 0.00)
    INTO balance
    FROM creator_earnings
    WHERE creator_id = user_id 
    AND status = 'available'
    AND id NOT IN (
        SELECT DISTINCT unnest(
            CASE 
                WHEN metadata->>'earning_ids' IS NOT NULL 
                THEN ARRAY(SELECT jsonb_array_elements_text(metadata->'earning_ids'))::uuid[]
                ELSE ARRAY[]::uuid[]
            END
        )
        FROM withdrawals 
        WHERE creator_id = user_id 
        AND status IN ('pending', 'processing', 'completed')
    );
    
    RETURN balance;
END;
$$;

-- Create function to process subscription payment
CREATE OR REPLACE FUNCTION process_subscription_payment(
    p_subscription_id uuid,
    p_amount decimal(10,2),
    p_currency varchar(3),
    p_stripe_payment_intent_id varchar,
    p_commission_rate decimal(5,2) DEFAULT 30.00
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_creator_id uuid;
    v_subscriber_id uuid;
    v_net_amount decimal(10,2);
BEGIN
    -- Get subscription details
    SELECT creator_id, subscriber_id
    INTO v_creator_id, v_subscriber_id
    FROM subscriptions
    WHERE id = p_subscription_id;
    
    IF v_creator_id IS NULL THEN
        RAISE EXCEPTION 'Subscription not found';
    END IF;
    
    -- Calculate net amount after commission
    v_net_amount := p_amount * (1 - p_commission_rate / 100);
    
    -- Create payment transaction record
    INSERT INTO payment_transactions (
        subscription_id,
        payer_id,
        recipient_id,
        stripe_payment_intent_id,
        amount,
        currency,
        status,
        type,
        description
    ) VALUES (
        p_subscription_id,
        v_subscriber_id,
        v_creator_id,
        p_stripe_payment_intent_id,
        p_amount,
        p_currency,
        'succeeded',
        'subscription',
        'Monthly subscription payment'
    );
    
    -- Create earnings record for creator
    INSERT INTO creator_earnings (
        creator_id,
        subscription_id,
        amount,
        currency,
        commission_rate,
        net_amount,
        status
    ) VALUES (
        v_creator_id,
        p_subscription_id,
        p_amount,
        p_currency,
        p_commission_rate,
        v_net_amount,
        'available'
    );
    
    -- Update creator's balance
    UPDATE profiles
    SET 
        available_balance = available_balance + v_net_amount,
        total_earned = total_earned + v_net_amount,
        updated_at = now()
    WHERE id = v_creator_id;
    
    RETURN true;
END;
$$;

-- Create RLS policies
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Payment methods policies
CREATE POLICY "Users can view their own payment methods" ON payment_methods
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment methods" ON payment_methods
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment methods" ON payment_methods
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment methods" ON payment_methods
    FOR DELETE USING (auth.uid() = user_id);

-- Creator earnings policies
CREATE POLICY "Creators can view their own earnings" ON creator_earnings
    FOR SELECT USING (auth.uid() = creator_id);

-- Withdrawals policies
CREATE POLICY "Creators can view their own withdrawals" ON withdrawals
    FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Creators can insert their own withdrawals" ON withdrawals
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Payment transactions policies
CREATE POLICY "Users can view their payment transactions" ON payment_transactions
    FOR SELECT USING (auth.uid() = payer_id OR auth.uid() = recipient_id);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_methods_updated_at
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER payment_transactions_updated_at
    BEFORE UPDATE ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insert default commission rate into profiles if not exists
UPDATE profiles 
SET commission_rate = 30.00 
WHERE commission_rate IS NULL;