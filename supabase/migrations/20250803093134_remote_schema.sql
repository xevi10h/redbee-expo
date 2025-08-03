

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
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Automatically creates profile when user signs up';



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


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
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
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'User profiles linked to auth.users';



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
 SELECT "p"."id",
    "p"."username",
    "p"."display_name",
    "p"."bio",
    "p"."avatar_url",
    "p"."subscription_price",
    "p"."subscription_currency",
    "p"."commission_rate",
    "p"."followers_count",
    "p"."subscribers_count",
    "p"."videos_count",
    "p"."created_at",
    "p"."updated_at",
    "u"."email",
    "u"."email_confirmed_at",
    "u"."created_at" AS "auth_created_at",
    "u"."updated_at" AS "auth_updated_at"
   FROM ("public"."profiles" "p"
     JOIN "auth"."users" "u" ON (("p"."id" = "u"."id")));


ALTER VIEW "public"."users_with_email" OWNER TO "postgres";


COMMENT ON VIEW "public"."users_with_email" IS 'Complete user data including email from auth.users';



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
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."videos" OWNER TO "postgres";


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



CREATE INDEX "idx_profiles_created_at" ON "public"."profiles" USING "btree" ("created_at");



CREATE INDEX "idx_profiles_display_name" ON "public"."profiles" USING "btree" ("display_name");



CREATE INDEX "idx_profiles_followers_count" ON "public"."profiles" USING "btree" ("followers_count");



CREATE INDEX "idx_profiles_username" ON "public"."profiles" USING "btree" ("username");



CREATE INDEX "idx_profiles_videos_count" ON "public"."profiles" USING "btree" ("videos_count");



CREATE INDEX "idx_subscriptions_active" ON "public"."subscriptions" USING "btree" ("subscriber_id", "creator_id") WHERE (("status")::"text" = 'active'::"text");



CREATE INDEX "idx_videos_created_at" ON "public"."videos" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_videos_created_at_desc" ON "public"."videos" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_videos_description" ON "public"."videos" USING "btree" ("description");



CREATE INDEX "idx_videos_hashtags" ON "public"."videos" USING "gin" ("hashtags");



CREATE INDEX "idx_videos_hashtags_gin" ON "public"."videos" USING "gin" ("hashtags");



CREATE INDEX "idx_videos_is_premium" ON "public"."videos" USING "btree" ("is_premium");



CREATE INDEX "idx_videos_premium_creator" ON "public"."videos" USING "btree" ("is_premium", "user_id");



CREATE INDEX "idx_videos_title" ON "public"."videos" USING "btree" ("title");



CREATE INDEX "idx_videos_user_id_created_at" ON "public"."videos" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_videos_views_count" ON "public"."videos" USING "btree" ("views_count" DESC);



CREATE OR REPLACE TRIGGER "update_comment_likes_count_trigger" AFTER INSERT OR DELETE ON "public"."comment_likes" FOR EACH ROW EXECUTE FUNCTION "public"."update_comment_likes_count"();



CREATE OR REPLACE TRIGGER "update_comments_updated_at" BEFORE UPDATE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_followers_count_trigger" AFTER INSERT OR DELETE ON "public"."follows" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_followers_count"();



CREATE OR REPLACE TRIGGER "update_user_subscribers_count_trigger" AFTER INSERT OR DELETE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_subscribers_count"();



CREATE OR REPLACE TRIGGER "update_user_videos_count_trigger" AFTER INSERT OR DELETE ON "public"."videos" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_videos_count"();



CREATE OR REPLACE TRIGGER "update_video_comments_count_trigger" AFTER INSERT OR DELETE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_video_comments_count"();



CREATE OR REPLACE TRIGGER "update_video_likes_count_trigger" AFTER INSERT OR DELETE ON "public"."likes" FOR EACH ROW EXECUTE FUNCTION "public"."update_video_likes_count"();



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



CREATE POLICY "Users can view their own reports" ON "public"."reports" FOR SELECT USING (("auth"."uid"() = "reporter_id"));



CREATE POLICY "Users can view their own subscriptions" ON "public"."subscriptions" FOR SELECT USING ((("auth"."uid"() = "subscriber_id") OR ("auth"."uid"() = "creator_id")));



ALTER TABLE "public"."app_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comment_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."follows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."videos" ENABLE ROW LEVEL SECURITY;




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



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_user_email_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_email_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_email_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_video_views"("video_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_video_views"("video_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_video_views"("video_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_video_views_safe"("video_id" "uuid", "viewer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_video_views_safe"("video_id" "uuid", "viewer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_video_views_safe"("video_id" "uuid", "viewer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_users_with_interactions"("search_query" "text", "viewer_id" "uuid", "page_offset" integer, "page_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_users_with_interactions"("search_query" "text", "viewer_id" "uuid", "page_offset" integer, "page_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_users_with_interactions"("search_query" "text", "viewer_id" "uuid", "page_offset" integer, "page_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_videos"("search_query" "text", "viewer_id" "uuid", "page_offset" integer, "page_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_videos"("search_query" "text", "viewer_id" "uuid", "page_offset" integer, "page_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_videos"("search_query" "text", "viewer_id" "uuid", "page_offset" integer, "page_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_videos_with_permissions"("search_query" "text", "viewer_id" "uuid", "page_offset" integer, "page_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_videos_with_permissions"("search_query" "text", "viewer_id" "uuid", "page_offset" integer, "page_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_videos_with_permissions"("search_query" "text", "viewer_id" "uuid", "page_offset" integer, "page_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."toggle_comment_like"("comment_id_param" "uuid", "user_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_comment_like"("comment_id_param" "uuid", "user_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_comment_like"("comment_id_param" "uuid", "user_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_comment_likes_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_comment_likes_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_comment_likes_count"() TO "service_role";



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
