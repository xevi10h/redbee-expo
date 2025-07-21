import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
	Alert,
	Dimensions,
	FlatList,
	RefreshControl,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { useRequireAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { Video } from '@/shared/types';

// Get screen height to use for snapping and placeholder height
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Placeholder component for video item - will be implemented later
const VideoItem: React.FC<{ video: Video; index: number }> = ({
	video,
	index,
}) => {
	return (
		<View style={styles.videoPlaceholder}>
			<Text style={styles.videoTitle}>Video {index + 1}</Text>
			<Text style={styles.videoDescription}>
				{video.title || 'Sample video title'}
			</Text>
			<Text style={styles.videoUser}>
				@{video.user?.username || 'username'}
			</Text>
		</View>
	);
};

export default function HomeScreen() {
	const { t } = useTranslation();
	const { user } = useRequireAuth();

	const [videos, setVideos] = useState<Video[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [currentTab, setCurrentTab] = useState<'forYou' | 'following'>(
		'forYou',
	);

	// Mock data updated with real URLs
	const mockVideos: Video[] = [
		{
			id: '1',
			user_id: '1',
			user: {
				id: '1',
				username: 'naturelover',
				display_name: 'Nature Lover',
				avatar_url:
					'https://images.pexels.com/photos/1072179/pexels-photo-1072179.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
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
			id: '2',
			user_id: '2',
			user: {
				id: '2',
				username: 'city_explorer',
				display_name: 'City Explorer',
				avatar_url:
					'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
			},
			title: 'Exclusive Premium Content',
			description: 'This premium content requires subscription',
			hashtags: ['premium', 'exclusive'],
			video_url:
				'https://videos.pexels.com/video-files/3209828/3209828-hd_720_1366_24fps.mp4',
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

	const loadVideos = async (refresh = false) => {
		if (refresh) {
			setIsRefreshing(true);
		} else {
			setIsLoading(true);
		}

		try {
			await new Promise((resolve) => setTimeout(resolve, 1000));

			if (refresh) {
				setVideos(mockVideos);
			} else {
				setVideos((prev) => [...prev, ...mockVideos]);
			}
		} catch (error) {
			console.error('Error loading videos:', error);
			Alert.alert(t('common.error'), t('errors.somethingWentWrong'), [
				{ text: t('common.ok') },
			]);
		} finally {
			setIsLoading(false);
			setIsRefreshing(false);
		}
	};

	useEffect(() => {
		if (user) {
			loadVideos();
		}
	}, [user, currentTab]);

	const handleRefresh = () => {
		loadVideos(true);
	};

	const handleLoadMore = () => {
		if (!isLoading && !isRefreshing) {
			loadVideos();
		}
	};

	const renderVideoItem = ({ item, index }: { item: Video; index: number }) => (
		<VideoItem video={item} index={index} />
	);

	const renderEmptyState = () => (
		<View style={styles.emptyState}>
			<Text style={styles.emptyTitle}>{t('home.noVideos')}</Text>
			<Text style={styles.emptySubtitle}>{t('home.refreshToSeeNew')}</Text>
		</View>
	);

	if (!user) {
		return null;
	}

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			<StatusBar style="light" />

			<View style={styles.header}>
				<Text style={styles.appName}>Redbee</Text>
				<View style={styles.tabContainer}>
					<Text
						style={[styles.tab, currentTab === 'forYou' && styles.activeTab]}
						onPress={() => setCurrentTab('forYou')}
					>
						{t('home.forYou')}
					</Text>
					<Text
						style={[styles.tab, currentTab === 'following' && styles.activeTab]}
						onPress={() => setCurrentTab('following')}
					>
						{t('home.following')}
					</Text>
				</View>
			</View>

			<FlatList
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
				pagingEnabled
				snapToInterval={SCREEN_HEIGHT}
				snapToAlignment="start"
				decelerationRate="fast"
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
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: Colors.background,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
	},
	appName: {
		fontSize: 24,
		fontFamily: 'Poppins-Bold',
		fontWeight: 'bold',
		color: Colors.text,
		textAlign: 'center',
		marginBottom: 12,
	},
	tabContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		gap: 32,
	},
	tab: {
		fontSize: 16,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.textTertiary,
		paddingVertical: 8,
		paddingHorizontal: 16,
	},
	activeTab: {
		color: Colors.text,
		borderBottomWidth: 2,
		borderBottomColor: Colors.primary,
	},
	feedContainer: {
		flex: 1,
	},
	videoPlaceholder: {
		height: SCREEN_HEIGHT,
		backgroundColor: Colors.backgroundSecondary,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 20,
	},
	videoTitle: {
		fontSize: 18,
		fontFamily: 'Poppins-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginBottom: 8,
		textAlign: 'center',
	},
	videoDescription: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		marginBottom: 8,
		textAlign: 'center',
	},
	videoUser: {
		fontSize: 16,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.primary,
		textAlign: 'center',
	},
	emptyState: {
		height: SCREEN_HEIGHT,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 32,
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
	},
});
