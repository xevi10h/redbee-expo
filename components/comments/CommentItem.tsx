import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
	Alert,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';

import { Colors } from '@/constants/Colors';
import { formatNumber, formatTimeAgo } from '@/shared/functions/utils';
import { Comment, User } from '@/shared/types';

interface CommentItemProps {
	comment: Comment;
	currentUser: User;
	isReply?: boolean;
	onReport: (commentId: string) => void;
	onDelete: (commentId: string, isReply?: boolean, parentId?: string) => void;
	onEdit: (commentId: string, newText: string) => void;
	onReply: (commentId: string, username: string) => void;
	onToggleReplies: (commentId: string) => void;
	onLoadMoreReplies: (commentId: string) => void;
	onLike: (commentId: string, isReply?: boolean, parentId?: string) => void;
	isLiking?: boolean;
	replies?: Comment[];
	repliesCount?: number;
	isLoadingReplies?: boolean;
	hasMoreReplies?: boolean;
}

export const CommentItem: React.FC<CommentItemProps> = ({
	comment,
	currentUser,
	isReply = false,
	onReport,
	onDelete,
	onEdit,
	onReply,
	onToggleReplies,
	onLoadMoreReplies,
	onLike,
	isLiking = false,
	replies = [],
	repliesCount = 0,
	isLoadingReplies = false,
	hasMoreReplies = false,
}) => {
	const [showOptions, setShowOptions] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [editText, setEditText] = useState(comment.text);

	const isOwn = comment.user?.id === currentUser.id;
	const hasReplies = !isReply && (repliesCount > 0 || replies.length > 0);
	const showingReplies = replies.length > 0;

	const handleLongPress = () => {
		setShowOptions(true);
	};

	const handleReport = () => {
		setShowOptions(false);
		Alert.alert(
			'Reportar comentario',
			'¿Por qué estás reportando este comentario?',
			[
				{ text: 'Cancelar', style: 'cancel' },
				{ text: 'Contenido inapropiado', onPress: () => onReport(comment.id) },
				{ text: 'Spam', onPress: () => onReport(comment.id) },
				{ text: 'Acoso', onPress: () => onReport(comment.id) },
				{ text: 'Otro motivo', onPress: () => onReport(comment.id) },
			],
			{ cancelable: true },
		);
	};

	const handleDelete = () => {
		setShowOptions(false);
		onDelete(comment.id, isReply, comment.reply_to);
	};

	const handleEdit = () => {
		setShowOptions(false);
		setIsEditing(true);
	};

	const handleSaveEdit = () => {
		if (editText.trim() && editText.trim() !== comment.text) {
			onEdit(comment.id, editText.trim());
		}
		setIsEditing(false);
	};

	const handleCancelEdit = () => {
		setEditText(comment.text);
		setIsEditing(false);
	};

	const handleReply = () => {
		onReply(comment.id, comment.user?.username || '');
	};

	const handleLike = async () => {
		if (isLiking) return; // Prevent double-tap

		try {
			await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		} catch (error) {
			// Haptics might fail on some devices, but that's okay
		}

		onLike(comment.id, isReply, comment.reply_to);
	};

	return (
		<View style={[styles.commentItem, isReply && styles.replyItem]}>
			<Pressable
				style={styles.commentContent}
				onLongPress={handleLongPress}
				disabled={isEditing}
			>
				<View style={styles.commentAvatar}>
					<Feather name="user" size={20} color={Colors.text} />
				</View>

				<View style={styles.commentBody}>
					<View style={styles.commentHeader}>
						<Text style={styles.commentUsername}>
							{comment.user?.display_name || comment.user?.username}
						</Text>
						<Text style={styles.commentTime}>
							{formatTimeAgo(comment.created_at)}
						</Text>
						{comment.updated_at &&
							comment.updated_at !== comment.created_at && (
								<Text style={styles.editedIndicator}>• editado</Text>
							)}
					</View>

					{isEditing ? (
						<View style={styles.editContainer}>
							<TextInput
								style={styles.editInput}
								value={editText}
								onChangeText={setEditText}
								multiline
								autoFocus
								maxLength={500}
								placeholder="Editar comentario..."
								placeholderTextColor={Colors.textTertiary}
							/>
							<View style={styles.editActions}>
								<TouchableOpacity
									style={styles.editActionButton}
									onPress={handleCancelEdit}
								>
									<Text style={styles.editCancelText}>Cancelar</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={[styles.editActionButton, styles.editSaveButton]}
									onPress={handleSaveEdit}
								>
									<Text style={styles.editSaveText}>Guardar</Text>
								</TouchableOpacity>
							</View>
						</View>
					) : (
						<>
							<Text style={styles.commentText}>{comment.text}</Text>

							{/* Comment actions */}
							<View style={styles.commentActions}>
								{/* Like button */}
								<TouchableOpacity
									style={[
										styles.actionButton,
										isLiking && styles.actionButtonLoading,
									]}
									onPress={handleLike}
									disabled={isLiking}
								>
									<Feather
										name="heart"
										size={14}
										color={
											comment.is_liked ? Colors.error : Colors.textTertiary
										}
										style={comment.is_liked && styles.likedIcon}
									/>
									{comment.likes_count > 0 && (
										<Text
											style={[
												styles.actionText,
												comment.is_liked && styles.likedText,
											]}
										>
											{formatNumber(comment.likes_count)}
										</Text>
									)}
								</TouchableOpacity>

								{/* Reply button - only for top-level comments */}
								{!isReply && (
									<TouchableOpacity
										style={styles.actionButton}
										onPress={handleReply}
									>
										<Text style={styles.actionText}>Responder</Text>
									</TouchableOpacity>
								)}
							</View>
						</>
					)}
				</View>
			</Pressable>

			{showOptions && !isEditing && (
				<View style={styles.commentOptions}>
					{isOwn ? (
						<>
							<TouchableOpacity
								style={styles.commentOption}
								onPress={handleEdit}
							>
								<Feather name="edit-2" size={16} color={Colors.text} />
								<Text style={styles.commentOptionText}>Editar</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={styles.commentOption}
								onPress={handleDelete}
							>
								<Feather name="trash-2" size={16} color={Colors.error} />
								<Text style={[styles.commentOptionText, styles.deleteText]}>
									Eliminar
								</Text>
							</TouchableOpacity>
						</>
					) : (
						<TouchableOpacity
							style={styles.commentOption}
							onPress={handleReport}
						>
							<Feather name="flag" size={16} color={Colors.textTertiary} />
							<Text style={styles.commentOptionText}>Reportar</Text>
						</TouchableOpacity>
					)}
					<TouchableOpacity
						style={styles.commentOption}
						onPress={() => setShowOptions(false)}
					>
						<Text style={styles.commentOptionText}>Cancelar</Text>
					</TouchableOpacity>
				</View>
			)}

			{/* Replies Section */}
			{hasReplies && !isEditing && (
				<View style={styles.repliesSection}>
					<TouchableOpacity
						style={styles.toggleRepliesButton}
						onPress={() => onToggleReplies(comment.id)}
					>
						<Feather
							name={showingReplies ? 'chevron-up' : 'chevron-down'}
							size={16}
							color={Colors.primary}
						/>
						<Text style={styles.toggleRepliesText}>
							{showingReplies
								? 'Ocultar respuestas'
								: `Ver ${repliesCount} respuesta${
										repliesCount !== 1 ? 's' : ''
								  }`}
						</Text>
					</TouchableOpacity>

					{showingReplies && (
						<View style={styles.repliesContainer}>
							{replies.map((reply) => (
								<CommentItem
									key={reply.id}
									comment={reply}
									currentUser={currentUser}
									isReply={true}
									onReport={onReport}
									onDelete={onDelete}
									onEdit={onEdit}
									onReply={onReply}
									onToggleReplies={onToggleReplies}
									onLoadMoreReplies={onLoadMoreReplies}
									onLike={onLike}
									isLiking={isLiking}
								/>
							))}

							{isLoadingReplies && (
								<View style={styles.loadingReplies}>
									<Text style={styles.loadingText}>Cargando respuestas...</Text>
								</View>
							)}

							{hasMoreReplies && !isLoadingReplies && (
								<TouchableOpacity
									style={styles.loadMoreRepliesButton}
									onPress={() => onLoadMoreReplies(comment.id)}
								>
									<Text style={styles.loadMoreRepliesText}>
										Cargar más respuestas
									</Text>
								</TouchableOpacity>
							)}
						</View>
					)}
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	commentItem: {
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
		paddingBottom: 12,
	},
	replyItem: {
		marginLeft: 32,
		borderBottomWidth: 0,
		paddingBottom: 8,
	},
	commentContent: {
		flexDirection: 'row',
		paddingHorizontal: 16,
		paddingTop: 12,
	},
	commentAvatar: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: Colors.backgroundSecondary,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	commentBody: {
		flex: 1,
	},
	commentHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 4,
	},
	commentUsername: {
		fontSize: 14,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginRight: 8,
	},
	commentTime: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
	editedIndicator: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
		marginLeft: 4,
	},
	commentText: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
		lineHeight: 20,
		marginBottom: 8,
	},
	commentActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 16,
		marginTop: 4,
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingVertical: 4,
		paddingHorizontal: 8,
		borderRadius: 12,
	},
	actionButtonLoading: {
		opacity: 0.6,
	},
	actionText: {
		fontSize: 12,
		fontFamily: 'Inter-Medium',
		color: Colors.textTertiary,
	},
	likedIcon: {
		transform: [{ scale: 1.1 }],
	},
	likedText: {
		color: Colors.error,
	},
	editContainer: {
		marginTop: 4,
	},
	editInput: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		maxHeight: 100,
		textAlignVertical: 'top',
	},
	editActions: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		marginTop: 8,
		gap: 12,
	},
	editActionButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 6,
	},
	editSaveButton: {
		backgroundColor: Colors.primary,
	},
	editCancelText: {
		fontSize: 12,
		fontFamily: 'Inter-Medium',
		color: Colors.textTertiary,
	},
	editSaveText: {
		fontSize: 12,
		fontFamily: 'Inter-Medium',
		color: Colors.text,
	},
	commentOptions: {
		position: 'absolute',
		right: 16,
		top: 12,
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 8,
		paddingVertical: 8,
		borderWidth: 1,
		borderColor: Colors.borderSecondary,
		minWidth: 120,
		zIndex: 1000,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		elevation: 5,
	},
	commentOption: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 8,
		gap: 8,
	},
	commentOptionText: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		color: Colors.text,
	},
	deleteText: {
		color: Colors.error,
	},
	repliesSection: {
		marginTop: 8,
		marginLeft: 16,
	},
	toggleRepliesButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 8,
		gap: 8,
	},
	toggleRepliesText: {
		fontSize: 12,
		fontFamily: 'Inter-Medium',
		color: Colors.primary,
	},
	repliesContainer: {
		marginTop: 4,
	},
	loadingReplies: {
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	loadMoreRepliesButton: {
		paddingHorizontal: 16,
		paddingVertical: 8,
	},
	loadMoreRepliesText: {
		fontSize: 12,
		fontFamily: 'Inter-Medium',
		color: Colors.primary,
	},
	loadingText: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
	},
});
