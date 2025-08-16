-- =====================================================
-- VIDEO ANALYTICS SYSTEM - DATABASE MIGRATIONS
-- =====================================================
-- Este archivo contiene todas las migraciones necesarias para
-- implementar el sistema completo de analíticas de video.

-- 1. TABLA DE VISTAS DE VIDEO (VIEWS)
-- Almacena cada vista individual con metadatos anónimos
CREATE TABLE IF NOT EXISTS video_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL para vistas anónimas
    viewer_country VARCHAR(2), -- Código ISO del país (ej: ES, US, FR)
    viewer_city VARCHAR(100), -- Ciudad (opcional)
    viewer_ip_hash VARCHAR(64), -- Hash de la IP para deduplicación sin almacenar IP real
    device_type VARCHAR(20) CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'tv')),
    browser VARCHAR(50), -- Safari, Chrome, Firefox, etc.
    platform VARCHAR(20) CHECK (platform IN ('ios', 'android', 'web')),
    referrer_source VARCHAR(50), -- 'search', 'direct', 'social', 'recommendation'
    watch_duration_seconds INTEGER DEFAULT 0, -- Cuánto tiempo vió el video
    video_duration_at_view INTEGER, -- Duración total del video en el momento de la vista
    completion_percentage DECIMAL(5,2) DEFAULT 0.0, -- Porcentaje completado (0.0 - 100.0)
    is_premium_viewer BOOLEAN DEFAULT FALSE, -- Si el viewer tiene suscripción premium
    is_follower BOOLEAN DEFAULT FALSE, -- Si el viewer sigue al creador
    session_id VARCHAR(36), -- ID de sesión para agrupar vistas de la misma sesión
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() -- Para análisis por horas
);

-- Índices para optimizar queries de analíticas
CREATE INDEX idx_video_views_video_id ON video_views(video_id);
CREATE INDEX idx_video_views_created_at ON video_views(created_at);
CREATE INDEX idx_video_views_viewer_country ON video_views(viewer_country);
CREATE INDEX idx_video_views_viewed_at_hour ON video_views(DATE_TRUNC('hour', viewed_at));
CREATE INDEX idx_video_views_video_date ON video_views(video_id, DATE(viewed_at));

-- 2. TABLA DE COMPARTIDOS (SHARES)
-- Rastrea cuando se comparte un video
CREATE TABLE IF NOT EXISTS video_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    sharer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    platform VARCHAR(30) NOT NULL, -- 'whatsapp', 'telegram', 'twitter', 'copy_link', etc.
    sharer_country VARCHAR(2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_video_shares_video_id ON video_shares(video_id);
CREATE INDEX idx_video_shares_platform ON video_shares(platform);

-- 3. TABLA DE MÉTRICAS AGREGADAS POR DÍA
-- Pre-calcula métricas diarias para mejorar performance
CREATE TABLE IF NOT EXISTS video_daily_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    views_count INTEGER DEFAULT 0,
    unique_views_count INTEGER DEFAULT 0, -- Vistas únicas por IP/usuario
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    reports_count INTEGER DEFAULT 0,
    avg_watch_duration DECIMAL(8,2) DEFAULT 0.0,
    avg_completion_percentage DECIMAL(5,2) DEFAULT 0.0,
    premium_views_count INTEGER DEFAULT 0,
    follower_views_count INTEGER DEFAULT 0,
    top_countries JSONB DEFAULT '[]', -- Array de países más activos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(video_id, date)
);

CREATE INDEX idx_video_daily_metrics_video_date ON video_daily_metrics(video_id, date);

-- 4. TABLA DE MÉTRICAS POR HORA
-- Para análisis de horas pico de visualización
CREATE TABLE IF NOT EXISTS video_hourly_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
    views_count INTEGER DEFAULT 0,
    unique_views_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(video_id, date, hour)
);

CREATE INDEX idx_video_hourly_metrics_video_date_hour ON video_hourly_metrics(video_id, date, hour);

-- 5. ACTUALIZAR TABLA DE REPORTES (si no existe)
-- Agregar campos necesarios para analíticas de reportes
DO $$ 
BEGIN
    -- Verificar si la tabla reports existe
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reports') THEN
        -- Agregar columnas si no existen
        ALTER TABLE reports ADD COLUMN IF NOT EXISTS video_id UUID REFERENCES videos(id) ON DELETE CASCADE;
        ALTER TABLE reports ADD COLUMN IF NOT EXISTS reporter_country VARCHAR(2);
        ALTER TABLE reports ADD COLUMN IF NOT EXISTS automated_action VARCHAR(50); -- 'none', 'warning', 'hidden', 'removed'
    ELSE
        -- Crear tabla si no existe
        CREATE TABLE reports (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
            comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
            reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
            reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            reason VARCHAR(50) NOT NULL CHECK (reason IN (
                'inappropriate', 'spam', 'harassment', 'copyright', 'violence', 
                'adult_content', 'hate_speech', 'misinformation', 'other'
            )),
            description TEXT,
            reporter_country VARCHAR(2),
            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
            automated_action VARCHAR(50) DEFAULT 'none',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            resolved_at TIMESTAMP WITH TIME ZONE,
            resolved_by UUID REFERENCES users(id)
        );
        
        CREATE INDEX idx_reports_video_id ON reports(video_id);
        CREATE INDEX idx_reports_status ON reports(status);
    END IF;
END $$;

-- 6. FUNCIÓN PARA ACTUALIZAR MÉTRICAS AGREGADAS
-- Esta función se ejecutará periódicamente para mantener las métricas actualizadas
CREATE OR REPLACE FUNCTION update_video_daily_metrics(target_video_id UUID, target_date DATE)
RETURNS void AS $$
BEGIN
    INSERT INTO video_daily_metrics (
        video_id, date, views_count, unique_views_count, likes_count, 
        comments_count, shares_count, reports_count, avg_watch_duration, 
        avg_completion_percentage, premium_views_count, follower_views_count,
        top_countries
    )
    SELECT 
        target_video_id,
        target_date,
        COUNT(*) as views_count,
        COUNT(DISTINCT COALESCE(viewer_id::text, viewer_ip_hash)) as unique_views_count,
        (SELECT COUNT(*) FROM likes WHERE video_id = target_video_id 
         AND DATE(created_at) = target_date) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE video_id = target_video_id 
         AND DATE(created_at) = target_date) as comments_count,
        (SELECT COUNT(*) FROM video_shares WHERE video_id = target_video_id 
         AND DATE(created_at) = target_date) as shares_count,
        (SELECT COUNT(*) FROM reports WHERE video_id = target_video_id 
         AND DATE(created_at) = target_date) as reports_count,
        COALESCE(AVG(watch_duration_seconds), 0) as avg_watch_duration,
        COALESCE(AVG(completion_percentage), 0) as avg_completion_percentage,
        COUNT(*) FILTER (WHERE is_premium_viewer = true) as premium_views_count,
        COUNT(*) FILTER (WHERE is_follower = true) as follower_views_count,
        (
            SELECT COALESCE(json_agg(json_build_object('country', viewer_country, 'count', count)), '[]'::json)
            FROM (
                SELECT viewer_country, COUNT(*) as count
                FROM video_views 
                WHERE video_id = target_video_id 
                AND DATE(created_at) = target_date 
                AND viewer_country IS NOT NULL
                GROUP BY viewer_country 
                ORDER BY count DESC 
                LIMIT 10
            ) t
        ) as top_countries
    FROM video_views
    WHERE video_id = target_video_id 
    AND DATE(created_at) = target_date
    ON CONFLICT (video_id, date) 
    DO UPDATE SET
        views_count = EXCLUDED.views_count,
        unique_views_count = EXCLUDED.unique_views_count,
        likes_count = EXCLUDED.likes_count,
        comments_count = EXCLUDED.comments_count,
        shares_count = EXCLUDED.shares_count,
        reports_count = EXCLUDED.reports_count,
        avg_watch_duration = EXCLUDED.avg_watch_duration,
        avg_completion_percentage = EXCLUDED.avg_completion_percentage,
        premium_views_count = EXCLUDED.premium_views_count,
        follower_views_count = EXCLUDED.follower_views_count,
        top_countries = EXCLUDED.top_countries,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 7. FUNCIÓN PARA ACTUALIZAR MÉTRICAS POR HORA
CREATE OR REPLACE FUNCTION update_video_hourly_metrics(target_video_id UUID, target_date DATE)
RETURNS void AS $$
BEGIN
    INSERT INTO video_hourly_metrics (video_id, date, hour, views_count, unique_views_count)
    SELECT 
        target_video_id,
        target_date,
        EXTRACT(hour FROM viewed_at) as hour,
        COUNT(*) as views_count,
        COUNT(DISTINCT COALESCE(viewer_id::text, viewer_ip_hash)) as unique_views_count
    FROM video_views
    WHERE video_id = target_video_id 
    AND DATE(viewed_at) = target_date
    GROUP BY EXTRACT(hour FROM viewed_at)
    ON CONFLICT (video_id, date, hour)
    DO UPDATE SET
        views_count = EXCLUDED.views_count,
        unique_views_count = EXCLUDED.unique_views_count,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 8. TRIGGER PARA ACTUALIZAR MÉTRICAS AUTOMÁTICAMENTE
-- Cuando se inserta una nueva vista, actualiza las métricas
CREATE OR REPLACE FUNCTION trigger_update_video_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar métricas diarias
    PERFORM update_video_daily_metrics(NEW.video_id, DATE(NEW.created_at));
    
    -- Actualizar métricas por hora
    PERFORM update_video_hourly_metrics(NEW.video_id, DATE(NEW.viewed_at));
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER video_views_metrics_trigger
    AFTER INSERT ON video_views
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_video_metrics();

-- 9. POLÍTICAS DE SEGURIDAD (RLS)
-- Solo el creador del video puede ver las analíticas detalladas

-- Habilitar RLS en las nuevas tablas
ALTER TABLE video_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_hourly_metrics ENABLE ROW LEVEL SECURITY;

-- Política para vistas: solo el propietario puede ver las analíticas
CREATE POLICY "video_analytics_owner_only" ON video_views
    FOR SELECT USING (
        video_id IN (
            SELECT id FROM videos WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "video_shares_owner_only" ON video_shares
    FOR SELECT USING (
        video_id IN (
            SELECT id FROM videos WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "video_daily_metrics_owner_only" ON video_daily_metrics
    FOR SELECT USING (
        video_id IN (
            SELECT id FROM videos WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "video_hourly_metrics_owner_only" ON video_hourly_metrics
    FOR SELECT USING (
        video_id IN (
            SELECT id FROM videos WHERE user_id = auth.uid()
        )
    );

-- Políticas para insertar vistas (cualquiera puede generar vistas)
CREATE POLICY "anyone_can_create_views" ON video_views
    FOR INSERT WITH CHECK (true);

CREATE POLICY "anyone_can_create_shares" ON video_shares
    FOR INSERT WITH CHECK (true);

-- 10. ÍNDICES ADICIONALES PARA PERFORMANCE
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_video_views_analytics 
ON video_views(video_id, created_at, is_premium_viewer, is_follower);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_video_views_geography 
ON video_views(video_id, viewer_country, viewer_city);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_video_views_engagement 
ON video_views(video_id, completion_percentage, watch_duration_seconds);

-- 11. FUNCIONES DE CONSULTA PARA ANALÍTICAS
-- Función para obtener resumen de analíticas de un video
CREATE OR REPLACE FUNCTION get_video_analytics_summary(target_video_id UUID, days_back INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_views', COALESCE(SUM(vv.views_count), 0),
        'unique_views', COALESCE(SUM(vv.unique_views_count), 0),
        'total_likes', COALESCE((SELECT COUNT(*) FROM likes WHERE video_id = target_video_id), 0),
        'total_comments', COALESCE((SELECT COUNT(*) FROM comments WHERE video_id = target_video_id), 0),
        'total_shares', COALESCE((SELECT COUNT(*) FROM video_shares WHERE video_id = target_video_id), 0),
        'total_reports', COALESCE((SELECT COUNT(*) FROM reports WHERE video_id = target_video_id), 0),
        'avg_watch_duration', COALESCE(AVG(vv.avg_watch_duration), 0),
        'avg_completion_rate', COALESCE(AVG(vv.avg_completion_percentage), 0),
        'premium_viewer_percentage', 
            CASE 
                WHEN SUM(vv.views_count) > 0 THEN 
                    ROUND((SUM(vv.premium_views_count) * 100.0 / SUM(vv.views_count))::numeric, 2)
                ELSE 0 
            END,
        'follower_percentage',
            CASE 
                WHEN SUM(vv.views_count) > 0 THEN 
                    ROUND((SUM(vv.follower_views_count) * 100.0 / SUM(vv.views_count))::numeric, 2)
                ELSE 0 
            END,
        'top_countries', (
            SELECT COALESCE(json_agg(country_data), '[]'::json)
            FROM (
                SELECT json_build_object('country', viewer_country, 'views', COUNT(*)) as country_data
                FROM video_views 
                WHERE video_id = target_video_id 
                AND created_at >= NOW() - INTERVAL '1 day' * days_back
                AND viewer_country IS NOT NULL
                GROUP BY viewer_country 
                ORDER BY COUNT(*) DESC 
                LIMIT 10
            ) countries
        )
    ) INTO result
    FROM video_daily_metrics vv
    WHERE vv.video_id = target_video_id 
    AND vv.date >= CURRENT_DATE - INTERVAL '1 day' * days_back;
    
    RETURN COALESCE(result, '{}'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. FUNCIÓN PARA OBTENER DATOS HOURLY
CREATE OR REPLACE FUNCTION get_video_hourly_views(target_video_id UUID, days_back INTEGER DEFAULT 7)
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT COALESCE(json_agg(
            json_build_object(
                'hour', hour,
                'views', views_count,
                'unique_views', unique_views_count
            ) ORDER BY hour
        ), '[]'::json)
        FROM video_hourly_metrics
        WHERE video_id = target_video_id
        AND date >= CURRENT_DATE - INTERVAL '1 day' * days_back
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios para documentación
COMMENT ON TABLE video_views IS 'Almacena cada vista individual de video con metadatos para analíticas, respetando privacidad';
COMMENT ON TABLE video_shares IS 'Rastrea compartidos de videos por plataforma';
COMMENT ON TABLE video_daily_metrics IS 'Métricas agregadas por día para optimizar consultas de analíticas';
COMMENT ON TABLE video_hourly_metrics IS 'Métricas por hora para análisis de patrones de visualización';
COMMENT ON FUNCTION get_video_analytics_summary IS 'Obtiene resumen completo de analíticas para un video específico';
COMMENT ON FUNCTION get_video_hourly_views IS 'Obtiene patrones de visualización por horas para gráficos temporales';