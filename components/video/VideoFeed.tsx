import { FlashList } from '@shopify/flash-list';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
	Alert,
	Dimensions,
	RefreshControl,
	StyleSheet,
	Text,
	View,
	ViewToken,
} from 'react-native';

import { Colors } from '@/constants/Colors';
import { useTranslation } from '@/hooks/useTranslation';
import { Comment, User, Video } from '@/shared/types';
import { router } from 'expo-router';
import VideoPlayer from './VideoPlayer';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface VideoFeedProps {
	videos: Video[];
	currentUser: User;
	feedType: 'forYou' | 'following';
	onRefresh: () => void;
	onLoadMore: () => void;
	isRefreshing: boolean;
	isLoading: boolean;
	onVideoLike: (videoId: string) => void;
	onVideoComment: (videoId: string) => void;
	onUserFollow: (userId: string) => void;
	onUserSubscribe: (userId: string) => void;
	onVideoReport: (videoId: string, reason: string) => void;
	onUserPress: (userId: string) => void;
	onCommentAdded: (comment: Comment) => void;
}

interface VideoItemProps {
	video: Video;
	isActive: boolean;
	currentUser: User;
	onLike: () => void;
	onComment: () => void;
	onFollow: () => void;
	onSubscribe: () => void;
	onReport: () => void;
	onUserPress: () => void;
	onCommentAdded: (comment: Comment) => void;
}

const VideoItemComponent: React.FC<VideoItemProps> = ({
	video,
	isActive,
	currentUser,
	onLike,
	onComment,
	onFollow,
	onSubscribe,
	onReport,
	onUserPress,
	onCommentAdded,
}) => {
	return (
		<View style={styles.videoItem}>
			<VideoPlayer
				video={video}
				isActive={isActive}
				currentUser={currentUser}
				onLike={onLike}
				onComment={onComment}
				onFollow={onFollow}
				onSubscribe={onSubscribe}
				onReport={onReport}
				onUserPress={onUserPress}
				onCommentAdded={onCommentAdded}
			/>
		</View>
	);
};

const VideoItem = React.memo(VideoItemComponent);

export const VideoFeed: React.FC<VideoFeedProps> = ({
	videos,
	currentUser,
	feedType,
	onRefresh,
	onLoadMore,
	isRefreshing,
	isLoading,
	onVideoLike,
	onVideoComment,
	onUserFollow,
	onUserSubscribe,
	onVideoReport,
	onUserPress,
	onCommentAdded,
}) => {
	const { t } = useTranslation();
	const flashListRef = useRef<FlashList<Video>>(null);
	const [activeVideoIndex, setActiveVideoIndex] = useState(0);
	const [viewableItems, setViewableItems] = useState<ViewToken[]>([]);
	const [showFixedLastVideo, setShowFixedLastVideo] = useState(false);

	// Handle viewable items change to determine active video
	const onViewableItemsChanged = useCallback(
		({ viewableItems: newViewableItems }: { viewableItems: ViewToken[] }) => {
			setViewableItems(newViewableItems);

			if (newViewableItems.length > 0) {
				const activeItem = newViewableItems.find(
					(item) => item.isViewable && item.index !== null,
				);

				if (activeItem && activeItem.index !== null) {
					const newIndex = activeItem.index;
					setActiveVideoIndex(newIndex);
					
					// Show fixed overlay when on last video
					const isLastVideo = newIndex === videos.length - 1;
					setShowFixedLastVideo(isLastVideo);
					
					if (isLastVideo) {
						// Force exact position
						setTimeout(() => {
							const expectedPosition = newIndex * SCREEN_HEIGHT;
							flashListRef.current?.scrollToOffset({
								offset: expectedPosition,
								animated: false,
							});
						}, 50);
					}
				}
			}
		},
		[videos.length],
	);

	// Configuration for viewability
	const viewabilityConfig = {
		itemVisiblePercentThreshold: 50,
		minimumViewTime: 300,
	};

	// Handle infinite scroll
	const handleEndReached = useCallback(() => {
		if (!isLoading && !isRefreshing) {
			onLoadMore();
		}
	}, [isLoading, isRefreshing, onLoadMore]);

	// Prevent scroll when on last video
	const handleScrollBeginDrag = useCallback((event: any) => {
		if (activeVideoIndex === videos.length - 1) {
			// Prevent the scroll from starting
			event.preventDefault?.();
			const expectedPosition = activeVideoIndex * SCREEN_HEIGHT;
			flashListRef.current?.scrollToOffset({
				offset: expectedPosition,
				animated: false,
			});
		}
	}, [activeVideoIndex, videos.length]);

	// Override scroll to maintain position
	const handleMomentumScrollBegin = useCallback((event: any) => {
		if (activeVideoIndex === videos.length - 1) {
			const expectedPosition = activeVideoIndex * SCREEN_HEIGHT;
			flashListRef.current?.scrollToOffset({
				offset: expectedPosition,
				animated: false,
			});
		}
	}, [activeVideoIndex, videos.length]);

	// Block any scroll on last video
	const handleScroll = useCallback((event: any) => {
		if (activeVideoIndex === videos.length - 1) {
			const { contentOffset } = event.nativeEvent;
			const expectedPosition = activeVideoIndex * SCREEN_HEIGHT;
			
			// If position is not exactly where it should be, force it back
			if (Math.abs(contentOffset.y - expectedPosition) > 1) {
				flashListRef.current?.scrollToOffset({
					offset: expectedPosition,
					animated: false,
				});
			}
		}
	}, [activeVideoIndex, videos.length]);

	// Render individual video item
	const renderVideoItem = useCallback(
		({ item, index }: { item: Video; index: number }) => {
			const isActive = index === activeVideoIndex;

			return (
				<VideoItem
					video={item}
					isActive={isActive}
					currentUser={currentUser}
					onLike={() => onVideoLike(item.id)}
					onComment={() => onVideoComment(item.id)}
					onFollow={() => item.user?.id && onUserFollow(item.user.id)}
					onSubscribe={() => item.user?.id && onUserSubscribe(item.user.id)}
					onReport={() => onVideoReport(item.id, 'inappropriate')}
					onUserPress={() => item.user?.id && onUserPress(item.user.id)}
					onCommentAdded={onCommentAdded}
				/>
			);
		},
		[
			activeVideoIndex,
			currentUser,
			onVideoLike,
			onVideoComment,
			onUserFollow,
			onUserSubscribe,
			onVideoReport,
			onUserPress,
			onCommentAdded,
		],
	);

	// Empty state component
	const renderEmptyState = () => (
		<View style={styles.emptyState}>
			<Text style={styles.emptyTitle}>
				{feedType === 'forYou'
					? t('home.noVideos')
					: 'No hay videos de tus seguidos'}
			</Text>
			<Text style={styles.emptySubtitle}>
				{feedType === 'forYou'
					? t('home.refreshToSeeNew')
					: 'Sigue a más creadores para ver su contenido aquí'}
			</Text>
		</View>
	);

	// Loading footer component
	const renderFooter = () => {
		if (!isLoading) return null;

		return (
			<View style={styles.loadingFooter}>
				<Text style={styles.loadingText}>Cargando más videos...</Text>
			</View>
		);
	};

	// Key extractor for FlashList
	const keyExtractor = useCallback((item: Video) => item.id, []);

	// Handle errors
	useEffect(() => {
		if (videos.length === 0 && !isLoading && !isRefreshing) {
			console.log('No videos available for feed type:', feedType);
		}
	}, [videos, isLoading, isRefreshing, feedType]);

	return (
		<View style={styles.container}>
			{videos.length === 0 ? (
				renderEmptyState()
			) : (
				<>
					<FlashList
						ref={flashListRef}
						data={videos}
						renderItem={renderVideoItem}
						keyExtractor={keyExtractor}
						estimatedItemSize={SCREEN_HEIGHT}
						showsVerticalScrollIndicator={false}
						pagingEnabled
						snapToInterval={SCREEN_HEIGHT}
						snapToAlignment="start"
						decelerationRate="fast"
						scrollEnabled={!showFixedLastVideo}
						onViewableItemsChanged={onViewableItemsChanged}
						viewabilityConfig={viewabilityConfig}
						onEndReached={handleEndReached}
						onEndReachedThreshold={0.5}
						onScroll={handleScroll}
						onScrollBeginDrag={handleScrollBeginDrag}
						onMomentumScrollBegin={handleMomentumScrollBegin}
						scrollEventThrottle={1}
						refreshControl={
							<RefreshControl
								refreshing={isRefreshing}
								onRefresh={onRefresh}
								tintColor={Colors.primary}
								colors={[Colors.primary]}
								progressBackgroundColor={Colors.background}
							/>
						}
						ListFooterComponent={renderFooter}
						removeClippedSubviews={true}
						maintainVisibleContentPosition={{
							minIndexForVisible: 0,
							autoscrollToTopThreshold: 10,
						}}
					/>
					
					{/* Fixed overlay for last video to prevent any movement */}
					{showFixedLastVideo && videos.length > 0 && (
						<View style={styles.fixedVideoOverlay} pointerEvents="box-none">
							<VideoItem
								video={videos[videos.length - 1]}
								isActive={true}
								currentUser={currentUser}
								onLike={() => onVideoLike(videos[videos.length - 1].id)}
								onComment={() => onVideoComment(videos[videos.length - 1].id)}
								onFollow={() => videos[videos.length - 1].user?.id && onUserFollow(videos[videos.length - 1].user.id)}
								onSubscribe={() => videos[videos.length - 1].user?.id && onUserSubscribe(videos[videos.length - 1].user.id)}
								onReport={() => onVideoReport(videos[videos.length - 1].id, 'inappropriate')}
								onUserPress={() => videos[videos.length - 1].user?.id && onUserPress(videos[videos.length - 1].user.id)}
								onCommentAdded={onCommentAdded}
							/>
						</View>
					)}
				</>
			)}
		</View>
	);
};

// Hook for managing video feed state
export const useVideoFeed = (feedType: 'forYou' | 'following') => {
	const [videos, setVideos] = useState<Video[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [page, setPage] = useState(0);

	// Load videos function (to be implemented with real API)
	const loadVideos = useCallback(
		async (refresh = false) => {
			if (refresh) {
				setIsRefreshing(true);
				setPage(0);
			} else {
				setIsLoading(true);
			}

			try {
				// TODO: Replace with real API call
				// const result = await VideoService.getVideos({
				//   feed_type: feedType,
				//   page: refresh ? 0 : page,
				//   limit: 10
				// });

				// Mock API call simulation
				await new Promise((resolve) => setTimeout(resolve, 1000));

				const mockVideos: Video[] = [
					{
						id: `${feedType}-${Date.now()}-1`,
						user_id: '1',
						user: {
							id: '1',
							username: 'naturelover',
							display_name: 'Nature Lover',
							avatar_url:
								'https://images.pexels.com/photos/1072179/pexels-photo-1072179.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
							subscription_price: 4.99,
						},
						title: 'Amazing vertical video!',
						description: 'This is a sample video description with #hashtags',
						hashtags: ['amazing', 'vertical', 'content'],
						video_url:
							'https://videos.pexels.com/video-files/4434255/4434255-hd_720_1366_25fps.mp4',
						thumbnail_url:
							'https://images.pexels.com/videos/4434255/pexels-photo-4434255.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
						duration: 45,
						is_premium: false,
						likes_count: 1250,
						comments_count: 89,
						views_count: 15600,
						created_at: new Date().toISOString(),
						is_liked: false,
						is_following: false,
						is_subscribed: false,
					},
					{
						id: `${feedType}-${Date.now()}-2`,
						user_id: '2',
						user: {
							id: '2',
							username: 'city_explorer',
							display_name: 'City Explorer',
							avatar_url:
								'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
							subscription_price: 9.99,
						},
						title: 'Exclusive Premium Content',
						description: 'This premium content requires subscription',
						hashtags: ['premium', 'exclusive'],
						video_url:
							'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
						thumbnail_url:
							'https://images.pexels.com/videos/3209828/pexels-photo-3209828.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
						duration: 120,
						is_premium: true,
						likes_count: 890,
						comments_count: 45,
						views_count: 5200,
						created_at: new Date().toISOString(),
						is_liked: false,
						is_following: true,
						is_subscribed: false,
					},
				];

				if (refresh) {
					setVideos(mockVideos);
					setPage(1);
				} else {
					setVideos((prev) => [...prev, ...mockVideos]);
					setPage((prev) => prev + 1);
				}

				// Simulate end of pagination
				if (page >= 5) {
					setHasMore(false);
				}
			} catch (error) {
				console.error('Error loading videos:', error);
				Alert.alert('Error', 'No se pudieron cargar los videos', [
					{ text: 'OK' },
				]);
			} finally {
				setIsLoading(false);
				setIsRefreshing(false);
			}
		},
		[feedType, page],
	);

	// Initial load
	useEffect(() => {
		loadVideos(true);
	}, [feedType]);

	const handleRefresh = useCallback(() => {
		if (!isRefreshing && !isLoading) {
			loadVideos(true);
		}
	}, [isRefreshing, isLoading, loadVideos]);

	const handleLoadMore = useCallback(() => {
		if (!isLoading && !isRefreshing && hasMore) {
			loadVideos(false);
		}
	}, [isLoading, isRefreshing, hasMore, loadVideos]);

	// Video interaction handlers
	const handleVideoLike = useCallback(async (videoId: string) => {
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
			// TODO: Implement actual API call
			// await VideoService.toggleLike(videoId);
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
	}, []);

	const handleUserFollow = useCallback(async (userId: string) => {
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
			// TODO: Implement actual API call
			// await UserService.toggleFollow(userId);
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
	}, []);

	const handleUserSubscribe = useCallback(async (userId: string) => {
		try {
			// TODO: Implement Stripe subscription flow
			// const result = await SubscriptionService.createSubscription(userId);
			// if (result.success) {
			//   // Update video state
			//   setVideos(prev => prev.map(video => {
			//     if (video.user?.id === userId) {
			//       return { ...video, is_subscribed: true };
			//     }
			//     return video;
			//   }));
			// }

			Alert.alert(
				'Suscripción',
				'Funcionalidad de suscripción pendiente de implementar con Stripe',
				[{ text: 'OK' }],
			);
		} catch (error) {
			console.error('Subscribe error:', error);
			Alert.alert('Error', 'No se pudo procesar la suscripción', [
				{ text: 'OK' },
			]);
		}
	}, []);

	const handleCommentAdded = useCallback((comment: Comment) => {
		setVideos((prev) =>
			prev.map((video) => {
				if (video.id === comment.video_id) {
					return {
						...video,
						comments_count: video.comments_count + 1,
					};
				}
				return video;
			}),
		);
	}, []);

	const handleVideoComment = useCallback((videoId: string) => {
		// TODO: Navigate to comments screen or open comment modal
		console.log('Open comments for video:', videoId);
	}, []);

	const handleVideoReport = useCallback(
		async (videoId: string, reason: string) => {
			try {
				// TODO: Implement report API call
				// await ReportService.reportVideo(videoId, reason);

				Alert.alert(
					'Reporte enviado',
					'Hemos recibido tu reporte y lo estamos revisando.',
					[{ text: 'OK' }],
				);
				console.log('Video reported:', videoId, reason);
			} catch (error) {
				console.error('Report error:', error);
				Alert.alert('Error', 'No se pudo enviar el reporte', [{ text: 'OK' }]);
			}
		},
		[],
	);

	const handleUserPress = useCallback((userId: string) => {
		router.push(`/user/${userId}`);
	}, []);

	return {
		videos,
		isLoading,
		isRefreshing,
		hasMore,
		handleRefresh,
		handleLoadMore,
		handleVideoLike,
		handleVideoComment,
		handleUserFollow,
		handleUserSubscribe,
		handleVideoReport,
		handleUserPress,
		handleCommentAdded,
	};
};

// VideoFeed Component
export default function VideoFeedComponent(
	props: Omit<
		VideoFeedProps,
		| 'onVideoLike'
		| 'onVideoComment'
		| 'onUserFollow'
		| 'onUserSubscribe'
		| 'onVideoReport'
		| 'onUserPress'
		| 'onCommentAdded'
	>,
) {
	const feedHook = useVideoFeed(props.feedType);

	return (
		<VideoFeed
			{...props}
			videos={feedHook.videos}
			isLoading={feedHook.isLoading}
			isRefreshing={feedHook.isRefreshing}
			onVideoLike={feedHook.handleVideoLike}
			onVideoComment={feedHook.handleVideoComment}
			onUserFollow={feedHook.handleUserFollow}
			onUserSubscribe={feedHook.handleUserSubscribe}
			onVideoReport={feedHook.handleVideoReport}
			onUserPress={feedHook.handleUserPress}
			onCommentAdded={feedHook.handleCommentAdded}
		/>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.videoBackground,
	},
	videoItem: {
		width: '100%',
		height: SCREEN_HEIGHT,
	},
	fixedVideoOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		width: '100%',
		height: SCREEN_HEIGHT,
		backgroundColor: Colors.videoBackground,
		zIndex: 1000,
	},
	emptyState: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 32,
		backgroundColor: Colors.background,
	},
	emptyTitle: {
		fontSize: 20,
		fontFamily: 'Raleway-SemiBold',
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
