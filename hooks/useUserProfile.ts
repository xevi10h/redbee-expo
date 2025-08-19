import { UserService, VideoService } from '@/services';
import { User, Video } from '@/shared/types';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
	const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);

	const setSpecificLoading = useCallback((key: string, loading: boolean) => {
		setLoadingStates((prev) => ({ ...prev, [key]: loading }));
	}, []);

	// Sorted videos based on current sort option
	const sortedUserVideos = useMemo(() => {
		const sorted = [...userVideos].sort((a, b) => {
			switch (sortOption) {
				case 'views_count':
					return b.views_count - a.views_count;
				case 'likes_count':
					return b.likes_count - a.likes_count;
				case 'created_at':
				default:
					return (
						new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
					);
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
			const result = await VideoService.searchVideos('', viewerId, 0, 50);

			if (result.success && result.data) {
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

	// Handle subscribe button press (opens payment method modal)
	const handleSubscribePress = useCallback(() => {
		if (!userId || !viewerId || userId === viewerId) return;

		if (isSubscribed) {
			// Handle unsubscribe directly
			handleUnsubscribe();
		} else {
			// Open payment method selection modal
			setShowPaymentMethodModal(true);
		}
	}, [userId, viewerId, isSubscribed]);

	// Handle subscription with selected payment method
	const handleSubscribeWithPaymentMethod = useCallback(
		async (paymentMethodId?: string) => {
			if (!userId || !viewerId || userId === viewerId) return;

			const loadingKey = `subscribe-${userId}`;
			setSpecificLoading(loadingKey, true);

			try {
				const { SubscriptionService } = await import(
					'@/services/subscriptionService'
				);

				console.log(
					'Creating subscription with payment method:',
					paymentMethodId,
				);
				const result = await SubscriptionService.createSubscription(
					userId,
					paymentMethodId,
				);

				console.log('Subscription result:', result);

				if (result.success) {
					// Close modal
					setShowPaymentMethodModal(false);

					// Handle different result states
					if (result.data?.processing) {
						Alert.alert(
							'Pago en proceso',
							'Tu pago está siendo procesado. Te notificaremos cuando se complete la suscripción.',
							[{ text: 'Entendido' }],
						);
						// Don't update UI yet, wait for confirmation
						return;
					}

					if (result.data?.pending) {
						Alert.alert(
							'Suscripción pendiente',
							'Tu suscripción está siendo procesada. Esto puede tomar unos momentos.',
							[{ text: 'Entendido' }],
						);
						// Check status after a moment
						setTimeout(() => {
							checkIncompleteSubscriptions();
						}, 5000);
						return;
					}

					if (result.data?.needs_attention) {
						// Debug the subscription to understand what's happening
						console.log('Subscription needs attention, debugging...');
						const debugInfo = await SubscriptionService.debugSubscription(
							result.data.subscription_id,
						);
						console.log('Debug info:', debugInfo);

						Alert.alert(
							'Revisar suscripción',
							'La suscripción necesita atención. Por favor contacta soporte si el problema persiste.',
							[{ text: 'Entendido' }],
						);
						return;
					}

					// Normal successful subscription
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
					console.error('Subscription failed:', result.error);

					// If we have a subscription_id but it failed, debug it
					if (result.data?.subscription_id) {
						console.log('Debugging failed subscription...');
						const debugInfo = await SubscriptionService.debugSubscription(
							result.data.subscription_id,
						);
						console.log('Failed subscription debug info:', debugInfo);
					}

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
		},
		[userId, viewerId, userProfile, setSpecificLoading],
	);

	// Handle unsubscribe
	const handleUnsubscribe = useCallback(async () => {
		if (!userId || !viewerId || userId === viewerId) return;

		Alert.alert(
			'Cancelar suscripción',
			'¿Estás seguro de que quieres cancelar tu suscripción? Mantendrás acceso hasta el final del período actual.',
			[
				{ text: 'No, mantener', style: 'cancel' },
				{
					text: 'Sí, cancelar',
					style: 'destructive',
					onPress: async () => {
						const loadingKey = `subscribe-${userId}`;
						setSpecificLoading(loadingKey, true);

						try {
							const { SubscriptionService } = await import(
								'@/services/subscriptionService'
							);

							// Get user's subscription to this creator
							const { data: subscriptions } =
								await SubscriptionService.getAllUserSubscriptions(viewerId);

							if (!subscriptions) {
								throw new Error('No subscriptions found');
							}

							const subscription = subscriptions.find(
								(sub) => sub.creator_id === userId && sub.status === 'active',
							);

							if (subscription?.stripe_subscription_id) {
								const result = await SubscriptionService.cancelSubscription(
									subscription.stripe_subscription_id,
								);

								if (result.success) {
									// Update UI
									setIsSubscribed(false);
									if (userProfile) {
										setUserProfile((prev) =>
											prev
												? {
														...prev,
														subscribers_count: Math.max(
															0,
															prev.subscribers_count - 1,
														),
												  }
												: prev,
										);
									}

									Alert.alert(
										'Suscripción cancelada',
										'Tu suscripción ha sido cancelada. Mantendrás acceso hasta el final del período actual.',
										[{ text: 'Entendido' }],
									);
								} else {
									throw new Error(result.error);
								}
							}
						} catch (error) {
							console.error('Unsubscribe error:', error);
							Alert.alert('Error', 'No se pudo cancelar la suscripción');
						} finally {
							setSpecificLoading(loadingKey, false);
						}
					},
				},
			],
		);
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

	// Check for incomplete subscriptions manually
	const checkIncompleteSubscriptions = useCallback(async () => {
		if (!userId || !viewerId) return false;

		try {
			const { SubscriptionService } = await import(
				'@/services/subscriptionService'
			);

			const { data: subscriptions } =
				await SubscriptionService.getAllUserSubscriptions(viewerId);

			if (subscriptions) {
				const incompleteSubscription = subscriptions.find(
					(sub) => sub.creator_id === userId && sub.status === 'incomplete',
				);

				// if (incompleteSubscription?.stripe_subscription_id) {
				// 	console.log('Found incomplete subscription, refreshing status...');
				// 	const refreshResult =
				// 		await SubscriptionService.refreshSubscriptionStatus(
				// 			incompleteSubscription.stripe_subscription_id,
				// 		);

				// 	if (refreshResult.success) {
				// 		await loadUserProfile();
				// 		return true;
				// 	}
				// }
			}
			return false;
		} catch (error) {
			console.error('Error checking incomplete subscriptions:', error);
			return false;
		}
	}, [userId, viewerId, loadUserProfile]);

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
		showPaymentMethodModal,

		// Actions
		handleFollow,
		handleSubscribePress,
		handleSubscribeWithPaymentMethod,
		handleBlock,
		handleReport,
		handleRefresh,
		loadUserProfile,
		loadUserVideos,
		updateUserVideo,
		removeUserVideo,
		setSortOption: setSortOption_,
		checkIncompleteSubscriptions,
		setShowPaymentMethodModal,

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
