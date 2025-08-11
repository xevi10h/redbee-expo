-- Final fix for waiting_list policies with correct permissions
-- Drop all existing policies
DROP POLICY IF EXISTS "Allow public insert to waiting list" ON waiting_list;
DROP POLICY IF EXISTS "Allow authenticated read waiting list" ON waiting_list;
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON waiting_list;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON waiting_list;
DROP POLICY IF EXISTS "Enable all for service role" ON waiting_list;

-- Ensure RLS is enabled
ALTER TABLE waiting_list ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (this is what we need for the public form)
CREATE POLICY "Enable insert for everyone" ON waiting_list
    FOR INSERT
    WITH CHECK (true);

-- Allow authenticated users to read all entries (for admin dashboard)
CREATE POLICY "Enable read for authenticated" ON waiting_list
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow service role full access
CREATE POLICY "Enable all for service role" ON waiting_list
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);