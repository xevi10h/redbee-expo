

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."can_access_premium_video"("video_id" "uuid", "viewer_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_video_creator_id uuid;
  v_video_is_premium boolean;
BEGIN
  SELECT vid.user_id, vid.is_premium INTO v_video_creator_id, v_video_is_premium
  FROM videos vid
  WHERE vid.id = video_id;
  
  IF v_video_creator_id IS NULL OR v_video_is_premium = false THEN
    RETURN true;
  END IF;
  
  IF viewer_id = v_video_creator_id THEN
    RETURN true;
  END IF;
  
  RETURN EXISTS(
    SELECT 1 FROM subscriptions sub
    WHERE sub.creator_id = v_video_creator_id
    AND sub.subscriber_id = viewer_id
    AND sub.status = 'active'
    AND sub.current_period_end > NOW()
  );
END;
$$;


ALTER FUNCTION "public"."can_access_premium_video"("video_id" "uuid", "viewer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access_premium_video_enhanced"("video_id" "uuid", "viewer_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_video_creator_id uuid;
  v_video_is_premium boolean;
BEGIN
  -- Obtener información del video
  SELECT vid.user_id, vid.is_premium INTO v_video_creator_id, v_video_is_premium
  FROM videos vid
  WHERE vid.id = video_id;
  
  -- Si el video no existe, denegar acceso
  IF v_video_creator_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Si el video no es premium, permitir acceso
  IF v_video_is_premium = false THEN
    RETURN true;
  END IF;
  
  -- Si el viewer es el creador del video, permitir acceso
  IF viewer_id = v_video_creator_id THEN
    RETURN true;
  END IF;
  
  -- Para videos premium, verificar suscripción activa
  RETURN EXISTS(
    SELECT 1 FROM subscriptions sub
    WHERE sub.creator_id = v_video_creator_id
    AND sub.subscriber_id = viewer_id
    AND sub.status = 'active'
    AND sub.current_period_end > NOW()
  );
END;
$$;


ALTER FUNCTION "public"."can_access_premium_video_enhanced"("video_id" "uuid", "viewer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_content_access"("content_type" character varying, "content_id" "uuid", "viewer_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_creator_id uuid;
  v_is_premium boolean;
BEGIN
  IF content_type = 'video' THEN
    SELECT vid.user_id, vid.is_premium INTO v_creator_id, v_is_premium
    FROM videos vid WHERE vid.id = content_id;
    
    IF NOT v_is_premium THEN
      RETURN true;
    END IF;
    
  ELSIF content_type = 'comment' THEN
    SELECT vid.user_id, vid.is_premium INTO v_creator_id, v_is_premium
    FROM comments c
    JOIN videos vid ON c.video_id = vid.id
    WHERE c.id = content_id;
    
    IF NOT v_is_premium THEN
      RETURN true;
    END IF;
  ELSE
    RETURN false;
  END IF;
  
  IF viewer_id = v_creator_id THEN
    RETURN true;
  END IF;
  
  RETURN EXISTS(
    SELECT 1 FROM subscriptions sub
    WHERE sub.creator_id = v_creator_id
    AND sub.subscriber_id = viewer_id
    AND sub.status = 'active'
    AND sub.current_period_end > NOW()
  );
END;
$$;


ALTER FUNCTION "public"."check_content_access"("content_type" character varying, "content_id" "uuid", "viewer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_username_availability"("username_to_check" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE LOWER(username) = LOWER(username_to_check)
  );
END;
$$;


ALTER FUNCTION "public"."check_username_availability"("username_to_check" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_username_availability"("username_to_check" "text") IS 'Check if username is available for new users';



CREATE OR REPLACE FUNCTION "public"."check_username_availability_for_update"("username_to_check" "text", "user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE LOWER(username) = LOWER(username_to_check)
    AND id != user_id
  );
END;
$$;


ALTER FUNCTION "public"."check_username_availability_for_update"("username_to_check" "text", "user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_username_availability_for_update"("username_to_check" "text", "user_id" "uuid") IS 'Check if username is available for existing user update';



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


CREATE OR REPLACE FUNCTION "public"."create_notification"("recipient_id" "uuid", "actor_id" "uuid", "notification_type" character varying, "entity_id" "uuid" DEFAULT NULL::"uuid", "entity_type" character varying DEFAULT NULL::character varying) RETURNS "uuid"
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


CREATE OR REPLACE FUNCTION "public"."get_comment_replies"("p_comment_id" "uuid", "p_limit" integer DEFAULT 10, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "user_id" "uuid", "video_id" "uuid", "text" "text", "reply_to" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "username" character varying, "display_name" character varying, "avatar_url" character varying)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.user_id,
        c.video_id,
        c.text,
        c.reply_to,
        c.created_at,
        c.updated_at,
        p.username,
        p.display_name,
        p.avatar_url
    FROM comments c
    LEFT JOIN profiles p ON p.id = c.user_id
    WHERE c.reply_to = p_comment_id
    ORDER BY c.created_at ASC  -- Replies en orden cronológico
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_comment_replies"("p_comment_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_comment_replies_with_likes"("comment_id_param" "uuid", "viewer_id_param" "uuid", "page_offset" integer DEFAULT 0, "page_limit" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "user_id" "uuid", "video_id" "uuid", "text" "text", "reply_to" "uuid", "replies_count" integer, "likes_count" integer, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "username" character varying, "display_name" character varying, "avatar_url" character varying, "is_liked" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.user_id,
    c.video_id,
    c.text,
    c.reply_to,
    c.replies_count,
    c.likes_count,
    c.created_at,
    c.updated_at,
    p.username,
    p.display_name,
    p.avatar_url,
    EXISTS(
      SELECT 1 FROM comment_likes cl 
      WHERE cl.comment_id = c.id AND cl.user_id = viewer_id_param
    ) as is_liked
  FROM comments c
  JOIN profiles p ON c.user_id = p.id
  WHERE c.reply_to = comment_id_param
  ORDER BY c.created_at ASC
  OFFSET page_offset
  LIMIT page_limit;
END;
$$;


ALTER FUNCTION "public"."get_comment_replies_with_likes"("comment_id_param" "uuid", "viewer_id_param" "uuid", "page_offset" integer, "page_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_comments_with_reply_counts"("p_video_id" "uuid", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "user_id" "uuid", "video_id" "uuid", "text" "text", "reply_to" "uuid", "replies_count" integer, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "username" character varying, "display_name" character varying, "avatar_url" character varying)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.user_id,
        c.video_id,
        c.text,
        c.reply_to,
        COALESCE(c.replies_count, 0) as replies_count,
        c.created_at,
        c.updated_at,
        p.username,
        p.display_name,
        p.avatar_url
    FROM comments c
    LEFT JOIN profiles p ON p.id = c.user_id
    WHERE c.video_id = p_video_id 
    AND c.reply_to IS NULL  -- Solo comentarios principales
    ORDER BY c.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_comments_with_reply_counts"("p_video_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_following_feed"("viewer_id" "uuid", "page_offset" integer DEFAULT 0, "page_limit" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "user_id" "uuid", "title" character varying, "description" "text", "hashtags" "text"[], "video_url" character varying, "thumbnail_url" character varying, "duration" integer, "is_premium" boolean, "likes_count" integer, "comments_count" integer, "views_count" integer, "created_at" timestamp with time zone, "username" character varying, "display_name" character varying, "avatar_url" character varying, "subscription_price" numeric, "subscription_currency" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id, v.user_id, v.title, v.description, v.hashtags, v.video_url, v.thumbnail_url, v.duration,
    v.is_premium, v.likes_count, v.comments_count, v.views_count, v.created_at,
    p.username, p.display_name, p.avatar_url, p.subscription_price, p.subscription_currency
  FROM videos v
  JOIN profiles p ON v.user_id = p.id
  JOIN follows f ON f.following_id = v.user_id
  WHERE
    f.follower_id = viewer_id  -- <<-- CAMBIO
    -- Only show premium videos if user is subscribed
    AND (
      v.is_premium = false
      OR EXISTS(
        SELECT 1 FROM subscriptions s
        WHERE s.creator_id = v.user_id
        AND s.subscriber_id = viewer_id  -- <<-- CAMBIO
        AND s.status = 'active'
        AND s.current_period_end > NOW()
      )
    )
  ORDER BY v.created_at DESC
  OFFSET page_offset
  LIMIT page_limit;
END;
$$;


ALTER FUNCTION "public"."get_following_feed"("viewer_id" "uuid", "page_offset" integer, "page_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_following_feed_with_permissions"("viewer_id" "uuid", "page_offset" integer DEFAULT 0, "page_limit" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "user_id" "uuid", "title" character varying, "description" "text", "hashtags" "text"[], "video_url" character varying, "thumbnail_url" character varying, "duration" integer, "is_premium" boolean, "likes_count" integer, "comments_count" integer, "views_count" integer, "created_at" timestamp with time zone, "username" character varying, "display_name" character varying, "avatar_url" character varying, "subscription_price" numeric, "subscription_currency" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id, v.user_id, v.title, v.description, v.hashtags, v.video_url, v.thumbnail_url, v.duration,
    v.is_premium, v.likes_count, v.comments_count, v.views_count, v.created_at,
    p.username, p.display_name, p.avatar_url, p.subscription_price, p.subscription_currency
  FROM videos v
  JOIN profiles p ON v.user_id = p.id
  JOIN follows f ON f.following_id = v.user_id
  WHERE
    -- Solo videos de usuarios que sigue
    f.follower_id = viewer_id
    -- Solo mostrar videos que el usuario puede ver
    AND (
      -- Videos gratuitos: siempre visibles
      v.is_premium = false
      OR (
        -- Videos premium: solo si el usuario está suscrito
        v.is_premium = true
        AND EXISTS(
          SELECT 1 FROM subscriptions s
          WHERE s.creator_id = v.user_id
          AND s.subscriber_id = viewer_id
          AND s.status = 'active'
          AND s.current_period_end > NOW()
        )
      )
    )
  ORDER BY v.created_at DESC
  OFFSET page_offset
  LIMIT page_limit;
END;
$$;


ALTER FUNCTION "public"."get_following_feed_with_permissions"("viewer_id" "uuid", "page_offset" integer, "page_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_for_you_feed"("viewer_id" "uuid", "page_offset" integer DEFAULT 0, "page_limit" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "user_id" "uuid", "title" character varying, "description" "text", "hashtags" "text"[], "video_url" character varying, "thumbnail_url" character varying, "duration" integer, "is_premium" boolean, "likes_count" integer, "comments_count" integer, "views_count" integer, "created_at" timestamp with time zone, "username" character varying, "display_name" character varying, "avatar_url" character varying, "subscription_price" numeric, "subscription_currency" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id, v.user_id, v.title, v.description, v.hashtags, v.video_url, v.thumbnail_url, v.duration,
    v.is_premium, v.likes_count, v.comments_count, v.views_count, v.created_at,
    p.username, p.display_name, p.avatar_url, p.subscription_price, p.subscription_currency
  FROM videos v
  JOIN profiles p ON v.user_id = p.id
  WHERE
    -- Exclude user's own videos
    v.user_id != viewer_id  -- <<-- CAMBIO
    -- Only show premium videos if user is subscribed
    AND (
      v.is_premium = false
      OR EXISTS(
        SELECT 1 FROM subscriptions s
        WHERE s.creator_id = v.user_id
        AND s.subscriber_id = viewer_id  -- <<-- CAMBIO
        AND s.status = 'active'
        AND s.current_period_end > NOW()
      )
    )
  ORDER BY
    (v.likes_count + v.comments_count + (v.views_count / 10)) DESC,
    v.created_at DESC
  OFFSET page_offset
  LIMIT page_limit;
END;
$$;


ALTER FUNCTION "public"."get_for_you_feed"("viewer_id" "uuid", "page_offset" integer, "page_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_for_you_feed_with_permissions"("viewer_id" "uuid", "page_offset" integer DEFAULT 0, "page_limit" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "user_id" "uuid", "title" character varying, "description" "text", "hashtags" "text"[], "video_url" character varying, "thumbnail_url" character varying, "duration" integer, "is_premium" boolean, "likes_count" integer, "comments_count" integer, "views_count" integer, "created_at" timestamp with time zone, "username" character varying, "display_name" character varying, "avatar_url" character varying, "subscription_price" numeric, "subscription_currency" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id, v.user_id, v.title, v.description, v.hashtags, v.video_url, v.thumbnail_url, v.duration,
    v.is_premium, v.likes_count, v.comments_count, v.views_count, v.created_at,
    p.username, p.display_name, p.avatar_url, p.subscription_price, p.subscription_currency
  FROM videos v
  JOIN profiles p ON v.user_id = p.id
  WHERE
    -- Excluir videos del propio usuario
    v.user_id != viewer_id
    -- Solo mostrar videos que el usuario puede ver
    AND (
      -- Videos gratuitos: siempre visibles
      v.is_premium = false
      OR (
        -- Videos premium: solo si el usuario está suscrito
        v.is_premium = true
        AND EXISTS(
          SELECT 1 FROM subscriptions s
          WHERE s.creator_id = v.user_id
          AND s.subscriber_id = viewer_id
          AND s.status = 'active'
          AND s.current_period_end > NOW()
        )
      )
    )
  ORDER BY
    -- Algoritmo mejorado de ranking
    (
      (v.likes_count * 0.3) + 
      (v.comments_count * 0.4) + 
      (v.views_count * 0.2 / 100) + 
      (EXTRACT(EPOCH FROM (NOW() - v.created_at)) / -3600 * 0.1) -- Más reciente = mayor score
    ) DESC,
    v.created_at DESC
  OFFSET page_offset
  LIMIT page_limit;
END;
$$;


ALTER FUNCTION "public"."get_for_you_feed_with_permissions"("viewer_id" "uuid", "page_offset" integer, "page_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_recommended_users"("for_user_id" "uuid", "limit_count" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "username" character varying, "display_name" character varying, "avatar_url" character varying, "followers_count" integer, "videos_count" integer, "subscription_price" numeric, "mutual_follows_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, 
    p.username, 
    p.display_name, 
    p.avatar_url, 
    p.followers_count, 
    p.videos_count, 
    p.subscription_price,
    (
      SELECT COUNT(*)
      FROM follows f1
      JOIN follows f2 ON f1.following_id = f2.following_id
      WHERE f1.follower_id = get_recommended_users.for_user_id
      AND f2.follower_id = p.id
    ) as mutual_follows_count
  FROM profiles p
  WHERE
    p.id != get_recommended_users.for_user_id
    AND NOT EXISTS(
      SELECT 1 FROM follows f
      WHERE f.follower_id = get_recommended_users.for_user_id
      AND f.following_id = p.id
    )
    AND p.videos_count > 0
  ORDER BY
    mutual_follows_count DESC,
    p.followers_count DESC,
    p.videos_count DESC
  LIMIT limit_count;
END;
$$;


ALTER FUNCTION "public"."get_recommended_users"("for_user_id" "uuid", "limit_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_subscription_statuses"("subscriber_id" "uuid", "creator_ids" "uuid"[]) RETURNS TABLE("creator_id" "uuid", "is_subscribed" boolean, "subscription_id" "uuid", "expires_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    creators.id as creator_id,
    COALESCE(s.status = 'active' AND s.current_period_end > NOW(), false) as is_subscribed,
    s.id as subscription_id,
    s.current_period_end as expires_at
  FROM unnest(creator_ids) as creators(id)
  LEFT JOIN subscriptions s ON s.creator_id = creators.id
    AND s.subscriber_id = get_subscription_statuses.subscriber_id
    AND s.status = 'active';
END;
$$;


ALTER FUNCTION "public"."get_subscription_statuses"("subscriber_id" "uuid", "creator_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_trending_hashtags"("limit_count" integer DEFAULT 20, "days_back" integer DEFAULT 7) RETURNS TABLE("hashtag" "text", "video_count" bigint, "total_views" bigint, "trending_score" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    unnest(v.hashtags) as hashtag,
    COUNT(*) as video_count,
    SUM(v.views_count) as total_views,
    (COUNT(*) * 0.3 + SUM(v.views_count) * 0.7)::numeric as trending_score
  FROM videos v
  WHERE
    v.created_at > NOW() - INTERVAL '1 day' * days_back
    AND v.hashtags IS NOT NULL
    AND array_length(v.hashtags, 1) > 0
  GROUP BY unnest(v.hashtags)
  ORDER BY trending_score DESC
  LIMIT limit_count;
END;
$$;


ALTER FUNCTION "public"."get_trending_hashtags"("limit_count" integer, "days_back" integer) OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."get_user_notifications"("user_id_param" "uuid", "page_offset" integer DEFAULT 0, "page_limit" integer DEFAULT 20) RETURNS TABLE("id" "uuid", "type" character varying, "entity_id" "uuid", "entity_type" character varying, "is_read" boolean, "created_at" timestamp with time zone, "actor_username" character varying, "actor_display_name" character varying, "actor_avatar_url" character varying, "entity_title" character varying)
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


CREATE OR REPLACE FUNCTION "public"."get_user_stats"("profile_id" "uuid") RETURNS TABLE("total_videos" integer, "total_likes" bigint, "total_views" bigint, "total_comments" bigint, "followers_count" integer, "following_count" integer, "subscribers_count" integer, "avg_engagement_rate" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(v.id)::integer as total_videos,
    COALESCE(SUM(v.likes_count), 0) as total_likes,
    COALESCE(SUM(v.views_count), 0) as total_views,
    COALESCE(SUM(v.comments_count), 0) as total_comments,
    p.followers_count,
    (SELECT COUNT(*)::integer FROM follows f WHERE f.follower_id = get_user_stats.profile_id) as following_count,
    p.subscribers_count,
    CASE
      WHEN SUM(v.views_count) > 0 THEN
        ((SUM(v.likes_count) + SUM(v.comments_count))::numeric / SUM(v.views_count) * 100)
      ELSE 0
    END as avg_engagement_rate
  FROM profiles p
  LEFT JOIN videos v ON v.user_id = p.id
  WHERE p.id = get_user_stats.profile_id
  GROUP BY p.id, p.followers_count, p.subscribers_count;
END;
$$;


ALTER FUNCTION "public"."get_user_stats"("profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_video_comments_paginated"("video_id" "uuid", "page_offset" integer DEFAULT 0, "page_limit" integer DEFAULT 20) RETURNS TABLE("id" "uuid", "user_id" "uuid", "video_id_out" "uuid", "text" "text", "is_pinned" boolean, "created_at" timestamp with time zone, "username" character varying, "display_name" character varying, "avatar_url" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id, 
    c.user_id, 
    c.video_id, 
    c.text,
    false as is_pinned, -- Placeholder for future
    c.created_at,
    p.username, 
    p.display_name, 
    p.avatar_url
  FROM comments c
  JOIN profiles p ON c.user_id = p.id
  WHERE c.video_id = get_video_comments_paginated.video_id
  ORDER BY c.created_at DESC
  OFFSET page_offset
  LIMIT page_limit;
END;
$$;


ALTER FUNCTION "public"."get_video_comments_paginated"("video_id" "uuid", "page_offset" integer, "page_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_video_comments_paginated_with_likes"("video_id_param" "uuid", "viewer_id_param" "uuid", "page_offset" integer DEFAULT 0, "page_limit" integer DEFAULT 20) RETURNS TABLE("id" "uuid", "user_id" "uuid", "video_id" "uuid", "text" "text", "reply_to" "uuid", "replies_count" integer, "likes_count" integer, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "username" character varying, "display_name" character varying, "avatar_url" character varying, "is_liked" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.user_id,
    c.video_id,
    c.text,
    c.reply_to,
    c.replies_count,
    c.likes_count,
    c.created_at,
    c.updated_at,
    p.username,
    p.display_name,
    p.avatar_url,
    EXISTS(
      SELECT 1 FROM comment_likes cl 
      WHERE cl.comment_id = c.id AND cl.user_id = viewer_id_param
    ) as is_liked
  FROM comments c
  JOIN profiles p ON c.user_id = p.id
  WHERE c.video_id = video_id_param
    AND c.reply_to IS NULL -- Solo comentarios principales
  ORDER BY c.created_at DESC
  OFFSET page_offset
  LIMIT page_limit;
END;
$$;


ALTER FUNCTION "public"."get_video_comments_paginated_with_likes"("video_id_param" "uuid", "viewer_id_param" "uuid", "page_offset" integer, "page_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_video_interactions"("video_ids" "uuid"[], "viewer_id" "uuid") RETURNS TABLE("video_id" "uuid", "is_liked" boolean, "is_following" boolean, "is_subscribed" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id as video_id,
    EXISTS(SELECT 1 FROM likes l WHERE l.video_id = v.id AND l.user_id = viewer_id) as is_liked,
    EXISTS(SELECT 1 FROM follows f WHERE f.following_id = v.user_id AND f.follower_id = viewer_id) as is_following,
    EXISTS(
      SELECT 1 FROM subscriptions s
      WHERE s.creator_id = v.user_id
      AND s.subscriber_id = viewer_id
      AND s.status = 'active'
      AND s.current_period_end > NOW()
    ) as is_subscribed
  FROM videos v
  WHERE v.id = ANY(video_ids);
END;
$$;


ALTER FUNCTION "public"."get_video_interactions"("video_ids" "uuid"[], "viewer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_video_interactions_safe"("video_ids" "uuid"[], "viewer_id" "uuid") RETURNS TABLE("video_id" "uuid", "is_liked" boolean, "is_following" boolean, "is_subscribed" boolean, "can_access" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id as video_id,
    EXISTS(SELECT 1 FROM likes l WHERE l.video_id = v.id AND l.user_id = viewer_id) as is_liked,
    EXISTS(SELECT 1 FROM follows f WHERE f.following_id = v.user_id AND f.follower_id = viewer_id) as is_following,
    EXISTS(
      SELECT 1 FROM subscriptions s
      WHERE s.creator_id = v.user_id
      AND s.subscriber_id = viewer_id
      AND s.status = 'active'
      AND s.current_period_end > NOW()
    ) as is_subscribed,
    -- Verificar si puede acceder al video
    (
      v.is_premium = false
      OR v.user_id = viewer_id
      OR EXISTS(
        SELECT 1 FROM subscriptions s
        WHERE s.creator_id = v.user_id
        AND s.subscriber_id = viewer_id
        AND s.status = 'active'
        AND s.current_period_end > NOW()
      )
    ) as can_access
  FROM videos v
  WHERE v.id = ANY(video_ids);
END;
$$;


ALTER FUNCTION "public"."get_video_interactions_safe"("video_ids" "uuid"[], "viewer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_videos_pending_thumbnail_processing"() RETURNS TABLE("video_id" "uuid", "video_url" "text", "thumbnail_time" double precision, "thumbnail_url" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.video_url,
        v.thumbnail_time,
        v.thumbnail_url
    FROM public.videos v
    WHERE v.thumbnail_processing_status = 'pending'
    AND v.thumbnail_time IS NOT NULL
    AND v.thumbnail_time >= 0
    ORDER BY v.created_at ASC
    LIMIT 50;
END;
$$;


ALTER FUNCTION "public"."get_videos_pending_thumbnail_processing"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Automatically creates profile when user signs up';



CREATE OR REPLACE FUNCTION "public"."handle_new_user_enhanced"() RETURNS "trigger"
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
    locale,
    preferred_language,
    pricing_region,
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
    3.95, -- Default recommended price for ES region
    'EUR',
    30.00,
    0,
    0,
    0,
    'es-ES',
    'es',
    'ES',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user_enhanced"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_user_email_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- You can add logic here if you need to do something when email changes
  -- For now, we'll just return the NEW record
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_user_email_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_video_views"("video_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE videos
  SET views_count = views_count + 1
  WHERE id = video_id;
END;
$$;


ALTER FUNCTION "public"."increment_video_views"("video_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_video_views_safe"("video_id" "uuid", "viewer_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  can_access boolean;
BEGIN
  -- Verificar si el usuario puede acceder al video
  SELECT can_access_premium_video_enhanced(video_id, viewer_id) INTO can_access;
  
  -- Solo incrementar vistas si tiene acceso
  IF can_access THEN
    UPDATE videos
    SET views_count = views_count + 1
    WHERE id = video_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."increment_video_views_safe"("video_id" "uuid", "viewer_id" "uuid") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."reset_failed_thumbnail_processing"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    reset_count INTEGER;
BEGIN
    UPDATE public.videos 
    SET 
        thumbnail_processing_status = 'pending',
        updated_at = NOW()
    WHERE thumbnail_processing_status = 'failed'
    AND created_at > NOW() - INTERVAL '24 hours'; -- Only retry recent failures
    
    GET DIAGNOSTICS reset_count = ROW_COUNT;
    RETURN reset_count;
END;
$$;


ALTER FUNCTION "public"."reset_failed_thumbnail_processing"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_users_with_interactions"("search_query" "text", "viewer_id" "uuid" DEFAULT NULL::"uuid", "page_offset" integer DEFAULT 0, "page_limit" integer DEFAULT 20) RETURNS TABLE("id" "uuid", "username" character varying, "display_name" character varying, "bio" "text", "avatar_url" character varying, "subscription_price" numeric, "subscription_currency" character varying, "followers_count" integer, "subscribers_count" integer, "videos_count" integer, "created_at" timestamp with time zone, "is_following" boolean, "is_subscribed" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.username,
        p.display_name,
        p.bio,
        p.avatar_url,
        p.subscription_price,
        p.subscription_currency,
        p.followers_count,
        p.subscribers_count,
        p.videos_count,
        p.created_at,
        CASE 
            WHEN viewer_id IS NULL THEN false
            ELSE EXISTS(
                SELECT 1 FROM follows f 
                WHERE f.follower_id = viewer_id 
                AND f.following_id = p.id
            )
        END as is_following,
        CASE 
            WHEN viewer_id IS NULL THEN false
            ELSE EXISTS(
                SELECT 1 FROM subscriptions s
                WHERE s.subscriber_id = viewer_id
                AND s.creator_id = p.id
                AND s.status = 'active'
                AND s.current_period_end > NOW()
            )
        END as is_subscribed
    FROM profiles p
    WHERE
        (
            p.username ILIKE '%' || search_query || '%'
            OR p.display_name ILIKE '%' || search_query || '%'
            OR p.bio ILIKE '%' || search_query || '%'
        )
        AND (viewer_id IS NULL OR p.id != viewer_id) -- Exclude viewer from results
    ORDER BY
        -- Prioritize exact matches
        CASE
            WHEN p.username ILIKE search_query THEN 1
            WHEN p.username ILIKE search_query || '%' THEN 2
            WHEN p.display_name ILIKE search_query || '%' THEN 3
            ELSE 4
        END,
        p.followers_count DESC,
        p.created_at DESC
    OFFSET page_offset
    LIMIT page_limit;
END;
$$;


ALTER FUNCTION "public"."search_users_with_interactions"("search_query" "text", "viewer_id" "uuid", "page_offset" integer, "page_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_videos"("search_query" "text", "viewer_id" "uuid" DEFAULT NULL::"uuid", "page_offset" integer DEFAULT 0, "page_limit" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "user_id" "uuid", "title" character varying, "description" "text", "hashtags" "text"[], "video_url" character varying, "thumbnail_url" character varying, "duration" integer, "is_premium" boolean, "likes_count" integer, "comments_count" integer, "views_count" integer, "created_at" timestamp with time zone, "username" character varying, "display_name" character varying, "avatar_url" character varying, "subscription_price" numeric, "subscription_currency" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id, v.user_id, v.title, v.description, v.hashtags, v.video_url, v.thumbnail_url, v.duration,
    v.is_premium, v.likes_count, v.comments_count, v.views_count, v.created_at,
    p.username, p.display_name, p.avatar_url, p.subscription_price, p.subscription_currency
  FROM videos v
  JOIN profiles p ON v.user_id = p.id
  WHERE
    (
      v.title ILIKE '%' || search_query || '%'
      OR v.description ILIKE '%' || search_query || '%'
      OR p.username ILIKE '%' || search_query || '%'
      OR p.display_name ILIKE '%' || search_query || '%'
      OR search_query = ANY(v.hashtags)
    )
    AND (
      viewer_id IS NULL
      OR v.is_premium = false
      OR EXISTS(
        SELECT 1 FROM subscriptions s
        WHERE s.creator_id = v.user_id
        AND s.subscriber_id = viewer_id
        AND s.status = 'active'
        AND s.current_period_end > NOW()
      )
    )
  ORDER BY
    CASE
      WHEN v.title ILIKE search_query || '%' THEN 1
      WHEN p.username ILIKE search_query || '%' THEN 2
      WHEN search_query = ANY(v.hashtags) THEN 3
      ELSE 4
    END,
    v.views_count DESC,
    v.created_at DESC
  OFFSET page_offset
  LIMIT page_limit;
END;
$$;


ALTER FUNCTION "public"."search_videos"("search_query" "text", "viewer_id" "uuid", "page_offset" integer, "page_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_videos_with_permissions"("search_query" "text", "viewer_id" "uuid" DEFAULT NULL::"uuid", "page_offset" integer DEFAULT 0, "page_limit" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "user_id" "uuid", "title" character varying, "description" "text", "hashtags" "text"[], "video_url" character varying, "thumbnail_url" character varying, "duration" integer, "is_premium" boolean, "likes_count" integer, "comments_count" integer, "views_count" integer, "created_at" timestamp with time zone, "username" character varying, "display_name" character varying, "avatar_url" character varying, "subscription_price" numeric, "subscription_currency" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id, v.user_id, v.title, v.description, v.hashtags, v.video_url, v.thumbnail_url, v.duration,
    v.is_premium, v.likes_count, v.comments_count, v.views_count, v.created_at,
    p.username, p.display_name, p.avatar_url, p.subscription_price, p.subscription_currency
  FROM videos v
  JOIN profiles p ON v.user_id = p.id
  WHERE
    -- Filtro de búsqueda usando ILIKE estándar
    (
      v.title ILIKE '%' || search_query || '%'
      OR v.description ILIKE '%' || search_query || '%'
      OR p.username ILIKE '%' || search_query || '%'
      OR p.display_name ILIKE '%' || search_query || '%'
      OR search_query = ANY(v.hashtags)
    )
    -- Control de permisos
    AND (
      viewer_id IS NULL -- Si no hay viewer, solo mostrar videos públicos
      OR v.is_premium = false -- Videos gratuitos siempre visibles
      OR v.user_id = viewer_id -- El creador puede ver sus propios videos
      OR (
        -- Videos premium solo si hay suscripción activa
        v.is_premium = true
        AND viewer_id IS NOT NULL
        AND EXISTS(
          SELECT 1 FROM subscriptions s
          WHERE s.creator_id = v.user_id
          AND s.subscriber_id = viewer_id
          AND s.status = 'active'
          AND s.current_period_end > NOW()
        )
      )
    )
  ORDER BY
    -- Ranking de relevancia de búsqueda
    CASE
      WHEN v.title ILIKE search_query || '%' THEN 1
      WHEN p.username ILIKE search_query || '%' THEN 2
      WHEN search_query = ANY(v.hashtags) THEN 3
      ELSE 4
    END,
    v.views_count DESC,
    v.created_at DESC
  OFFSET page_offset
  LIMIT page_limit;
END;
$$;


ALTER FUNCTION "public"."search_videos_with_permissions"("search_query" "text", "viewer_id" "uuid", "page_offset" integer, "page_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_initial_thumbnail_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- If thumbnail_time is provided, mark for processing
    IF NEW.thumbnail_time IS NOT NULL AND NEW.thumbnail_time >= 0 THEN
        NEW.thumbnail_processing_status := 'pending';
        NEW.thumbnail_generated := FALSE;
    ELSE
        NEW.thumbnail_processing_status := 'not_required';
        NEW.thumbnail_generated := TRUE;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_initial_thumbnail_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."toggle_comment_like"("comment_id_param" "uuid", "user_id_param" "uuid") RETURNS TABLE("liked" boolean, "likes_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  existing_like_id uuid;
  current_likes_count integer;
BEGIN
  -- Verificar si ya existe el like
  SELECT id INTO existing_like_id
  FROM comment_likes
  WHERE comment_id = comment_id_param AND user_id = user_id_param;

  IF existing_like_id IS NOT NULL THEN
    -- Unlike: eliminar el like
    DELETE FROM comment_likes WHERE id = existing_like_id;
    
    -- Obtener el conteo actualizado
    SELECT c.likes_count INTO current_likes_count
    FROM comments c WHERE c.id = comment_id_param;
    
    RETURN QUERY SELECT false as liked, current_likes_count;
  ELSE
    -- Like: insertar nuevo like
    INSERT INTO comment_likes (comment_id, user_id)
    VALUES (comment_id_param, user_id_param);
    
    -- Obtener el conteo actualizado
    SELECT c.likes_count INTO current_likes_count
    FROM comments c WHERE c.id = comment_id_param;
    
    RETURN QUERY SELECT true as liked, current_likes_count;
  END IF;
END;
$$;


ALTER FUNCTION "public"."toggle_comment_like"("comment_id_param" "uuid", "user_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_comment_likes_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments SET likes_count = likes_count - 1 WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_comment_likes_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_thumbnail_processing_status"("video_id" "uuid", "new_status" character varying, "new_thumbnail_url" "text" DEFAULT NULL::"text", "mark_generated" boolean DEFAULT false) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.videos 
    SET 
        thumbnail_processing_status = new_status,
        thumbnail_url = COALESCE(new_thumbnail_url, thumbnail_url),
        thumbnail_generated = CASE 
            WHEN mark_generated THEN TRUE 
            ELSE thumbnail_generated 
        END,
        updated_at = NOW()
    WHERE id = video_id;
    
    RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."update_thumbnail_processing_status"("video_id" "uuid", "new_status" character varying, "new_thumbnail_url" "text", "mark_generated" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_followers_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET followers_count = followers_count - 1 WHERE id = OLD.following_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_user_followers_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_subscribers_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET subscribers_count = subscribers_count + 1 WHERE id = NEW.creator_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET subscribers_count = subscribers_count - 1 WHERE id = OLD.creator_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_user_subscribers_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_videos_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET videos_count = videos_count + 1 WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET videos_count = videos_count - 1 WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_user_videos_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_video_comments_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Incrementar comment count para el video (lógica existente)
    UPDATE videos SET comments_count = comments_count + 1 WHERE id = NEW.video_id;
    
    -- NUEVO: Si es una reply, incrementar el contador del comentario padre
    IF NEW.reply_to IS NOT NULL THEN
      UPDATE comments 
      SET replies_count = COALESCE(replies_count, 0) + 1
      WHERE id = NEW.reply_to;
    END IF;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrementar comment count para el video (lógica existente)
    UPDATE videos SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.video_id;
    
    -- NUEVO: Si era una reply, decrementar el contador del comentario padre
    IF OLD.reply_to IS NOT NULL THEN
      UPDATE comments 
      SET replies_count = GREATEST(COALESCE(replies_count, 0) - 1, 0)
      WHERE id = OLD.reply_to;
    END IF;
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_video_comments_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_video_likes_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE videos SET likes_count = likes_count + 1 WHERE id = NEW.video_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE videos SET likes_count = likes_count - 1 WHERE id = OLD.video_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_video_likes_count"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."app_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "default_commission_rate" numeric(5,2) DEFAULT 30.00,
    "min_video_duration" integer DEFAULT 15,
    "max_video_duration" integer DEFAULT 300,
    "preview_duration" integer DEFAULT 5,
    "supported_currencies" "jsonb" DEFAULT '["USD", "EUR", "GBP", "JPY", "CNY"]'::"jsonb"
);


ALTER TABLE "public"."app_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comment_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "comment_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."comment_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "video_id" "uuid",
    "text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "reply_to" "uuid",
    "replies_count" integer DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "likes_count" integer DEFAULT 0
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."follows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "follower_id" "uuid",
    "following_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."follows" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "video_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."likes" OWNER TO "postgres";


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
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "new_subscribers_enabled" boolean DEFAULT true
);


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "username" character varying NOT NULL,
    "display_name" character varying,
    "bio" "text",
    "avatar_url" character varying,
    "subscription_price" numeric(10,2) DEFAULT 0,
    "subscription_currency" character varying(3) DEFAULT 'USD'::character varying,
    "commission_rate" numeric(5,2) DEFAULT 30.00,
    "followers_count" integer DEFAULT 0,
    "subscribers_count" integer DEFAULT 0,
    "videos_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "locale" character varying(10) DEFAULT 'es-ES'::character varying,
    "preferred_language" character varying(5) DEFAULT 'es'::character varying,
    "pricing_region" character varying(5) DEFAULT 'ES'::character varying,
    "has_premium_content" boolean DEFAULT false NOT NULL,
    "language" character varying(5) DEFAULT 'es_ES'::character varying
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'User profiles linked to auth.users';



COMMENT ON COLUMN "public"."profiles"."locale" IS 'User locale (e.g., es-ES, en-US, fr-FR)';



COMMENT ON COLUMN "public"."profiles"."preferred_language" IS 'User preferred language code (e.g., es, en, fr)';



COMMENT ON COLUMN "public"."profiles"."pricing_region" IS 'Region code for pricing recommendations (e.g., ES, US, FR)';



COMMENT ON COLUMN "public"."profiles"."has_premium_content" IS 'Indicates if the user offers premium content subscriptions';



CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "reporter_id" "uuid" NOT NULL,
    "reported_user_id" "uuid",
    "reported_video_id" "uuid",
    "reported_comment_id" "uuid",
    "reason" "text" NOT NULL,
    "status" character varying DEFAULT 'pending'::character varying
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subscriber_id" "uuid",
    "creator_id" "uuid",
    "stripe_subscription_id" character varying,
    "status" character varying DEFAULT 'active'::character varying,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "price" numeric(10,2),
    "currency" character varying(3),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."users_with_email" AS
 SELECT "au"."id",
    "au"."email",
    "p"."language"
   FROM ("auth"."users" "au"
     LEFT JOIN "public"."profiles" "p" ON (("au"."id" = "p"."id")));


ALTER VIEW "public"."users_with_email" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."videos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" character varying(255),
    "description" "text",
    "hashtags" "text"[],
    "video_url" character varying NOT NULL,
    "thumbnail_url" character varying,
    "duration" integer,
    "is_premium" boolean DEFAULT false,
    "likes_count" integer DEFAULT 0,
    "comments_count" integer DEFAULT 0,
    "views_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "thumbnail_time" double precision DEFAULT 0,
    "start_time" double precision DEFAULT 0,
    "end_time" double precision,
    "thumbnail_generated" boolean DEFAULT false,
    "thumbnail_processing_status" character varying(20) DEFAULT 'pending'::character varying,
    "is_hidden" boolean DEFAULT false,
    "hidden_at" timestamp with time zone
);


ALTER TABLE "public"."videos" OWNER TO "postgres";


COMMENT ON COLUMN "public"."videos"."thumbnail_url" IS 'Public URL of the video thumbnail image uploaded to Supabase Storage';



COMMENT ON COLUMN "public"."videos"."thumbnail_time" IS 'Time in seconds where thumbnail should be extracted from video';



COMMENT ON COLUMN "public"."videos"."start_time" IS 'Video start time for trimming (in seconds)';



COMMENT ON COLUMN "public"."videos"."end_time" IS 'Video end time for trimming (in seconds)';



COMMENT ON COLUMN "public"."videos"."thumbnail_generated" IS 'Whether thumbnail has been generated successfully';



COMMENT ON COLUMN "public"."videos"."thumbnail_processing_status" IS 'Status of thumbnail processing: pending, processing, completed, failed';



COMMENT ON COLUMN "public"."videos"."is_hidden" IS 'Whether the video is hidden from public view (soft delete)';



COMMENT ON COLUMN "public"."videos"."hidden_at" IS 'Timestamp when the video was hidden';



CREATE TABLE IF NOT EXISTS "public"."waiting_list" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "user_type" "text" NOT NULL,
    "source" "text" DEFAULT 'waiting_list'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "waiting_list_user_type_check" CHECK (("user_type" = ANY (ARRAY['fan'::"text", 'creator'::"text", 'brand'::"text"])))
);


ALTER TABLE "public"."waiting_list" OWNER TO "postgres";


ALTER TABLE ONLY "public"."app_config"
    ADD CONSTRAINT "app_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comment_likes"
    ADD CONSTRAINT "comment_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comment_likes"
    ADD CONSTRAINT "comment_likes_user_comment_unique" UNIQUE ("user_id", "comment_id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_follower_id_following_id_key" UNIQUE ("follower_id", "following_id");



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_user_id_video_id_key" UNIQUE ("user_id", "video_id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "users_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."waiting_list"
    ADD CONSTRAINT "waiting_list_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."waiting_list"
    ADD CONSTRAINT "waiting_list_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_comment_likes_comment_id" ON "public"."comment_likes" USING "btree" ("comment_id");



CREATE INDEX "idx_comment_likes_created_at" ON "public"."comment_likes" USING "btree" ("created_at");



CREATE INDEX "idx_comment_likes_user_id" ON "public"."comment_likes" USING "btree" ("user_id");



CREATE INDEX "idx_comments_created_at" ON "public"."comments" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_comments_reply_to" ON "public"."comments" USING "btree" ("reply_to") WHERE ("reply_to" IS NOT NULL);



CREATE INDEX "idx_comments_video_created" ON "public"."comments" USING "btree" ("video_id", "created_at" DESC);



CREATE INDEX "idx_comments_video_id_reply_to" ON "public"."comments" USING "btree" ("video_id", "reply_to");



CREATE INDEX "idx_follows_follower_following" ON "public"."follows" USING "btree" ("follower_id", "following_id");



CREATE INDEX "idx_likes_user_video" ON "public"."likes" USING "btree" ("user_id", "video_id");



CREATE INDEX "idx_likes_video_user" ON "public"."likes" USING "btree" ("video_id", "user_id");



CREATE INDEX "idx_notifications_actor_id" ON "public"."notifications" USING "btree" ("actor_id");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_is_read" ON "public"."notifications" USING "btree" ("is_read");



CREATE INDEX "idx_notifications_recipient_id" ON "public"."notifications" USING "btree" ("recipient_id");



CREATE INDEX "idx_notifications_recipient_read" ON "public"."notifications" USING "btree" ("recipient_id", "is_read");



CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");



CREATE INDEX "idx_profiles_created_at" ON "public"."profiles" USING "btree" ("created_at");



CREATE INDEX "idx_profiles_display_name" ON "public"."profiles" USING "btree" ("display_name");



CREATE INDEX "idx_profiles_followers_count" ON "public"."profiles" USING "btree" ("followers_count");



CREATE INDEX "idx_profiles_has_premium_content" ON "public"."profiles" USING "btree" ("has_premium_content");



CREATE INDEX "idx_profiles_locale" ON "public"."profiles" USING "btree" ("locale");



CREATE INDEX "idx_profiles_preferred_language" ON "public"."profiles" USING "btree" ("preferred_language");



CREATE INDEX "idx_profiles_pricing_region" ON "public"."profiles" USING "btree" ("pricing_region");



CREATE INDEX "idx_profiles_username" ON "public"."profiles" USING "btree" ("username");



CREATE INDEX "idx_profiles_videos_count" ON "public"."profiles" USING "btree" ("videos_count");



CREATE INDEX "idx_subscriptions_active" ON "public"."subscriptions" USING "btree" ("subscriber_id", "creator_id") WHERE (("status")::"text" = 'active'::"text");



CREATE INDEX "idx_videos_created_at" ON "public"."videos" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_videos_created_at_desc" ON "public"."videos" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_videos_description" ON "public"."videos" USING "btree" ("description");



CREATE INDEX "idx_videos_hashtags" ON "public"."videos" USING "gin" ("hashtags");



CREATE INDEX "idx_videos_hashtags_gin" ON "public"."videos" USING "gin" ("hashtags");



CREATE INDEX "idx_videos_is_hidden" ON "public"."videos" USING "btree" ("is_hidden");



CREATE INDEX "idx_videos_is_premium" ON "public"."videos" USING "btree" ("is_premium");



CREATE INDEX "idx_videos_premium_creator" ON "public"."videos" USING "btree" ("is_premium", "user_id");



CREATE INDEX "idx_videos_thumbnail_generated" ON "public"."videos" USING "btree" ("thumbnail_generated");



CREATE INDEX "idx_videos_thumbnail_status" ON "public"."videos" USING "btree" ("thumbnail_processing_status");



CREATE INDEX "idx_videos_thumbnail_url" ON "public"."videos" USING "btree" ("thumbnail_url") WHERE ("thumbnail_url" IS NOT NULL);



CREATE INDEX "idx_videos_title" ON "public"."videos" USING "btree" ("title");



CREATE INDEX "idx_videos_user_id_created_at" ON "public"."videos" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_videos_user_visible" ON "public"."videos" USING "btree" ("user_id", "is_hidden", "created_at" DESC);



CREATE INDEX "idx_videos_views_count" ON "public"."videos" USING "btree" ("views_count" DESC);



CREATE INDEX "idx_waiting_list_created_at" ON "public"."waiting_list" USING "btree" ("created_at");



CREATE INDEX "idx_waiting_list_email" ON "public"."waiting_list" USING "btree" ("email");



CREATE INDEX "idx_waiting_list_user_type" ON "public"."waiting_list" USING "btree" ("user_type");



CREATE OR REPLACE TRIGGER "comment_like_notification_trigger" AFTER INSERT ON "public"."comment_likes" FOR EACH ROW EXECUTE FUNCTION "public"."notify_comment_like"();



CREATE OR REPLACE TRIGGER "follow_notification_trigger" AFTER INSERT ON "public"."follows" FOR EACH ROW EXECUTE FUNCTION "public"."notify_follow"();



CREATE OR REPLACE TRIGGER "trigger_set_initial_thumbnail_status" BEFORE INSERT ON "public"."videos" FOR EACH ROW EXECUTE FUNCTION "public"."set_initial_thumbnail_status"();



CREATE OR REPLACE TRIGGER "update_comment_likes_count_trigger" AFTER INSERT OR DELETE ON "public"."comment_likes" FOR EACH ROW EXECUTE FUNCTION "public"."update_comment_likes_count"();



CREATE OR REPLACE TRIGGER "update_comments_updated_at" BEFORE UPDATE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_notification_preferences_updated_at" BEFORE UPDATE ON "public"."notification_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_notifications_updated_at" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_followers_count_trigger" AFTER INSERT OR DELETE ON "public"."follows" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_followers_count"();



CREATE OR REPLACE TRIGGER "update_user_subscribers_count_trigger" AFTER INSERT OR DELETE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_subscribers_count"();



CREATE OR REPLACE TRIGGER "update_user_videos_count_trigger" AFTER INSERT OR DELETE ON "public"."videos" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_videos_count"();



CREATE OR REPLACE TRIGGER "update_video_comments_count_trigger" AFTER INSERT OR DELETE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_video_comments_count"();



CREATE OR REPLACE TRIGGER "update_video_likes_count_trigger" AFTER INSERT OR DELETE ON "public"."likes" FOR EACH ROW EXECUTE FUNCTION "public"."update_video_likes_count"();



CREATE OR REPLACE TRIGGER "update_waiting_list_updated_at" BEFORE UPDATE ON "public"."waiting_list" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "video_comment_notification_trigger" AFTER INSERT ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."notify_video_comment"();



CREATE OR REPLACE TRIGGER "video_like_notification_trigger" AFTER INSERT ON "public"."likes" FOR EACH ROW EXECUTE FUNCTION "public"."notify_video_like"();



ALTER TABLE ONLY "public"."comment_likes"
    ADD CONSTRAINT "comment_likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comment_likes"
    ADD CONSTRAINT "comment_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_reply_to_fkey" FOREIGN KEY ("reply_to") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reported_comment_id_fkey" FOREIGN KEY ("reported_comment_id") REFERENCES "public"."comments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reported_video_id_fkey" FOREIGN KEY ("reported_video_id") REFERENCES "public"."videos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "All videos are viewable by anonymous users" ON "public"."videos" FOR SELECT USING (("auth"."role"() = 'anon'::"text"));



CREATE POLICY "All videos are viewable by authenticated users" ON "public"."videos" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "App config is viewable by authenticated users" ON "public"."app_config" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Comments are viewable by everyone" ON "public"."comments" FOR SELECT USING (true);



CREATE POLICY "Follows are viewable by everyone" ON "public"."follows" FOR SELECT USING (true);



CREATE POLICY "Likes are viewable by everyone" ON "public"."likes" FOR SELECT USING (true);



CREATE POLICY "Public profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Users can comment on content they have access to" ON "public"."comments" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."videos" "v"
  WHERE (("v"."id" = "comments"."video_id") AND ((NOT "v"."is_premium") OR (EXISTS ( SELECT 1
           FROM "public"."subscriptions" "s"
          WHERE (("s"."creator_id" = "v"."user_id") AND ("s"."subscriber_id" = "auth"."uid"()) AND (("s"."status")::"text" = 'active'::"text") AND ("s"."current_period_end" > "now"())))) OR ("v"."user_id" = "auth"."uid"())))))));



CREATE POLICY "Users can create reports" ON "public"."reports" FOR INSERT WITH CHECK (("auth"."uid"() = "reporter_id"));



CREATE POLICY "Users can create subscriptions" ON "public"."subscriptions" FOR INSERT WITH CHECK (("auth"."uid"() = "subscriber_id"));



CREATE POLICY "Users can create their own comment likes" ON "public"."comment_likes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own notification preferences" ON "public"."notification_preferences" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can delete their own comment likes" ON "public"."comment_likes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own comments" ON "public"."comments" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own profile" ON "public"."profiles" FOR DELETE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can delete their own subscriptions" ON "public"."subscriptions" FOR DELETE USING (("auth"."uid"() = "subscriber_id"));



CREATE POLICY "Users can delete their own videos" ON "public"."videos" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can follow others" ON "public"."follows" FOR INSERT WITH CHECK (("auth"."uid"() = "follower_id"));



CREATE POLICY "Users can insert their own comments" ON "public"."comments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can like videos" ON "public"."likes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can unfollow others" ON "public"."follows" FOR DELETE USING (("auth"."uid"() = "follower_id"));



CREATE POLICY "Users can unlike videos" ON "public"."likes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own comments" ON "public"."comments" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own notification preferences" ON "public"."notification_preferences" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "recipient_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own subscriptions" ON "public"."subscriptions" FOR UPDATE USING (("auth"."uid"() = "subscriber_id"));



CREATE POLICY "Users can update their own videos" ON "public"."videos" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can upload videos" ON "public"."videos" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view comments they have access to" ON "public"."comments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."videos" "v"
  WHERE (("v"."id" = "comments"."video_id") AND ((NOT "v"."is_premium") OR (("auth"."uid"() IS NOT NULL) AND ((EXISTS ( SELECT 1
           FROM "public"."subscriptions" "s"
          WHERE (("s"."creator_id" = "v"."user_id") AND ("s"."subscriber_id" = "auth"."uid"()) AND (("s"."status")::"text" = 'active'::"text") AND ("s"."current_period_end" > "now"())))) OR ("v"."user_id" = "auth"."uid"()))))))));



CREATE POLICY "Users can view their own comment likes" ON "public"."comment_likes" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own notification preferences" ON "public"."notification_preferences" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "recipient_id"));



CREATE POLICY "Users can view their own reports" ON "public"."reports" FOR SELECT USING (("auth"."uid"() = "reporter_id"));



CREATE POLICY "Users can view their own subscriptions" ON "public"."subscriptions" FOR SELECT USING ((("auth"."uid"() = "subscriber_id") OR ("auth"."uid"() = "creator_id")));



ALTER TABLE "public"."app_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "authenticated_read" ON "public"."waiting_list" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."comment_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."follows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public_insert" ON "public"."waiting_list" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."videos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."waiting_list" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."can_access_premium_video"("video_id" "uuid", "viewer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_access_premium_video"("video_id" "uuid", "viewer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_premium_video"("video_id" "uuid", "viewer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_access_premium_video_enhanced"("video_id" "uuid", "viewer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_access_premium_video_enhanced"("video_id" "uuid", "viewer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_premium_video_enhanced"("video_id" "uuid", "viewer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_content_access"("content_type" character varying, "content_id" "uuid", "viewer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_content_access"("content_type" character varying, "content_id" "uuid", "viewer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_content_access"("content_type" character varying, "content_id" "uuid", "viewer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_username_availability"("username_to_check" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_username_availability"("username_to_check" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_username_availability"("username_to_check" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_username_availability_for_update"("username_to_check" "text", "user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_username_availability_for_update"("username_to_check" "text", "user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_username_availability_for_update"("username_to_check" "text", "user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_notification_preferences"("user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_notification_preferences"("user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_notification_preferences"("user_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_notification"("recipient_id" "uuid", "actor_id" "uuid", "notification_type" character varying, "entity_id" "uuid", "entity_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."create_notification"("recipient_id" "uuid", "actor_id" "uuid", "notification_type" character varying, "entity_id" "uuid", "entity_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_notification"("recipient_id" "uuid", "actor_id" "uuid", "notification_type" character varying, "entity_id" "uuid", "entity_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_comment_replies"("p_comment_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_comment_replies"("p_comment_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_comment_replies"("p_comment_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_comment_replies_with_likes"("comment_id_param" "uuid", "viewer_id_param" "uuid", "page_offset" integer, "page_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_comment_replies_with_likes"("comment_id_param" "uuid", "viewer_id_param" "uuid", "page_offset" integer, "page_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_comment_replies_with_likes"("comment_id_param" "uuid", "viewer_id_param" "uuid", "page_offset" integer, "page_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_comments_with_reply_counts"("p_video_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_comments_with_reply_counts"("p_video_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_comments_with_reply_counts"("p_video_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_following_feed"("viewer_id" "uuid", "page_offset" integer, "page_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_following_feed"("viewer_id" "uuid", "page_offset" integer, "page_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_following_feed"("viewer_id" "uuid", "page_offset" integer, "page_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_following_feed_with_permissions"("viewer_id" "uuid", "page_offset" integer, "page_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_following_feed_with_permissions"("viewer_id" "uuid", "page_offset" integer, "page_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_following_feed_with_permissions"("viewer_id" "uuid", "page_offset" integer, "page_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_for_you_feed"("viewer_id" "uuid", "page_offset" integer, "page_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_for_you_feed"("viewer_id" "uuid", "page_offset" integer, "page_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_for_you_feed"("viewer_id" "uuid", "page_offset" integer, "page_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_for_you_feed_with_permissions"("viewer_id" "uuid", "page_offset" integer, "page_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_for_you_feed_with_permissions"("viewer_id" "uuid", "page_offset" integer, "page_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_for_you_feed_with_permissions"("viewer_id" "uuid", "page_offset" integer, "page_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_recommended_users"("for_user_id" "uuid", "limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_recommended_users"("for_user_id" "uuid", "limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recommended_users"("for_user_id" "uuid", "limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_subscription_statuses"("subscriber_id" "uuid", "creator_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_subscription_statuses"("subscriber_id" "uuid", "creator_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_subscription_statuses"("subscriber_id" "uuid", "creator_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_trending_hashtags"("limit_count" integer, "days_back" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_trending_hashtags"("limit_count" integer, "days_back" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_trending_hashtags"("limit_count" integer, "days_back" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("user_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_notifications"("user_id_param" "uuid", "page_offset" integer, "page_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_notifications"("user_id_param" "uuid", "page_offset" integer, "page_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_notifications"("user_id_param" "uuid", "page_offset" integer, "page_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_stats"("profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_stats"("profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_stats"("profile_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_video_comments_paginated"("video_id" "uuid", "page_offset" integer, "page_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_video_comments_paginated"("video_id" "uuid", "page_offset" integer, "page_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_video_comments_paginated"("video_id" "uuid", "page_offset" integer, "page_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_video_comments_paginated_with_likes"("video_id_param" "uuid", "viewer_id_param" "uuid", "page_offset" integer, "page_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_video_comments_paginated_with_likes"("video_id_param" "uuid", "viewer_id_param" "uuid", "page_offset" integer, "page_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_video_comments_paginated_with_likes"("video_id_param" "uuid", "viewer_id_param" "uuid", "page_offset" integer, "page_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_video_interactions"("video_ids" "uuid"[], "viewer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_video_interactions"("video_ids" "uuid"[], "viewer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_video_interactions"("video_ids" "uuid"[], "viewer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_video_interactions_safe"("video_ids" "uuid"[], "viewer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_video_interactions_safe"("video_ids" "uuid"[], "viewer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_video_interactions_safe"("video_ids" "uuid"[], "viewer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_videos_pending_thumbnail_processing"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_videos_pending_thumbnail_processing"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_videos_pending_thumbnail_processing"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_enhanced"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_enhanced"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_enhanced"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_user_email_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_email_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_email_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_video_views"("video_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_video_views"("video_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_video_views"("video_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_video_views_safe"("video_id" "uuid", "viewer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_video_views_safe"("video_id" "uuid", "viewer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_video_views_safe"("video_id" "uuid", "viewer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"("user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"("user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"("user_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_notification_read"("notification_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_notification_read"("notification_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_notification_read"("notification_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_comment_like"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_comment_like"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_comment_like"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_follow"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_follow"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_follow"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_video_comment"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_video_comment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_video_comment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_video_like"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_video_like"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_video_like"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_failed_thumbnail_processing"() TO "anon";
GRANT ALL ON FUNCTION "public"."reset_failed_thumbnail_processing"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_failed_thumbnail_processing"() TO "service_role";



GRANT ALL ON FUNCTION "public"."search_users_with_interactions"("search_query" "text", "viewer_id" "uuid", "page_offset" integer, "page_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_users_with_interactions"("search_query" "text", "viewer_id" "uuid", "page_offset" integer, "page_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_users_with_interactions"("search_query" "text", "viewer_id" "uuid", "page_offset" integer, "page_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_videos"("search_query" "text", "viewer_id" "uuid", "page_offset" integer, "page_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_videos"("search_query" "text", "viewer_id" "uuid", "page_offset" integer, "page_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_videos"("search_query" "text", "viewer_id" "uuid", "page_offset" integer, "page_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_videos_with_permissions"("search_query" "text", "viewer_id" "uuid", "page_offset" integer, "page_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_videos_with_permissions"("search_query" "text", "viewer_id" "uuid", "page_offset" integer, "page_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_videos_with_permissions"("search_query" "text", "viewer_id" "uuid", "page_offset" integer, "page_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_initial_thumbnail_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_initial_thumbnail_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_initial_thumbnail_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."toggle_comment_like"("comment_id_param" "uuid", "user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_comment_like"("comment_id_param" "uuid", "user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_comment_like"("comment_id_param" "uuid", "user_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_comment_likes_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_comment_likes_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_comment_likes_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_thumbnail_processing_status"("video_id" "uuid", "new_status" character varying, "new_thumbnail_url" "text", "mark_generated" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_thumbnail_processing_status"("video_id" "uuid", "new_status" character varying, "new_thumbnail_url" "text", "mark_generated" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_thumbnail_processing_status"("video_id" "uuid", "new_status" character varying, "new_thumbnail_url" "text", "mark_generated" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_followers_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_followers_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_followers_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_subscribers_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_subscribers_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_subscribers_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_videos_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_videos_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_videos_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_video_comments_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_video_comments_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_video_comments_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_video_likes_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_video_likes_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_video_likes_count"() TO "service_role";


















GRANT ALL ON TABLE "public"."app_config" TO "anon";
GRANT ALL ON TABLE "public"."app_config" TO "authenticated";
GRANT ALL ON TABLE "public"."app_config" TO "service_role";



GRANT ALL ON TABLE "public"."comment_likes" TO "anon";
GRANT ALL ON TABLE "public"."comment_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."comment_likes" TO "service_role";



GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT ALL ON TABLE "public"."follows" TO "anon";
GRANT ALL ON TABLE "public"."follows" TO "authenticated";
GRANT ALL ON TABLE "public"."follows" TO "service_role";



GRANT ALL ON TABLE "public"."likes" TO "anon";
GRANT ALL ON TABLE "public"."likes" TO "authenticated";
GRANT ALL ON TABLE "public"."likes" TO "service_role";



GRANT ALL ON TABLE "public"."notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."users_with_email" TO "anon";
GRANT ALL ON TABLE "public"."users_with_email" TO "authenticated";
GRANT ALL ON TABLE "public"."users_with_email" TO "service_role";



GRANT ALL ON TABLE "public"."videos" TO "anon";
GRANT ALL ON TABLE "public"."videos" TO "authenticated";
GRANT ALL ON TABLE "public"."videos" TO "service_role";



GRANT ALL ON TABLE "public"."waiting_list" TO "anon";
GRANT ALL ON TABLE "public"."waiting_list" TO "authenticated";
GRANT ALL ON TABLE "public"."waiting_list" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
