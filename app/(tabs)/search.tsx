import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import {
	Alert,
	FlatList,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HashtagVideoGrid } from '@/components/hashtag/HashtagVideoGrid';
import { Input } from '@/components/ui/Input';
import { Colors } from '@/constants/Colors';
import { useRequireAuth } from '@/hooks/useAuth';
import { useHashtagSearch, useHashtagVideos } from '@/hooks/useHashtagSearch';
import { useSearch } from '@/hooks/useSearch';
import { useTranslation } from '@/hooks/useTranslation';
import { useUserInteractions } from '@/hooks/useUserInteractions';
import { formatNumber } from '@/shared/functions/utils';
import { UserProfile, Video } from '@/shared/types';

// Component for user item
const UserItem: React.FC<{
	user: UserProfile;
	onPress: () => void;
	onFollowPress: () => void;
	isFollowLoading: boolean;
}> = ({ user, onPress, onFollowPress, isFollowLoading }) => {
	return (
		<TouchableOpacity style={styles.userItem} onPress={onPress}>
			<View style={styles.userAvatar}>
				<Feather name="user" size={24} color={Colors.textTertiary} />
			</View>
			<View style={styles.userInfo}>
				<Text style={styles.username}>@{user.username}</Text>
				<Text style={styles.displayName}>
					{user.display_name || user.username}
				</Text>
				<Text style={styles.followers}>
					{formatNumber(user.followers_count)} seguidores
				</Text>
			</View>
			<TouchableOpacity
				style={[
					styles.followButton,
					user.is_following && styles.followingButton,
					isFollowLoading && styles.loadingButton,
				]}
				onPress={onFollowPress}
				disabled={isFollowLoading}
			>
				<Text
					style={[
						styles.followButtonText,
						user.is_following && styles.followingButtonText,
					]}
				>
					{isFollowLoading
						? 'Cargando...'
						: user.is_following
						? 'Siguiendo'
						: 'Seguir'}
				</Text>
			</TouchableOpacity>
		</TouchableOpacity>
	);
};

// Component for hashtag item
const HashtagItem: React.FC<{
	hashtag: string;
	count: number;
	onPress: () => void;
}> = ({ hashtag, count, onPress }) => {
	return (
		<TouchableOpacity style={styles.hashtagItem} onPress={onPress}>
			<View style={styles.hashtagIcon}>
				<Feather name="hash" size={24} color={Colors.primary} />
			</View>
			<View style={styles.hashtagInfo}>
				<Text style={styles.hashtagName}>#{hashtag}</Text>
				<Text style={styles.hashtagCount}>{formatNumber(count)} videos</Text>
			</View>
		</TouchableOpacity>
	);
};

// Component for search suggestions
const SearchSuggestions: React.FC<{
	suggestions: string[];
	onSuggestionPress: (suggestion: string) => void;
}> = ({ suggestions, onSuggestionPress }) => {
	if (suggestions.length === 0) return null;

	return (
		<View style={styles.suggestionsContainer}>
			<Text style={styles.suggestionsTitle}>Sugerencias</Text>
			{suggestions.map((suggestion, index) => (
				<TouchableOpacity
					key={index}
					style={styles.suggestionItem}
					onPress={() => onSuggestionPress(suggestion)}
				>
					<Feather
						name={suggestion.startsWith('@') ? 'user' : 'hash'}
						size={16}
						color={Colors.textTertiary}
					/>
					<Text style={styles.suggestionText}>{suggestion}</Text>
				</TouchableOpacity>
			))}
		</View>
	);
};

export default function SearchScreen() {
	const { t } = useTranslation();
	const { user } = useRequireAuth();
	const { handleFollow } = useUserInteractions();

	const [currentTab, setCurrentTab] = useState<'users' | 'hashtags'>('users');

	const {
		query,
		isSearching,
		results,
		suggestions,
		error,
		hasMore,
		handleSearch,
		handleLoadMore,
		clearSearch,
		isEmpty,
		hasQuery,
		canLoadMore,
		updateUserInResults,
	} = useSearch(currentTab, user?.id);

	// Hashtag trending hook
	const {
		trendingHashtags,
		isLoadingTrending,
		trendingError,
		loadTrendingHashtags,
	} = useHashtagSearch(user?.id);

	// Handle user press - navigate to profile
	const handleUserPress = useCallback((userId: string) => {
		router.push(`/user/${userId}`);
	}, []);

	// Handle hashtag press - navigate directly to hashtag screen
	const handleHashtagPress = useCallback((hashtag: string) => {
		router.push({
			pathname: '/hashtag/[hashtag]',
			params: { 
				hashtag: encodeURIComponent(hashtag)
			},
		});
	}, []);

	// Handle follow user
	const handleFollowUser = useCallback(
		async (userId: string) => {
			try {
				const isNowFollowing = await handleFollow(userId);
				const currentUser = results.users.find((u) => u.id === userId);
				if (currentUser) {
					updateUserInResults(userId, {
						is_following: isNowFollowing,
						followers_count:
							currentUser.followers_count + (isNowFollowing ? 1 : -1),
					});
				}
			} catch (error) {
				console.error('Follow error:', error);
				Alert.alert('Error', 'No se pudo procesar la acción');
			}
		},
		[handleFollow, updateUserInResults, results.users],
	);

	// Handle suggestion press
	const handleSuggestionPress = useCallback(
		(suggestion: string) => {
			// Remove @ or # prefix for search
			const cleanSuggestion = suggestion.replace(/^[@#]/, '');
			handleSearch(cleanSuggestion);
		},
		[handleSearch],
	);

	// Render user item
	const renderUserItem = ({ item }: { item: UserProfile }) => (
		<UserItem
			user={item}
			onPress={() => handleUserPress(item.id)}
			onFollowPress={() => handleFollowUser(item.id)}
			isFollowLoading={false} // You can add loading state per user if needed
		/>
	);

	// Render hashtag item
	const renderHashtagItem = ({
		item,
	}: {
		item: { hashtag: string; count: number };
	}) => (
		<HashtagItem
			hashtag={item.hashtag}
			count={item.count}
			onPress={() => handleHashtagPress(item.hashtag)}
		/>
	);

	// Render empty state
	const renderEmptyState = () => (
		<View style={styles.emptyState}>
			{!hasQuery ? (
				<>
					<Feather name="search" size={48} color={Colors.textTertiary} />
					<Text style={styles.emptyTitle}>{t('search.searchPlaceholder')}</Text>
					<Text style={styles.emptySubtitle}>
						Busca usuarios, hashtags y contenido
					</Text>
				</>
			) : (
				<>
					<Feather name="inbox" size={48} color={Colors.textTertiary} />
					<Text style={styles.emptyTitle}>
						{currentTab === 'users'
							? t('search.noUsersFound')
							: 'No se encontraron hashtags'}
					</Text>
					<Text style={styles.emptySubtitle}>
						Intenta con una búsqueda diferente
					</Text>
				</>
			)}
		</View>
	);

	// Render trending hashtags when no search query
	const renderTrendingHashtags = () => (
		<FlatList
			data={trendingHashtags}
			renderItem={({ item }) => (
				<HashtagItem
					hashtag={item.hashtag}
					count={item.count}
					onPress={() => handleHashtagPress(item.hashtag)}
				/>
			)}
			keyExtractor={(item) => item.hashtag}
			style={styles.list}
			showsVerticalScrollIndicator={false}
			ListHeaderComponent={() => (
				<View style={styles.trendingHeader}>
					<Feather name="trending-up" size={20} color={Colors.primary} />
					<Text style={styles.trendingTitle}>Hashtags trending</Text>
				</View>
			)}
			refreshing={isLoadingTrending}
			onRefresh={loadTrendingHashtags}
		/>
	);

	// Render loading footer
	const renderFooter = () => {
		if (!isSearching || !canLoadMore) return null;

		return (
			<View style={styles.loadingFooter}>
				<Text style={styles.loadingText}>Cargando más resultados...</Text>
			</View>
		);
	};

	if (!user) {
		return null; // useRequireAuth will handle redirect
	}

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			<StatusBar style="light" />

			{/* Header */}
			<View style={styles.header}>
				<Input
					value={query}
					onChangeText={handleSearch}
					placeholder={t('search.searchPlaceholder')}
					leftIcon="search"
					rightIcon={hasQuery ? 'x' : undefined}
					onRightIconPress={hasQuery ? clearSearch : undefined}
					containerStyle={styles.searchContainer}
					autoCapitalize="none"
					autoCorrect={false}
					returnKeyType="search"
					isLoading={isSearching}
				/>

				{/* Show suggestions when typing */}
				{suggestions.length > 0 && hasQuery && (
					<SearchSuggestions
						suggestions={suggestions}
						onSuggestionPress={handleSuggestionPress}
					/>
				)}

				{/* Tabs */}
				<View style={styles.tabContainer}>
					<TouchableOpacity
						style={[styles.tab, currentTab === 'users' && styles.activeTab]}
						onPress={() => setCurrentTab('users')}
					>
						<Text
							style={[
								styles.tabText,
								currentTab === 'users' && styles.activeTabText,
							]}
						>
							{t('search.users')}
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.tab, currentTab === 'hashtags' && styles.activeTab]}
						onPress={() => setCurrentTab('hashtags')}
					>
						<Text
							style={[
								styles.tabText,
								currentTab === 'hashtags' && styles.activeTabText,
							]}
						>
							{t('search.hashtags')}
						</Text>
					</TouchableOpacity>
				</View>
			</View>

			{/* Results */}
			<View style={styles.content}>
				{currentTab === 'users' ? (
					<FlatList
						data={results.users}
						renderItem={renderUserItem}
						keyExtractor={(item) => item.id}
						style={styles.list}
						showsVerticalScrollIndicator={false}
						ListEmptyComponent={renderEmptyState}
						ListFooterComponent={renderFooter}
						onEndReached={canLoadMore ? handleLoadMore : undefined}
						onEndReachedThreshold={0.5}
					/>
				) : hasQuery ? (
					// Show search results for hashtags
					<FlatList
						data={results.hashtags}
						renderItem={renderHashtagItem}
						keyExtractor={(item) => item.hashtag}
						style={styles.list}
						showsVerticalScrollIndicator={false}
						ListEmptyComponent={renderEmptyState}
						ListFooterComponent={renderFooter}
						onEndReached={canLoadMore ? handleLoadMore : undefined}
						onEndReachedThreshold={0.5}
					/>
				) : (
					// Show trending hashtags when no search query
					renderTrendingHashtags()
				)}
			</View>

			{/* Error message */}
			{error && (
				<View style={styles.errorContainer}>
					<Text style={styles.errorText}>{error}</Text>
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
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: Colors.background,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
		position: 'relative',
		zIndex: 10,
	},
	searchContainer: {
		marginBottom: 16,
	},
	suggestionsContainer: {
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 8,
		padding: 12,
		marginBottom: 16,
		position: 'absolute',
		top: 70,
		left: 16,
		right: 16,
		zIndex: 20,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		elevation: 5,
	},
	suggestionsTitle: {
		fontSize: 14,
		fontFamily: 'Inter-SemiBold',
		color: Colors.textSecondary,
		marginBottom: 8,
	},
	suggestionItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
		gap: 8,
	},
	suggestionText: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
	},
	tabContainer: {
		flexDirection: 'row',
		gap: 0,
	},
	tab: {
		flex: 1,
		paddingVertical: 12,
		alignItems: 'center',
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
	},
	activeTabText: {
		color: Colors.text,
	},
	content: {
		flex: 1,
	},
	list: {
		flex: 1,
	},
	userItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
	},
	userAvatar: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: Colors.backgroundSecondary,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	userInfo: {
		flex: 1,
	},
	username: {
		fontSize: 16,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginBottom: 2,
	},
	displayName: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		marginBottom: 2,
	},
	followers: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
	followButton: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: Colors.primary,
		backgroundColor: 'transparent',
	},
	followingButton: {
		backgroundColor: Colors.primary,
	},
	loadingButton: {
		opacity: 0.6,
	},
	followButtonText: {
		fontSize: 14,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.primary,
	},
	followingButtonText: {
		color: Colors.text,
	},
	hashtagItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
	},
	hashtagIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: Colors.premiumBackground,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	hashtagInfo: {
		flex: 1,
	},
	hashtagName: {
		fontSize: 16,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginBottom: 2,
	},
	hashtagCount: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
	emptyState: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 32,
		marginTop: 20,
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
	errorContainer: {
		position: 'absolute',
		bottom: 100,
		left: 16,
		right: 16,
		backgroundColor: Colors.error,
		borderRadius: 8,
		padding: 12,
	},
	errorText: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
		textAlign: 'center',
	},
	trendingHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 16,
		gap: 8,
	},
	trendingTitle: {
		fontSize: 18,
		fontFamily: 'Inter-Bold',
		fontWeight: 'bold',
		color: Colors.text,
	},
	hashtagVideosContainer: {
		flex: 1,
	},
	hashtagVideosHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: Colors.backgroundSecondary,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
		gap: 12,
	},
	backButton: {
		width: 32,
		height: 32,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 16,
		backgroundColor: Colors.background,
	},
	hashtagVideosTitle: {
		fontSize: 18,
		fontFamily: 'Inter-Bold',
		fontWeight: 'bold',
		color: Colors.text,
		flex: 1,
	},
});
