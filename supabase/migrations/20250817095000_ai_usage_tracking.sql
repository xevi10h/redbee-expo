-- Create table for tracking AI usage per user per day
CREATE TABLE IF NOT EXISTS ai_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    request_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per user per day
    UNIQUE(user_id, date)
);

-- Create table for logging all AI interactions
CREATE TABLE IF NOT EXISTS ai_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage(user_id, date);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_user_created ON ai_interactions(user_id, created_at);

-- Row Level Security (RLS)
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;

-- Policies for ai_usage
CREATE POLICY "Users can view their own AI usage" ON ai_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can manage AI usage" ON ai_usage
    FOR ALL USING (auth.role() = 'service_role');

-- Policies for ai_interactions  
CREATE POLICY "Users can view their own AI interactions" ON ai_interactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can manage AI interactions" ON ai_interactions
    FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON ai_usage TO service_role;
GRANT ALL ON ai_interactions TO service_role;
GRANT SELECT ON ai_usage TO authenticated;
GRANT SELECT ON ai_interactions TO authenticated;