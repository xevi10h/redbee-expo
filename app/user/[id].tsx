import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router, useLocalSearchParams } from 'expo-router';
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
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { useUserProfile } from '@/hooks/useUserProfile';
import { formatCurrency, formatNumber } from '@/shared/functions/utils';
import { Video } from '@/shared/types';

const { width } = Dimensions.get('window');
const videoWidth = (width - 32 - 16) / 3; // Account for padding and gaps

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

export default function UserProfileScreen() {
	const { t } = useTranslation();
	const { user: currentUser } = useAuth();
	const { id } = useLocalSearchParams<{ id: string }>();

	const {
		userProfile,
		userVideos,
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
	} = useUserProfile(id!, currentUser?.id);

	const [currentTab, setCurrentTab] = useState<'videos' | 'liked'>('videos');

	// Load user videos when component mounts
	useEffect(() => {
		if (userProfile) {
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

	const handleSubscribePress = useCallback(async () => {
		try {
			await handleSubscribe();
		} catch (error) {
			Alert.alert(t('common.error'), 'No se pudo procesar la suscripción');
		}
	}, [handleSubscribe, t]);

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

	const renderEmptyState = () => (
		<View style={styles.emptyState}>
			<Feather name="video" size={48} color={Colors.textTertiary} />
			<Text style={styles.emptyTitle}>
				{currentTab === 'videos'
					? 'No hay videos'
					: 'No hay videos que le gusten'}
			</Text>
			<Text style={styles.emptySubtitle}>
				{currentTab === 'videos'
					? 'Este usuario aún no ha publicado videos'
					: 'Este usuario no ha dado like a ningún video'}
			</Text>
		</View>
	);

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

							{userProfile.subscription_price > 0 && (
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
					{isLoadingVideos ? (
						<View style={styles.loadingVideos}>
							<Text style={styles.loadingText}>Cargando videos...</Text>
						</View>
					) : (
						<FlatList
							data={currentTab === 'videos' ? userVideos : []}
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
					)}
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
		fontFamily: 'Poppins-SemiBold',
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
		fontFamily: 'Poppins-SemiBold',
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
		fontFamily: 'Poppins-SemiBold',
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
});
