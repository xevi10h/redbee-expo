import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { 
	FlatList, 
	StyleSheet, 
	Text, 
	TextInput, 
	TouchableOpacity, 
	View 
} from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/Colors';
import { VideoAnalyticsInteraction } from '@/shared/types';

interface InteractionsListProps {
	data: VideoAnalyticsInteraction[];
	type: 'likes' | 'comments';
	title?: string;
	onSearch?: (query: string) => void;
	isSearching?: boolean;
	maxHeight?: number;
}

export const InteractionsList: React.FC<InteractionsListProps> = ({
	data,
	type,
	title,
	onSearch,
	isSearching = false,
	maxHeight = 300,
}) => {
	const [searchQuery, setSearchQuery] = useState('');
	const [isSearchExpanded, setIsSearchExpanded] = useState(false);

	const handleSearch = (query: string) => {
		setSearchQuery(query);
		onSearch?.(query);
	};

	const formatDate = (dateString: string): string => {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffMinutes = Math.floor(diffMs / (1000 * 60));

		if (diffMinutes < 1) return 'Ahora';
		if (diffMinutes < 60) return `${diffMinutes}m`;
		if (diffHours < 24) return `${diffHours}h`;
		if (diffDays < 7) return `${diffDays}d`;
		
		return date.toLocaleDateString('es-ES', { 
			day: 'numeric', 
			month: 'short' 
		});
	};

	const getIcon = () => {
		return type === 'likes' ? 'heart' : 'message-circle';
	};

	const getEmptyMessage = () => {
		return type === 'likes' 
			? 'No hay likes recientes' 
			: 'No hay comentarios recientes';
	};

	const renderItem = ({ item }: { item: VideoAnalyticsInteraction }) => (
		<View style={styles.interactionItem}>
			<Avatar 
				avatarUrl={item.user.avatar_url} 
				size={32} 
				username={item.user.username}
			/>
			
			<View style={styles.interactionContent}>
				<View style={styles.userInfo}>
					<Text style={styles.displayName}>
						{item.user.display_name || item.user.username}
					</Text>
					<Text style={styles.username}>@{item.user.username}</Text>
					<Text style={styles.timestamp}>{formatDate(item.created_at)}</Text>
				</View>
				
				{type === 'comments' && item.text && (
					<Text style={styles.commentText} numberOfLines={2}>
						{item.text}
					</Text>
				)}
			</View>

			<View style={styles.interactionIcon}>
				<Feather 
					name={getIcon()} 
					size={14} 
					color={type === 'likes' ? Colors.error : Colors.primary} 
				/>
			</View>
		</View>
	);

	const renderEmpty = () => (
		<View style={styles.emptyState}>
			<Feather 
				name={getIcon()} 
				size={24} 
				color={Colors.textTertiary} 
			/>
			<Text style={styles.emptyText}>{getEmptyMessage()}</Text>
		</View>
	);

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<View style={styles.titleContainer}>
					<Feather 
						name={getIcon()} 
						size={16} 
						color={type === 'likes' ? Colors.error : Colors.primary}
					/>
					<Text style={styles.title}>
						{title || (type === 'likes' ? 'Likes Recientes' : 'Comentarios Recientes')}
					</Text>
					<Text style={styles.count}>({data.length})</Text>
				</View>

				{onSearch && (
					<TouchableOpacity 
						onPress={() => setIsSearchExpanded(!isSearchExpanded)}
						style={styles.searchButton}
					>
						<Feather 
							name="search" 
							size={16} 
							color={isSearchExpanded ? Colors.primary : Colors.textSecondary}
						/>
					</TouchableOpacity>
				)}
			</View>

			{isSearchExpanded && onSearch && (
				<View style={styles.searchContainer}>
					<TextInput
						style={styles.searchInput}
						placeholder={`Buscar por nombre de usuario...`}
						value={searchQuery}
						onChangeText={handleSearch}
						placeholderTextColor={Colors.inputPlaceholder}
						autoCapitalize="none"
						autoCorrect={false}
					/>
					{isSearching && (
						<Feather 
							name="loader" 
							size={16} 
							color={Colors.primary}
							style={styles.searchLoader}
						/>
					)}
				</View>
			)}

			<View style={[styles.listContainer, { maxHeight }]}>
				{data.length > 0 ? (
					<FlatList
						data={data}
						renderItem={renderItem}
						keyExtractor={item => item.id}
						showsVerticalScrollIndicator={false}
						ItemSeparatorComponent={() => <View style={styles.separator} />}
					/>
				) : (
					renderEmpty()
				)}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: Colors.borderSecondary,
		marginVertical: 8,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 12,
	},
	titleContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	title: {
		fontSize: 16,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginLeft: 8,
	},
	count: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
		marginLeft: 4,
	},
	searchButton: {
		padding: 4,
	},
	searchContainer: {
		paddingHorizontal: 16,
		paddingBottom: 12,
		flexDirection: 'row',
		alignItems: 'center',
	},
	searchInput: {
		flex: 1,
		height: 36,
		backgroundColor: Colors.inputBackground,
		borderRadius: 8,
		paddingHorizontal: 12,
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	searchLoader: {
		marginLeft: 8,
	},
	listContainer: {
		paddingHorizontal: 16,
		paddingBottom: 16,
	},
	interactionItem: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		paddingVertical: 8,
	},
	interactionContent: {
		flex: 1,
		marginLeft: 12,
		marginRight: 8,
	},
	userInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 2,
		flexWrap: 'wrap',
	},
	displayName: {
		fontSize: 14,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginRight: 6,
	},
	username: {
		fontSize: 13,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		marginRight: 8,
	},
	timestamp: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
	commentText: {
		fontSize: 13,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		lineHeight: 18,
		marginTop: 2,
	},
	interactionIcon: {
		marginTop: 2,
	},
	separator: {
		height: 1,
		backgroundColor: Colors.borderSecondary,
		marginVertical: 4,
	},
	emptyState: {
		alignItems: 'center',
		paddingVertical: 32,
		gap: 8,
	},
	emptyText: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
		textAlign: 'center',
	},
});