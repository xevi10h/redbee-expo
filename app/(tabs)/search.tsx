import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
	FlatList,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Input } from '@/components/ui/Input';
import { useRequireAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { UserProfile } from '@/shared/types';

// Placeholder component for user item
const UserItem: React.FC<{ user: UserProfile }> = ({ user }) => {
	return (
		<TouchableOpacity style={styles.userItem}>
			<View style={styles.userAvatar}>
				<Feather name="user" size={24} color="#6C757D" />
			</View>
			<View style={styles.userInfo}>
				<Text style={styles.username}>@{user.username}</Text>
				<Text style={styles.displayName}>{user.display_name}</Text>
				<Text style={styles.followers}>{user.followers_count} seguidores</Text>
			</View>
			<TouchableOpacity style={styles.followButton}>
				<Text style={styles.followButtonText}>
					{user.is_following ? 'Siguiendo' : 'Seguir'}
				</Text>
			</TouchableOpacity>
		</TouchableOpacity>
	);
};

// Placeholder component for hashtag item
const HashtagItem: React.FC<{ hashtag: string; count: number }> = ({
	hashtag,
	count,
}) => {
	return (
		<TouchableOpacity style={styles.hashtagItem}>
			<View style={styles.hashtagIcon}>
				<Feather name="hash" size={24} color="#E1306C" />
			</View>
			<View style={styles.hashtagInfo}>
				<Text style={styles.hashtagName}>#{hashtag}</Text>
				<Text style={styles.hashtagCount}>{count} videos</Text>
			</View>
		</TouchableOpacity>
	);
};

export default function SearchScreen() {
	const { t } = useTranslation();
	const { user } = useRequireAuth();

	const [searchQuery, setSearchQuery] = useState('');
	const [currentTab, setCurrentTab] = useState<'users' | 'hashtags'>('users');
	const [isSearching, setIsSearching] = useState(false);

	// Mock data
	const mockUsers: UserProfile[] = [
		{
			id: '1',
			email: 'user1@example.com',
			username: 'creator1',
			display_name: 'Creative Creator',
			bio: 'Digital content creator',
			avatar_url: undefined,
			subscription_price: 4.99,
			subscription_currency: 'USD',
			followers_count: 1250,
			subscribers_count: 89,
			videos_count: 45,
			created_at: new Date().toISOString(),
			is_following: false,
			is_subscribed: false,
		},
		{
			id: '2',
			email: 'user2@example.com',
			username: 'premium_creator',
			display_name: 'Premium Creator',
			bio: 'Premium content specialist',
			avatar_url: undefined,
			subscription_price: 9.99,
			subscription_currency: 'USD',
			followers_count: 5600,
			subscribers_count: 234,
			videos_count: 89,
			created_at: new Date().toISOString(),
			is_following: true,
			is_subscribed: false,
		},
	];

	const mockHashtags = [
		{ hashtag: 'vertical', count: 1250 },
		{ hashtag: 'creative', count: 890 },
		{ hashtag: 'premium', count: 456 },
		{ hashtag: 'content', count: 2340 },
	];

	const handleSearch = async (query: string) => {
		setSearchQuery(query);

		if (query.length > 2) {
			setIsSearching(true);

			try {
				// TODO: Implement actual search API call
				// const result = await SearchService.search({
				//   query,
				//   type: currentTab,
				//   limit: 20,
				// });

				// Simulate API call
				await new Promise((resolve) => setTimeout(resolve, 500));
			} catch (error) {
				console.error('Search error:', error);
			} finally {
				setIsSearching(false);
			}
		}
	};

	const renderUserItem = ({ item }: { item: UserProfile }) => (
		<UserItem user={item} />
	);

	const renderHashtagItem = ({
		item,
	}: {
		item: { hashtag: string; count: number };
	}) => <HashtagItem hashtag={item.hashtag} count={item.count} />;

	const renderEmptyState = () => (
		<View style={styles.emptyState}>
			{searchQuery.length === 0 ? (
				<>
					<Feather name="search" size={48} color="#6C757D" />
					<Text style={styles.emptyTitle}>{t('search.searchPlaceholder')}</Text>
					<Text style={styles.emptySubtitle}>
						Busca usuarios, hashtags y contenido
					</Text>
				</>
			) : (
				<>
					<Feather name="inbox" size={48} color="#6C757D" />
					<Text style={styles.emptyTitle}>{t('search.noUsersFound')}</Text>
					<Text style={styles.emptySubtitle}>
						Intenta con una búsqueda diferente
					</Text>
				</>
			)}
		</View>
	);

	if (!user) {
		return null; // useRequireAuth will handle redirect
	}

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			<StatusBar style="light" />

			{/* Header */}
			<View style={styles.header}>
				<Input
					value={searchQuery}
					onChangeText={handleSearch}
					placeholder={t('search.searchPlaceholder')}
					leftIcon="search"
					containerStyle={styles.searchContainer}
					autoCapitalize="none"
					autoCorrect={false}
					returnKeyType="search"
					clearButtonMode="while-editing"
					isLoading={isSearching}
				/>

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
						data={searchQuery.length > 2 ? mockUsers : []}
						renderItem={renderUserItem}
						keyExtractor={(item) => item.id}
						style={styles.list}
						showsVerticalScrollIndicator={false}
						ListEmptyComponent={renderEmptyState}
					/>
				) : (
					<FlatList
						data={searchQuery.length > 2 ? mockHashtags : []}
						renderItem={renderHashtagItem}
						keyExtractor={(item) => item.hashtag}
						style={styles.list}
						showsVerticalScrollIndicator={false}
						ListEmptyComponent={renderEmptyState}
					/>
				)}
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#000000',
	},
	header: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: '#000000',
		borderBottomWidth: 1,
		borderBottomColor: '#1C1C1E',
	},
	searchContainer: {
		marginBottom: 16,
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
		borderBottomColor: '#E1306C',
	},
	tabText: {
		fontSize: 16,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: '#6C757D',
	},
	activeTabText: {
		color: '#FFFFFF',
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
		borderBottomColor: '#1C1C1E',
	},
	userAvatar: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: '#1C1C1E',
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
		color: '#FFFFFF',
		marginBottom: 2,
	},
	displayName: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: '#ADB5BD',
		marginBottom: 2,
	},
	followers: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: '#6C757D',
	},
	followButton: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E1306C',
	},
	followButtonText: {
		fontSize: 14,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: '#E1306C',
	},
	hashtagItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#1C1C1E',
	},
	hashtagIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: 'rgba(225, 48, 108, 0.1)',
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
		color: '#FFFFFF',
		marginBottom: 2,
	},
	hashtagCount: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: '#6C757D',
	},
	emptyState: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 32,
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
		color: '#ADB5BD',
		textAlign: 'center',
		lineHeight: 20,
	},
});
