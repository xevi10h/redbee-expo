import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
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
import { useProfileVideos, VideoSortOption } from '@/hooks/useProfileVideos';
import { useTranslation } from '@/hooks/useTranslation';
import { useNotificationsList } from '@/hooks/useNotificationsList';
import { NotificationBadge } from '@/components/ui/NotificationBadge';
import { formatNumber } from '@/shared/functions/utils';
import { Video } from '@/shared/types';

const { width } = Dimensions.get('window');
const videoWidth = (width - 32 - 16) / 3; // Account for padding and gaps

// Sort Controls Component
const SortControls: React.FC<{
	currentSort: VideoSortOption;
	onSortChange: (sort: VideoSortOption) => void;
}> = ({ currentSort, onSortChange }) => {
	const getSortConfig = (sort: VideoSortOption) => {
		switch (sort) {
			case 'created_at':
				return { label: 'Más recientes', icon: 'clock' as const };
			case 'views_count':
				return { label: 'Más vistas', icon: 'eye' as const };
			case 'likes_count':
				return { label: 'Más gustados', icon: 'heart' as const };
		}
	};

	const sorts: VideoSortOption[] = ['created_at', 'views_count', 'likes_count'];

	return (
		<View style={styles.sortContainer}>
			{sorts.map((sort) => {
				const config = getSortConfig(sort);
				const isActive = currentSort === sort;

				return (
					<TouchableOpacity
						key={sort}
						style={[styles.sortButton, isActive && styles.activeSortButton]}
						onPress={() => onSortChange(sort)}
						activeOpacity={0.7}
					>
						<Feather
							name={config.icon}
							size={14}
							color={isActive ? Colors.primary : Colors.textTertiary}
						/>
						<Text
							style={[
								styles.sortButtonText,
								isActive && styles.activeSortButtonText,
							]}
						>
							{config.label}
						</Text>
					</TouchableOpacity>
				);
			})}
		</View>
	);
};

// Video thumbnail component with proper cover image display
const VideoThumbnail: React.FC<{
	video: Video;
	onPress: () => void;
	onLongPress?: () => void;
}> = ({ video, onPress, onLongPress }) => {
	const [imageError, setImageError] = useState(false);

	// Debug logging
	console.log(
		`🖼️ VideoThumbnail for ${video.id}: thumbnail_url = ${video.thumbnail_url}`,
	);

	return (
		<TouchableOpacity
			style={styles.videoThumbnail}
			onPress={onPress}
			onLongPress={onLongPress}
		>
			<View style={styles.thumbnailContainer}>
				{/* Show thumbnail image if available, otherwise show placeholder */}
				{video.thumbnail_url && !imageError ? (
					<Image
						source={{ uri: video.thumbnail_url }}
						style={styles.thumbnailImage}
						resizeMode="cover"
						onError={(error) => {
							console.error(
								`❌ Image load error for video ${video.id}: ${video.thumbnail_url}`,
								error,
							);
							setImageError(true);
						}}
					/>
				) : (
					<View style={styles.placeholderThumbnail}>
						<Feather name="video" size={24} color={Colors.textTertiary} />
					</View>
				)}

				{/* Play button overlay */}
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
			</View>

			{/* Video stats at bottom */}
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
	const { unreadCount } = useNotificationsList();

	type ProfileTab = 'public' | 'premium' | 'videos' | 'liked' | 'hidden';

	// Determine initial tab based on user's premium content setting
	const getInitialTab = (): ProfileTab => {
		if (user?.has_premium_content) {
			return 'public'; // Start with public when user has premium content
		}
		return 'videos'; // Start with videos when user doesn't have premium content
	};

	const [currentTab, setCurrentTab] = useState<ProfileTab>(getInitialTab());

	// Update tab when user premium content status changes
	useEffect(() => {
		const newInitialTab = getInitialTab();
		if (currentTab === 'videos' && user?.has_premium_content) {
			setCurrentTab('public');
		} else if (
			(currentTab === 'public' || currentTab === 'premium') &&
			!user?.has_premium_content
		) {
			setCurrentTab('videos');
		}
	}, [user?.has_premium_content]);
	const [isRefreshing, setIsRefreshing] = useState(false);

	// Real data from the database
	const {
		userVideos,
		filteredUserVideos,
		likedVideos,
		hiddenVideos,
		sortOption,
		setSortOption,
		isLoadingVideos,
		isLoadingLiked,
		isLoadingHidden,
		hasMoreVideos,
		hasMoreLiked,
		hasMoreHidden,
		error,
		loadMoreUserVideos,
		loadMoreLikedVideos,
		loadMoreHiddenVideos,
		refreshVideos,
		hideVideo,
		showVideo,
		deleteVideo,
	} = useProfileVideos(user?.id || '', user?.id);

	// Refresh videos when screen comes into focus (e.g., after hiding a video from detail screen)
	useFocusEffect(
		useCallback(() => {
			refreshVideos();
		}, [refreshVideos]),
	);

	const handleVideoPress = (video: Video) => {
		// Navigate to the video player screen
		router.push(`/video/${video.id}`);
	};

	const handleVideoLongPress = (video: Video) => {
		const options = [];

		// Analytics option for all videos
		options.push({
			text: '📊 Ver analíticas',
			style: 'default',
			onPress: () => handleShowAnalytics(video.id, video.title),
		});

		if (currentTab === 'videos') {
			// For visible videos
			options.push(
				{
					text: 'Ocultar video',
					style: 'default',
					onPress: () => handleHideVideo(video.id),
				},
				{
					text: 'Eliminar video',
					style: 'destructive',
					onPress: () => handleDeleteVideo(video.id),
				},
			);
		} else if (currentTab === 'hidden') {
			// For hidden videos
			options.push(
				{
					text: 'Mostrar video',
					style: 'default',
					onPress: () => handleShowVideo(video.id),
				},
				{
					text: 'Eliminar video',
					style: 'destructive',
					onPress: () => handleDeleteVideo(video.id),
				},
			);
		}

		options.push({ text: t('common.cancel'), style: 'cancel' });

		Alert.alert(
			'Opciones del video',
			`¿Qué quieres hacer con "${video.title || 'este video'}"?`,
			options,
		);
	};

	const handleHideVideo = async (videoId: string) => {
		const result = await hideVideo(videoId);
		if (!result.success) {
			Alert.alert(
				t('common.error'),
				result.error || 'No se pudo ocultar el video',
			);
		}
	};

	const handleShowVideo = async (videoId: string) => {
		const result = await showVideo(videoId);
		if (!result.success) {
			Alert.alert(
				t('common.error'),
				result.error || 'No se pudo mostrar el video',
			);
		}
	};

	const handleDeleteVideo = async (videoId: string) => {
		Alert.alert(
			'Eliminar video',
			'¿Estás seguro de que quieres eliminar este video permanentemente? Esta acción no se puede deshacer.',
			[
				{ text: t('common.cancel'), style: 'cancel' },
				{
					text: 'Eliminar',
					style: 'destructive',
					onPress: async () => {
						const result = await deleteVideo(videoId);
						if (!result.success) {
							Alert.alert(
								t('common.error'),
								result.error || 'No se pudo eliminar el video',
							);
						}
					},
				},
			],
		);
	};

	const handleEditProfile = () => {
		router.push('/(tabs)/profile/edit');
	};

	const handleSettings = () => {
		router.push('/(tabs)/profile/settings');
	};

	const handleNotifications = () => {
		router.push('/(tabs)/profile/notifications-list');
	};

	const handleShowAnalytics = (videoId: string, videoTitle?: string) => {
		router.push(`/video/${videoId}/analytics`);
	};

	const handleAudienceCenter = () => {
		router.push('/(tabs)/profile/audience-center');
	};

	// Get current videos based on selected tab
	const getCurrentVideos = () => {
		switch (currentTab) {
			case 'public':
				return filteredUserVideos.filter((video) => !video.is_premium);
			case 'premium':
				return filteredUserVideos.filter((video) => video.is_premium);
			case 'videos':
				return filteredUserVideos;
			case 'liked':
				return likedVideos;
			case 'hidden':
				return hiddenVideos;
			default:
				return [];
		}
	};

	const renderVideoItem = ({ item, index }: { item: Video; index: number }) => {
		const currentVideos = getCurrentVideos();
		const hasMore =
			currentTab === 'videos' ||
			currentTab === 'public' ||
			currentTab === 'premium'
				? hasMoreVideos
				: currentTab === 'liked'
				? hasMoreLiked
				: hasMoreHidden;
		const isLoading =
			currentTab === 'videos' ||
			currentTab === 'public' ||
			currentTab === 'premium'
				? isLoadingVideos
				: currentTab === 'liked'
				? isLoadingLiked
				: isLoadingHidden;

		// Load more when reaching near the end
		if (index === currentVideos.length - 5 && hasMore && !isLoading) {
			if (
				currentTab === 'videos' ||
				currentTab === 'public' ||
				currentTab === 'premium'
			) {
				loadMoreUserVideos();
			} else if (currentTab === 'liked') {
				loadMoreLikedVideos();
			} else {
				loadMoreHiddenVideos();
			}
		}

		return (
			<VideoThumbnail
				video={item}
				onPress={() => handleVideoPress(item)}
				onLongPress={() => handleVideoLongPress(item)}
			/>
		);
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

		const getEmptyStateConfig = () => {
			switch (currentTab) {
				case 'videos':
					return {
						icon: 'video',
						title: t('profile.noVideos'),
						subtitle: 'Comparte tu primer video para empezar',
					};
				case 'public':
					return {
						icon: 'globe',
						title: 'No hay videos públicos',
						subtitle: 'Tus videos públicos aparecerán aquí',
					};
				case 'premium':
					return {
						icon: 'crown',
						title: 'No hay videos premium',
						subtitle: 'Tus videos premium aparecerán aquí',
					};
				case 'liked':
					return {
						icon: 'heart',
						title: 'No hay videos que te gusten',
						subtitle: 'Los videos que te gusten aparecerán aquí',
					};
				case 'hidden':
					return {
						icon: 'eye-off',
						title: 'No hay videos ocultos',
						subtitle: 'Los videos que ocultes aparecerán aquí',
					};
				default:
					return {
						icon: 'video',
						title: 'No videos',
						subtitle: '',
					};
			}
		};

		const config = getEmptyStateConfig();

		return (
			<View style={styles.emptyState}>
				{config.icon === 'crown' ? (
					<MaterialCommunityIcons
						name="crown"
						size={48}
						color={Colors.textTertiary}
					/>
				) : (
					<Feather
						name={config.icon as any}
						size={48}
						color={Colors.textTertiary}
					/>
				)}
				<Text style={styles.emptyTitle}>{config.title}</Text>
				<Text style={styles.emptySubtitle}>{config.subtitle}</Text>
			</View>
		);
	};

	const renderLoadingFooter = () => {
		const isLoading =
			currentTab === 'videos' ||
			currentTab === 'public' ||
			currentTab === 'premium'
				? isLoadingVideos
				: currentTab === 'liked'
				? isLoadingLiked
				: isLoadingHidden;
		const hasMore =
			currentTab === 'videos' ||
			currentTab === 'public' ||
			currentTab === 'premium'
				? hasMoreVideos
				: currentTab === 'liked'
				? hasMoreLiked
				: hasMoreHidden;

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

			{/* Header with Notifications and Settings Buttons */}
			<View style={styles.headerContainer}>
				<View style={styles.headerSpacer} />
				<View style={styles.headerButtons}>
					<TouchableOpacity
						style={styles.headerButton}
						onPress={handleNotifications}
					>
						<View style={{ position: 'relative' }}>
							<Feather name="bell" size={22} color={Colors.text} />
							<NotificationBadge count={unreadCount} size="small" />
						</View>
					</TouchableOpacity>
					<TouchableOpacity
						style={styles.headerButton}
						onPress={handleSettings}
					>
						<Feather name="settings" size={22} color={Colors.text} />
					</TouchableOpacity>
				</View>
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
						progressBackgroundColor={Colors.backgroundSecondary}
						title="Actualizando..."
						titleColor={Colors.textSecondary}
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
							<View style={styles.usernameContainer}>
								<Text style={styles.username}>@{user.username}</Text>
								{user.has_premium_content && user.subscription_price > 0 && (
									<View style={styles.subscriptionBadge}>
										<MaterialCommunityIcons
											name="crown"
											size={12}
											color={Colors.premium}
										/>
										<Text style={styles.subscriptionBadgeText}>
											{user.subscription_currency === 'EUR'
												? '€'
												: user.subscription_currency === 'USD'
												? '$'
												: user.subscription_currency === 'GBP'
												? '£'
												: user.subscription_currency === 'JPY'
												? '¥'
												: user.subscription_currency === 'CNY'
												? '¥'
												: user.subscription_currency === 'KRW'
												? '₩'
												: user.subscription_currency === 'BRL'
												? 'R$'
												: user.subscription_currency === 'ARS'
												? '$'
												: user.subscription_currency === 'MXN'
												? '$'
												: '$'}
											{user.subscription_price.toFixed(2)}/mes
										</Text>
									</View>
								)}
							</View>

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

					{/* Action Buttons */}
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
						
						<TouchableOpacity
							style={styles.analyticsButton}
							onPress={handleAudienceCenter}
							activeOpacity={0.8}
						>
							<Feather name="bar-chart-2" size={16} color={Colors.primary} />
							<Text style={styles.analyticsButtonText}>
								Analíticas
							</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* Content Tabs */}
				<View style={styles.tabsContainer}>
					{/* Video tabs - show either "Videos" or "Públicos/Premium" based on user settings */}
					{user?.has_premium_content ? (
						<>
							{/* Públicos */}
							<TouchableOpacity
								style={[
									styles.tab,
									styles.tabWithFour,
									currentTab === 'public' && styles.activeTab,
								]}
								onPress={() => setCurrentTab('public')}
							>
								<Feather
									name="globe"
									size={16}
									color={
										currentTab === 'public'
											? Colors.primary
											: Colors.textTertiary
									}
								/>
								<Text
									style={[
										styles.tabText,
										styles.tabTextWithFour,
										currentTab === 'public' && styles.activeTabText,
									]}
								>
									Públicos
								</Text>
							</TouchableOpacity>

							{/* Premium */}
							<TouchableOpacity
								style={[
									styles.tab,
									styles.tabWithFour,
									currentTab === 'premium' && styles.activeTab,
								]}
								onPress={() => setCurrentTab('premium')}
							>
								<MaterialCommunityIcons
									name="crown"
									size={16}
									color={
										currentTab === 'premium'
											? Colors.primary
											: Colors.textTertiary
									}
								/>
								<Text
									style={[
										styles.tabText,
										styles.tabTextWithFour,
										currentTab === 'premium' && styles.activeTabText,
									]}
								>
									Premium
								</Text>
							</TouchableOpacity>

							{/* Ocultos */}
							<TouchableOpacity
								style={[
									styles.tab,
									styles.tabWithFour,
									currentTab === 'hidden' && styles.activeTab,
								]}
								onPress={() => setCurrentTab('hidden')}
							>
								<Feather
									name="eye-off"
									size={16}
									color={
										currentTab === 'hidden'
											? Colors.primary
											: Colors.textTertiary
									}
								/>
								<Text
									style={[
										styles.tabText,
										styles.tabTextWithFour,
										currentTab === 'hidden' && styles.activeTabText,
									]}
								>
									Ocultos
								</Text>
							</TouchableOpacity>

							{/* Me gusta - al final */}
							<TouchableOpacity
								style={[
									styles.tab,
									styles.tabWithFour,
									currentTab === 'liked' && styles.activeTab,
								]}
								onPress={() => setCurrentTab('liked')}
							>
								<Feather
									name="heart"
									size={16}
									color={
										currentTab === 'liked'
											? Colors.primary
											: Colors.textTertiary
									}
								/>
								<Text
									style={[
										styles.tabText,
										styles.tabTextWithFour,
										currentTab === 'liked' && styles.activeTabText,
									]}
								>
									{t('profile.likes')}
								</Text>
							</TouchableOpacity>
						</>
					) : (
						<>
							{/* Videos */}
							<TouchableOpacity
								style={[
									styles.tab,
									currentTab === 'videos' && styles.activeTab,
								]}
								onPress={() => setCurrentTab('videos')}
							>
								<Feather
									name="grid"
									size={20}
									color={
										currentTab === 'videos'
											? Colors.primary
											: Colors.textTertiary
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

							{/* Me gusta */}
							<TouchableOpacity
								style={[styles.tab, currentTab === 'liked' && styles.activeTab]}
								onPress={() => setCurrentTab('liked')}
							>
								<Feather
									name="heart"
									size={20}
									color={
										currentTab === 'liked'
											? Colors.primary
											: Colors.textTertiary
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

							{/* Ocultos */}
							<TouchableOpacity
								style={[
									styles.tab,
									currentTab === 'hidden' && styles.activeTab,
								]}
								onPress={() => setCurrentTab('hidden')}
							>
								<Feather
									name="eye-off"
									size={20}
									color={
										currentTab === 'hidden'
											? Colors.primary
											: Colors.textTertiary
									}
								/>
								<Text
									style={[
										styles.tabText,
										currentTab === 'hidden' && styles.activeTabText,
									]}
								>
									Ocultos
								</Text>
							</TouchableOpacity>
						</>
					)}
				</View>

				{/* Sort Controls - Show when in video tabs (videos, public, or premium) */}
				{(currentTab === 'videos' ||
					currentTab === 'public' ||
					currentTab === 'premium') && (
					<SortControls currentSort={sortOption} onSortChange={setSortOption} />
				)}

				{/* Video Grid */}
				<View style={styles.videosContainer}>
					<FlatList
						data={getCurrentVideos()}
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
		width: 44, // Same width as buttons section for centering
	},
	headerButtons: {
		flexDirection: 'row',
		gap: 8,
	},
	headerButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
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
		fontFamily: 'Raleway-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginBottom: 2,
	},
	usernameContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
		gap: 8,
	},
	username: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
	},
	subscriptionBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'rgba(255, 215, 0, 0.1)',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
		gap: 3,
	},
	subscriptionBadgeText: {
		fontSize: 10,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.premium,
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
		fontFamily: 'Raleway-SemiBold',
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
	analyticsButton: {
		flex: 1,
		backgroundColor: 'rgba(255, 107, 129, 0.1)',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: Colors.primary,
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
		gap: 8,
	},
	analyticsButtonText: {
		fontSize: 14,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '500',
		color: Colors.primary,
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
	tabWithFour: {
		gap: 4, // Reduce gap when there are 4 tabs
		paddingVertical: 14,
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
	tabTextWithFour: {
		fontSize: 12, // Smaller text when there are 4 tabs
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
		justifyContent: 'flex-start',
		gap: 8,
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
		fontFamily: 'Raleway-SemiBold',
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
		transform: [{ translateX: -20 }, { translateY: -20 }],
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
	sortContainer: {
		flexDirection: 'row',
		paddingHorizontal: 16,
		paddingTop: 20,
		paddingBottom: 8,
		backgroundColor: Colors.background,
		gap: 8,
	},
	sortButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 20,
		backgroundColor: Colors.backgroundSecondary,
		borderWidth: 1,
		borderColor: Colors.borderSecondary,
		gap: 6,
	},
	activeSortButton: {
		backgroundColor: 'rgba(255, 107, 129, 0.1)',
		borderColor: Colors.primary,
	},
	sortButtonText: {
		fontSize: 12,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.textTertiary,
	},
	activeSortButtonText: {
		color: Colors.primary,
	},
});
