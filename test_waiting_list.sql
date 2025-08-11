-- Test insert into waiting_list table
INSERT INTO waiting_list (email, user_type, source) 
VALUES ('test@example.com', 'fan', 'waiting_list')
ON CONFLICT (email) DO NOTHING;