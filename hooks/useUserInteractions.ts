import { useAuth } from '@/hooks/useAuth';
import { SubscriptionService, UserService } from '@/services';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

export const useUserInteractions = () => {
	const { user } = useAuth();
	const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

	const setLoading = useCallback((key: string, loading: boolean) => {
		setLoadingStates(prev => ({ ...prev, [key]: loading }));
	}, []);

	const handleFollow = useCallback(async (targetUserId: string): Promise<boolean> => {
		if (!user || user.id === targetUserId) return false;

		const loadingKey = `follow-${targetUserId}`;
		setLoading(loadingKey, true);

		try {
			const result = await UserService.toggleFollow(targetUserId, user.id);
			
			if (result.success) {
				return result.data?.following || false;
			} else {
				Alert.alert('Error', 'No se pudo procesar la acción');
				return false;
			}
		} catch (error) {
			console.error('Follow error:', error);
			Alert.alert('Error', 'No se pudo procesar la acción');
			return false;
		} finally {
			setLoading(loadingKey, false);
		}
	}, [user, setLoading]);

	const handleSubscribe = useCallback(async (creatorId: string): Promise<boolean> => {
		if (!user || user.id === creatorId) return false;

		const loadingKey = `subscribe-${creatorId}`;
		setLoading(loadingKey, true);

		try {
			const result = await SubscriptionService.createSubscription(creatorId);
			
			if (result.success) {
				Alert.alert(
					'¡Suscripción exitosa!',
					'Ahora tienes acceso a todo el contenido premium de este creador.',
					[{ text: 'Perfecto' }]
				);
				return true;
			} else {
				Alert.alert('Error en el pago', result.error || 'No se pudo procesar la suscripción');
				return false;
			}
		} catch (error) {
			console.error('Subscribe error:', error);
			Alert.alert('Error', 'No se pudo procesar la suscripción');
			return false;
		} finally {
			setLoading(loadingKey, false);
		}
	}, [user, setLoading]);

	const isLoading = useCallback((key: string) => {
		return loadingStates[key] || false;
	}, [loadingStates]);

	return {
		handleFollow,
		handleSubscribe,
		isLoading,
	};
};
