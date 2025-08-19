import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
	Alert,
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
import { SubscriptionModal } from '@/components/modals/SubscriptionModal';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { useUserProfile, VideoSortOption } from '@/hooks/useUserProfile';
import { formatCurrency, formatNumber } from '@/shared/functions/utils';
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

// Avatar component with proper image handling
const UserAvatar: React.FC<{
	avatarUrl?: string;
	size?: number;
	username?: string;
}> = ({ avatarUrl, size = 64, username }) => {
	const [imageError, setImageError] = useState(false);

	if (!avatarUrl || imageError) {
		return (
			<View style={[styles.avatarContainer, { width: size, height: size }]}>
				<LinearGradient
					colors={Colors.gradientPrimary}
					style={[
						styles.avatarGradient,
						{ width: size, height: size, borderRadius: size / 2 },
					]}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 0 }}
				>
					<Feather name="user" size={size * 0.4} color={Colors.text} />
				</LinearGradient>
			</View>
		);
	}

	return (
		<View style={[styles.avatarContainer, { width: size, height: size }]}>
			<Image
				source={{ uri: avatarUrl }}
				style={[
					styles.avatarImage,
					{ width: size, height: size, borderRadius: size / 2 },
				]}
				contentFit="cover"
				onError={() => setImageError(true)}
			/>
		</View>
	);
};

// Video thumbnail component with proper cover image display
const VideoThumbnail: React.FC<{ video: Video; onPress: () => void }> = ({
	video,
	onPress,
}) => {
	const [imageError, setImageError] = useState(false);

	return (
		<TouchableOpacity style={styles.videoThumbnail} onPress={onPress}>
			<View style={styles.thumbnailContainer}>
				{/* Show thumbnail image if available, otherwise show placeholder */}
				{video.thumbnail_url && !imageError ? (
					<Image
						source={{ uri: video.thumbnail_url }}
						style={styles.thumbnailImage}
						resizeMode="cover"
						onError={() => setImageError(true)}
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

export default function UserProfileScreen() {
	const { t } = useTranslation();
	const { user: currentUser } = useAuth();
	const { id } = useLocalSearchParams<{ id: string }>();

	const {
		userProfile,
		userVideos,
		sortOption,
		isLoading,
		isLoadingVideos,
		error,
		isFollowing,
		isSubscribed,
		handleFollow,
		handleSubscribe,
		handleBlock,
		handleReport,
		loadUserVideos,
		setSortOption,
	} = useUserProfile(id!, currentUser?.id);

	type ExternalProfileTab = 'public' | 'premium' | 'videos';

	// Determine initial tab based on user's premium content setting
	const getInitialTab = (): ExternalProfileTab => {
		if (userProfile?.has_premium_content) {
			return 'public'; // Start with public when user has premium content
		}
		return 'videos'; // Start with videos when user doesn't have premium content
	};

	const [currentTab, setCurrentTab] = useState<ExternalProfileTab>('public');
	const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
	const [subscriptionLoading, setSubscriptionLoading] = useState(false);

	// Update tab when userProfile loads and changes
	useEffect(() => {
		if (userProfile) {
			const initialTab = getInitialTab();
			setCurrentTab(initialTab);
			loadUserVideos();
		}
	}, [userProfile, loadUserVideos]);

	const handleVideoPress = useCallback((video: Video) => {
		router.push(`/video/${video.id}`);
	}, []);

	const handleFollowPress = useCallback(async () => {
		try {
			await handleFollow();
		} catch (error) {
			Alert.alert(t('common.error'), 'No se pudo procesar la acción');
		}
	}, [handleFollow, t]);

	const handleSubscribePress = useCallback(() => {
		setShowSubscriptionModal(true);
	}, []);

	const handleSubscriptionConfirm = useCallback(async () => {
		setSubscriptionLoading(true);
		try {
			if (isSubscribed) {
				// Handle unsubscribe
				const { SubscriptionService } = await import('@/services/subscriptionService');
				
				// Get user's subscription to this creator
				const { data: subscriptions } = await SubscriptionService.getAllUserSubscriptions(currentUser?.id || '');
				const subscription = subscriptions.find(sub => sub.creator_id === id && sub.status === 'active');
				
				if (subscription) {
					const result = await SubscriptionService.cancelSubscription(subscription.stripe_subscription_id!);
					if (result.success) {
						Alert.alert(
							'Suscripción cancelada',
							'Tu suscripción ha sido cancelada. Mantendrás acceso hasta el final del período actual.',
							[{ text: 'Entendido' }]
						);
						// Refresh the profile to update subscription state
						router.replace(`/user/${id}`);
					} else {
						throw new Error(result.error);
					}
				}
			} else {
				// Handle subscribe
				await handleSubscribe();
			}
		} catch (error) {
			Alert.alert(t('common.error'), 'No se pudo procesar la acción');
		} finally {
			setSubscriptionLoading(false);
		}
	}, [isSubscribed, handleSubscribe, currentUser?.id, id, t]);

	const handleBackPress = useCallback(() => {
		router.back();
	}, []);

	const handleShareProfile = useCallback(() => {
		// TODO: Implement share functionality
		Alert.alert('Compartir perfil', 'Funcionalidad próximamente');
	}, []);

	const handleMoreOptions = useCallback(() => {
		Alert.alert('Opciones', '¿Qué deseas hacer?', [
			{ text: t('common.cancel'), style: 'cancel' },
			{
				text: 'Reportar usuario',
				style: 'destructive',
				onPress: () => handleReport('inappropriate'),
			},
			{
				text: 'Bloquear usuario',
				style: 'destructive',
				onPress: () => handleBlock(),
			},
		]);
	}, [t, handleReport, handleBlock]);

	const renderVideoItem = ({ item }: { item: Video }) => (
		<VideoThumbnail video={item} onPress={() => handleVideoPress(item)} />
	);

	// Filtrar videos según la tab activa
	const filteredVideos = React.useMemo(() => {
		if (currentTab === 'public') {
			return userVideos.filter((video) => !video.is_premium);
		} else if (currentTab === 'premium') {
			return userVideos.filter((video) => video.is_premium);
		} else {
			// currentTab === 'videos'
			return userVideos;
		}
	}, [userVideos, currentTab]);

	const renderEmptyState = () => {
		const getEmptyStateConfig = () => {
			switch (currentTab) {
				case 'public':
					return {
						icon: 'globe',
						title: 'No hay videos públicos',
						subtitle: 'Este usuario no ha publicado videos públicos',
					};
				case 'premium':
					return {
						icon: 'crown',
						title: 'No hay videos premium',
						subtitle: 'Este usuario no tiene contenido premium',
					};
				case 'videos':
				default:
					return {
						icon: 'video',
						title: 'No hay videos',
						subtitle: 'Este usuario no ha publicado videos',
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

	if (isLoading) {
		return (
			<SafeAreaView style={styles.container} edges={['top']}>
				<StatusBar style="light" />
				<Stack.Screen
					options={{
						headerShown: true,
						title: 'Perfil',
						headerStyle: { backgroundColor: Colors.background },
						headerTintColor: Colors.text,
						headerLeft: () => (
							<TouchableOpacity onPress={handleBackPress}>
								<Feather name="arrow-left" size={24} color={Colors.text} />
							</TouchableOpacity>
						),
					}}
				/>
				<View style={styles.loadingContainer}>
					<Text style={styles.loadingText}>Cargando perfil...</Text>
				</View>
			</SafeAreaView>
		);
	}

	if (error || !userProfile) {
		return (
			<SafeAreaView style={styles.container} edges={['top']}>
				<StatusBar style="light" />
				<Stack.Screen
					options={{
						headerShown: true,
						title: 'Error',
						headerStyle: { backgroundColor: Colors.background },
						headerTintColor: Colors.text,
						headerLeft: () => (
							<TouchableOpacity onPress={handleBackPress}>
								<Feather name="arrow-left" size={24} color={Colors.text} />
							</TouchableOpacity>
						),
					}}
				/>
				<View style={styles.errorContainer}>
					<Feather name="user-x" size={48} color={Colors.error} />
					<Text style={styles.errorTitle}>Usuario no encontrado</Text>
					<Text style={styles.errorText}>
						{error || 'No se pudo cargar el perfil del usuario'}
					</Text>
					<Button
						title="Volver"
						onPress={handleBackPress}
						style={styles.backButton}
					/>
				</View>
			</SafeAreaView>
		);
	}

	const isOwnProfile = currentUser?.id === userProfile.id;

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			<StatusBar style="light" />
			<Stack.Screen
				options={{
					headerShown: true,
					title: userProfile.display_name || userProfile.username,
					headerStyle: { backgroundColor: Colors.background },
					headerTintColor: Colors.text,
					headerLeft: () => (
						<TouchableOpacity onPress={handleBackPress}>
							<Feather name="arrow-left" size={24} color={Colors.text} />
						</TouchableOpacity>
					),
					headerRight: () => (
						<View style={styles.headerActions}>
							<TouchableOpacity
								onPress={handleShareProfile}
								style={styles.headerButton}
							>
								<Feather name="share" size={20} color={Colors.text} />
							</TouchableOpacity>
							{!isOwnProfile && (
								<TouchableOpacity
									onPress={handleMoreOptions}
									style={styles.headerButton}
								>
									<Feather name="more-vertical" size={20} color={Colors.text} />
								</TouchableOpacity>
							)}
						</View>
					),
				}}
			/>

			<ScrollView
				style={styles.scrollContainer}
				showsVerticalScrollIndicator={false}
			>
				{/* Header - Compact version */}
				<View style={styles.header}>
					<View style={styles.topSection}>
						<UserAvatar
							avatarUrl={userProfile.avatar_url}
							size={72}
							username={userProfile.username}
						/>

						<View style={styles.userInfo}>
							<Text style={styles.displayName}>
								{userProfile.display_name || userProfile.username}
							</Text>
							<Text style={styles.username}>@{userProfile.username}</Text>

							{/* Stats */}
							<View style={styles.statsContainer}>
								<View style={styles.stat}>
									<Text style={styles.statNumber}>
										{formatNumber(userProfile.videos_count)}
									</Text>
									<Text style={styles.statLabel}>{t('profile.videos')}</Text>
								</View>
								<View style={styles.stat}>
									<Text style={styles.statNumber}>
										{formatNumber(userProfile.followers_count)}
									</Text>
									<Text style={styles.statLabel}>{t('profile.followers')}</Text>
								</View>
								<View style={styles.stat}>
									<Text style={styles.statNumber}>
										{formatNumber(userProfile.subscribers_count)}
									</Text>
									<Text style={styles.statLabel}>Suscriptores</Text>
								</View>
							</View>
						</View>
					</View>

					{userProfile.bio && <Text style={styles.bio}>{userProfile.bio}</Text>}

					{/* Action Buttons */}
					{!isOwnProfile && (
						<View style={styles.actionButtons}>
							<TouchableOpacity
								style={styles.followButton}
								onPress={handleFollowPress}
								activeOpacity={0.8}
							>
								<MaterialCommunityIcons
									name={isFollowing ? 'check' : 'plus'}
									size={16}
									color={Colors.textSecondary}
								/>
								<Text style={styles.followButtonText}>
									{isFollowing ? 'Siguiendo' : 'Seguir'}
								</Text>
							</TouchableOpacity>

							{userProfile.has_premium_content &&
								userProfile.subscription_price > 0 && (
									<TouchableOpacity
										style={styles.subscribeButton}
										onPress={handleSubscribePress}
										activeOpacity={0.8}
									>
										<LinearGradient
											colors={
												isSubscribed
													? [
															Colors.backgroundSecondary,
															Colors.backgroundSecondary,
													  ]
													: Colors.gradientPrimary
											}
											style={styles.subscribeGradient}
											start={{ x: 0, y: 0 }}
											end={{ x: 1, y: 0 }}
										>
											<MaterialCommunityIcons
												name="crown"
												size={16}
												color={Colors.text}
											/>
											<View style={styles.subscribeTextContainer}>
												<Text style={styles.subscribeText}>
													{isSubscribed ? 'Suscrito' : 'Suscribirse'}
												</Text>
												{!isSubscribed && (
													<Text style={styles.subscribePrice}>
														{formatCurrency(
															userProfile.subscription_price,
															userProfile.subscription_currency,
														)}
														/mes
													</Text>
												)}
											</View>
										</LinearGradient>
									</TouchableOpacity>
								)}
						</View>
					)}
				</View>

				{/* Content Tabs */}
				<View style={styles.tabsContainer}>
					{/* Video tabs - show either "Videos" or "Públicos/Premium" based on user settings */}
					{userProfile.has_premium_content ? (
						<>
							<TouchableOpacity
								style={[
									styles.tab,
									currentTab === 'public' && styles.activeTab,
								]}
								onPress={() => setCurrentTab('public')}
							>
								<Feather
									name="globe"
									size={20}
									color={
										currentTab === 'public'
											? Colors.primary
											: Colors.textTertiary
									}
								/>
								<Text
									style={[
										styles.tabText,
										currentTab === 'public' && styles.activeTabText,
									]}
								>
									Públicos
								</Text>
							</TouchableOpacity>

							<TouchableOpacity
								style={[
									styles.tab,
									currentTab === 'premium' && styles.activeTab,
								]}
								onPress={() => setCurrentTab('premium')}
							>
								<MaterialCommunityIcons
									name="crown"
									size={20}
									color={
										currentTab === 'premium'
											? Colors.primary
											: Colors.textTertiary
									}
								/>
								<Text
									style={[
										styles.tabText,
										currentTab === 'premium' && styles.activeTabText,
									]}
								>
									Premium
								</Text>
							</TouchableOpacity>
						</>
					) : (
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
								Vídeos
							</Text>
						</TouchableOpacity>
					)}
				</View>

				{/* Sort Controls */}
				<SortControls currentSort={sortOption} onSortChange={setSortOption} />

				{/* Video Grid */}
				<View style={styles.videosContainer}>
					{isLoadingVideos ? (
						<View style={styles.loadingVideos}>
							<Text style={styles.loadingText}>Cargando videos...</Text>
						</View>
					) : (
						<FlatList
							data={filteredVideos}
							renderItem={renderVideoItem}
							keyExtractor={(item) => item.id}
							numColumns={3}
							scrollEnabled={false}
							contentContainerStyle={styles.videoGrid}
							ItemSeparatorComponent={() => (
								<View style={styles.videoSeparator} />
							)}
							columnWrapperStyle={styles.videoRowStart}
							ListEmptyComponent={renderEmptyState}
						/>
					)}
				</View>
			</ScrollView>

			{/* Subscription Modal */}
			<SubscriptionModal
				visible={showSubscriptionModal}
				onClose={() => setShowSubscriptionModal(false)}
				onConfirm={handleSubscriptionConfirm}
				creatorName={userProfile?.display_name || userProfile?.username || ''}
				price={userProfile?.subscription_price || 0}
				currency={userProfile?.subscription_currency || 'USD'}
				isSubscribed={isSubscribed}
				loading={subscriptionLoading}
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	scrollContainer: {
		flex: 1,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 24,
	},
	loadingText: {
		fontSize: 16,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 24,
	},
	errorTitle: {
		fontSize: 20,
		fontFamily: 'Raleway-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginTop: 16,
		marginBottom: 8,
		textAlign: 'center',
	},
	errorText: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
		lineHeight: 20,
		marginBottom: 24,
	},
	backButton: {
		width: 120,
	},
	headerActions: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	headerButton: {
		marginLeft: 16,
		padding: 4,
	},
	header: {
		paddingHorizontal: 20,
		paddingVertical: 16, // Reduced from 24
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
	},
	topSection: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: 12, // Reduced from 16
	},
	avatarContainer: {
		marginRight: 16,
	},
	avatarImage: {
		backgroundColor: Colors.backgroundSecondary,
	},
	avatarGradient: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	userInfo: {
		flex: 1,
	},
	displayName: {
		fontSize: 20, // Reduced from 24
		fontFamily: 'Raleway-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginBottom: 2,
	},
	username: {
		fontSize: 14, // Reduced from 16
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		marginBottom: 12, // Reduced from 16
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
		gap: 24, // Reduced from 32
	},
	stat: {
		alignItems: 'center',
	},
	statNumber: {
		fontSize: 18, // Reduced from 20
		fontFamily: 'Raleway-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginBottom: 2, // Reduced from 4
	},
	statLabel: {
		fontSize: 11, // Reduced from 12
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
	actionButtons: {
		flexDirection: 'row',
		gap: 12,
		marginTop: 16,
		height: 50,
	},
	followButton: {
		flex: 1,
		width: '50%',
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: Colors.borderSecondary,
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
		gap: 4,
	},
	followButtonText: {
		fontSize: 14,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '500',
		color: Colors.textSecondary,
	},
	subscribeButton: {
		flex: 1,
		width: '50%',
		borderRadius: 8,
		overflow: 'hidden',
	},
	subscribeGradient: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 16,
		paddingVertical: 10,
		gap: 8,
		height: '100%',
	},
	subscribeTextContainer: {
		alignItems: 'center',
	},
	subscribeText: {
		fontSize: 14,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
	},
	subscribePrice: {
		fontSize: 10,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
		opacity: 0.8,
		marginTop: 1,
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
	loadingVideos: {
		paddingVertical: 64,
		alignItems: 'center',
	},
	videoGrid: {
		flexGrow: 1,
	},
	videoRow: {
		justifyContent: 'space-between',
	},
	videoRowStart: {
		justifyContent: 'flex-start',
		gap: 8, // Espacio entre videos
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
	thumbnailImage: {
		width: '100%',
		height: '100%',
		backgroundColor: Colors.backgroundSecondary,
	},
	placeholderThumbnail: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: Colors.backgroundSecondary,
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
	sortContainer: {
		flexDirection: 'row',
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: Colors.background,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
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
