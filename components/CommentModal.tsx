import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Animated,
	Dimensions,
	FlatList,
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
import { CommentService } from '@/services/commentService';
import { formatTimeAgo } from '@/shared/functions/utils';
import { Comment, User, Video } from '@/shared/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CommentModalProps {
	isVisible: boolean;
	video: Video;
	currentUser: User;
	onClose: () => void;
	onCommentAdded?: (comment: Comment) => void;
}

interface CommentItemProps {
	comment: Comment;
	currentUser: User;
	onDelete?: (commentId: string) => void;
	onReport?: (commentId: string) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
	comment,
	currentUser,
	onDelete,
	onReport,
}) => {
	const [showOptions, setShowOptions] = useState(false);
	const isOwnComment = comment.user_id === currentUser.id;

	return (
		<View style={styles.commentItem}>
			<View style={styles.commentAvatar}>
				<LinearGradient
					colors={Colors.gradientPrimary}
					style={styles.avatarGradient}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 0 }}
				>
					<Feather name="user" size={16} color={Colors.text} />
				</LinearGradient>
			</View>

			<View style={styles.commentContent}>
				<View style={styles.commentHeader}>
					<Text style={styles.commentUsername}>
						@{comment.user?.username || 'user'}
					</Text>
					<Text style={styles.commentTime}>
						{formatTimeAgo(comment.created_at)}
					</Text>
					<TouchableOpacity
						onPress={() => setShowOptions(!showOptions)}
						style={styles.commentOptionsButton}
					>
						<Feather
							name="more-horizontal"
							size={16}
							color={Colors.textTertiary}
						/>
					</TouchableOpacity>
				</View>

				<Text style={styles.commentText}>{comment.text}</Text>

				{showOptions && (
					<View style={styles.commentOptions}>
						{isOwnComment ? (
							<TouchableOpacity
								onPress={() => {
									onDelete?.(comment.id);
									setShowOptions(false);
								}}
								style={styles.optionButton}
							>
								<Feather name="trash-2" size={14} color={Colors.error} />
								<Text style={[styles.optionText, styles.deleteText]}>
									Eliminar
								</Text>
							</TouchableOpacity>
						) : (
							<TouchableOpacity
								onPress={() => {
									onReport?.(comment.id);
									setShowOptions(false);
								}}
								style={styles.optionButton}
							>
								<Feather name="flag" size={14} color={Colors.textTertiary} />
								<Text style={styles.optionText}>Reportar</Text>
							</TouchableOpacity>
						)}
					</View>
				)}
			</View>
		</View>
	);
};

export const CommentModal: React.FC<CommentModalProps> = ({
	isVisible,
	video,
	currentUser,
	onClose,
	onCommentAdded,
}) => {
	const { t } = useTranslation();
	const [comments, setComments] = useState<Comment[]>([]);
	const [newComment, setNewComment] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [page, setPage] = useState(0);
	const [hasMore, setHasMore] = useState(true);

	const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
	const textInputRef = useRef<TextInput>(null);

	// Animate modal
	useEffect(() => {
		if (isVisible) {
			Animated.spring(slideAnim, {
				toValue: 0,
				useNativeDriver: true,
				tension: 100,
				friction: 8,
			}).start();
		} else {
			Animated.spring(slideAnim, {
				toValue: SCREEN_HEIGHT,
				useNativeDriver: true,
				tension: 100,
				friction: 8,
			}).start();
		}
	}, [isVisible]);

	// Load comments when modal opens
	useEffect(() => {
		if (isVisible) {
			loadComments(true);
		} else {
			// Reset state when modal closes
			setComments([]);
			setNewComment('');
			setPage(0);
			setHasMore(true);
		}
	}, [isVisible]);

	const loadComments = async (refresh = false) => {
		if (isLoading || (!hasMore && !refresh)) return;

		setIsLoading(true);
		const currentPage = refresh ? 0 : page;

		try {
			const result = await CommentService.getVideoComments(
				video.id,
				currentPage,
				20,
			);
			cn;

			if (result.success && result.data) {
				if (refresh) {
					setComments(result.data.comments);
					setPage(1);
				} else {
					setComments((prev) => [...prev, ...result.data.comments]);
					setPage((prev) => prev + 1);
				}
				setHasMore(result.data.hasMore);
			}
		} catch (error) {
			console.error('Error loading comments:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleSubmitComment = async () => {
		if (!newComment.trim() || isSubmitting) return;

		setIsSubmitting(true);

		try {
			const result = await CommentService.createComment({
				video_id: video.id,
				text: newComment.trim(),
			});

			if (result.success && result.data) {
				// Add comment to local state
				setComments((prev) => [result.data, ...prev]);
				setNewComment('');

				// Notify parent component
				onCommentAdded?.(result.data);

				// Dismiss keyboard
				textInputRef.current?.blur();
			}
		} catch (error) {
			console.error('Error creating comment:', error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDeleteComment = async (commentId: string) => {
		try {
			const result = await CommentService.deleteComment(commentId);

			if (result.success) {
				setComments((prev) => prev.filter((c) => c.id !== commentId));
			}
		} catch (error) {
			console.error('Error deleting comment:', error);
		}
	};

	const handleReportComment = async (commentId: string) => {
		try {
			const result = await CommentService.reportComment(
				commentId,
				currentUser.id,
				'inappropriate',
			);

			if (result.success) {
				// Show success message or remove comment from view
				console.log('Comment reported successfully');
			}
		} catch (error) {
			console.error('Error reporting comment:', error);
		}
	};

	const renderCommentItem = ({ item }: { item: Comment }) => (
		<CommentItem
			comment={item}
			currentUser={currentUser}
			onDelete={handleDeleteComment}
			onReport={handleReportComment}
		/>
	);

	const renderEmptyState = () => (
		<View style={styles.emptyState}>
			<Feather name="message-circle" size={48} color={Colors.textTertiary} />
			<Text style={styles.emptyTitle}>No hay comentarios aún</Text>
			<Text style={styles.emptySubtitle}>
				Sé el primero en comentar este video
			</Text>
		</View>
	);

	const renderLoadingFooter = () => {
		if (!isLoading || comments.length === 0) return null;

		return (
			<View style={styles.loadingFooter}>
				<ActivityIndicator size="small" color={Colors.primary} />
			</View>
		);
	};

	if (!isVisible) return null;

	return (
		<View style={styles.modalOverlay}>
			<Pressable style={styles.modalBackdrop} onPress={onClose} />
			<Animated.View
				style={[
					styles.modalContainer,
					{ transform: [{ translateY: slideAnim }] },
				]}
			>
				{/* Header - Fixed at top */}
				<View style={styles.modalHeader}>
					<View style={styles.modalHandle} />
					<View style={styles.headerContent}>
						<Text style={styles.modalTitle}>
							Comentarios ({video.comments_count})
						</Text>
						<TouchableOpacity onPress={onClose} style={styles.closeButton}>
							<Feather name="x" size={24} color={Colors.text} />
						</TouchableOpacity>
					</View>
				</View>

				{/* Comments Area - Flexible middle section */}
				<View style={styles.commentsArea}>
					{comments.length === 0 && !isLoading ? (
						renderEmptyState()
					) : (
						<FlatList
							data={comments}
							renderItem={renderCommentItem}
							keyExtractor={(item) => item.id}
							style={styles.commentsList}
							contentContainerStyle={styles.commentsContent}
							showsVerticalScrollIndicator={false}
							ListFooterComponent={renderLoadingFooter}
							onEndReached={() => loadComments(false)}
							onEndReachedThreshold={0.5}
							refreshing={isLoading && comments.length === 0}
							onRefresh={() => loadComments(true)}
							keyboardShouldPersistTaps="handled"
						/>
					)}
				</View>

				{/* Input Area - Fixed at bottom */}
				<KeyboardAvoidingView
					behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
					keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
				>
					<View style={styles.commentInputContainer}>
						<View style={styles.userAvatar}>
							<LinearGradient
								colors={Colors.gradientPrimary}
								style={styles.avatarGradient}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 0 }}
							>
								<Feather name="user" size={16} color={Colors.text} />
							</LinearGradient>
						</View>

						<View style={styles.inputContainer}>
							<TextInput
								ref={textInputRef}
								style={styles.textInput}
								placeholder="Añadir comentario..."
								placeholderTextColor={Colors.textTertiary}
								value={newComment}
								onChangeText={setNewComment}
								multiline
								maxLength={500}
								editable={!isSubmitting}
							/>
							<TouchableOpacity
								onPress={handleSubmitComment}
								style={[
									styles.sendButton,
									(!newComment.trim() || isSubmitting) &&
										styles.sendButtonDisabled,
								]}
								disabled={!newComment.trim() || isSubmitting}
							>
								{isSubmitting ? (
									<ActivityIndicator size="small" color={Colors.text} />
								) : (
									<Feather name="send" size={18} color={Colors.text} />
								)}
							</TouchableOpacity>
						</View>
					</View>
				</KeyboardAvoidingView>
			</Animated.View>
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
	modalContainer: {
		backgroundColor: Colors.modalBackground,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		maxHeight: SCREEN_HEIGHT * 0.85,
		minHeight: SCREEN_HEIGHT * 0.6,
		flex: 1,
	},
	keyboardView: {
		flex: 1,
		justifyContent: 'space-between',
	},
	modalHeader: {
		paddingTop: 12,
		paddingHorizontal: 16,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
		backgroundColor: Colors.modalBackground,
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
		paddingBottom: 16,
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
	commentsList: {
		flex: 1,
		maxHeight: SCREEN_HEIGHT * 0.6,
	},
	commentsContent: {
		flexGrow: 1,
		paddingVertical: 8,
	},
	commentItem: {
		flexDirection: 'row',
		paddingHorizontal: 16,
		paddingVertical: 12,
		alignItems: 'flex-start',
	},
	commentAvatar: {
		marginRight: 12,
	},
	avatarGradient: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
	},
	commentContent: {
		flex: 1,
	},
	commentHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 4,
		gap: 8,
	},
	commentUsername: {
		fontSize: 14,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
	},
	commentTime: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
	commentOptionsButton: {
		marginLeft: 'auto',
		padding: 4,
	},
	commentText: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
		lineHeight: 20,
	},
	commentOptions: {
		marginTop: 8,
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 8,
		padding: 8,
	},
	optionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
		paddingHorizontal: 4,
		gap: 8,
	},
	optionText: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		color: Colors.textSecondary,
	},
	deleteText: {
		color: Colors.error,
	},
	emptyState: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 64,
		paddingHorizontal: 32,
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
		color: Colors.textTertiary,
		textAlign: 'center',
	},
	loadingFooter: {
		paddingVertical: 16,
		alignItems: 'center',
	},
	commentInputContainer: {
		flexDirection: 'row',
		padding: 16,
		borderTopWidth: 2,
		borderTopColor: Colors.primary, // Temporalmente más visible
		alignItems: 'flex-end',
		backgroundColor: Colors.modalBackground,
		minHeight: 72,
		// Asegurar que siempre esté en la parte inferior
		marginTop: 'auto',
	},
	userAvatar: {
		marginRight: 12,
	},
	inputContainer: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'flex-end',
		backgroundColor: Colors.inputBackground,
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingVertical: 8,
		minHeight: 40,
		borderWidth: 2,
		borderColor: Colors.primary, // Temporalmente más visible
	},
	textInput: {
		flex: 1,
		fontSize: 16,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
		maxHeight: 100,
		paddingTop: 8,
		paddingBottom: 8,
		paddingHorizontal: 4,
	},
	sendButton: {
		marginLeft: 8,
		padding: 8,
		backgroundColor: Colors.primary,
		borderRadius: 16,
		width: 32,
		height: 32,
		alignItems: 'center',
		justifyContent: 'center',
	},
	sendButtonDisabled: {
		backgroundColor: Colors.textTertiary,
		opacity: 0.5,
	},
});
