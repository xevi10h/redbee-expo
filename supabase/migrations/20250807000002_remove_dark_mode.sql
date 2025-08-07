-- Revertir cambios de dark_mode de la migración anterior
-- Mantener solo el campo language que sí queremos

-- Eliminar la columna dark_mode de la tabla profiles
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS dark_mode;