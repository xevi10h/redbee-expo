-- Eliminar el trigger problemático directamente
DROP TRIGGER IF EXISTS waiting_list_confirmation_email_trigger ON waiting_list;
DROP FUNCTION IF EXISTS send_waiting_list_confirmation_email();

-- Verificar que no hay más triggers problemáticos
SELECT * FROM pg_trigger WHERE tgname LIKE '%waiting_list%';

-- Verificar que la tabla existe y tiene las políticas correctas
SELECT schemaname, tablename, policyname, permissive, cmd 
FROM pg_policies 
WHERE tablename = 'waiting_list';