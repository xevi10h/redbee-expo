import { VideoFeedLoader } from '@/components/ui/VideoFeedLoader';
import { VideoPlayer } from '@/components/video/VideoPlayer';
import { Colors } from '@/constants/Colors';
import { useTranslation } from '@/hooks/useTranslation';
import { useVideoFeedWithPermissions } from '@/hooks/useVideoFeedWithPermissions';
import { Comment, User } from '@/shared/types';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
	Alert,
	Dimensions,
	FlatList,
	Platform,
	RefreshControl,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	ViewToken,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Tab bar measurements (matching _layout.tsx)
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 90 : 70;
// Video height should exclude tab bar area
const VIDEO_HEIGHT = SCREEN_HEIGHT - TAB_BAR_HEIGHT;

interface FollowingScreenProps {
	user: User;
	isActive?: boolean;
}

export const FollowingScreen: React.FC<FollowingScreenProps> = ({
	user,
	isActive = true,
}) => {
	const router = useRouter();
	const { t } = useTranslation();

	// State management
	const [activeVideoIndex, setActiveVideoIndex] = useState(0);

	// Refs
	const flatListRef = useRef<FlatList>(null);

	// Use the improved video feed hook with permissions
	const {
		videos,
		isLoading,
		isRefreshing,
		hasMore,
		error,
		handleVideoLike,
		handleUserFollow,
		handleUserSubscribe,
		handleVideoComment,
		handleVideoReport,
		handleCommentAdded,
		handleUserPress,
		handleRefresh,
		handleLoadMore,
		clearError,
	} = useVideoFeedWithPermissions('following', user);

	// Handle viewable items change for video playback
	const onViewableItemsChanged = useCallback(
		({ viewableItems }: { viewableItems: ViewToken[] }) => {
			if (viewableItems.length > 0) {
				const activeItem = viewableItems.find(
					(item) => item.isViewable && item.index !== null,
				);
				if (activeItem && activeItem.index !== null) {
					setActiveVideoIndex(activeItem.index);

					// Track video view (solo si el usuario puede ver el video)
					const video = videos[activeItem.index];
					if (video) {
						// La función incrementViewCount ahora verifica permisos internamente
						import('@/services/videoService').then(({ VideoService }) => {
							VideoService.incrementViewCount(video.id, user?.id);
						});
					}
				}
			}
		},
		[videos, user?.id],
	);

	const viewabilityConfig = {
		itemVisiblePercentThreshold: 50,
		minimumViewTime: 500,
	};

	// Show error alert when error state changes
	useEffect(() => {
		if (error) {
			Alert.alert(t('common.error'), error, [
				{
					text: t('common.ok'),
					onPress: clearError,
				},
				{
					text: t('common.retry'),
					onPress: () => {
						clearError();
						handleRefresh();
					},
				},
			]);
		}
	}, [error, t, clearError, handleRefresh]);

	// Handle comment added from modal
	const handleVideoCommentAdded = useCallback(
		(videoId: string, comment: Comment) => {
			handleCommentAdded(videoId); // Solo pasamos el videoId ya que el hook solo incrementa el contador
		},
		[handleCommentAdded],
	);

	// Handle analytics
	const handleShowAnalytics = useCallback(
		(videoId: string, videoTitle?: string) => {
			router.push(`/video/${videoId}/analytics`);
		},
		[router],
	);

	// Render individual video item
	const renderVideoItem = useCallback(
		({ item, index }: { item: any; index: number }) => {
			const isVideoActive = isActive && index === activeVideoIndex;

			return (
				<View style={styles.videoItem}>
					<VideoPlayer
						video={item}
						isActive={isVideoActive}
						currentUser={user}
						onLike={() => handleVideoLike(item.id)}
						onFollow={() => item.user?.id && handleUserFollow(item.user.id)}
						onSubscribe={() =>
							item.user?.id && handleUserSubscribe(item.user.id)
						}
						onReport={() => handleVideoReport(item.id, 'inappropriate')}
						onUserPress={() => item.user?.id && handleUserPress(item.user.id)}
						onCommentAdded={(comment: Comment) =>
							handleVideoCommentAdded(item.id, comment)
						}
						onShowAnalytics={() => handleShowAnalytics(item.id, item.title)}
					/>
				</View>
			);
		},
		[
			isActive,
			activeVideoIndex,
			user,
			handleVideoLike,
			handleVideoComment,
			handleUserFollow,
			handleUserSubscribe,
			handleVideoReport,
			handleUserPress,
			handleVideoCommentAdded,
			handleShowAnalytics,
		],
	);

	// Render empty state
	const renderEmptyState = () => (
		<View style={styles.emptyState}>
			<Text style={styles.emptyTitle}>
				{error ? t('errors.somethingWentWrong') : t('home.noVideos')}
			</Text>
			<Text style={styles.emptySubtitle}>
				{error ? t('errors.tryAgainLater') : t('home.followCreatorsMessage')}
			</Text>
			{error && (
				<TouchableOpacity
					style={styles.retryButton}
					onPress={() => {
						clearError();
						handleRefresh();
					}}
				>
					<Text style={styles.retryText}>{t('common.retry')}</Text>
				</TouchableOpacity>
			)}
		</View>
	);

	// Loading footer component
	const renderFooter = () => {
		if (!isLoading || isRefreshing) return null;

		return (
			<View style={styles.loadingFooter}>
				<Text style={styles.loadingText}>{t('home.loadingMoreVideos')}</Text>
			</View>
		);
	};

	// Key extractor
	const keyExtractor = useCallback((item: any) => item.id, []);

	// Mostrar loader estético cuando está cargando por primera vez
	const showMainLoader = isLoading && videos.length === 0 && !error;

	return (
		<View style={styles.container}>
			{/* Video Feed */}
			<FlatList
				ref={flatListRef}
				data={videos}
				renderItem={renderVideoItem}
				keyExtractor={keyExtractor}
				style={styles.feedContainer}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={isRefreshing}
						onRefresh={handleRefresh}
						tintColor={Colors.primary}
						colors={[Colors.primary]}
						progressBackgroundColor={Colors.backgroundSecondary}
						title="Cargando videos..."
						titleColor={Colors.textSecondary}
					/>
				}
				onEndReached={handleLoadMore}
				onEndReachedThreshold={0.5}
				ListEmptyComponent={showMainLoader ? null : renderEmptyState}
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

			{/* Loader principal estético */}
			{showMainLoader && (
				<VideoFeedLoader message={t('common.loading')} showIcon={true} />
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	feedContainer: {
		flex: 1,
	},
	videoItem: {
		width: '100%',
		height: SCREEN_HEIGHT, // Video a pantalla completa
	},
	emptyState: {
		height: VIDEO_HEIGHT, // Altura reducida para no taparse con tab bar
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 32,
		backgroundColor: Colors.background,
	},
	emptyTitle: {
		fontSize: 20,
		fontFamily: 'Raleway-SemiBold',
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
