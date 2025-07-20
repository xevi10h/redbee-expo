import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
	Dimensions,
	FlatList,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { useRequireAuth } from '@/hooks/useAuth';
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
				<Feather name="play" size={20} color="#FFFFFF" />
				{video.is_premium && (
					<View style={styles.premiumBadge}>
						<Feather name="star" size={12} color="#FFFFFF" />
					</View>
				)}
			</View>
			<View style={styles.videoStats}>
				<View style={styles.statItem}>
					<Feather name="heart" size={12} color="#FFFFFF" />
					<Text style={styles.statText}>{formatNumber(video.likes_count)}</Text>
				</View>
				<View style={styles.statItem}>
					<Feather name="eye" size={12} color="#FFFFFF" />
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

	// Mock data for user videos
	const mockVideos: Video[] = [
		{
			id: '1',
			user_id: user?.id || '',
			title: 'My first video',
			video_url: '',
			is_premium: false,
			likes_count: 1250,
			comments_count: 89,
			views_count: 15600,
			created_at: new Date().toISOString(),
		},
		{
			id: '2',
			user_id: user?.id || '',
			title: 'Premium content',
			video_url: '',
			is_premium: true,
			likes_count: 890,
			comments_count: 45,
			views_count: 5200,
			created_at: new Date().toISOString(),
		},
		{
			id: '3',
			user_id: user?.id || '',
			title: 'Another video',
			video_url: '',
			is_premium: false,
			likes_count: 2100,
			comments_count: 156,
			views_count: 28900,
			created_at: new Date().toISOString(),
		},
	] as Video[];

	const handleVideoPress = (video: Video) => {
		console.log('Video pressed:', video.id);
		// TODO: Navigate to video player
	};

	const handleEditProfile = () => {
		console.log('Edit profile pressed');
		// TODO: Navigate to edit profile screen
	};

	const renderVideoItem = ({ item }: { item: Video }) => (
		<VideoThumbnail video={item} onPress={() => handleVideoPress(item)} />
	);

	const renderEmptyState = () => (
		<View style={styles.emptyState}>
			<Feather name="video" size={48} color="#6C757D" />
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

	if (!user) {
		return null; // useRequireAuth will handle redirect
	}

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			<StatusBar style="light" />

			<ScrollView
				style={styles.scrollContainer}
				showsVerticalScrollIndicator={false}
			>
				{/* Header */}
				<View style={styles.header}>
					<View style={styles.avatarContainer}>
						<LinearGradient
							colors={['#E1306C', '#F77737']}
							style={styles.avatarGradient}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 0 }}
						>
							{user.avatar_url ? (
								// TODO: Add Image component when avatar is available
								<Feather name="user" size={32} color="#FFFFFF" />
							) : (
								<Feather name="user" size={32} color="#FFFFFF" />
							)}
						</LinearGradient>
					</View>

					<Text style={styles.displayName}>
						{user.display_name || user.username}
					</Text>
					<Text style={styles.username}>@{user.username}</Text>

					{user.bio && <Text style={styles.bio}>{user.bio}</Text>}

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

					{/* Subscription Info */}
					{user.subscription_price > 0 && (
						<View style={styles.subscriptionContainer}>
							<Text style={styles.subscriptionPrice}>
								{formatCurrency(
									user.subscription_price,
									user.subscription_currency,
								)}
								<Text style={styles.subscriptionPeriod}>/mes</Text>
							</Text>
							<Text style={styles.subscriptionLabel}>
								{t('profile.monthlySubscription')}
							</Text>
						</View>
					)}

					{/* Edit Profile Button */}
					<Button
						title={t('profile.editProfile')}
						onPress={handleEditProfile}
						variant="outline"
						style={styles.editButton}
					/>
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
							color={currentTab === 'videos' ? '#E1306C' : '#6C757D'}
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
							color={currentTab === 'liked' ? '#E1306C' : '#6C757D'}
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
						data={currentTab === 'videos' ? mockVideos : []}
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
					/>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#000000',
	},
	scrollContainer: {
		flex: 1,
	},
	header: {
		alignItems: 'center',
		paddingHorizontal: 24,
		paddingVertical: 24,
		borderBottomWidth: 1,
		borderBottomColor: '#1C1C1E',
	},
	avatarContainer: {
		marginBottom: 16,
	},
	avatarGradient: {
		width: 80,
		height: 80,
		borderRadius: 40,
		alignItems: 'center',
		justifyContent: 'center',
	},
	displayName: {
		fontSize: 24,
		fontFamily: 'Poppins-SemiBold',
		fontWeight: '600',
		color: '#FFFFFF',
		marginBottom: 4,
		textAlign: 'center',
	},
	username: {
		fontSize: 16,
		fontFamily: 'Inter-Regular',
		color: '#ADB5BD',
		marginBottom: 16,
		textAlign: 'center',
	},
	bio: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: '#FFFFFF',
		textAlign: 'center',
		lineHeight: 20,
		marginBottom: 20,
	},
	statsContainer: {
		flexDirection: 'row',
		gap: 32,
		marginBottom: 20,
	},
	stat: {
		alignItems: 'center',
	},
	statNumber: {
		fontSize: 20,
		fontFamily: 'Poppins-SemiBold',
		fontWeight: '600',
		color: '#FFFFFF',
		marginBottom: 4,
	},
	statLabel: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: '#6C757D',
	},
	subscriptionContainer: {
		alignItems: 'center',
		backgroundColor: 'rgba(225, 48, 108, 0.1)',
		borderRadius: 12,
		paddingVertical: 12,
		paddingHorizontal: 20,
		marginBottom: 20,
	},
	subscriptionPrice: {
		fontSize: 18,
		fontFamily: 'Poppins-SemiBold',
		fontWeight: '600',
		color: '#E1306C',
	},
	subscriptionPeriod: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: '#E1306C',
	},
	subscriptionLabel: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: '#E1306C',
		marginTop: 4,
	},
	editButton: {
		width: '100%',
		maxWidth: 200,
	},
	tabsContainer: {
		flexDirection: 'row',
		backgroundColor: '#000000',
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
		borderBottomColor: '#E1306C',
	},
	tabText: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: '#6C757D',
	},
	activeTabText: {
		color: '#E1306C',
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
		backgroundColor: '#1C1C1E',
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
		backgroundColor: '#E1306C',
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
		backgroundColor: 'rgba(0, 0, 0, 0.7)',
	},
	statItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	statText: {
		fontSize: 10,
		fontFamily: 'Inter-Regular',
		color: '#FFFFFF',
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
		color: '#FFFFFF',
		marginTop: 16,
		marginBottom: 8,
		textAlign: 'center',
	},
	emptySubtitle: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: '#6C757D',
		textAlign: 'center',
	},
});
