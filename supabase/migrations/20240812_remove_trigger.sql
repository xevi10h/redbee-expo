-- Remove the problematic trigger that uses net schema
DROP TRIGGER IF EXISTS waiting_list_confirmation_email_trigger ON waiting_list;
DROP FUNCTION IF EXISTS send_waiting_list_confirmation_email();