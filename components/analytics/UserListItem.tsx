import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors } from '@/constants/Colors';
import { formatTimeAgo } from '@/shared/functions/utils';
import type { User } from '@/shared/types';

interface UserListItemProps {
	user: User | null;
	timestamp?: string;
	subtitle?: string;
	text?: string; // Para comentarios
	onPress?: () => void;
}

export const UserListItem: React.FC<UserListItemProps> = ({
	user,
	timestamp,
	subtitle,
	text,
	onPress,
}) => {
	const ItemContent = () => (
		<View style={styles.container}>
			<View style={styles.avatarContainer}>
				{user?.avatar_url ? (
					<Image source={{ uri: user.avatar_url }} style={styles.avatar} />
				) : (
					<View style={styles.avatarPlaceholder}>
						<Text style={styles.avatarText}>
							{user?.display_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || '?'}
						</Text>
					</View>
				)}
			</View>
			
			<View style={styles.content}>
				<View style={styles.header}>
					<Text style={styles.displayName}>
						{user?.display_name || user?.username || 'Usuario anónimo'}
					</Text>
					{user?.username && user.display_name && (
						<Text style={styles.username}>@{user.username}</Text>
					)}
					{timestamp && (
						<Text style={styles.timestamp}>{formatTimeAgo(timestamp)}</Text>
					)}
				</View>
				
				{subtitle && (
					<Text style={styles.subtitle}>{subtitle}</Text>
				)}
				
				{text && (
					<Text style={styles.text} numberOfLines={3}>
						{text}
					</Text>
				)}
			</View>
		</View>
	);

	if (onPress) {
		return (
			<TouchableOpacity onPress={onPress} activeOpacity={0.7}>
				<ItemContent />
			</TouchableOpacity>
		);
	}

	return <ItemContent />;
};

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
	},
	avatarContainer: {
		marginRight: 12,
	},
	avatar: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: Colors.backgroundSecondary,
	},
	avatarPlaceholder: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: Colors.primary,
		justifyContent: 'center',
		alignItems: 'center',
	},
	avatarText: {
		fontSize: 18,
		fontFamily: 'Raleway-Bold',
		fontWeight: 'bold',
		color: Colors.text,
	},
	content: {
		flex: 1,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		flexWrap: 'wrap',
		marginBottom: 2,
	},
	displayName: {
		fontSize: 16,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginRight: 8,
	},
	username: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		marginRight: 8,
	},
	timestamp: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
		marginLeft: 'auto',
	},
	subtitle: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		marginBottom: 4,
	},
	text: {
		fontSize: 15,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
		lineHeight: 20,
	},
});