import { Feather } from '@expo/vector-icons';
import React, { memo } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { Colors } from '@/constants/Colors';

interface SearchHeaderProps {
	searchQuery: string;
	isSearching: boolean;
	onSearch: (query: string) => void;
	placeholder?: string;
}

export const SearchHeader: React.FC<SearchHeaderProps> = memo(({
	searchQuery,
	isSearching,
	onSearch,
	placeholder = "Buscar por nombre de usuario..."
}) => {
	return (
		<View style={styles.searchContainer}>
			<View style={styles.searchInputContainer}>
				<Feather name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
				<TextInput
					style={styles.searchInput}
					placeholder={placeholder}
					placeholderTextColor={Colors.textSecondary}
					value={searchQuery}
					onChangeText={onSearch}
					autoCapitalize="none"
					autoCorrect={false}
					returnKeyType="search"
				/>
				{(searchQuery || isSearching) && (
					<TouchableOpacity 
						onPress={() => onSearch('')}
						style={styles.clearButton}
					>
						<Feather 
							name={isSearching ? "loader" : "x"} 
							size={16} 
							color={Colors.textSecondary} 
						/>
					</TouchableOpacity>
				)}
			</View>
		</View>
	);
});

SearchHeader.displayName = 'SearchHeader';

const styles = StyleSheet.create({
	searchContainer: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
		backgroundColor: Colors.background,
	},
	searchInputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	searchIcon: {
		marginRight: 8,
	},
	searchInput: {
		flex: 1,
		fontSize: 16,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
	},
	clearButton: {
		padding: 4,
		marginLeft: 8,
	},
});