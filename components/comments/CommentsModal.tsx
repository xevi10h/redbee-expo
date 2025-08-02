import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
	Animated,
	Dimensions,
	FlatList,
	Keyboard,
	KeyboardAvoidingView,
	Modal,
	Platform,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import {
	GestureHandlerRootView,
	PanGestureHandler,
	PanGestureHandlerGestureEvent,
	State,
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { useTranslation } from '@/hooks/useTranslation';
import { Comment, User, Video } from '@/shared/types';
import { useComments } from '../../hooks/useComments';
import { CommentInput } from './CommentInput';
import { CommentItem } from './CommentItem';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CommentsModalProps {
	isVisible: boolean;
	video: Video;
	currentUser: User;
	onClose: () => void;
	onCommentAdded: (comment: Comment) => void;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({
	isVisible,
	video,
	currentUser,
	onClose,
	onCommentAdded,
}) => {
	const { t } = useTranslation();
	const { bottom } = useSafeAreaInsets();
	const [commentText, setCommentText] = useState('');
	const [keyboardHeight, setKeyboardHeight] = useState(0);
	const [replyingTo, setReplyingTo] = useState<{
		id: string;
		username: string;
	} | null>(null);
	const flatListRef = useRef<FlatList>(null);

	// ✅ Simplified animation state - solo lo esencial
	const translateY = useRef(new Animated.Value(0)).current;
	const [isManuallyClosing, setIsManuallyClosing] = useState(false);
	const [isScrolling, setIsScrolling] = useState(false);

	// ✅ Ref para prevenir múltiples llamadas a onClose
	const hasCalledOnClose = useRef(false);

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
		toggleCommentLike,
	} = useComments(video.id, currentUser.id);

	// ✅ Reset states cuando el modal se abre/cierra
	useEffect(() => {
		if (isVisible) {
			// Reset al abrir
			setCommentText('');
			setReplyingTo(null);
			setKeyboardHeight(0);
			setIsManuallyClosing(false);
			setIsScrolling(false);
			hasCalledOnClose.current = false;
			translateY.setValue(0);
		}
	}, [isVisible, translateY]);

	// ✅ Keyboard handling simplificado
	useEffect(() => {
		if (!isVisible) return;

		const keyboardDidShow = Keyboard.addListener('keyboardDidShow', (event) => {
			setKeyboardHeight(event.endCoordinates.height);
		});

		const keyboardDidHide = Keyboard.addListener('keyboardDidHide', () => {
			setKeyboardHeight(0);
		});

		return () => {
			keyboardDidShow?.remove();
			keyboardDidHide?.remove();
		};
	}, [isVisible]);

	// ✅ Función de cierre más robusta
	const handleSafeClose = useCallback(() => {
		if (hasCalledOnClose.current || isManuallyClosing) {
			return;
		}

		hasCalledOnClose.current = true;
		setIsManuallyClosing(true);

		// Log para debugging
		console.log('CommentsModal: Closing modal');

		onClose();
	}, [onClose, isManuallyClosing]);

	// ✅ Gesture handler mucho más restrictivo
	const handleSwipeGesture = useCallback(
		(event: PanGestureHandlerGestureEvent) => {
			const { translationY, velocityY, state } = event.nativeEvent;

			// No procesar si ya se está cerrando, hay teclado activo, o se está scrolleando
			if (isManuallyClosing || keyboardHeight > 0 || isScrolling) {
				return;
			}

			if (state === State.ACTIVE) {
				// Solo permitir movimiento hacia abajo con threshold alto
				if (translationY > 50) {
					translateY.setValue(translationY);
				}
			} else if (state === State.END) {
				// Condiciones MUY estrictas para cerrar
				const shouldClose = translationY > 200 && velocityY > 1200;

				if (shouldClose) {
					console.log('CommentsModal: Swipe to close triggered');
					setIsManuallyClosing(true);

					Animated.timing(translateY, {
						toValue: SCREEN_HEIGHT,
						duration: 300,
						useNativeDriver: true,
					}).start(() => {
						handleSafeClose();
					});
				} else {
					// Volver a posición original
					Animated.spring(translateY, {
						toValue: 0,
						useNativeDriver: true,
						tension: 100,
						friction: 8,
					}).start();
				}
			}
		},
		[
			translateY,
			isManuallyClosing,
			keyboardHeight,
			isScrolling,
			handleSafeClose,
		],
	);

	// ✅ Scroll handlers simplificados
	const handleScrollBeginDrag = useCallback(() => {
		setIsScrolling(true);
	}, []);

	const handleScrollEndDrag = useCallback(() => {
		// Delay para asegurar que el scroll termine completamente
		setTimeout(() => setIsScrolling(false), 100);
	}, []);

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

	const handleCommentLike = useCallback(
		async (commentId: string, isReply = false, parentId?: string) => {
			try {
				await toggleCommentLike(commentId, isReply, parentId);
			} catch (error) {
				console.error('Failed to like comment:', error);
			}
		},
		[toggleCommentLike],
	);

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
				onLike={(commentId, isReply, parentId) =>
					handleCommentLike(commentId, isReply, parentId)
				}
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
			handleCommentLike,
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

	// ✅ No usar animationType si se está cerrando manualmente
	return (
		<Modal
			visible={isVisible}
			animationType={isManuallyClosing ? 'none' : 'slide'}
			transparent={true}
			statusBarTranslucent={true}
			onRequestClose={handleSafeClose}
		>
			<GestureHandlerRootView style={{ flex: 1 }}>
				<View style={styles.modalOverlay}>
					{/* ✅ Backdrop muy pequeño para evitar toques accidentales */}
					<TouchableOpacity
						style={styles.backdropArea}
						activeOpacity={1}
						onPress={handleSafeClose}
					/>

					<KeyboardAvoidingView
						behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
						style={styles.keyboardAvoid}
					>
						<Animated.View
							style={[
								styles.modalContainer,
								{
									paddingBottom: Math.max(bottom, keyboardHeight / 2) + 20,
									transform: [{ translateY }],
								},
							]}
						>
							{/* ✅ Header con swipe MUY restrictivo */}
							<PanGestureHandler
								onGestureEvent={handleSwipeGesture}
								onHandlerStateChange={handleSwipeGesture}
								activeOffsetY={50} // ✅ Threshold muy alto
								failOffsetX={[-20, 20]} // ✅ Más restrictivo
								enabled={!isManuallyClosing && keyboardHeight === 0} // ✅ Solo cuando es seguro
							>
								<Animated.View style={styles.swipeArea}>
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
											<TouchableOpacity
												onPress={handleSafeClose}
												style={styles.closeButton}
											>
												<Feather name="x" size={24} color={Colors.text} />
											</TouchableOpacity>
										</View>
									</View>
								</Animated.View>
							</PanGestureHandler>

							{/* ✅ Comments List simplificado */}
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
										contentContainerStyle={
											comments.length === 0 && !isLoading
												? styles.emptyListContainer
												: styles.listContainer
										}
										showsVerticalScrollIndicator={true}
										ListEmptyComponent={!isLoading ? renderEmptyState : null}
										ListFooterComponent={renderFooter}
										onEndReached={hasMore ? loadMoreComments : undefined}
										onEndReachedThreshold={0.5}
										initialNumToRender={10}
										maxToRenderPerBatch={10}
										windowSize={10}
										removeClippedSubviews={false}
										keyboardShouldPersistTaps="handled"
										scrollEnabled={true}
										nestedScrollEnabled={true}
										// ✅ Solo los handlers esenciales
										onScrollBeginDrag={handleScrollBeginDrag}
										onScrollEndDrag={handleScrollEndDrag}
									/>
								)}

								{isLoading && comments.length === 0 && (
									<View style={styles.loadingContainer}>
										<Text style={styles.loadingText}>
											Cargando comentarios...
										</Text>
									</View>
								)}
							</View>

							{/* Comment Input */}
							<CommentInput
								commentText={commentText}
								onCommentTextChange={setCommentText}
								onSubmitComment={handleSubmitComment}
								replyingTo={replyingTo}
								onCancelReply={handleCancelReply}
							/>
						</Animated.View>
					</KeyboardAvoidingView>
				</View>
			</GestureHandlerRootView>
		</Modal>
	);
};

const styles = StyleSheet.create({
	modalOverlay: {
		flex: 1,
		backgroundColor: Colors.modalOverlay,
		justifyContent: 'flex-end',
	},
	// ✅ Backdrop mínimo para evitar cierres accidentales
	backdropArea: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		height: SCREEN_HEIGHT * 0.15, // ✅ Reducido aún más
	},
	keyboardAvoid: {
		justifyContent: 'flex-end',
		maxHeight: SCREEN_HEIGHT * 0.85,
	},
	modalContainer: {
		backgroundColor: Colors.modalBackground,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		maxHeight: SCREEN_HEIGHT * 0.85,
		minHeight: SCREEN_HEIGHT * 0.6,
		flex: 1,
	},
	swipeArea: {
		backgroundColor: Colors.modalBackground,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingTop: 12,
		paddingBottom: 4, // ✅ Área mínima para swipe
	},
	modalHeader: {
		paddingHorizontal: 16,
		paddingBottom: 16,
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
		backgroundColor: Colors.modalBackground,
	},
	commentsList: {
		flex: 1,
		backgroundColor: Colors.modalBackground,
	},
	listContainer: {
		paddingBottom: 16,
		flexGrow: 1,
	},
	emptyListContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
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
});
