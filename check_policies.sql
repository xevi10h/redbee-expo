-- Check if waiting_list table and policies exist
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'waiting_list';

-- Check if table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'waiting_list';