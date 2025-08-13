import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
	Alert,
	Dimensions,
	FlatList,
	Image,
	RefreshControl,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { VideoFeedLoader } from '@/components/ui/VideoFeedLoader';
import { Colors } from '@/constants/Colors';
import { useRequireAuth } from '@/hooks/useAuth';
import { useHashtagVideos } from '@/hooks/useHashtagSearch';
import { useTranslation } from '@/hooks/useTranslation';
import { formatNumber } from '@/shared/functions/utils';
import { Video } from '@/shared/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_WIDTH = (SCREEN_WIDTH - 48) / 2; // 2 columns with margins

// Video Card Component
const VideoCard: React.FC<{
	video: Video;
	onPress: () => void;
}> = ({ video, onPress }) => {
	const [imageError, setImageError] = useState(false);

	return (
		<TouchableOpacity style={styles.videoCard} onPress={onPress}>
			<View style={styles.thumbnailContainer}>
				{video.thumbnail_url && !imageError ? (
					<Image
						source={{ uri: video.thumbnail_url }}
						style={styles.thumbnail}
						resizeMode="cover"
						onError={() => setImageError(true)}
					/>
				) : (
					<View style={styles.placeholderThumbnail}>
						<Feather name="video" size={32} color={Colors.textTertiary} />
					</View>
				)}

				{/* Play overlay */}
				<View style={styles.playOverlay}>
					<Feather name="play" size={16} color={Colors.text} />
				</View>

				{/* Premium badge */}
				{video.is_premium && (
					<View style={styles.premiumBadge}>
						<MaterialCommunityIcons
							name="crown"
							size={12}
							color={Colors.text}
						/>
					</View>
				)}

				{/* Video stats overlay */}
				<View style={styles.statsOverlay}>
					<View style={styles.statItem}>
						<Feather name="heart" size={12} color={Colors.text} />
						<Text style={styles.statText}>
							{formatNumber(video.likes_count)}
						</Text>
					</View>
					<View style={styles.statItem}>
						<Feather name="eye" size={12} color={Colors.text} />
						<Text style={styles.statText}>
							{formatNumber(video.views_count)}
						</Text>
					</View>
				</View>
			</View>

			{/* Video info */}
			<View style={styles.videoInfo}>
				<Text style={styles.videoTitle} numberOfLines={2}>
					{video.title || 'Sin título'}
				</Text>
				<Text style={styles.videoAuthor} numberOfLines={1}>
					@{video.user?.username || 'Unknown'}
				</Text>
			</View>
		</TouchableOpacity>
	);
};

export default function HashtagFeedScreen() {
	const { t } = useTranslation();
	const { hashtag: hashtagParam } = useLocalSearchParams<{ hashtag: string }>();
	const { user } = useRequireAuth();

	// Decode hashtag parameter
	const hashtag = decodeURIComponent(hashtagParam || '');

	// Use hashtag videos hook
	const { videos, isLoading, error, hasMore, loadMore, refresh, canLoadMore } =
		useHashtagVideos(hashtag, user?.id);

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

	// Handle back navigation
	const handleBack = useCallback(() => {
		if (router.canGoBack()) {
			router.back();
		} else {
			router.push('/(tabs)/search');
		}
	}, []);

	// Handle video press - navigate to video player
	const handleVideoPress = useCallback((video: Video) => {
		router.push(`/video/${video.id}`);
	}, []);

	// Render video item
	const renderVideoItem = useCallback(
		({ item }: { item: Video }) => (
			<VideoCard video={item} onPress={() => handleVideoPress(item)} />
		),
		[handleVideoPress],
	);

	// Render empty state
	const renderEmptyState = () => (
		<View style={styles.emptyState}>
			<Feather name="video-off" size={64} color={Colors.textTertiary} />
			<Text style={styles.emptyTitle}>No hay videos para #{hashtag}</Text>
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

			{/* Video Grid */}
			{!showMainLoader && (
				<FlatList
					data={videos}
					renderItem={renderVideoItem}
					keyExtractor={(item) => item.id}
					numColumns={2}
					showsVerticalScrollIndicator={false}
					contentContainerStyle={styles.gridContainer}
					columnWrapperStyle={styles.gridRow}
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
					ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
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
	gridContainer: {
		padding: 16,
	},
	gridRow: {
		justifyContent: 'space-between',
	},
	itemSeparator: {
		height: 16,
	},
	videoCard: {
		width: VIDEO_WIDTH,
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 12,
		overflow: 'hidden',
		marginBottom: 8,
	},
	thumbnailContainer: {
		width: '100%',
		aspectRatio: 9 / 16,
		position: 'relative',
		backgroundColor: Colors.backgroundSecondary,
	},
	thumbnail: {
		width: '100%',
		height: '100%',
	},
	placeholderThumbnail: {
		width: '100%',
		height: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: Colors.backgroundSecondary,
	},
	playOverlay: {
		position: 'absolute',
		top: '50%',
		left: '50%',
		transform: [{ translateX: -20 }, { translateY: -20 }],
		backgroundColor: 'rgba(0, 0, 0, 0.6)',
		borderRadius: 20,
		width: 40,
		height: 40,
		alignItems: 'center',
		justifyContent: 'center',
	},
	premiumBadge: {
		position: 'absolute',
		top: 8,
		right: 8,
		backgroundColor: Colors.premium,
		borderRadius: 10,
		width: 20,
		height: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	statsOverlay: {
		position: 'absolute',
		bottom: 8,
		left: 8,
		right: 8,
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	statItem: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.6)',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
		gap: 2,
	},
	statText: {
		fontSize: 10,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
	},
	videoInfo: {
		padding: 12,
	},
	videoTitle: {
		fontSize: 14,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginBottom: 4,
		lineHeight: 18,
	},
	videoAuthor: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
	},
	emptyState: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 32,
		minHeight: 400,
	},
	emptyTitle: {
		fontSize: 20,
		fontFamily: 'Raleway-SemiBold',
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
