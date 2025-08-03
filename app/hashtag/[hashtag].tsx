import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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

import { VideoPlayer } from '@/components/video/VideoPlayer';
import { VideoFeedLoader } from '@/components/ui/VideoFeedLoader';
import { Colors } from '@/constants/Colors';
import { useRequireAuth } from '@/hooks/useAuth';
import { useHashtagVideos } from '@/hooks/useHashtagSearch';
import { useTranslation } from '@/hooks/useTranslation';
import { useUserInteractions } from '@/hooks/useUserInteractions';
import { Comment } from '@/shared/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function HashtagFeedScreen() {
	const { t } = useTranslation();
	const { hashtag: hashtagParam } = useLocalSearchParams<{ hashtag: string }>();
	const { user } = useRequireAuth();
	const { handleLike, handleFollow, handleSubscribe } = useUserInteractions();

	// Decode hashtag parameter
	const hashtag = decodeURIComponent(hashtagParam || '');

	// State management
	const [activeVideoIndex, setActiveVideoIndex] = useState(0);

	// Refs
	const flatListRef = useRef<FlatList>(null);

	// Use hashtag videos hook
	const {
		videos,
		isLoading,
		error,
		hasMore,
		loadMore,
		refresh,
		canLoadMore,
	} = useHashtagVideos(hashtag, user?.id);

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
					onPress: () => {},
				},
				{
					text: t('common.retry'),
					onPress: refresh,
				},
			]);
		}
	}, [error, t, refresh]);

	// Handle video like
	const handleVideoLike = useCallback(
		async (videoId: string) => {
			try {
				await handleLike(videoId);
			} catch (error) {
				console.error('Error liking video:', error);
				Alert.alert(t('common.error'), 'No se pudo dar like al video');
			}
		},
		[handleLike, t],
	);

	// Handle user follow
	const handleUserFollow = useCallback(
		async (userId: string) => {
			try {
				await handleFollow(userId);
			} catch (error) {
				console.error('Error following user:', error);
				Alert.alert(t('common.error'), 'No se pudo seguir al usuario');
			}
		},
		[handleFollow, t],
	);

	// Handle user subscribe
	const handleUserSubscribe = useCallback(
		async (userId: string) => {
			try {
				await handleSubscribe(userId);
			} catch (error) {
				console.error('Error subscribing to user:', error);
				Alert.alert(t('common.error'), 'No se pudo suscribir al usuario');
			}
		},
		[handleSubscribe, t],
	);

	// Handle video comment
	const handleVideoComment = useCallback(() => {
		// This will be handled by the VideoPlayer component's comment modal
	}, []);

	// Handle video report
	const handleVideoReport = useCallback(
		(videoId: string) => {
			Alert.alert(
				'Reportar video',
				'¿Quieres reportar este video?',
				[
					{ text: 'Cancelar', style: 'cancel' },
					{
						text: 'Reportar',
						style: 'destructive',
						onPress: () => {
							// TODO: Implement video reporting
							console.log('Report video:', videoId);
						},
					},
				],
			);
		},
		[],
	);

	// Handle user press
	const handleUserPress = useCallback((userId: string) => {
		router.push(`/user/${userId}`);
	}, []);

	// Handle comment added
	const handleCommentAdded = useCallback((comment: Comment) => {
		// TODO: Update video comments count
		console.log('Comment added:', comment);
	}, []);

	// Handle back navigation
	const handleBack = useCallback(() => {
		if (router.canGoBack()) {
			router.back();
		} else {
			router.push('/(tabs)/search');
		}
	}, []);

	// Render video item
	const renderVideoItem = useCallback(
		({ item, index }: { item: any; index: number }) => (
			<View style={styles.videoContainer}>
				<VideoPlayer
					video={item}
					isActive={index === activeVideoIndex}
					currentUser={user!}
					onLike={() => handleVideoLike(item.id)}
					onComment={handleVideoComment}
					onFollow={() => handleUserFollow(item.author?.id)}
					onSubscribe={() => handleUserSubscribe(item.author?.id)}
					onReport={() => handleVideoReport(item.id)}
					onUserPress={() => handleUserPress(item.author?.id)}
					onCommentAdded={handleCommentAdded}
				/>
			</View>
		),
		[
			activeVideoIndex,
			user,
			handleVideoLike,
			handleVideoComment,
			handleUserFollow,
			handleUserSubscribe,
			handleVideoReport,
			handleUserPress,
			handleCommentAdded,
		],
	);

	// Render empty state
	const renderEmptyState = () => (
		<View style={styles.emptyState}>
			<Feather name="video-off" size={64} color={Colors.textTertiary} />
			<Text style={styles.emptyTitle}>
				No hay videos para #{hashtag}
			</Text>
			<Text style={styles.emptySubtitle}>
				Sé el primero en crear contenido con este hashtag
			</Text>
		</View>
	);

	// Handle refresh
	const handleRefresh = useCallback(() => {
		refresh();
	}, [refresh]);

	// Handle load more
	const handleLoadMore = useCallback(() => {
		if (canLoadMore) {
			loadMore();
		}
	}, [canLoadMore, loadMore]);

	// Show main loader while initially loading
	const showMainLoader = isLoading && videos.length === 0;

	if (!user) {
		return null; // useRequireAuth will handle redirect
	}

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			<StatusBar style="light" />
			
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity style={styles.backButton} onPress={handleBack}>
					<Feather name="arrow-left" size={24} color={Colors.text} />
				</TouchableOpacity>
				<View style={styles.headerTitle}>
					<Text style={styles.hashtagTitle}>#{hashtag}</Text>
					<Text style={styles.videoCount}>
						{videos.length} video{videos.length !== 1 ? 's' : ''}
					</Text>
				</View>
				<View style={styles.headerSpacer} />
			</View>

			{/* Loader principal estético */}
			{showMainLoader && (
				<VideoFeedLoader 
					message={`Cargando videos de #${hashtag}...`}
					showIcon={true}
				/>
			)}

			{/* Video Feed */}
			{!showMainLoader && (
				<FlatList
					ref={flatListRef}
					data={videos}
					renderItem={renderVideoItem}
					keyExtractor={(item) => item.id}
					pagingEnabled
					showsVerticalScrollIndicator={false}
					onViewableItemsChanged={onViewableItemsChanged}
					viewabilityConfig={viewabilityConfig}
					getItemLayout={(_, index) => ({
						length: SCREEN_HEIGHT - 100, // Subtract header height
						offset: (SCREEN_HEIGHT - 100) * index,
						index,
					})}
					refreshControl={
						<RefreshControl
							refreshing={false}
							onRefresh={handleRefresh}
							tintColor={Colors.primary}
							progressBackgroundColor={Colors.backgroundSecondary}
							colors={[Colors.primary]}
						/>
					}
					onEndReached={handleLoadMore}
					onEndReachedThreshold={0.5}
					ListEmptyComponent={!isLoading ? renderEmptyState : null}
					removeClippedSubviews={true}
					maxToRenderPerBatch={3}
					windowSize={5}
					initialNumToRender={2}
				/>
			)}

			{/* Loading indicator for pagination */}
			{isLoading && videos.length > 0 && (
				<View style={styles.loadingIndicator}>
					<Text style={styles.loadingText}>Cargando más videos...</Text>
				</View>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: Colors.background,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
		height: 60,
	},
	backButton: {
		width: 40,
		height: 40,
		alignItems: 'center',
		justifyContent: 'center',
	},
	headerTitle: {
		flex: 1,
		alignItems: 'center',
	},
	headerSpacer: {
		width: 40,
	},
	hashtagTitle: {
		fontSize: 18,
		fontFamily: 'Inter-Bold',
		fontWeight: 'bold',
		color: Colors.text,
	},
	videoCount: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		marginTop: 2,
	},
	videoContainer: {
		height: SCREEN_HEIGHT - 100, // Subtract header height
		width: '100%',
	},
	emptyState: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 32,
		height: SCREEN_HEIGHT - 200,
	},
	emptyTitle: {
		fontSize: 20,
		fontFamily: 'Poppins-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginTop: 24,
		marginBottom: 12,
		textAlign: 'center',
	},
	emptySubtitle: {
		fontSize: 16,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
		lineHeight: 22,
	},
	loadingIndicator: {
		position: 'absolute',
		bottom: 100,
		left: 0,
		right: 0,
		alignItems: 'center',
		paddingVertical: 8,
		backgroundColor: 'rgba(0, 0, 0, 0.7)',
		marginHorizontal: 20,
		borderRadius: 8,
	},
	loadingText: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
	},
});