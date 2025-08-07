-- Add new_subscribers_enabled column to notification_preferences table

ALTER TABLE public.notification_preferences 
ADD COLUMN new_subscribers_enabled boolean DEFAULT true;

-- Update existing preferences to have new_subscribers_enabled = true by default
UPDATE public.notification_preferences 
SET new_subscribers_enabled = true 
WHERE new_subscribers_enabled IS NULL;