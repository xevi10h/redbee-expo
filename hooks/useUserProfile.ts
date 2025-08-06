import { UserService, VideoService } from '@/services';
import { User, Video } from '@/shared/types';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { Alert } from 'react-native';

export type VideoSortOption = 'created_at' | 'views_count' | 'likes_count';

export const useUserProfile = (userId: string, viewerId?: string) => {
	const [userProfile, setUserProfile] = useState<User | null>(null);
	const [userVideos, setUserVideos] = useState<Video[]>([]);
	const [sortOption, setSortOption] = useState<VideoSortOption>('created_at');
	const [isLoading, setIsLoading] = useState(false);
	const [isLoadingVideos, setIsLoadingVideos] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isFollowing, setIsFollowing] = useState(false);
	const [isSubscribed, setIsSubscribed] = useState(false);
	const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
		{},
	);

	const setSpecificLoading = useCallback((key: string, loading: boolean) => {
		setLoadingStates((prev) => ({ ...prev, [key]: loading }));
	}, []);

	// Sorted videos based on current sort option
	const sortedUserVideos = useMemo(() => {
		const sorted = [...userVideos].sort((a, b) => {
			switch (sortOption) {
				case 'views_count':
					return b.views_count - a.views_count; // Descendente (más visualizaciones primero)
				case 'likes_count':
					return b.likes_count - a.likes_count; // Descendente (más me gusta primero)
				case 'created_at':
				default:
					return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); // Descendente (más recientes primero)
			}
		});
		
		return sorted;
	}, [userVideos, sortOption]);

	// Function to change video sort option
	const setSortOption_ = useCallback((sort: VideoSortOption) => {
		setSortOption(sort);
	}, []);

	// Load user profile
	const loadUserProfile = useCallback(async () => {
		if (!userId) return;

		setIsLoading(true);
		setError(null);

		try {
			const result = await UserService.getUserProfile(userId, viewerId);

			if (result.success && result.data) {
				setUserProfile(result.data);
				setIsFollowing(result.data.is_following || false);
				setIsSubscribed(result.data.is_subscribed || false);
			} else {
				setError(result.error || 'Failed to load user profile');
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Failed to load user profile';
			setError(errorMessage);
			console.error('Error loading user profile:', error);
		} finally {
			setIsLoading(false);
		}
	}, [userId, viewerId]);

	// Load user videos
	const loadUserVideos = useCallback(async () => {
		if (!userId || !userProfile) return;

		setIsLoadingVideos(true);

		try {
			// Usar la función de búsqueda con el user_id como filtro
			const result = await VideoService.searchVideos('', viewerId, 0, 50);

			if (result.success && result.data) {
				// Filtrar solo los videos del usuario actual
				const filteredVideos = result.data.videos.filter(
					(video) => video.user_id === userId,
				);
				setUserVideos(filteredVideos);
			} else {
				console.error('Failed to load user videos:', result.error);
			}
		} catch (error) {
			console.error('Error loading user videos:', error);
		} finally {
			setIsLoadingVideos(false);
		}
	}, [userId, userProfile, viewerId]);

	// Handle follow/unfollow
	const handleFollow = useCallback(async () => {
		if (!userId || !viewerId || userId === viewerId) return;

		const loadingKey = `follow-${userId}`;
		setSpecificLoading(loadingKey, true);

		// Optimistic update
		setIsFollowing((prev) => !prev);
		if (userProfile) {
			setUserProfile((prev) =>
				prev
					? {
							...prev,
							followers_count: isFollowing
								? prev.followers_count - 1
								: prev.followers_count + 1,
					  }
					: prev,
			);
		}

		try {
			const result = await UserService.toggleFollow(userId, viewerId);

			if (result.success) {
				setIsFollowing(result.data?.following || false);
				// Update followers count based on actual result
				if (userProfile) {
					setUserProfile((prev) =>
						prev
							? {
									...prev,
									followers_count: result.data?.following
										? prev.followers_count + (isFollowing ? 0 : 1)
										: prev.followers_count - (isFollowing ? 1 : 0),
							  }
							: prev,
					);
				}
			} else {
				// Revert optimistic update on error
				setIsFollowing((prev) => !prev);
				if (userProfile) {
					setUserProfile((prev) =>
						prev
							? {
									...prev,
									followers_count: isFollowing
										? prev.followers_count + 1
										: prev.followers_count - 1,
							  }
							: prev,
					);
				}
				throw new Error(result.error || 'Failed to toggle follow');
			}
		} catch (error) {
			// Revert optimistic update on error
			setIsFollowing((prev) => !prev);
			if (userProfile) {
				setUserProfile((prev) =>
					prev
						? {
								...prev,
								followers_count: isFollowing
									? prev.followers_count + 1
									: prev.followers_count - 1,
						  }
						: prev,
				);
			}
			console.error('Follow error:', error);
			Alert.alert('Error', 'No se pudo procesar la acción');
		} finally {
			setSpecificLoading(loadingKey, false);
		}
	}, [userId, viewerId, isFollowing, userProfile, setSpecificLoading]);

	// Handle subscribe/unsubscribe
	const handleSubscribe = useCallback(async () => {
		if (!userId || !viewerId || userId === viewerId) return;

		const loadingKey = `subscribe-${userId}`;
		setSpecificLoading(loadingKey, true);

		try {
			// Import SubscriptionService dynamically
			const { SubscriptionService } = await import(
				'@/services/subscriptionService'
			);
			const result = await SubscriptionService.createSubscription(userId);

			if (result.success) {
				setIsSubscribed(true);
				if (userProfile) {
					setUserProfile((prev) =>
						prev
							? {
									...prev,
									subscribers_count: prev.subscribers_count + 1,
							  }
							: prev,
					);
				}
				Alert.alert(
					'¡Suscripción exitosa!',
					'Ahora tienes acceso a todo el contenido premium de este creador.',
					[{ text: 'Perfecto' }],
				);
			} else {
				Alert.alert(
					'Error en el pago',
					result.error || 'No se pudo procesar la suscripción',
				);
			}
		} catch (error) {
			console.error('Subscribe error:', error);
			Alert.alert('Error', 'No se pudo procesar la suscripción');
		} finally {
			setSpecificLoading(loadingKey, false);
		}
	}, [userId, viewerId, userProfile, setSpecificLoading]);

	// Handle block user
	const handleBlock = useCallback(async () => {
		if (!userId || !viewerId || userId === viewerId) return;

		Alert.alert(
			'Bloquear usuario',
			'¿Estás seguro de que quieres bloquear a este usuario? No podrás ver su contenido.',
			[
				{ text: 'Cancelar', style: 'cancel' },
				{
					text: 'Bloquear',
					style: 'destructive',
					onPress: async () => {
						// TODO: Implement block functionality
						Alert.alert(
							'Funcionalidad próximamente',
							'La función de bloquear usuarios estará disponible pronto.',
						);
					},
				},
			],
		);
	}, [userId, viewerId]);

	// Handle report user
	const handleReport = useCallback(
		async (reason: string) => {
			if (!userId || !viewerId || userId === viewerId) return;

			try {
				// TODO: Implement user reporting
				Alert.alert(
					'Reporte enviado',
					'Hemos recibido tu reporte y lo estamos revisando. Gracias por ayudarnos a mantener la comunidad segura.',
				);
			} catch (error) {
				console.error('Report error:', error);
				Alert.alert('Error', 'No se pudo enviar el reporte');
			}
		},
		[userId, viewerId],
	);

	// Handle refresh
	const handleRefresh = useCallback(async () => {
		await Promise.all([loadUserProfile(), loadUserVideos()]);
	}, [loadUserProfile, loadUserVideos]);

	// Update video in user videos list
	const updateUserVideo = useCallback(
		(videoId: string, updates: Partial<Video>) => {
			setUserVideos((prev) =>
				prev.map((video) =>
					video.id === videoId ? { ...video, ...updates } : video,
				),
			);
		},
		[],
	);

	// Remove video from user videos list
	const removeUserVideo = useCallback((videoId: string) => {
		setUserVideos((prev) => prev.filter((video) => video.id !== videoId));
	}, []);

	// Load profile when userId changes
	useEffect(() => {
		if (userId) {
			loadUserProfile();
		}
	}, [userId, loadUserProfile]);

	// Helper to check if specific action is loading
	const isActionLoading = useCallback(
		(action: string) => {
			return loadingStates[`${action}-${userId}`] || false;
		},
		[loadingStates, userId],
	);

	return {
		// State
		userProfile,
		userVideos: sortedUserVideos,
		sortOption,
		isLoading,
		isLoadingVideos,
		error,
		isFollowing,
		isSubscribed,

		// Actions
		handleFollow,
		handleSubscribe,
		handleBlock,
		handleReport,
		handleRefresh,
		loadUserProfile,
		loadUserVideos,
		updateUserVideo,
		removeUserVideo,
		setSortOption: setSortOption_,

		// Loading states
		isFollowLoading: isActionLoading('follow'),
		isSubscribeLoading: isActionLoading('subscribe'),

		// Helpers
		isOwnProfile: viewerId === userId,
		canSubscribe: userProfile?.subscription_price
			? userProfile.subscription_price > 0
			: false,
	};
};
