-- Create notifications system tables and functions

-- Create notifications table
CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "type" character varying NOT NULL,
    "entity_id" "uuid",
    "entity_type" character varying,
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."notifications" OWNER TO "postgres";

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "video_likes_enabled" boolean DEFAULT true,
    "comment_likes_enabled" boolean DEFAULT true,
    "new_followers_enabled" boolean DEFAULT true,
    "video_comments_enabled" boolean DEFAULT true,
    "comment_replies_enabled" boolean DEFAULT true,
    "push_notifications_enabled" boolean DEFAULT true,
    "email_notifications_enabled" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";

-- Add primary keys
ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id");

-- Add unique constraint for user preferences
ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_key" UNIQUE ("user_id");

-- Add foreign key constraints
ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX "idx_notifications_recipient_id" ON "public"."notifications" USING "btree" ("recipient_id");
CREATE INDEX "idx_notifications_actor_id" ON "public"."notifications" USING "btree" ("actor_id");
CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");
CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);
CREATE INDEX "idx_notifications_is_read" ON "public"."notifications" USING "btree" ("is_read");
CREATE INDEX "idx_notifications_recipient_read" ON "public"."notifications" USING "btree" ("recipient_id", "is_read");

-- Create function to handle notification creation
CREATE OR REPLACE FUNCTION "public"."create_notification"(
  "recipient_id" "uuid",
  "actor_id" "uuid", 
  "notification_type" character varying,
  "entity_id" "uuid" DEFAULT NULL,
  "entity_type" character varying DEFAULT NULL
) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  notification_id uuid;
  preferences_enabled boolean;
BEGIN
  -- Check if recipient has this notification type enabled
  SELECT CASE notification_type
    WHEN 'video_like' THEN video_likes_enabled
    WHEN 'follow' THEN new_followers_enabled
    WHEN 'comment_like' THEN comment_likes_enabled
    WHEN 'video_comment' THEN video_comments_enabled
    WHEN 'comment_reply' THEN comment_replies_enabled
    ELSE TRUE
  END INTO preferences_enabled
  FROM notification_preferences
  WHERE user_id = recipient_id;
  
  -- If preferences not found, assume enabled
  IF preferences_enabled IS NULL THEN
    preferences_enabled := TRUE;
  END IF;
  
  -- Only create notification if enabled and not self-action
  IF preferences_enabled AND recipient_id != actor_id THEN
    INSERT INTO notifications (recipient_id, actor_id, type, entity_id, entity_type)
    VALUES (recipient_id, actor_id, notification_type, entity_id, entity_type)
    RETURNING id INTO notification_id;
  END IF;
  
  RETURN notification_id;
END;
$$;

ALTER FUNCTION "public"."create_notification"("recipient_id" "uuid", "actor_id" "uuid", "notification_type" character varying, "entity_id" "uuid", "entity_type" character varying) OWNER TO "postgres";

-- Create function to get user notifications with pagination
CREATE OR REPLACE FUNCTION "public"."get_user_notifications"(
  "user_id_param" "uuid",
  "page_offset" integer DEFAULT 0,
  "page_limit" integer DEFAULT 20
) RETURNS TABLE(
  "id" "uuid",
  "type" character varying,
  "entity_id" "uuid",
  "entity_type" character varying,
  "is_read" boolean,
  "created_at" timestamp with time zone,
  "actor_username" character varying,
  "actor_display_name" character varying,
  "actor_avatar_url" character varying,
  "entity_title" character varying
)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.type,
    n.entity_id,
    n.entity_type,
    n.is_read,
    n.created_at,
    p.username as actor_username,
    p.display_name as actor_display_name,
    p.avatar_url as actor_avatar_url,
    CASE 
      WHEN n.entity_type = 'video' THEN v.title
      WHEN n.entity_type = 'comment' THEN SUBSTRING(c.text, 1, 50)
      ELSE NULL
    END as entity_title
  FROM notifications n
  JOIN profiles p ON n.actor_id = p.id
  LEFT JOIN videos v ON n.entity_type = 'video' AND n.entity_id = v.id
  LEFT JOIN comments c ON n.entity_type = 'comment' AND n.entity_id = c.id
  WHERE n.recipient_id = user_id_param
  ORDER BY n.created_at DESC
  OFFSET page_offset
  LIMIT page_limit;
END;
$$;

ALTER FUNCTION "public"."get_user_notifications"("user_id_param" "uuid", "page_offset" integer, "page_limit" integer) OWNER TO "postgres";

-- Create function to mark notification as read
CREATE OR REPLACE FUNCTION "public"."mark_notification_read"("notification_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, updated_at = now()
  WHERE id = notification_id;
END;
$$;

ALTER FUNCTION "public"."mark_notification_read"("notification_id" "uuid") OWNER TO "postgres";

-- Create function to mark all user notifications as read
CREATE OR REPLACE FUNCTION "public"."mark_all_notifications_read"("user_id_param" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, updated_at = now()
  WHERE recipient_id = user_id_param AND is_read = false;
END;
$$;

ALTER FUNCTION "public"."mark_all_notifications_read"("user_id_param" "uuid") OWNER TO "postgres";

-- Create function to get unread notification count
CREATE OR REPLACE FUNCTION "public"."get_unread_notification_count"("user_id_param" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  unread_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO unread_count
  FROM notifications
  WHERE recipient_id = user_id_param AND is_read = false;
  
  RETURN unread_count;
END;
$$;

ALTER FUNCTION "public"."get_unread_notification_count"("user_id_param" "uuid") OWNER TO "postgres";

-- Create trigger to update updated_at on notifications
CREATE OR REPLACE TRIGGER "update_notifications_updated_at" 
  BEFORE UPDATE ON "public"."notifications" 
  FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- Create trigger to update updated_at on notification_preferences
CREATE OR REPLACE TRIGGER "update_notification_preferences_updated_at" 
  BEFORE UPDATE ON "public"."notification_preferences" 
  FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- Create function to initialize notification preferences for new users
CREATE OR REPLACE FUNCTION "public"."create_default_notification_preferences"("user_id_param" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (user_id_param)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

ALTER FUNCTION "public"."create_default_notification_preferences"("user_id_param" "uuid") OWNER TO "postgres";

-- Update the handle_new_user function to create notification preferences
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    bio,
    avatar_url,
    subscription_price,
    subscription_currency,
    commission_rate,
    followers_count,
    subscribers_count,
    videos_count,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    -- Generate a temporary username based on email
    LOWER(SPLIT_PART(NEW.email, '@', 1)) || '_' || SUBSTR(NEW.id::text, 1, 8),
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    NULL,
    NEW.raw_user_meta_data->>'avatar_url',
    0,
    'USD',
    30.00,
    0,
    0,
    0,
    NOW(),
    NOW()
  );
  
  -- Create default notification preferences
  PERFORM create_default_notification_preferences(NEW.id);
  
  RETURN NEW;
END;
$$;

-- Add notification functions to existing triggers

-- Video likes notification
CREATE OR REPLACE FUNCTION "public"."notify_video_like"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM create_notification(
      (SELECT user_id FROM videos WHERE id = NEW.video_id),
      NEW.user_id,
      'video_like',
      NEW.video_id,
      'video'
    );
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."notify_video_like"() OWNER TO "postgres";

-- Follow notification
CREATE OR REPLACE FUNCTION "public"."notify_follow"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM create_notification(
      NEW.following_id,
      NEW.follower_id,
      'follow',
      NULL,
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."notify_follow"() OWNER TO "postgres";

-- Comment like notification
CREATE OR REPLACE FUNCTION "public"."notify_comment_like"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM create_notification(
      (SELECT user_id FROM comments WHERE id = NEW.comment_id),
      NEW.user_id,
      'comment_like',
      NEW.comment_id,
      'comment'
    );
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."notify_comment_like"() OWNER TO "postgres";

-- Video comment notification
CREATE OR REPLACE FUNCTION "public"."notify_video_comment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.reply_to IS NULL THEN
    -- Only notify for top-level comments, not replies
    PERFORM create_notification(
      (SELECT user_id FROM videos WHERE id = NEW.video_id),
      NEW.user_id,
      'video_comment',
      NEW.video_id,
      'video'
    );
  ELSIF TG_OP = 'INSERT' AND NEW.reply_to IS NOT NULL THEN
    -- Notify original commenter about reply
    PERFORM create_notification(
      (SELECT user_id FROM comments WHERE id = NEW.reply_to),
      NEW.user_id,
      'comment_reply',
      NEW.reply_to,
      'comment'
    );
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."notify_video_comment"() OWNER TO "postgres";

-- Create triggers for notifications
CREATE OR REPLACE TRIGGER "video_like_notification_trigger"
  AFTER INSERT ON "public"."likes"
  FOR EACH ROW EXECUTE FUNCTION "public"."notify_video_like"();

CREATE OR REPLACE TRIGGER "follow_notification_trigger"
  AFTER INSERT ON "public"."follows"
  FOR EACH ROW EXECUTE FUNCTION "public"."notify_follow"();

CREATE OR REPLACE TRIGGER "comment_like_notification_trigger"
  AFTER INSERT ON "public"."comment_likes"
  FOR EACH ROW EXECUTE FUNCTION "public"."notify_comment_like"();

CREATE OR REPLACE TRIGGER "video_comment_notification_trigger"
  AFTER INSERT ON "public"."comments"
  FOR EACH ROW EXECUTE FUNCTION "public"."notify_video_comment"();

-- Enable RLS on new tables
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON "public"."notifications" 
  FOR SELECT USING ("auth"."uid"() = "recipient_id");

CREATE POLICY "Users can update their own notifications" ON "public"."notifications" 
  FOR UPDATE USING ("auth"."uid"() = "recipient_id");

-- Notification preferences policies
CREATE POLICY "Users can view their own notification preferences" ON "public"."notification_preferences" 
  FOR SELECT USING ("auth"."uid"() = "user_id");

CREATE POLICY "Users can update their own notification preferences" ON "public"."notification_preferences" 
  FOR UPDATE USING ("auth"."uid"() = "user_id");

CREATE POLICY "Users can create their own notification preferences" ON "public"."notification_preferences" 
  FOR INSERT WITH CHECK ("auth"."uid"() = "user_id");

-- Grant permissions
GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";

GRANT ALL ON TABLE "public"."notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";

-- Grant function permissions
GRANT ALL ON FUNCTION "public"."create_notification"("recipient_id" "uuid", "actor_id" "uuid", "notification_type" character varying, "entity_id" "uuid", "entity_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."create_notification"("recipient_id" "uuid", "actor_id" "uuid", "notification_type" character varying, "entity_id" "uuid", "entity_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_notification"("recipient_id" "uuid", "actor_id" "uuid", "notification_type" character varying, "entity_id" "uuid", "entity_type" character varying) TO "service_role";

GRANT ALL ON FUNCTION "public"."get_user_notifications"("user_id_param" "uuid", "page_offset" integer, "page_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_notifications"("user_id_param" "uuid", "page_offset" integer, "page_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_notifications"("user_id_param" "uuid", "page_offset" integer, "page_limit" integer) TO "service_role";

GRANT ALL ON FUNCTION "public"."mark_notification_read"("notification_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_notification_read"("notification_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_notification_read"("notification_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"("user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"("user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"("user_id_param" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("user_id_param" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."create_default_notification_preferences"("user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_notification_preferences"("user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_notification_preferences"("user_id_param" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."notify_video_like"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_video_like"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_video_like"() TO "service_role";

GRANT ALL ON FUNCTION "public"."notify_follow"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_follow"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_follow"() TO "service_role";

GRANT ALL ON FUNCTION "public"."notify_comment_like"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_comment_like"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_comment_like"() TO "service_role";

GRANT ALL ON FUNCTION "public"."notify_video_comment"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_video_comment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_video_comment"() TO "service_role";