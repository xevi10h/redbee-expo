-- Simple policies for waiting_list without triggers or net schema
-- Ensure table exists first
CREATE TABLE IF NOT EXISTS waiting_list (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    user_type TEXT NOT NULL CHECK (user_type IN ('fan', 'creator', 'brand')),
    source TEXT DEFAULT 'waiting_list',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE waiting_list ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies first
DROP POLICY IF EXISTS "Allow public insert to waiting list" ON waiting_list;
DROP POLICY IF EXISTS "Allow authenticated read waiting list" ON waiting_list;
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON waiting_list;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON waiting_list;
DROP POLICY IF EXISTS "Enable all for service role" ON waiting_list;
DROP POLICY IF EXISTS "Enable insert for everyone" ON waiting_list;
DROP POLICY IF EXISTS "Enable read for authenticated" ON waiting_list;

-- Create simple policies
-- Allow anyone to insert (public form)
CREATE POLICY "public_insert" ON waiting_list
    FOR INSERT
    WITH CHECK (true);

-- Allow authenticated users to read
CREATE POLICY "authenticated_read" ON waiting_list
    FOR SELECT
    TO authenticated
    USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_waiting_list_email ON waiting_list(email);
CREATE INDEX IF NOT EXISTS idx_waiting_list_user_type ON waiting_list(user_type);
CREATE INDEX IF NOT EXISTS idx_waiting_list_created_at ON waiting_list(created_at);