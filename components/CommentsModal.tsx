import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
	Alert,
	Animated,
	Dimensions,
	FlatList,
	Keyboard,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';

import { Colors } from '@/constants/Colors';
import { useTranslation } from '@/hooks/useTranslation';
import { formatTimeAgo } from '@/shared/functions/utils';
import { Comment, User, Video } from '@/shared/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useComments } from '../hooks/useComments';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CommentsModalProps {
	isVisible: boolean;
	video: Video;
	currentUser: User;
	onClose: () => void;
	onCommentAdded: (comment: Comment) => void;
}

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
	replies?: Comment[];
	repliesCount?: number;
	isLoadingReplies?: boolean;
	hasMoreReplies?: boolean;
}

const CommentItem: React.FC<CommentItemProps> = ({
	comment,
	currentUser,
	isReply = false,
	onReport,
	onDelete,
	onEdit,
	onReply,
	onToggleReplies,
	onLoadMoreReplies,
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

							{!isReply && (
								<View style={styles.commentActions}>
									<TouchableOpacity
										style={styles.replyButton}
										onPress={handleReply}
									>
										<Text style={styles.replyButtonText}>Responder</Text>
									</TouchableOpacity>
								</View>
							)}
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

export const CommentsModal: React.FC<CommentsModalProps> = ({
	isVisible,
	video,
	currentUser,
	onClose,
	onCommentAdded,
}) => {
	const { t } = useTranslation();
	const { bottom } = useSafeAreaInsets();
	const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
	const [commentText, setCommentText] = useState('');
	const [keyboardHeight, setKeyboardHeight] = useState(0);
	const [replyingTo, setReplyingTo] = useState<{
		id: string;
		username: string;
	} | null>(null);
	const flatListRef = useRef<FlatList>(null);

	const {
		comments,
		isLoading,
		isLoadingMore,
		hasMore,
		error,
		loadedReplies,
		loadingReplies,
		repliesHasMore,
		submitComment,
		editComment,
		deleteComment,
		reportComment,
		retryLoad,
		loadMoreComments,
		toggleReplies,
		loadMoreReplies,
	} = useComments(video.id);

	// Handle keyboard events
	useEffect(() => {
		const keyboardWillShow = Keyboard.addListener(
			Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
			(event) => {
				setKeyboardHeight(event.endCoordinates.height);
			},
		);

		const keyboardWillHide = Keyboard.addListener(
			Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
			() => {
				setKeyboardHeight(0);
			},
		);

		return () => {
			keyboardWillShow?.remove();
			keyboardWillHide?.remove();
		};
	}, []);

	// Animate modal
	useEffect(() => {
		if (isVisible) {
			Animated.spring(slideAnim, {
				toValue: 0,
				useNativeDriver: true,
				tension: 100,
				friction: 10,
			}).start();
		} else {
			Animated.spring(slideAnim, {
				toValue: SCREEN_HEIGHT,
				useNativeDriver: true,
				tension: 100,
				friction: 10,
			}).start();
		}
	}, [isVisible, slideAnim]);

	const handleSubmitComment = useCallback(async () => {
		if (!commentText.trim()) return;

		const trimmedText = commentText.trim();
		const replyToId = replyingTo?.id;

		setCommentText('');
		setReplyingTo(null);

		try {
			const newComment = await submitComment(trimmedText, replyToId);
			if (newComment && !replyToId) {
				onCommentAdded(newComment);
				// Scroll to top only for new top-level comments
				flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
			}
		} catch (error) {
			console.error('Failed to submit comment:', error);
		}
	}, [commentText, replyingTo, submitComment, onCommentAdded]);

	const handleEditComment = useCallback(
		async (commentId: string, newText: string) => {
			await editComment(commentId, newText);
		},
		[editComment],
	);

	const handleDeleteComment = useCallback(
		async (commentId: string, isReply = false, parentId?: string) => {
			await deleteComment(commentId, isReply, parentId);
		},
		[deleteComment],
	);

	const handleReportComment = useCallback(
		async (commentId: string) => {
			await reportComment(commentId, 'inappropriate');
		},
		[reportComment],
	);

	const handleReply = useCallback((commentId: string, username: string) => {
		setReplyingTo({ id: commentId, username });
	}, []);

	const handleCancelReply = useCallback(() => {
		setReplyingTo(null);
	}, []);

	const renderCommentItem = useCallback(
		({ item }: { item: Comment }) => (
			<CommentItem
				comment={item}
				currentUser={currentUser}
				onReport={handleReportComment}
				onDelete={handleDeleteComment}
				onEdit={handleEditComment}
				onReply={handleReply}
				onToggleReplies={toggleReplies}
				onLoadMoreReplies={loadMoreReplies}
				replies={loadedReplies[item.id] || []}
				repliesCount={item.replies_count || 0}
				isLoadingReplies={loadingReplies[item.id] || false}
				hasMoreReplies={repliesHasMore[item.id] || false}
			/>
		),
		[
			currentUser,
			handleReportComment,
			handleDeleteComment,
			handleEditComment,
			handleReply,
			toggleReplies,
			loadMoreReplies,
			loadedReplies,
			loadingReplies,
			repliesHasMore,
		],
	);

	const renderEmptyState = () => (
		<View style={styles.emptyState}>
			<Feather name="message-circle" size={48} color={Colors.textTertiary} />
			<Text style={styles.emptyTitle}>{t('video.noComments')}</Text>
			<Text style={styles.emptySubtitle}>{t('video.beFirstToComment')}</Text>
		</View>
	);

	const renderFooter = () => {
		if (!isLoadingMore) return null;

		return (
			<View style={styles.loadingFooter}>
				<Text style={styles.loadingText}>Cargando más comentarios...</Text>
			</View>
		);
	};

	const renderError = () => (
		<View style={styles.errorState}>
			<Feather name="alert-circle" size={48} color={Colors.error} />
			<Text style={styles.errorTitle}>Error al cargar comentarios</Text>
			<TouchableOpacity style={styles.retryButton} onPress={retryLoad}>
				<Text style={styles.retryText}>Reintentar</Text>
			</TouchableOpacity>
		</View>
	);

	if (!isVisible) return null;

	return (
		<View style={styles.modalOverlay}>
			<Pressable style={styles.modalBackdrop} onPress={onClose} />
			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={styles.keyboardAvoid}
			>
				<Animated.View
					style={[
						styles.modalContainer,
						{
							transform: [{ translateY: slideAnim }],
							paddingBottom: bottom + 50,
						},
					]}
				>
					{/* Header */}
					<View style={styles.modalHeader}>
						<View style={styles.modalHandle} />
						<View style={styles.headerContent}>
							<Text style={styles.modalTitle}>
								{comments.length > 0
									? `${comments.length} comentario${
											comments.length !== 1 ? 's' : ''
									  }`
									: 'Comentarios'}
							</Text>
							<TouchableOpacity onPress={onClose} style={styles.closeButton}>
								<Feather name="x" size={24} color={Colors.text} />
							</TouchableOpacity>
						</View>
					</View>

					{/* Comments List */}
					<View style={styles.commentsContainer}>
						{error ? (
							renderError()
						) : (
							<FlatList
								ref={flatListRef}
								data={comments}
								renderItem={renderCommentItem}
								keyExtractor={(item) => item.id}
								style={styles.commentsList}
								showsVerticalScrollIndicator={false}
								ListEmptyComponent={!isLoading ? renderEmptyState : null}
								ListFooterComponent={renderFooter}
								onEndReached={hasMore ? loadMoreComments : undefined}
								onEndReachedThreshold={0.5}
								contentContainerStyle={
									comments.length === 0 && !isLoading
										? styles.emptyListContainer
										: styles.listContainer
								}
								initialNumToRender={10}
								maxToRenderPerBatch={10}
								windowSize={10}
								removeClippedSubviews={true}
								keyboardShouldPersistTaps="handled"
							/>
						)}

						{isLoading && comments.length === 0 && (
							<View style={styles.loadingContainer}>
								<Text style={styles.loadingText}>Cargando comentarios...</Text>
							</View>
						)}
					</View>

					{/* Comment Input */}
					<View style={styles.commentInputContainer}>
						{replyingTo && (
							<View style={styles.replyingToContainer}>
								<Text style={styles.replyingToText}>
									Respondiendo a @{replyingTo.username}
								</Text>
								<TouchableOpacity onPress={handleCancelReply}>
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
								onChangeText={setCommentText}
								multiline
								maxLength={500}
								returnKeyType="send"
								onSubmitEditing={handleSubmitComment}
								blurOnSubmit={false}
							/>
							<TouchableOpacity
								style={[
									styles.sendButton,
									commentText.trim().length > 0 && styles.sendButtonActive,
								]}
								onPress={handleSubmitComment}
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
				</Animated.View>
			</KeyboardAvoidingView>
		</View>
	);
};

const styles = StyleSheet.create({
	modalOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: Colors.modalOverlay,
		justifyContent: 'flex-end',
		zIndex: 1000,
	},
	modalBackdrop: {
		...StyleSheet.absoluteFillObject,
	},
	keyboardAvoid: {
		flex: 1,
		justifyContent: 'flex-end',
	},
	modalContainer: {
		backgroundColor: Colors.modalBackground,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		maxHeight: SCREEN_HEIGHT * 0.8,
		minHeight: SCREEN_HEIGHT * 0.6,
	},
	modalHeader: {
		paddingTop: 12,
		paddingHorizontal: 16,
		paddingBottom: 16,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
	},
	modalHandle: {
		width: 40,
		height: 4,
		backgroundColor: Colors.textTertiary,
		borderRadius: 2,
		alignSelf: 'center',
		marginBottom: 16,
	},
	headerContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	modalTitle: {
		fontSize: 18,
		fontFamily: 'Poppins-SemiBold',
		fontWeight: '600',
		color: Colors.text,
	},
	closeButton: {
		padding: 4,
	},
	commentsContainer: {
		flex: 1,
	},
	commentsList: {
		flex: 1,
	},
	listContainer: {
		paddingBottom: 16,
	},
	emptyListContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
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
	},
	commentActions: {
		marginTop: 8,
	},
	replyButton: {
		alignSelf: 'flex-start',
	},
	replyButtonText: {
		fontSize: 12,
		fontFamily: 'Inter-Medium',
		color: Colors.textTertiary,
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
	emptyState: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 32,
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
		color: Colors.textSecondary,
		textAlign: 'center',
		lineHeight: 20,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 32,
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
	errorState: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 32,
		paddingVertical: 64,
	},
	errorTitle: {
		fontSize: 18,
		fontFamily: 'Poppins-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginTop: 16,
		marginBottom: 24,
		textAlign: 'center',
	},
	retryButton: {
		paddingHorizontal: 24,
		paddingVertical: 12,
		backgroundColor: Colors.primary,
		borderRadius: 8,
	},
	retryText: {
		fontSize: 16,
		fontFamily: 'Inter-SemiBold',
		color: Colors.text,
	},
	commentInputContainer: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderTopWidth: 1,
		borderTopColor: Colors.borderSecondary,
		backgroundColor: Colors.modalBackground,
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

export default CommentsModal;
