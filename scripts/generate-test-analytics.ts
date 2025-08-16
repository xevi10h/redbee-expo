/**
 * Script para generar datos de prueba para analíticas
 * Ejecutar desde la consola del navegador en Supabase o crear una función temporal
 */

import { AnalyticsService } from '@/services/analyticsService';

export const generateTestAnalytics = async (videoId: string, userId: string) => {
	console.log('Generating test analytics for video:', videoId);

	// Generar vistas de prueba para los últimos 7 días
	const now = new Date();
	const viewsToGenerate = [
		// Día 1 (hoy)
		{ day: 0, hourlyViews: [2, 1, 0, 1, 3, 5, 8, 12, 15, 20, 18, 16, 14, 12, 10, 8, 6, 4, 3, 2, 1, 1, 0, 1] },
		// Día 2
		{ day: 1, hourlyViews: [1, 0, 0, 2, 4, 6, 10, 14, 18, 22, 20, 18, 16, 14, 12, 10, 8, 5, 3, 2, 1, 0, 0, 1] },
		// Día 3
		{ day: 2, hourlyViews: [0, 1, 0, 1, 2, 4, 7, 11, 16, 19, 17, 15, 13, 11, 9, 7, 5, 3, 2, 1, 1, 0, 0, 0] },
		// Día 4
		{ day: 3, hourlyViews: [1, 0, 1, 2, 3, 5, 9, 13, 17, 21, 19, 17, 15, 13, 11, 9, 7, 4, 3, 2, 1, 1, 0, 1] },
		// Día 5
		{ day: 4, hourlyViews: [0, 0, 0, 1, 2, 3, 6, 10, 14, 18, 16, 14, 12, 10, 8, 6, 4, 3, 2, 1, 0, 0, 0, 0] },
		// Día 6
		{ day: 5, hourlyViews: [1, 1, 0, 1, 3, 4, 8, 12, 16, 20, 18, 16, 14, 12, 10, 8, 6, 4, 2, 1, 1, 0, 1, 0] },
		// Día 7
		{ day: 6, hourlyViews: [0, 0, 1, 2, 4, 6, 10, 14, 18, 22, 20, 18, 16, 14, 12, 10, 8, 5, 3, 2, 1, 0, 0, 1] },
	];

	const countries = ['ES', 'US', 'FR', 'DE', 'IT', 'BR', 'AR', 'MX'];
	const platforms: ('ios' | 'android' | 'web')[] = ['ios', 'android', 'web'];
	const deviceTypes = ['mobile', 'tablet', 'desktop'];

	let totalViewsGenerated = 0;

	for (const dayData of viewsToGenerate) {
		const dayDate = new Date(now);
		dayDate.setDate(dayDate.getDate() - dayData.day);

		for (let hour = 0; hour < 24; hour++) {
			const viewsInHour = dayData.hourlyViews[hour];

			for (let view = 0; view < viewsInHour; view++) {
				const viewDate = new Date(dayDate);
				viewDate.setHours(hour, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));

				// Generar datos aleatorios pero realistas
				const watchDuration = Math.floor(Math.random() * 300) + 10; // 10-310 segundos
				const videoDuration = 180; // 3 minutos
				const completionPercentage = Math.min((watchDuration / videoDuration) * 100, 100);

				const viewData = {
					viewer_id: Math.random() > 0.3 ? userId : null, // 70% vistas autenticadas
					viewer_country: countries[Math.floor(Math.random() * countries.length)],
					viewer_city: 'Test City',
					device_type: deviceTypes[Math.floor(Math.random() * deviceTypes.length)],
					browser: 'Safari',
					platform: platforms[Math.floor(Math.random() * platforms.length)],
					referrer_source: Math.random() > 0.5 ? 'direct' : 'recommendation',
					watch_duration_seconds: watchDuration,
					video_duration_at_view: videoDuration,
					completion_percentage: Math.round(completionPercentage * 100) / 100,
					is_premium_viewer: Math.random() > 0.8, // 20% premium
					is_follower: Math.random() > 0.7, // 30% followers
					session_id: `test-session-${Date.now()}-${Math.random()}`,
					viewer_ip_hash: `hash-${Math.floor(Math.random() * 1000000)}`,
					viewed_at: viewDate.toISOString(),
				};

				try {
					await AnalyticsService.trackVideoView(videoId, viewData);
					totalViewsGenerated++;
				} catch (error) {
					console.error('Error generating view:', error);
				}

				// Pequeña pausa para no sobrecargar
				if (totalViewsGenerated % 10 === 0) {
					await new Promise(resolve => setTimeout(resolve, 100));
				}
			}
		}
	}

	console.log(`Generated ${totalViewsGenerated} test views for video ${videoId}`);

	// Generar algunos shares de prueba
	for (let i = 0; i < 15; i++) {
		const shareDate = new Date(now);
		shareDate.setDate(shareDate.getDate() - Math.floor(Math.random() * 7));

		const platforms = ['whatsapp', 'telegram', 'twitter', 'copy_link', 'instagram'];
		const platform = platforms[Math.floor(Math.random() * platforms.length)];

		try {
			await AnalyticsService.trackVideoShare(videoId, platform, userId);
		} catch (error) {
			console.error('Error generating share:', error);
		}
	}

	console.log('Generated test shares');

	// Actualizar métricas para todos los días
	for (let day = 0; day < 7; day++) {
		const targetDate = new Date(now);
		targetDate.setDate(targetDate.getDate() - day);
		const dateString = targetDate.toISOString().split('T')[0];

		try {
			await AnalyticsService.updateVideoMetrics(videoId, dateString);
		} catch (error) {
			console.error('Error updating metrics for', dateString, error);
		}
	}

	console.log('Analytics test data generation completed!');
};

// Función para ejecutar desde la consola
export const runTestDataGeneration = async () => {
	// Reemplazar con IDs reales
	const TEST_VIDEO_ID = 'your-video-id-here';
	const TEST_USER_ID = 'your-user-id-here';

	await generateTestAnalytics(TEST_VIDEO_ID, TEST_USER_ID);
};