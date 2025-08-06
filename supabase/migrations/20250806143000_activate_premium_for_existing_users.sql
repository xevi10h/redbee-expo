-- Activate premium content for all existing users and set price to $3.95
UPDATE "public"."profiles" 
SET 
    "has_premium_content" = TRUE,
    "subscription_price" = 3.95,
    "subscription_currency" = 'EUR'
WHERE 
    "created_at" IS NOT NULL; -- Only update actual user records

-- Log the update
DO $$
DECLARE
    updated_count integer;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % users to have premium content enabled with price €3.95', updated_count;
END
$$;