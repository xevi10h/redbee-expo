# 📊 Guía del Sistema de Analíticas de Video

## Resumen

El sistema de analíticas de video proporciona a los creadores de contenido información detallada sobre el rendimiento de sus videos, respetando la privacidad de los usuarios.

## 🎯 Funcionalidades Principales

### Métricas Básicas
- **Vistas Totales y Únicas**: Número total de reproducciones y vistas únicas por IP/usuario
- **Likes y Comentarios**: Interacciones directas con el contenido
- **Compartidos**: Número de veces que se ha compartido el video
- **Reportes**: Número y tipos de reportes recibidos

### Análisis de Audiencia
- **Porcentaje de Seguidores**: Qué porcentaje de las vistas proviene de seguidores
- **Suscriptores Premium**: Porcentaje de vistas de usuarios con suscripción premium
- **Duración Media de Visualización**: Tiempo promedio que los usuarios ven el video
- **Tasa de Finalización**: Porcentaje promedio completado del video

### Análisis Geográfico
- **Top Países**: Los 10 países con más visualizaciones
- **Distribución Global**: Mapa de calor de visualizaciones por región

### Análisis Temporal
- **Patrones por Horas**: Gráfico de barras mostrando las horas pico de visualización (últimos 7 días)
- **Métricas Diarias**: Evolución de métricas día por día (últimos 30 días)

### Interacciones Detalladas
- **Likes Recientes**: Lista de usuarios que han dado like con función de búsqueda
- **Comentarios Recientes**: Lista de comentarios con información del usuario
- **Búsqueda por Usuario**: Capacidad de buscar likes y comentarios por nombre de usuario

### Análisis de Moderación
- **Reportes por Categoría**: Desglose de reportes por tipo (spam, contenido inapropiado, etc.)
- **Acciones Automáticas**: Información sobre acciones de moderación tomadas

## 🔍 Cómo Acceder a las Analíticas

### Desde el VideoPlayer
1. **Para Videos Propios**: Cuando reproduces tu propio video, verás un ícono de gráfico de barras (📊) en la esquina superior derecha
2. **Toca el Ícono**: Se abrirá el panel completo de analíticas en modal de pantalla completa

### Desde el Perfil
1. **Mantén Pulsado**: En tu perfil, mantén pulsado cualquier video tuyo
2. **Selecciona "📊 Ver analíticas"**: Aparecerá en el menú contextual junto a las opciones de ocultar y eliminar
3. **Panel Completo**: Se abre el mismo panel de analíticas detalladas

## 🔒 Privacidad y Seguridad

### Datos Anónimos para Vistas
- **No se almacenan IPs reales**: Solo hashes para deduplicación
- **Datos geográficos limitados**: Solo país y ciudad (opcional)
- **Sin información personal**: Las vistas anónimas no contienen datos identificables

### Datos Identificables Solo para Interacciones
- **Likes y Comentarios**: Se puede ver qué usuario específico interactuó
- **Búsqueda Permitida**: Los creadores pueden buscar por nombre de usuario
- **Solo el Propietario**: Solo el creador del video puede ver estas analíticas

### Políticas de Acceso (RLS)
- **Verificación Automática**: El sistema verifica automáticamente que seas el propietario
- **Sin Bypass**: No hay forma de ver analíticas de videos de otros usuarios
- **Base de Datos Segura**: Implementado con Row Level Security en Supabase

## 🛠️ Implementación Técnica

### Base de Datos
- **`video_views`**: Cada vista individual con metadatos anónimos
- **`video_shares`**: Registro de compartidos por plataforma
- **`video_daily_metrics`**: Métricas agregadas por día (optimización)
- **`video_hourly_metrics`**: Datos por hora para análisis temporal

### Funciones SQL
- **`get_video_analytics_summary`**: Resumen completo de métricas
- **`get_video_hourly_views`**: Datos para gráficos temporales
- **Triggers Automáticos**: Actualizan métricas en tiempo real

### Componentes React
- **`VideoAnalyticsPanel`**: Panel principal con toda la información
- **`VideoAnalyticsModal`**: Modal wrapper para pantalla completa
- **Componentes Especializados**: Gráficos, métricas, listas de interacciones

## 🚀 Casos de Uso

### Para Creadores de Contenido
- **Optimizar Horarios**: Publicar cuando tu audiencia está más activa
- **Analizar Alcance**: Ver qué contenido resuena en diferentes países
- **Mejorar Engagement**: Entender qué genera más interacciones
- **Gestionar Comunidad**: Ver quién interactúa más con tu contenido

### Para Moderación
- **Detectar Problemas**: Identificar videos con muchos reportes
- **Análisis de Patrones**: Ver tipos de reportes más comunes
- **Acciones Preventivas**: Entender qué contenido genera controversia

## 📈 Métricas Explicadas

### Tasa de Finalización
- **Cálculo**: (Tiempo visto / Duración total) * 100
- **Bueno**: >50% para videos largos, >70% para videos cortos
- **Excelente**: >80% en cualquier duración

### Vistas Únicas vs Totales
- **Únicas**: Una por IP/usuario en 24 horas
- **Totales**: Cada reproducción cuenta
- **Ratio Alto**: Indica contenido que la gente re-ve

### Engagement Rate
- **Fórmula**: (Likes + Comentarios) / Vistas * 100
- **Promedio**: 2-5% es bueno
- **Viral**: >10% indica contenido muy atractivo

## 🔧 Mantenimiento

### Actualizaciones Automáticas
- **Métricas en Tiempo Real**: Se actualizan cada vista
- **Agregaciones Nocturnas**: Datos diarios se consolidan automáticamente
- **Limpieza de Datos**: Se mantiene solo lo necesario para las analíticas

### Rendimiento Optimizado
- **Índices de Base de Datos**: Optimizados para consultas rápidas
- **Caché de Métricas**: Datos agregados para evitar cálculos pesados
- **Paginación**: Las listas de interacciones se cargan por páginas

---

*Sistema desarrollado con React Native, TypeScript, Supabase y Expo. Cumple con GDPR y mejores prácticas de privacidad.*