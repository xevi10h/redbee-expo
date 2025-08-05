import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
	ActivityIndicator,
	Dimensions,
	FlatList,
	Image,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/Colors';
import { useRequireAuth } from '@/hooks/useAuth';
import { useProfileVideos } from '@/hooks/useProfileVideos';
import { useTranslation } from '@/hooks/useTranslation';
import { formatCurrency, formatNumber } from '@/shared/functions/utils';
import { Video } from '@/shared/types';

const { width } = Dimensions.get('window');
const videoWidth = (width - 32 - 16) / 3; // Account for padding and gaps

// Placeholder component for video thumbnail
const VideoThumbnail: React.FC<{ video: Video; onPress: () => void }> = ({
	video,
	onPress,
}) => {
	return (
		<TouchableOpacity style={styles.videoThumbnail} onPress={onPress}>
			<View style={styles.thumbnailContainer}>
				<Feather name="play" size={20} color={Colors.text} />
				{video.is_premium && (
					<View style={styles.premiumBadge}>
						<Feather name="star" size={12} color={Colors.text} />
					</View>
				)}
			</View>
			<View style={styles.videoStats}>
				<View style={styles.statItem}>
					<Feather name="heart" size={12} color={Colors.text} />
					<Text style={styles.statText}>{formatNumber(video.likes_count)}</Text>
				</View>
				<View style={styles.statItem}>
					<Feather name="eye" size={12} color={Colors.text} />
					<Text style={styles.statText}>{formatNumber(video.views_count)}</Text>
				</View>
			</View>
		</TouchableOpacity>
	);
};

export default function ProfileScreen() {
	const { t } = useTranslation();
	const { user } = useRequireAuth();

	const [currentTab, setCurrentTab] = useState<'videos' | 'liked'>('videos');
	const [isRefreshing, setIsRefreshing] = useState(false);

	// Real data from the database
	const {
		userVideos,
		likedVideos,
		isLoadingVideos,
		isLoadingLiked,
		hasMoreVideos,
		hasMoreLiked,
		error,
		loadMoreUserVideos,
		loadMoreLikedVideos,
		refreshVideos,
	} = useProfileVideos(user?.id || '', user?.id);

	const handleVideoPress = (video: Video) => {
		// Navigate to the video player screen
		router.push(`/video/${video.id}`);
	};

	const handleEditProfile = () => {
		router.push('/(tabs)/profile/edit');
	};

	const handleSettings = () => {
		router.push('/(tabs)/profile/settings');
	};

	const renderVideoItem = ({ item, index }: { item: Video; index: number }) => {
		const currentVideos = currentTab === 'videos' ? userVideos : likedVideos;
		const hasMore = currentTab === 'videos' ? hasMoreVideos : hasMoreLiked;
		const isLoading = currentTab === 'videos' ? isLoadingVideos : isLoadingLiked;
		
		// Load more when reaching near the end
		if (index === currentVideos.length - 5 && hasMore && !isLoading) {
			if (currentTab === 'videos') {
				loadMoreUserVideos();
			} else {
				loadMoreLikedVideos();
			}
		}

		return <VideoThumbnail video={item} onPress={() => handleVideoPress(item)} />;
	};

	const handleRefresh = async () => {
		setIsRefreshing(true);
		await refreshVideos();
		setIsRefreshing(false);
	};

	const renderEmptyState = () => {
		if (error) {
			return (
				<View style={styles.emptyState}>
					<Feather name="alert-circle" size={48} color={Colors.error} />
					<Text style={styles.emptyTitle}>Error loading videos</Text>
					<Text style={styles.emptySubtitle}>{error}</Text>
					<Button
						title="Retry"
						onPress={handleRefresh}
						variant="outline"
						style={{ marginTop: 16, maxWidth: 120 }}
					/>
				</View>
			);
		}

		return (
			<View style={styles.emptyState}>
				<Feather 
					name={currentTab === 'videos' ? 'video' : 'heart'} 
					size={48} 
					color={Colors.textTertiary} 
				/>
				<Text style={styles.emptyTitle}>
					{currentTab === 'videos' ? t('profile.noVideos') : 'No liked videos'}
				</Text>
				<Text style={styles.emptySubtitle}>
					{currentTab === 'videos'
						? 'Share your first video to get started'
						: 'Videos you like will appear here'}
				</Text>
			</View>
		);
	};

	const renderLoadingFooter = () => {
		const isLoading = currentTab === 'videos' ? isLoadingVideos : isLoadingLiked;
		const hasMore = currentTab === 'videos' ? hasMoreVideos : hasMoreLiked;
		
		if (!isLoading || !hasMore) return null;
		
		return (
			<View style={styles.loadingFooter}>
				<ActivityIndicator size="small" color={Colors.primary} />
			</View>
		);
	};


	if (!user) {
		return null; // useRequireAuth will handle redirect
	}

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			<StatusBar style="light" />

			{/* Header with Settings Button */}
			<View style={styles.headerContainer}>
				<View style={styles.headerSpacer} />
				<TouchableOpacity
					style={styles.headerSettingsButton}
					onPress={handleSettings}
				>
					<Feather name="settings" size={24} color={Colors.text} />
				</TouchableOpacity>
			</View>

			<ScrollView
				style={styles.scrollContainer}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={isRefreshing}
						onRefresh={handleRefresh}
						tintColor={Colors.primary}
						colors={[Colors.primary]}
					/>
				}
			>
				{/* Header - Compact horizontal layout like external profile */}
				<View style={styles.header}>
					<View style={styles.topSection}>
						<View style={styles.avatarContainer}>
							<LinearGradient
								colors={Colors.gradientPrimary}
								style={styles.avatarGradient}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 0 }}
							>
								{user.avatar_url ? (
									<Image 
										source={{ uri: user.avatar_url }} 
										style={styles.avatarImage}
										resizeMode="cover"
									/>
								) : (
									<Feather name="user" size={28} color={Colors.text} />
								)}
							</LinearGradient>
						</View>

						<View style={styles.userInfo}>
							<Text style={styles.displayName}>
								{user.display_name || user.username}
							</Text>
							<Text style={styles.username}>@{user.username}</Text>

							{/* Stats */}
							<View style={styles.statsContainer}>
								<View style={styles.stat}>
									<Text style={styles.statNumber}>
										{formatNumber(user.videos_count)}
									</Text>
									<Text style={styles.statLabel}>{t('profile.videos')}</Text>
								</View>
								<View style={styles.stat}>
									<Text style={styles.statNumber}>
										{formatNumber(user.followers_count)}
									</Text>
									<Text style={styles.statLabel}>{t('profile.followers')}</Text>
								</View>
								<View style={styles.stat}>
									<Text style={styles.statNumber}>
										{formatNumber(user.subscribers_count)}
									</Text>
									<Text style={styles.statLabel}>Suscriptores</Text>
								</View>
							</View>
						</View>
					</View>

					{user.bio && <Text style={styles.bio}>{user.bio}</Text>}

					{/* Edit Profile Button */}
					<View style={styles.actionButtons}>
						<TouchableOpacity
							style={styles.editProfileButton}
							onPress={handleEditProfile}
							activeOpacity={0.8}
						>
							<Feather name="edit" size={16} color={Colors.textSecondary} />
							<Text style={styles.editProfileButtonText}>
								{t('profile.editProfile')}
							</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* Content Tabs */}
				<View style={styles.tabsContainer}>
					<TouchableOpacity
						style={[styles.tab, currentTab === 'videos' && styles.activeTab]}
						onPress={() => setCurrentTab('videos')}
					>
						<Feather
							name="grid"
							size={20}
							color={
								currentTab === 'videos' ? Colors.primary : Colors.textTertiary
							}
						/>
						<Text
							style={[
								styles.tabText,
								currentTab === 'videos' && styles.activeTabText,
							]}
						>
							Videos
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.tab, currentTab === 'liked' && styles.activeTab]}
						onPress={() => setCurrentTab('liked')}
					>
						<Feather
							name="heart"
							size={20}
							color={
								currentTab === 'liked' ? Colors.primary : Colors.textTertiary
							}
						/>
						<Text
							style={[
								styles.tabText,
								currentTab === 'liked' && styles.activeTabText,
							]}
						>
							{t('profile.likes')}
						</Text>
					</TouchableOpacity>

				</View>

				{/* Video Grid */}
				<View style={styles.videosContainer}>
					<FlatList
						data={currentTab === 'videos' ? userVideos : likedVideos}
						renderItem={renderVideoItem}
						keyExtractor={(item) => item.id}
						numColumns={3}
						scrollEnabled={false}
						contentContainerStyle={styles.videoGrid}
						ItemSeparatorComponent={() => (
							<View style={styles.videoSeparator} />
						)}
						columnWrapperStyle={styles.videoRow}
						ListEmptyComponent={renderEmptyState}
						ListFooterComponent={renderLoadingFooter}
					/>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	headerContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 8,
		backgroundColor: Colors.background,
	},
	headerSpacer: {
		width: 44, // Same width as settings button for centering
	},
	headerSettingsButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: Colors.backgroundSecondary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	scrollContainer: {
		flex: 1,
	},
	header: {
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
	},
	topSection: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: 12,
	},
	avatarContainer: {
		marginRight: 16,
	},
	avatarGradient: {
		width: 72,
		height: 72,
		borderRadius: 36,
		alignItems: 'center',
		justifyContent: 'center',
	},
	userInfo: {
		flex: 1,
	},
	displayName: {
		fontSize: 20,
		fontFamily: 'Poppins-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginBottom: 2,
	},
	username: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		marginBottom: 12,
	},
	bio: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
		lineHeight: 18,
		marginTop: 10,
	},
	statsContainer: {
		flexDirection: 'row',
		gap: 24,
	},
	stat: {
		alignItems: 'center',
	},
	statNumber: {
		fontSize: 18,
		fontFamily: 'Poppins-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginBottom: 2,
	},
	statLabel: {
		fontSize: 11,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
	actionButtons: {
		flexDirection: 'row',
		gap: 12,
		marginTop: 16,
		height: 50,
	},
	editProfileButton: {
		flex: 1,
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: Colors.borderSecondary,
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
		gap: 8,
	},
	editProfileButtonText: {
		fontSize: 14,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '500',
		color: Colors.textSecondary,
	},
	tabsContainer: {
		flexDirection: 'row',
		backgroundColor: Colors.background,
	},
	tab: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 16,
		gap: 8,
		borderBottomWidth: 2,
		borderBottomColor: 'transparent',
	},
	activeTab: {
		borderBottomColor: Colors.primary,
	},
	tabText: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.textTertiary,
	},
	activeTabText: {
		color: Colors.primary,
	},
	videosContainer: {
		flex: 1,
		paddingHorizontal: 16,
		paddingTop: 16,
	},
	videoGrid: {
		flexGrow: 1,
	},
	videoRow: {
		justifyContent: 'space-between',
	},
	videoSeparator: {
		height: 8,
	},
	videoThumbnail: {
		width: videoWidth,
		aspectRatio: 9 / 16,
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 8,
		overflow: 'hidden',
	},
	thumbnailContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		position: 'relative',
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
	videoStats: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingHorizontal: 8,
		paddingVertical: 6,
		backgroundColor: Colors.overlay,
	},
	statItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	statText: {
		fontSize: 10,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
	},
	emptyState: {
		alignItems: 'center',
		justifyContent: 'center',
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
		color: Colors.textTertiary,
		textAlign: 'center',
	},
	avatarImage: {
		width: 72,
		height: 72,
		borderRadius: 36,
		backgroundColor: Colors.backgroundSecondary,
	},
	thumbnailImage: {
		width: '100%',
		height: '100%',
		borderRadius: 8,
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
		transform: [{ translateX: -10 }, { translateY: -10 }],
		backgroundColor: 'rgba(0, 0, 0, 0.6)',
		borderRadius: 20,
		width: 40,
		height: 40,
		alignItems: 'center',
		justifyContent: 'center',
	},
	loadingFooter: {
		paddingVertical: 20,
		alignItems: 'center',
	},
});
