import { useAuth } from '@/hooks/useAuth';
import { VideoService } from '@/services/videoService';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

export const useVideoInteractions = () => {
	const { user } = useAuth();
	const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

	const setLoading = useCallback((key: string, loading: boolean) => {
		setLoadingStates(prev => ({ ...prev, [key]: loading }));
	}, []);

	const handleLike = useCallback(async (videoId: string): Promise<boolean> => {
		if (!user) return false;

		const loadingKey = `like-${videoId}`;
		setLoading(loadingKey, true);

		try {
			const result = await VideoService.toggleLike(videoId, user.id);
			
			if (result.success) {
				return result.data?.liked || false;
			} else {
				Alert.alert('Error', 'No se pudo procesar el like');
				return false;
			}
		} catch (error) {
			console.error('Like error:', error);
			Alert.alert('Error', 'No se pudo procesar el like');
			return false;
		} finally {
			setLoading(loadingKey, false);
		}
	}, [user, setLoading]);

	const handleReport = useCallback(async (videoId: string, reason: string): Promise<boolean> => {
		if (!user) return false;

		const loadingKey = `report-${videoId}`;
		setLoading(loadingKey, true);

		try {
			const result = await VideoService.reportVideo(videoId, user.id, reason);
			
			if (result.success) {
				Alert.alert(
					'Reporte enviado',
					'Hemos recibido tu reporte y lo estamos revisando.'
				);
				return true;
			} else {
				Alert.alert('Error', 'No se pudo enviar el reporte');
				return false;
			}
		} catch (error) {
			console.error('Report error:', error);
			Alert.alert('Error', 'No se pudo enviar el reporte');
			return false;
		} finally {
			setLoading(loadingKey, false);
		}
	}, [user, setLoading]);

	const handleView = useCallback(async (videoId: string) => {
		// Increment view count in background (non-blocking)
		VideoService.incrementViewCount(videoId);
	}, []);

	const isLoading = useCallback((key: string) => {
		return loadingStates[key] || false;
	}, [loadingStates]);

	return {
		handleLike,
		handleReport,
		handleView,
		isLoading,
	};
};