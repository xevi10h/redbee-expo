import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
	Alert,
	Dimensions,
	FlatList,
	RefreshControl,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import VideoPlayer from '@/components/VideoPlayer';
import { Colors } from '@/constants/Colors';
import { useRequireAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { VideoService } from '@/services';
import { Comment, FeedType, Video } from '@/shared/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function HomeScreen() {
	const { t } = useTranslation();
	const { user } = useRequireAuth();

	// State management
	const [videos, setVideos] = useState<Video[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [currentTab, setCurrentTab] = useState<FeedType>('forYou');
	const [activeVideoIndex, setActiveVideoIndex] = useState(0);
	const [hasMore, setHasMore] = useState(true);
	const [page, setPage] = useState(0);
	const [error, setError] = useState<string | null>(null);

	// Refs
	const flatListRef = useRef<FlatList>(null);

	// Enhanced mock data generator
	const generateMockVideos = useCallback((): Video[] => {
		const baseTimestamp = Date.now();
		const feedPrefix = currentTab;

		return [
			{
				id: `${feedPrefix}-${baseTimestamp}-1`,
				user_id: '1',
				user: {
					id: '1',
					username: 'naturelover',
					display_name: 'Nature Lover',
					avatar_url:
						'https://images.pexels.com/photos/1072179/pexels-photo-1072179.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
					subscription_price: 4.99,
				},
				title: 'Incredible sunset timelapse 🌅',
				description:
					'Captured this amazing sunset from my rooftop. The colors were absolutely stunning! Watch till the end for the best part! #nature #sunset #timelapse #photography #peaceful',
				hashtags: ['nature', 'sunset', 'timelapse', 'photography', 'peaceful'],
				video_url:
					'https://videos.pexels.com/video-files/32158974/13712189_1080_1920_24fps.mp4',
				thumbnail_url:
					'https://images.pexels.com/videos/4434255/pexels-photo-4434255.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
				duration: 45,
				is_premium: false,
				likes_count: 1250,
				comments_count: 89,
				views_count: 15600,
				created_at: new Date(baseTimestamp - 2 * 60 * 60 * 1000).toISOString(),
				is_liked: false,
				is_following: false,
				is_subscribed: false,
			},
			{
				id: `${feedPrefix}-${baseTimestamp}-2`,
				user_id: '2',
				user: {
					id: '2',
					username: 'city_explorer',
					display_name: 'City Explorer',
					avatar_url:
						'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
					subscription_price: 9.99,
				},
				title: '🔥 EXCLUSIVE: Behind the scenes content',
				description:
					'Get an exclusive look at my creative process! This premium content shows you exactly how I create my viral videos. Subscribe for more exclusive tutorials and insider tips! #premium #tutorial #bts #exclusive',
				hashtags: ['premium', 'exclusive', 'tutorial', 'bts', 'creative'],
				video_url:
					'https://videos.pexels.com/video-files/32892276/14018057_1080_1920_25fps.mp4',
				thumbnail_url:
					'https://images.pexels.com/videos/3209828/pexels-photo-3209828.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
				duration: 120,
				is_premium: true,
				likes_count: 890,
				comments_count: 45,
				views_count: 5200,
				created_at: new Date(baseTimestamp - 5 * 60 * 60 * 1000).toISOString(),
				is_liked: false,
				is_following: true,
				is_subscribed: false,
			},
			{
				id: `${feedPrefix}-${baseTimestamp}-3`,
				user_id: '3',
				user: {
					id: '3',
					username: 'tech_guru',
					display_name: 'Tech Guru',
					avatar_url: undefined,
					subscription_price: 0,
				},
				title: 'Mind-blowing tech hack! 🤯',
				description:
					"This simple trick will change how you use your phone forever. Can't believe more people don't know about this! Try it and let me know if it works for you! #tech #hack #productivity #lifehack #smartphone",
				hashtags: ['tech', 'hack', 'productivity', 'lifehack', 'smartphone'],
				video_url:
					'https://videos.pexels.com/video-files/33092997/14106170_1440_2560_60fps.mp4',
				thumbnail_url:
					'https://images.pexels.com/videos/2795405/pexels-photo-2795405.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
				duration: 30,
				is_premium: false,
				likes_count: 2340,
				comments_count: 156,
				views_count: 28900,
				created_at: new Date(
					baseTimestamp - 1 * 24 * 60 * 60 * 1000,
				).toISOString(),
				is_liked: true,
				is_following: false,
				is_subscribed: false,
			},
			{
				id: `${feedPrefix}-${baseTimestamp}-4`,
				user_id: '4',
				user: {
					id: '4',
					username: 'food_artist',
					display_name: 'Culinary Artist',
					avatar_url: undefined,
					subscription_price: 7.99,
				},
				title: 'Premium cooking masterclass 👨‍🍳',
				description:
					'Learn my secret techniques for creating restaurant-quality dishes at home. This premium series covers advanced knife skills, flavor pairing, and presentation secrets that took me years to master. Perfect for aspiring chefs!',
				hashtags: ['cooking', 'premium', 'masterclass', 'chef', 'culinary'],
				video_url:
					'https://videos.pexels.com/video-files/26224653/11940597_1440_2560_25fps.mp4',
				thumbnail_url:
					'https://images.pexels.com/videos/3191624/pexels-photo-3191624.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
				duration: 180,
				is_premium: true,
				likes_count: 567,
				comments_count: 78,
				views_count: 3400,
				created_at: new Date(
					baseTimestamp - 3 * 24 * 60 * 60 * 1000,
				).toISOString(),
				is_liked: false,
				is_following: false,
				is_subscribed: false,
			},
			{
				id: `${feedPrefix}-${baseTimestamp}-5`,
				user_id: '5',
				user: {
					id: '5',
					username: 'fitness_coach',
					display_name: 'Fitness Coach Pro',
					avatar_url: undefined,
					subscription_price: 12.99,
				},
				title: 'Transform your body in 30 days! 💪',
				description:
					'My personal transformation program that helped thousands achieve their dream body. Get access to my complete workout plans, nutrition guides, and personal coaching! #fitness #transformation #workout #health #motivation',
				hashtags: [
					'fitness',
					'transformation',
					'workout',
					'health',
					'motivation',
				],
				video_url:
					'https://videos.pexels.com/video-files/4434255/4434255-hd_720_1366_25fps.mp4',
				thumbnail_url:
					'https://images.pexels.com/videos/4752861/pexels-photo-4752861.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
				duration: 60,
				is_premium: true,
				likes_count: 3200,
				comments_count: 245,
				views_count: 45600,
				created_at: new Date(baseTimestamp - 6 * 60 * 60 * 1000).toISOString(),
				is_liked: false,
				is_following: true,
				is_subscribed: true,
			},
		];
	}, [currentTab]);

	// Load videos function
	const loadVideos = useCallback(
		async (refresh = false) => {
			if (refresh) {
				setIsRefreshing(true);
				setPage(0);
				setError(null);
			} else {
				if (!hasMore) return;
				setIsLoading(true);
			}

			try {
				// TODO: Replace with real API call
				// const result = await VideoService.getVideosFeed({
				//   feed_type: currentTab,
				//   page: refresh ? 0 : page,
				//   limit: 5,
				//   user_id: user?.id,
				// });

				// Simulate API delay
				await new Promise((resolve) => setTimeout(resolve, 1000));

				const newVideos = generateMockVideos();

				if (refresh) {
					setVideos(newVideos);
					setPage(1);
					setActiveVideoIndex(0);
				} else {
					setVideos((prev) => [...prev, ...newVideos]);
					setPage((prev) => prev + 1);
				}

				// Simulate end of pagination after 3 pages
				if (page >= 2) {
					setHasMore(false);
				} else {
					setHasMore(true);
				}

				setError(null);
			} catch (error) {
				console.error('Error loading videos:', error);
				const errorMessage =
					error instanceof Error ? error.message : 'Failed to load videos';
				setError(errorMessage);

				if (!refresh) {
					Alert.alert(t('common.error'), errorMessage, [
						{ text: t('common.ok') },
					]);
				}
			} finally {
				setIsLoading(false);
				setIsRefreshing(false);
			}
		},
		[currentTab, page, hasMore, generateMockVideos, t],
	);

	// Handle viewable items change for video playback
	const onViewableItemsChanged = useCallback(
		({ viewableItems }: { viewableItems: ViewToken[] }) => {
			if (viewableItems.length > 0) {
				const activeItem = viewableItems.find(
					(item) => item.isViewable && item.index !== null,
				);
				if (activeItem && activeItem.index !== null) {
					setActiveVideoIndex(activeItem.index);

					// Track video view
					const video = videos[activeItem.index];
					if (video) {
						VideoService.incrementViewCount(video.id);
					}
				}
			}
		},
		[videos],
	);

	const viewabilityConfig = {
		itemVisiblePercentThreshold: 50,
		minimumViewTime: 500,
	};

	// Video interaction handlers with optimistic updates
	const handleVideoLike = useCallback(
		async (videoId: string) => {
			if (!user) return;

			// Optimistic update
			setVideos((prev) =>
				prev.map((video) => {
					if (video.id === videoId) {
						return {
							...video,
							is_liked: !video.is_liked,
							likes_count: video.is_liked
								? video.likes_count - 1
								: video.likes_count + 1,
						};
					}
					return video;
				}),
			);

			try {
				// TODO: Implement real API call
				// await VideoService.toggleLike(videoId, user.id);
				console.log('Video liked:', videoId);
			} catch (error) {
				// Revert optimistic update on error
				setVideos((prev) =>
					prev.map((video) => {
						if (video.id === videoId) {
							return {
								...video,
								is_liked: !video.is_liked,
								likes_count: video.is_liked
									? video.likes_count + 1
									: video.likes_count - 1,
							};
						}
						return video;
					}),
				);
				console.error('Like error:', error);
			}
		},
		[user],
	);

	const handleVideoComment = useCallback((videoId: string) => {
		console.log('Open comments for video:', videoId);
		// Comments modal is handled within VideoPlayer component
	}, []);

	const handleUserFollow = useCallback(
		async (userId: string) => {
			if (!user || user.id === userId) return;

			// Optimistic update
			setVideos((prev) =>
				prev.map((video) => {
					if (video.user?.id === userId) {
						return {
							...video,
							is_following: !video.is_following,
						};
					}
					return video;
				}),
			);

			try {
				// TODO: Implement real API call
				// await UserService.toggleFollow(userId, user.id);
				console.log('User followed:', userId);
			} catch (error) {
				// Revert optimistic update on error
				setVideos((prev) =>
					prev.map((video) => {
						if (video.user?.id === userId) {
							return {
								...video,
								is_following: !video.is_following,
							};
						}
						return video;
					}),
				);
				console.error('Follow error:', error);
			}
		},
		[user],
	);

	const handleUserSubscribe = useCallback(
		async (userId: string) => {
			if (!user || user.id === userId) return;

			try {
				// TODO: Implement Stripe subscription flow
				// const result = await SubscriptionService.createSubscription(userId);

				// For now, show placeholder alert
				Alert.alert(
					'Suscripción',
					'¡Funcionalidad de suscripción próximamente! Se implementará con Stripe para pagos seguros.',
					[
						{ text: 'Entendido' },
						{
							text: 'Simular suscripción',
							onPress: () => {
								// Simulate successful subscription
								setVideos((prev) =>
									prev.map((video) => {
										if (video.user?.id === userId) {
											return {
												...video,
												is_subscribed: true,
											};
										}
										return video;
									}),
								);
								Alert.alert(
									'¡Suscripción exitosa!',
									'Ahora tienes acceso a todo el contenido premium de este creador.',
									[{ text: 'Perfecto' }],
								);
							},
						},
					],
				);
			} catch (error) {
				console.error('Subscribe error:', error);
				Alert.alert('Error', 'No se pudo procesar la suscripción');
			}
		},
		[user],
	);

	const handleVideoReport = useCallback(
		async (videoId: string) => {
			if (!user) return;

			try {
				// TODO: Implement real API call
				// await VideoService.reportVideo(videoId, user.id, reason);

				Alert.alert(
					'Reporte enviado',
					'Hemos recibido tu reporte y lo estamos revisando. Te notificaremos cuando tengamos una resolución.',
					[{ text: 'OK' }],
				);
				console.log('Video reported:', videoId);
			} catch (error) {
				console.error('Report error:', error);
				Alert.alert('Error', 'No se pudo enviar el reporte');
			}
		},
		[user],
	);

	const handleUserPress = useCallback((userId: string) => {
		console.log('Navigate to user profile:', userId);
		// TODO: Navigate to user profile screen
		// router.push(`/profile/${userId}`);
	}, []);

	const handleCommentAdded = useCallback(
		(videoId: string, comment: Comment) => {
			setVideos((prev) =>
				prev.map((video) => {
					if (video.id === videoId) {
						return {
							...video,
							comments_count: video.comments_count + 1,
						};
					}
					return video;
				}),
			);
		},
		[],
	);

	// Load more videos
	const handleLoadMore = useCallback(() => {
		if (!isLoading && !isRefreshing && hasMore) {
			loadVideos(false);
		}
	}, [isLoading, isRefreshing, hasMore, loadVideos]);

	// Refresh videos
	const handleRefresh = useCallback(() => {
		if (!isRefreshing && !isLoading) {
			setHasMore(true);
			loadVideos(true);
		}
	}, [isRefreshing, isLoading, loadVideos]);

	// Handle tab change
	const handleTabChange = useCallback(
		(newTab: FeedType) => {
			if (newTab !== currentTab) {
				setCurrentTab(newTab);
				setVideos([]);
				setPage(0);
				setHasMore(true);
				setActiveVideoIndex(0);
				setError(null);
			}
		},
		[currentTab],
	);

	// Load videos when component mounts or tab changes
	useEffect(() => {
		if (user) {
			loadVideos(true);
		}
	}, [user, currentTab]);

	// Render individual video item
	const renderVideoItem = useCallback(
		({ item, index }: { item: Video; index: number }) => {
			const isActive = index === activeVideoIndex;

			return (
				<View style={styles.videoItem}>
					<VideoPlayer
						video={item}
						isActive={isActive}
						currentUser={user!}
						onLike={() => handleVideoLike(item.id)}
						onComment={() => handleVideoComment(item.id)}
						onFollow={() => item.user?.id && handleUserFollow(item.user.id)}
						onSubscribe={() =>
							item.user?.id && handleUserSubscribe(item.user.id)
						}
						onReport={() => handleVideoReport(item.id)}
						onUserPress={() => item.user?.id && handleUserPress(item.user.id)}
					/>
				</View>
			);
		},
		[
			activeVideoIndex,
			user,
			handleVideoLike,
			handleVideoComment,
			handleUserFollow,
			handleUserSubscribe,
			handleVideoReport,
			handleUserPress,
		],
	);

	// Render empty state
	const renderEmptyState = () => (
		<View style={styles.emptyState}>
			<Text style={styles.emptyTitle}>
				{error
					? 'Error al cargar videos'
					: currentTab === 'forYou'
					? t('home.noVideos')
					: 'No hay videos de tus seguidos'}
			</Text>
			<Text style={styles.emptySubtitle}>
				{error
					? error
					: currentTab === 'forYou'
					? t('home.refreshToSeeNew')
					: 'Sigue a más creadores para ver su contenido aquí'}
			</Text>
			{error && (
				<TouchableOpacity
					style={styles.retryButton}
					onPress={() => loadVideos(true)}
				>
					<Text style={styles.retryText}>Reintentar</Text>
				</TouchableOpacity>
			)}
		</View>
	);

	// Loading footer component
	const renderFooter = () => {
		if (!isLoading || isRefreshing) return null;

		return (
			<View style={styles.loadingFooter}>
				<Text style={styles.loadingText}>Cargando más videos...</Text>
			</View>
		);
	};

	if (!user) {
		return null;
	}

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			<StatusBar
				style="light"
				backgroundColor={Colors.background}
				translucent
			/>

			{/* Header with tabs - positioned absolutely */}
			<View style={styles.header}>
				<Text style={styles.appName}>Redbee</Text>
				<View style={styles.tabContainer}>
					<TouchableOpacity
						style={[styles.tab, currentTab === 'forYou' && styles.activeTab]}
						onPress={() => handleTabChange('forYou')}
						disabled={isLoading || isRefreshing}
					>
						<Text
							style={[
								styles.tabText,
								currentTab === 'forYou' && styles.activeTabText,
							]}
						>
							{t('home.forYou')}
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.tab, currentTab === 'following' && styles.activeTab]}
						onPress={() => handleTabChange('following')}
						disabled={isLoading || isRefreshing}
					>
						<Text
							style={[
								styles.tabText,
								currentTab === 'following' && styles.activeTabText,
							]}
						>
							{t('home.following')}
						</Text>
					</TouchableOpacity>
				</View>
			</View>

			{/* Video Feed */}
			<FlatList
				ref={flatListRef}
				data={videos}
				renderItem={renderVideoItem}
				keyExtractor={(item) => item.id}
				style={styles.feedContainer}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={isRefreshing}
						onRefresh={handleRefresh}
						tintColor={Colors.primary}
						colors={[Colors.primary]}
					/>
				}
				onEndReached={handleLoadMore}
				onEndReachedThreshold={0.5}
				ListEmptyComponent={renderEmptyState}
				ListFooterComponent={renderFooter}
				pagingEnabled
				snapToInterval={SCREEN_HEIGHT}
				snapToAlignment="start"
				decelerationRate="fast"
				onViewableItemsChanged={onViewableItemsChanged}
				viewabilityConfig={viewabilityConfig}
				removeClippedSubviews={true}
				windowSize={3}
				initialNumToRender={2}
				maxToRenderPerBatch={2}
				getItemLayout={(_, index) => ({
					length: SCREEN_HEIGHT,
					offset: SCREEN_HEIGHT * index,
					index,
				})}
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	header: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		paddingHorizontal: 16,
		paddingVertical: 12,
		paddingTop: 50, // Account for status bar
		backgroundColor: 'rgba(0, 0, 0, 0.7)',
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(28, 28, 30, 0.5)',
		zIndex: 100,
		backdropFilter: 'blur(10px)',
	},
	appName: {
		fontSize: 24,
		fontFamily: 'Poppins-Bold',
		fontWeight: 'bold',
		color: Colors.text,
		textAlign: 'center',
		marginBottom: 12,
		textShadowColor: Colors.overlay,
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 3,
	},
	tabContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		gap: 32,
	},
	tab: {
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderBottomWidth: 2,
		borderBottomColor: 'transparent',
	},
	activeTab: {
		borderBottomColor: Colors.primary,
	},
	tabText: {
		fontSize: 16,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.textTertiary,
		textShadowColor: Colors.overlay,
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 3,
	},
	activeTabText: {
		color: Colors.text,
	},
	feedContainer: {
		flex: 1,
	},
	videoItem: {
		width: '100%',
		height: SCREEN_HEIGHT,
	},
	emptyState: {
		height: SCREEN_HEIGHT,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 32,
		backgroundColor: Colors.background,
	},
	emptyTitle: {
		fontSize: 20,
		fontFamily: 'Poppins-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginBottom: 8,
		textAlign: 'center',
	},
	emptySubtitle: {
		fontSize: 16,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
		lineHeight: 24,
		marginBottom: 24,
	},
	retryButton: {
		paddingHorizontal: 24,
		paddingVertical: 12,
		backgroundColor: Colors.primary,
		borderRadius: 8,
	},
	retryText: {
		fontSize: 16,
		fontFamily: 'Inter-SemiBold',
		color: Colors.text,
	},
	loadingFooter: {
		height: 60,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: Colors.background,
	},
	loadingText: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
	},
});
