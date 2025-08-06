-- Add has_premium_content field to profiles table
ALTER TABLE "public"."profiles" 
ADD COLUMN "has_premium_content" BOOLEAN DEFAULT FALSE NOT NULL;

-- Create index for performance
CREATE INDEX idx_profiles_has_premium_content ON "public"."profiles" ("has_premium_content");

-- Update existing users that already have a subscription price > 0 to have premium content enabled
UPDATE "public"."profiles" 
SET "has_premium_content" = TRUE 
WHERE "subscription_price" > 0;

-- Add a comment to document the field
COMMENT ON COLUMN "public"."profiles"."has_premium_content" IS 'Indicates if the user offers premium content subscriptions';