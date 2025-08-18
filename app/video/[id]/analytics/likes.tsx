import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
	FlatList,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { AnalyticsService } from '@/services/analyticsService';
import type { VideoAnalyticsInteraction } from '@/shared/types';

import { SearchHeader } from '@/components/analytics/SearchHeader';
import { UserListItem } from '@/components/analytics/UserListItem';

export default function VideoAnalyticsLikesPage() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const router = useRouter();

	const [likes, setLikes] = useState<VideoAnalyticsInteraction[]>([]);
	const [filteredLikes, setFilteredLikes] = useState<
		VideoAnalyticsInteraction[]
	>([]);
	const [searchQuery, setSearchQuery] = useState('');
	const [isLoading, setIsLoading] = useState(true);
	const [isSearching, setIsSearching] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [videoTitle, setVideoTitle] = useState<string>('');

	const loadAllLikes = useCallback(async () => {
		if (!id) return;

		try {
			setIsLoading(true);
			setError(null);

			// Verificar permisos primero
			const canAccess = await AnalyticsService.canAccessAnalytics(id);
			if (!canAccess) {
				setError('No tienes permisos para ver estas analíticas');
				return;
			}

			// Cargar todos los likes (sin límite)
			const response = await AnalyticsService.getRecentLikes(id, 1000);

			if (response.success && response.data) {
				setLikes(response.data);
				setFilteredLikes(response.data);
			} else {
				setError(response.error || 'Error al cargar likes');
			}
		} catch (error) {
			console.error('Error loading likes:', error);
			setError('Error inesperado al cargar los datos');
		} finally {
			setIsLoading(false);
		}
	}, [id]);

	const handleSearch = useCallback(
		async (query: string) => {
			if (!id) return;

			setSearchQuery(query);

			if (!query.trim()) {
				setFilteredLikes(likes);
				return;
			}

			setIsSearching(true);
			try {
				const response = await AnalyticsService.searchLikesByUsername(
					id,
					query,
				);
				if (response.success) {
					const searchResults = response.data || [];
					setFilteredLikes(searchResults);
				} else {
					setFilteredLikes([]);
				}
			} catch (error) {
				console.error('Error searching likes:', error);
				setFilteredLikes([]);
			} finally {
				setIsSearching(false);
			}
		},
		[id, likes],
	);

	useEffect(() => {
		loadAllLikes();
	}, [loadAllLikes]);

	const renderLikeItem = ({ item }: { item: VideoAnalyticsInteraction }) => (
		<UserListItem
			user={item.user}
			timestamp={item.created_at}
			subtitle="Le gustó tu video"
		/>
	);

	const renderEmptyState = () => (
		<View style={styles.emptyState}>
			<Feather name="heart" size={48} color={Colors.textTertiary} />
			<Text style={styles.emptyTitle}>
				{searchQuery ? 'No se encontraron likes' : 'Aún no hay likes'}
			</Text>
			<Text style={styles.emptySubtitle}>
				{searchQuery
					? `No hay usuarios con "${searchQuery}" que hayan dado like`
					: 'Cuando alguien le dé like a tu video, aparecerá aquí'}
			</Text>
		</View>
	);

	const renderSearchHeader = () => (
		<SearchHeader
			searchQuery={searchQuery}
			isSearching={isSearching}
			onSearch={handleSearch}
			placeholder="Buscar por nombre de usuario..."
		/>
	);

	const handleClose = () => {
		router.back();
	};

	if (!id) {
		return null;
	}

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar style="light" />

			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={handleClose} style={styles.closeButton}>
					<Feather name="arrow-left" size={24} color={Colors.text} />
				</TouchableOpacity>
				<View style={styles.headerContent}>
					<Text style={styles.headerTitle}>Likes ({filteredLikes.length})</Text>
					{videoTitle && (
						<Text style={styles.videoTitle} numberOfLines={1}>
							{videoTitle}
						</Text>
					)}
				</View>
				<View style={styles.placeholder} />
			</View>

			{/* Content */}
			{isLoading ? (
				<View style={styles.loadingContainer}>
					<Feather name="heart" size={48} color={Colors.primary} />
					<Text style={styles.loadingText}>Cargando likes...</Text>
				</View>
			) : error ? (
				<View style={styles.errorContainer}>
					<Feather name="alert-circle" size={48} color={Colors.error} />
					<Text style={styles.errorTitle}>Error al cargar likes</Text>
					<Text style={styles.errorMessage}>{error}</Text>
					<TouchableOpacity onPress={loadAllLikes} style={styles.retryButton}>
						<Text style={styles.retryButtonText}>Reintentar</Text>
					</TouchableOpacity>
				</View>
			) : (
				<>
					{renderSearchHeader()}
					<FlatList
						data={filteredLikes}
						renderItem={renderLikeItem}
						keyExtractor={(item) => item.id}
						ListEmptyComponent={renderEmptyState}
						style={styles.list}
						showsVerticalScrollIndicator={false}
						contentContainerStyle={
							filteredLikes.length === 0 ? styles.emptyListContainer : undefined
						}
					/>
				</>
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
		paddingTop: 20,
		paddingBottom: 12,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
	},
	closeButton: {
		padding: 4,
		marginRight: 12,
	},
	headerContent: {
		flex: 1,
		alignItems: 'center',
	},
	headerTitle: {
		fontSize: 20,
		fontFamily: 'Raleway-Bold',
		fontWeight: 'bold',
		color: Colors.text,
	},
	videoTitle: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		marginTop: 2,
	},
	placeholder: {
		width: 40,
	},
	list: {
		flex: 1,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		gap: 16,
	},
	loadingText: {
		fontSize: 16,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 32,
		gap: 16,
	},
	errorTitle: {
		fontSize: 18,
		fontFamily: 'Inter-Bold',
		fontWeight: 'bold',
		color: Colors.text,
		textAlign: 'center',
	},
	errorMessage: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
		lineHeight: 20,
	},
	retryButton: {
		backgroundColor: Colors.primary,
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 8,
		marginTop: 8,
	},
	retryButtonText: {
		fontSize: 14,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
	},
	emptyListContainer: {
		flexGrow: 1,
	},
	emptyState: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 32,
		paddingTop: 60,
	},
	emptyTitle: {
		fontSize: 20,
		fontFamily: 'Raleway-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginTop: 16,
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
