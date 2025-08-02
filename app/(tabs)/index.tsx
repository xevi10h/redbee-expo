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

import { VideoPlayer } from '@/components/VideoPlayer';
import { Colors } from '@/constants/Colors';
import { useRequireAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { useVideoFeedWithPermissions } from '@/hooks/useVideoFeedWithPermissions';
import { Comment, FeedType } from '@/shared/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function HomeScreen() {
	const { t } = useTranslation();
	const { user } = useRequireAuth();

	// State management
	const [currentTab, setCurrentTab] = useState<FeedType>('forYou');
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
	} = useVideoFeedWithPermissions(currentTab, user!);

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
		[videos],
	);

	const viewabilityConfig = {
		itemVisiblePercentThreshold: 50,
		minimumViewTime: 500,
	};

	// Handle tab change with proper reset
	const handleTabChange = useCallback(
		(newTab: FeedType) => {
			if (newTab !== currentTab) {
				setCurrentTab(newTab);
				setActiveVideoIndex(0);
				clearError();

				// Scroll to top when changing tabs
				if (flatListRef.current) {
					flatListRef.current.scrollToOffset({ offset: 0, animated: false });
				}
			}
		},
		[currentTab, clearError],
	);

	// Show error alert when error state changes
	useEffect(() => {
		if (error) {
			Alert.alert(t('common.error'), error, [
				{
					text: t('common.ok'),
					onPress: clearError,
				},
				{
					text: 'Reintentar',
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

	// Render individual video item
	const renderVideoItem = useCallback(
		({ item, index }: { item: any; index: number }) => {
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
						onReport={() => handleVideoReport(item.id, 'inappropriate')}
						onUserPress={() => item.user?.id && handleUserPress(item.user.id)}
						onCommentAdded={(comment: Comment) =>
							handleVideoCommentAdded(item.id, comment)
						}
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
			handleVideoCommentAdded,
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
					? 'Verifica tu conexión e inténtalo de nuevo'
					: currentTab === 'forYou'
					? t('home.refreshToSeeNew')
					: 'Sigue a más creadores para ver su contenido aquí'}
			</Text>
			{error && (
				<TouchableOpacity
					style={styles.retryButton}
					onPress={() => {
						clearError();
						handleRefresh();
					}}
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

	// Key extractor
	const keyExtractor = useCallback((item: any) => item.id, []);

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
				keyExtractor={keyExtractor}
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
		marginTop: 50,
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
