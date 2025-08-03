import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
	Dimensions,
	FlatList,
	Image,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';

import { Colors } from '@/constants/Colors';
import { formatNumber } from '@/shared/functions/utils';
import { User, Video } from '@/shared/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = (SCREEN_WIDTH - 48) / 2; // 16px padding + 16px gap

interface HashtagVideoGridProps {
	videos: Video[];
	hashtag: string;
	isLoading: boolean;
	hasMore: boolean;
	onLoadMore: () => void;
	onVideoPress: (video: Video, index: number) => void;
}

const VideoGridItem: React.FC<{
	video: Video;
	onPress: () => void;
}> = ({ video, onPress }) => {
	return (
		<TouchableOpacity style={styles.videoItem} onPress={onPress}>
			{/* Video Thumbnail */}
			<View style={styles.thumbnailContainer}>
				{video.thumbnail_url ? (
					<Image 
						source={{ uri: video.thumbnail_url }} 
						style={styles.thumbnail}
						resizeMode="cover"
					/>
				) : (
					<View style={styles.placeholderThumbnail}>
						<Feather name="play" size={24} color={Colors.text} />
					</View>
				)}
				
				{/* Duration overlay */}
				{video.duration && (
					<View style={styles.durationOverlay}>
						<Text style={styles.durationText}>
							{formatDuration(video.duration)}
						</Text>
					</View>
				)}

				{/* Views overlay */}
				<View style={styles.viewsOverlay}>
					<Feather name="eye" size={12} color={Colors.text} />
					<Text style={styles.viewsText}>
						{formatNumber(video.views_count || 0)}
					</Text>
				</View>
			</View>

			{/* Video Info */}
			<View style={styles.videoInfo}>
				<Text style={styles.videoDescription} numberOfLines={2}>
					{video.description || 'Sin descripción'}
				</Text>
				
				{/* Author Info */}
				<View style={styles.authorInfo}>
					<View style={styles.authorAvatar}>
						<Feather name="user" size={12} color={Colors.textTertiary} />
					</View>
					<Text style={styles.authorName} numberOfLines={1}>
						@{video.author?.username || 'Usuario'}
					</Text>
				</View>

				{/* Stats */}
				<View style={styles.stats}>
					<View style={styles.statItem}>
						<Feather name="heart" size={12} color={Colors.textTertiary} />
						<Text style={styles.statText}>
							{formatNumber(video.likes_count || 0)}
						</Text>
					</View>
					<View style={styles.statItem}>
						<Feather name="message-circle" size={12} color={Colors.textTertiary} />
						<Text style={styles.statText}>
							{formatNumber(video.comments_count || 0)}
						</Text>
					</View>
				</View>
			</View>
		</TouchableOpacity>
	);
};

const formatDuration = (seconds: number): string => {
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const HashtagVideoGrid: React.FC<HashtagVideoGridProps> = ({
	videos,
	hashtag,
	isLoading,
	hasMore,
	onLoadMore,
	onVideoPress,
}) => {
	const renderVideoItem = ({ item, index }: { item: Video; index: number }) => (
		<VideoGridItem
			video={item}
			onPress={() => onVideoPress(item, index)}
		/>
	);

	const renderEmptyState = () => (
		<View style={styles.emptyState}>
			<Feather name="video-off" size={48} color={Colors.textTertiary} />
			<Text style={styles.emptyTitle}>
				No hay videos para #{hashtag}
			</Text>
			<Text style={styles.emptySubtitle}>
				Sé el primero en crear contenido con este hashtag
			</Text>
		</View>
	);

	const renderFooter = () => {
		if (!isLoading) return null;

		return (
			<View style={styles.loadingFooter}>
				<Text style={styles.loadingText}>Cargando más videos...</Text>
			</View>
		);
	};

	const renderHeader = () => (
		<View style={styles.header}>
			<View style={styles.hashtagHeader}>
				<View style={styles.hashtagIcon}>
					<Feather name="hash" size={24} color={Colors.primary} />
				</View>
				<View style={styles.hashtagInfo}>
					<Text style={styles.hashtagTitle}>#{hashtag}</Text>
					<Text style={styles.videoCount}>
						{formatNumber(videos.length)} video{videos.length !== 1 ? 's' : ''}
					</Text>
				</View>
			</View>
		</View>
	);

	if (videos.length === 0 && !isLoading) {
		return (
			<View style={styles.container}>
				{renderHeader()}
				{renderEmptyState()}
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<FlatList
				data={videos}
				renderItem={renderVideoItem}
				keyExtractor={(item) => item.id}
				numColumns={2}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={styles.listContainer}
				columnWrapperStyle={styles.row}
				ListHeaderComponent={renderHeader}
				ListFooterComponent={renderFooter}
				onEndReached={hasMore ? onLoadMore : undefined}
				onEndReachedThreshold={0.5}
				ItemSeparatorComponent={() => <View style={styles.separator} />}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	listContainer: {
		padding: 16,
	},
	row: {
		justifyContent: 'space-between',
	},
	separator: {
		height: 16,
	},
	header: {
		marginBottom: 20,
	},
	hashtagHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 16,
		paddingHorizontal: 16,
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 12,
		marginBottom: 8,
	},
	hashtagIcon: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: Colors.premiumBackground,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	hashtagInfo: {
		flex: 1,
	},
	hashtagTitle: {
		fontSize: 20,
		fontFamily: 'Inter-Bold',
		fontWeight: 'bold',
		color: Colors.text,
		marginBottom: 4,
	},
	videoCount: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
	},
	videoItem: {
		width: ITEM_WIDTH,
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 12,
		overflow: 'hidden',
	},
	thumbnailContainer: {
		width: '100%',
		height: ITEM_WIDTH * 1.33, // 4:3 aspect ratio
		position: 'relative',
	},
	thumbnail: {
		width: '100%',
		height: '100%',
	},
	placeholderThumbnail: {
		width: '100%',
		height: '100%',
		backgroundColor: Colors.borderSecondary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	durationOverlay: {
		position: 'absolute',
		bottom: 8,
		right: 8,
		backgroundColor: 'rgba(0, 0, 0, 0.7)',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
	},
	durationText: {
		fontSize: 10,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.text,
	},
	viewsOverlay: {
		position: 'absolute',
		bottom: 8,
		left: 8,
		backgroundColor: 'rgba(0, 0, 0, 0.7)',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	viewsText: {
		fontSize: 10,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.text,
	},
	videoInfo: {
		padding: 12,
	},
	videoDescription: {
		fontSize: 13,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.text,
		lineHeight: 18,
		marginBottom: 8,
	},
	authorInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	authorAvatar: {
		width: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: Colors.borderSecondary,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 6,
	},
	authorName: {
		fontSize: 12,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.textSecondary,
		flex: 1,
	},
	stats: {
		flexDirection: 'row',
		gap: 12,
	},
	statItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	statText: {
		fontSize: 11,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
	emptyState: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 32,
		paddingVertical: 64,
	},
	emptyTitle: {
		fontSize: 18,
		fontFamily: 'Poppins-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginTop: 16,
		marginBottom: 8,
		textAlign: 'center',
	},
	emptySubtitle: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
		lineHeight: 20,
	},
	loadingFooter: {
		paddingVertical: 16,
		alignItems: 'center',
	},
	loadingText: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
	},
});