-- Add language and dark_mode columns to profiles table

-- Add language column (matches our TypeScript types)
ALTER TABLE public.profiles 
ADD COLUMN language character varying(5) DEFAULT 'es_ES';

-- Add dark_mode column (default to true for dark theme)
ALTER TABLE public.profiles 
ADD COLUMN dark_mode boolean DEFAULT true;

-- Update existing profiles to have dark_mode = true and language = 'es_ES' by default
UPDATE public.profiles 
SET dark_mode = true, language = 'es_ES' 
WHERE dark_mode IS NULL OR language IS NULL;