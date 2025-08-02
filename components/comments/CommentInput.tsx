import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';

import { Colors } from '@/constants/Colors';
import { useTranslation } from '@/hooks/useTranslation';

interface CommentInputProps {
	commentText: string;
	onCommentTextChange: (text: string) => void;
	onSubmitComment: () => void;
	replyingTo?: {
		id: string;
		username: string;
	} | null;
	onCancelReply: () => void;
}

export const CommentInput: React.FC<CommentInputProps> = ({
	commentText,
	onCommentTextChange,
	onSubmitComment,
	replyingTo,
	onCancelReply,
}) => {
	const { t } = useTranslation();

	return (
		<View style={styles.commentInputContainer}>
			{replyingTo && (
				<View style={styles.replyingToContainer}>
					<Text style={styles.replyingToText}>
						Respondiendo a @{replyingTo.username}
					</Text>
					<TouchableOpacity onPress={onCancelReply}>
						<Feather name="x" size={16} color={Colors.textTertiary} />
					</TouchableOpacity>
				</View>
			)}

			<View style={styles.inputWrapper}>
				<View style={styles.currentUserAvatar}>
					<Feather name="user" size={20} color={Colors.text} />
				</View>
				<TextInput
					style={styles.commentInput}
					placeholder={
						replyingTo
							? `Responder a @${replyingTo.username}...`
							: t('video.addComment')
					}
					placeholderTextColor={Colors.textTertiary}
					value={commentText}
					onChangeText={onCommentTextChange}
					multiline
					maxLength={500}
					returnKeyType="send"
					onSubmitEditing={onSubmitComment}
					blurOnSubmit={false}
					autoCorrect={true}
					spellCheck={true}
				/>
				<TouchableOpacity
					style={[
						styles.sendButton,
						commentText.trim().length > 0 && styles.sendButtonActive,
					]}
					onPress={onSubmitComment}
					disabled={!commentText.trim()}
				>
					<Feather
						name="send"
						size={20}
						color={
							commentText.trim().length > 0
								? Colors.primary
								: Colors.textTertiary
						}
					/>
				</TouchableOpacity>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	commentInputContainer: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderTopWidth: 1,
		borderTopColor: Colors.borderSecondary,
		backgroundColor: Colors.modalBackground,
		zIndex: 1002,
	},
	replyingToContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: Colors.backgroundSecondary,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
		marginBottom: 8,
	},
	replyingToText: {
		fontSize: 12,
		fontFamily: 'Inter-Medium',
		color: Colors.primary,
	},
	inputWrapper: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 20,
		paddingHorizontal: 12,
		paddingVertical: 8,
		minHeight: 40,
	},
	currentUserAvatar: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: Colors.background,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 8,
		marginBottom: 2,
	},
	commentInput: {
		flex: 1,
		fontSize: 16,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
		maxHeight: 80,
		paddingVertical: 6,
		paddingHorizontal: 0,
	},
	sendButton: {
		padding: 6,
		marginLeft: 8,
		marginBottom: 2,
	},
	sendButtonActive: {
		// Additional styles when active
	},
});
