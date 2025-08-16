-- =====================================================
-- FIX ANALYTICS DATA - MIGRATION
-- =====================================================
-- Esta migración corrige problemas con los datos de analíticas

-- 1. Crear función para sincronizar likes_count en la tabla videos
CREATE OR REPLACE FUNCTION sync_video_likes_count()
RETURNS void AS $$
BEGIN
    UPDATE videos 
    SET likes_count = (
        SELECT COUNT(*) 
        FROM likes 
        WHERE likes.video_id = videos.id
    );
END;
$$ LANGUAGE plpgsql;

-- 2. Crear función para sincronizar comments_count en la tabla videos
CREATE OR REPLACE FUNCTION sync_video_comments_count()
RETURNS void AS $$
BEGIN
    UPDATE videos 
    SET comments_count = (
        SELECT COUNT(*) 
        FROM comments 
        WHERE comments.video_id = videos.id
    );
END;
$$ LANGUAGE plpgsql;

-- 3. Ejecutar sincronización de contadores
SELECT sync_video_likes_count();
SELECT sync_video_comments_count();

-- 4. Crear triggers para mantener los contadores actualizados

-- Trigger para likes
CREATE OR REPLACE FUNCTION update_video_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE videos 
        SET likes_count = likes_count + 1 
        WHERE id = NEW.video_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE videos 
        SET likes_count = GREATEST(likes_count - 1, 0) 
        WHERE id = OLD.video_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS likes_count_trigger ON likes;

-- Crear nuevo trigger para likes
CREATE TRIGGER likes_count_trigger
    AFTER INSERT OR DELETE ON likes
    FOR EACH ROW
    EXECUTE FUNCTION update_video_likes_count();

-- Trigger para comments
CREATE OR REPLACE FUNCTION update_video_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE videos 
        SET comments_count = comments_count + 1 
        WHERE id = NEW.video_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE videos 
        SET comments_count = GREATEST(comments_count - 1, 0) 
        WHERE id = OLD.video_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS comments_count_trigger ON comments;

-- Crear nuevo trigger para comments
CREATE TRIGGER comments_count_trigger
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_video_comments_count();

-- 5. Función para generar datos de prueba de analíticas para un video
CREATE OR REPLACE FUNCTION generate_test_analytics_for_video(target_video_id UUID)
RETURNS void AS $$
DECLARE
    i INTEGER;
    j INTEGER;
    view_date TIMESTAMP;
    hour_val INTEGER;
    countries TEXT[] := ARRAY['ES', 'US', 'FR', 'DE', 'IT', 'BR', 'AR', 'MX'];
    platforms TEXT[] := ARRAY['ios', 'android', 'web'];
    device_types TEXT[] := ARRAY['mobile', 'tablet', 'desktop'];
    random_country TEXT;
    random_platform TEXT;
    random_device TEXT;
    random_duration INTEGER;
    random_completion DECIMAL;
    views_per_hour INTEGER;
BEGIN
    -- Generar vistas para los últimos 7 días
    FOR i IN 0..6 LOOP
        -- Para cada hora del día
        FOR hour_val IN 0..23 LOOP
            -- Calcular vistas por hora (simulando patrones realistas)
            views_per_hour := CASE 
                WHEN hour_val BETWEEN 8 AND 10 THEN 8 + FLOOR(RANDOM() * 12)::INTEGER  -- Mañana: 8-20 vistas
                WHEN hour_val BETWEEN 12 AND 14 THEN 6 + FLOOR(RANDOM() * 10)::INTEGER -- Mediodía: 6-16 vistas
                WHEN hour_val BETWEEN 18 AND 22 THEN 10 + FLOOR(RANDOM() * 15)::INTEGER -- Noche: 10-25 vistas
                WHEN hour_val = 23 OR hour_val BETWEEN 0 AND 6 THEN FLOOR(RANDOM() * 3)::INTEGER -- Madrugada: 0-3 vistas
                ELSE 3 + FLOOR(RANDOM() * 8)::INTEGER -- Resto del día: 3-11 vistas
            END;

            -- Generar las vistas para esta hora
            FOR j IN 1..views_per_hour LOOP
                view_date := NOW() - INTERVAL '1 day' * i + INTERVAL '1 hour' * hour_val + INTERVAL '1 minute' * FLOOR(RANDOM() * 60);
                random_country := countries[1 + FLOOR(RANDOM() * array_length(countries, 1))];
                random_platform := platforms[1 + FLOOR(RANDOM() * array_length(platforms, 1))];
                random_device := device_types[1 + FLOOR(RANDOM() * array_length(device_types, 1))];
                random_duration := 15 + FLOOR(RANDOM() * 200)::INTEGER; -- 15-215 segundos
                random_completion := LEAST((random_duration::DECIMAL / 180) * 100, 100); -- Asumiendo video de 3 minutos

                INSERT INTO video_views (
                    video_id,
                    viewer_country,
                    viewer_city,
                    device_type,
                    browser,
                    platform,
                    referrer_source,
                    watch_duration_seconds,
                    video_duration_at_view,
                    completion_percentage,
                    is_premium_viewer,
                    is_follower,
                    session_id,
                    viewer_ip_hash,
                    created_at,
                    viewed_at
                ) VALUES (
                    target_video_id,
                    random_country,
                    'Test City',
                    random_device,
                    'Safari',
                    random_platform,
                    CASE WHEN RANDOM() > 0.5 THEN 'direct' ELSE 'recommendation' END,
                    random_duration,
                    180, -- 3 minutos
                    random_completion,
                    RANDOM() > 0.8, -- 20% premium
                    RANDOM() > 0.7, -- 30% followers
                    'test-session-' || EXTRACT(EPOCH FROM view_date)::TEXT || '-' || j::TEXT,
                    'hash-' || FLOOR(RANDOM() * 1000000)::TEXT,
                    view_date,
                    view_date
                );
            END LOOP;
        END LOOP;
    END LOOP;

    -- Generar algunos shares
    FOR i IN 1..15 LOOP
        INSERT INTO video_shares (
            video_id,
            platform,
            sharer_country,
            created_at
        ) VALUES (
            target_video_id,
            (ARRAY['whatsapp', 'telegram', 'twitter', 'copy_link', 'instagram'])[1 + FLOOR(RANDOM() * 5)],
            countries[1 + FLOOR(RANDOM() * array_length(countries, 1))],
            NOW() - INTERVAL '1 day' * FLOOR(RANDOM() * 7)
        );
    END LOOP;

    -- Actualizar métricas agregadas para todos los días
    FOR i IN 0..6 LOOP
        PERFORM update_video_daily_metrics(target_video_id, (CURRENT_DATE - INTERVAL '1 day' * i)::DATE);
        PERFORM update_video_hourly_metrics(target_video_id, (CURRENT_DATE - INTERVAL '1 day' * i)::DATE);
    END LOOP;

    RAISE NOTICE 'Generated test analytics data for video %', target_video_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Comentarios informativos
COMMENT ON FUNCTION sync_video_likes_count IS 'Sincroniza el contador de likes en la tabla videos';
COMMENT ON FUNCTION sync_video_comments_count IS 'Sincroniza el contador de comentarios en la tabla videos';
COMMENT ON FUNCTION generate_test_analytics_for_video IS 'Genera datos de prueba de analíticas para un video específico';

-- 7. Crear índices adicionales para mejorar performance
CREATE INDEX IF NOT EXISTS idx_video_views_video_date ON video_views(video_id, viewed_at);
CREATE INDEX IF NOT EXISTS idx_video_views_country_stats ON video_views(video_id, viewer_country, is_premium_viewer, is_follower);

-- Final: Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Analytics fixes applied successfully! Use SELECT generate_test_analytics_for_video(''your-video-id''); to generate test data.';
END $$;