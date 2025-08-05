import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';

import { Colors } from '@/constants/Colors';

interface HashtagInputProps {
	label?: string;
	hashtags: string[];
	onHashtagsChange: (hashtags: string[]) => void;
	maxHashtags?: number;
	placeholder?: string;
	editable?: boolean;
}

export function HashtagInput({
	label,
	hashtags,
	onHashtagsChange,
	maxHashtags = 10,
	placeholder = "Escribe hashtag y presiona Enter",
	editable = true,
}: HashtagInputProps) {
	const [inputValue, setInputValue] = useState('');

	const addHashtag = (text: string) => {
		// Clean the text - remove # if present and trim whitespace
		const cleaned = text.replace(/^#/, '').trim().toLowerCase();
		
		if (cleaned.length === 0) return;
		if (hashtags.length >= maxHashtags) return;
		if (hashtags.includes(cleaned)) return; // Avoid duplicates
		
		// Add the hashtag without the # symbol (we'll add it when displaying)
		onHashtagsChange([...hashtags, cleaned]);
		setInputValue('');
	};

	const removeHashtag = (index: number) => {
		if (!editable) return;
		const newHashtags = hashtags.filter((_, i) => i !== index);
		onHashtagsChange(newHashtags);
	};

	const handleSubmitEditing = () => {
		addHashtag(inputValue);
	};

	const handleKeyPress = ({ nativeEvent }: { nativeEvent: { key: string } }) => {
		if (nativeEvent.key === 'Enter') {
			addHashtag(inputValue);
		}
	};

	return (
		<View style={styles.container}>
			{label && <Text style={styles.label}>{label}</Text>}
			
			{/* Hashtag Tags */}
			{hashtags.length > 0 && (
				<View style={styles.tagsContainer}>
					{hashtags.map((hashtag, index) => (
						<View key={index} style={styles.tag}>
							<Text style={styles.tagText}>#{hashtag}</Text>
							{editable && (
								<TouchableOpacity
									onPress={() => removeHashtag(index)}
									style={styles.tagRemove}
									hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
								>
									<Feather name="x" size={14} color={Colors.textSecondary} />
								</TouchableOpacity>
							)}
						</View>
					))}
				</View>
			)}

			{/* Input Field */}
			{editable && hashtags.length < maxHashtags && (
				<TextInput
					style={styles.input}
					value={inputValue}
					onChangeText={setInputValue}
					onSubmitEditing={handleSubmitEditing}
					onKeyPress={handleKeyPress}
					placeholder={placeholder}
					placeholderTextColor={Colors.textTertiary}
					autoCapitalize="none"
					autoCorrect={false}
					returnKeyType="done"
					blurOnSubmit={false}
				/>
			)}

			{/* Counter */}
			<View style={styles.footer}>
				<Text style={styles.counter}>
					{hashtags.length}/{maxHashtags} hashtags
				</Text>
				{hashtags.length >= maxHashtags && (
					<Text style={styles.maxReached}>
						Máximo alcanzado
					</Text>
				)}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		marginBottom: 16,
	},
	label: {
		fontSize: 16,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.text,
		marginBottom: 8,
	},
	tagsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginBottom: 12,
	},
	tag: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: Colors.primary,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		gap: 6,
	},
	tagText: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		color: Colors.text,
	},
	tagRemove: {
		padding: 2,
	},
	input: {
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
		fontSize: 16,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
		borderWidth: 1,
		borderColor: Colors.borderSecondary,
	},
	footer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 6,
	},
	counter: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
	maxReached: {
		fontSize: 12,
		fontFamily: 'Inter-Medium',
		color: Colors.accent,
	},
});