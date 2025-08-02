import { CommentService } from '@/services/commentService';
import { Comment } from '@/shared/types';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

export const useComments = (videoId: string, viewerId: string) => {
	const [comments, setComments] = useState<Comment[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [page, setPage] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [total, setTotal] = useState(0);

	// State for replies
	const [loadedReplies, setLoadedReplies] = useState<Record<string, Comment[]>>(
		{},
	);
	const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>(
		{},
	);
	const [repliesHasMore, setRepliesHasMore] = useState<Record<string, boolean>>(
		{},
	);

	// Loading states for comment likes
	const [likingComments, setLikingComments] = useState<Record<string, boolean>>(
		{},
	);

	// Load initial comments
	const loadComments = useCallback(
		async (refresh = false) => {
			if (!viewerId) {
				setError('Viewer ID is required');
				return;
			}

			if (refresh) {
				setIsLoading(true);
				setPage(0);
				setError(null);
			} else {
				if (!hasMore || isLoadingMore) return;
				setIsLoadingMore(true);
			}

			try {
				const result = await CommentService.getVideoComments(
					videoId,
					viewerId,
					refresh ? 0 : page,
					20,
				);

				if (result.success && result.data) {
					const dataPayload = result.data;
					if (refresh) {
						setComments(result.data.comments);
						setLoadedReplies({}); // Clear loaded replies when refreshing
					} else {
						setComments((prev) => [...prev, ...dataPayload.comments]);
					}
					setPage((prev) => (refresh ? 1 : prev + 1));
					setHasMore(result.data.hasMore);
					setTotal(result.data.total);
					setError(null);
				} else {
					setError(result.error || 'Failed to load comments');
				}
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : 'Failed to load comments';
				setError(errorMessage);
				console.error('Error loading comments:', error);
			} finally {
				setIsLoading(false);
				setIsLoadingMore(false);
			}
		},
		[videoId, viewerId, page, hasMore, isLoadingMore],
	);

	// Load replies for a specific comment
	const loadReplies = useCallback(
		async (commentId: string, refresh = false): Promise<void> => {
			if (!viewerId) return;

			const currentPage = refresh
				? 0
				: Math.floor((loadedReplies[commentId]?.length || 0) / 10);

			setLoadingReplies((prev) => ({ ...prev, [commentId]: true }));

			try {
				const result = await CommentService.getCommentReplies(
					commentId,
					viewerId,
					currentPage,
					10,
				);

				if (result.success && result.data) {
					const newReplies = result.data.replies;

					setLoadedReplies((prev) => ({
						...prev,
						[commentId]: refresh
							? newReplies
							: [...(prev[commentId] || []), ...newReplies],
					}));

					setRepliesHasMore((prev) => ({
						...prev,
						[commentId]: result.data!.hasMore,
					}));
				} else {
					console.error('Failed to load replies:', result.error);
				}
			} catch (error) {
				console.error('Error loading replies:', error);
			} finally {
				setLoadingReplies((prev) => ({ ...prev, [commentId]: false }));
			}
		},
		[loadedReplies, viewerId],
	);

	// Submit new comment or reply
	const submitComment = useCallback(
		async (text: string, replyTo?: string): Promise<Comment | null> => {
			if (!text.trim()) return null;

			setIsSubmitting(true);
			setError(null);

			try {
				const result = await CommentService.createComment({
					video_id: videoId,
					text: text.trim(),
					reply_to: replyTo,
				});

				if (result.success && result.data) {
					const newComment = result.data;

					if (replyTo) {
						// It's a reply - add to replies and update parent comment replies count
						setLoadedReplies((prev) => ({
							...prev,
							[replyTo]: [...(prev[replyTo] || []), newComment],
						}));

						// Update parent comment's replies count
						setComments((prev) =>
							prev.map((comment) =>
								comment.id === replyTo
									? {
											...comment,
											replies_count: (comment.replies_count || 0) + 1,
									  }
									: comment,
							),
						);
					} else {
						// It's a top-level comment
						setComments((prev) => [newComment, ...prev]);
						setTotal((prev) => prev + 1);
					}

					return newComment;
				} else {
					const errorMessage = result.error || 'Failed to submit comment';
					setError(errorMessage);
					Alert.alert('Error', errorMessage);
					return null;
				}
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : 'Failed to submit comment';
				setError(errorMessage);
				console.error('Error submitting comment:', error);
				Alert.alert('Error', errorMessage);
				return null;
			} finally {
				setIsSubmitting(false);
			}
		},
		[videoId],
	);

	// Toggle like on comment
	const toggleCommentLike = useCallback(
		async (
			commentId: string,
			isReply = false,
			parentId?: string,
		): Promise<boolean> => {
			if (!viewerId) return false;

			// Set loading state
			setLikingComments((prev) => ({ ...prev, [commentId]: true }));

			// Find current comment
			let currentComment: Comment | undefined;
			if (isReply && parentId) {
				currentComment = loadedReplies[parentId]?.find(
					(r) => r.id === commentId,
				);
			} else {
				currentComment = comments.find((c) => c.id === commentId);
			}

			if (!currentComment) {
				setLikingComments((prev) => ({ ...prev, [commentId]: false }));
				return false;
			}

			// Optimistic update
			const optimisticUpdate = (comment: Comment) => ({
				...comment,
				is_liked: !comment.is_liked,
				likes_count: comment.is_liked
					? comment.likes_count - 1
					: comment.likes_count + 1,
			});

			if (isReply && parentId) {
				setLoadedReplies((prev) => ({
					...prev,
					[parentId]:
						prev[parentId]?.map((reply) =>
							reply.id === commentId ? optimisticUpdate(reply) : reply,
						) || [],
				}));
			} else {
				setComments((prev) =>
					prev.map((comment) =>
						comment.id === commentId ? optimisticUpdate(comment) : comment,
					),
				);
			}

			try {
				const result = await CommentService.toggleCommentLike(
					commentId,
					viewerId,
				);

				if (result.success && result.data) {
					// Update with actual result
					const updateWithReal = (comment: Comment) => ({
						...comment,
						is_liked: result.data!.liked,
						likes_count: result.data!.likes_count,
					});

					if (isReply && parentId) {
						setLoadedReplies((prev) => ({
							...prev,
							[parentId]:
								prev[parentId]?.map((reply) =>
									reply.id === commentId ? updateWithReal(reply) : reply,
								) || [],
						}));
					} else {
						setComments((prev) =>
							prev.map((comment) =>
								comment.id === commentId ? updateWithReal(comment) : comment,
							),
						);
					}

					return result.data.liked;
				} else {
					// Revert optimistic update on error
					if (isReply && parentId) {
						setLoadedReplies((prev) => ({
							...prev,
							[parentId]:
								prev[parentId]?.map((reply) =>
									reply.id === commentId ? currentComment! : reply,
								) || [],
						}));
					} else {
						setComments((prev) =>
							prev.map((comment) =>
								comment.id === commentId ? currentComment! : comment,
							),
						);
					}

					const errorMessage = result.error || 'Failed to like comment';
					Alert.alert('Error', errorMessage);
					return currentComment.is_liked || false;
				}
			} catch (error) {
				// Revert optimistic update on error
				if (isReply && parentId) {
					setLoadedReplies((prev) => ({
						...prev,
						[parentId]:
							prev[parentId]?.map((reply) =>
								reply.id === commentId ? currentComment! : reply,
							) || [],
					}));
				} else {
					setComments((prev) =>
						prev.map((comment) =>
							comment.id === commentId ? currentComment! : comment,
						),
					);
				}

				const errorMessage =
					error instanceof Error ? error.message : 'Failed to like comment';
				console.error('Error liking comment:', error);
				Alert.alert('Error', errorMessage);
				return currentComment.is_liked || false;
			} finally {
				setLikingComments((prev) => ({ ...prev, [commentId]: false }));
			}
		},
		[viewerId, comments, loadedReplies],
	);

	// Edit comment
	const editComment = useCallback(
		async (commentId: string, newText: string): Promise<boolean> => {
			if (!newText.trim()) return false;

			try {
				const result = await CommentService.updateComment(
					commentId,
					newText.trim(),
				);

				if (result.success && result.data) {
					const updatedComment = result.data;

					// Update in comments list
					setComments((prev) =>
						prev.map((comment) =>
							comment.id === commentId ? updatedComment : comment,
						),
					);

					// Update in replies if it's a reply
					setLoadedReplies((prev) => {
						const newReplies = { ...prev };
						Object.keys(newReplies).forEach((parentId) => {
							newReplies[parentId] = newReplies[parentId].map((reply) =>
								reply.id === commentId ? updatedComment : reply,
							);
						});
						return newReplies;
					});

					return true;
				} else {
					const errorMessage = result.error || 'Failed to edit comment';
					Alert.alert('Error', errorMessage);
					return false;
				}
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : 'Failed to edit comment';
				console.error('Error editing comment:', error);
				Alert.alert('Error', errorMessage);
				return false;
			}
		},
		[],
	);

	// Delete comment
	const deleteComment = useCallback(
		async (
			commentId: string,
			isReply = false,
			parentId?: string,
		): Promise<boolean> => {
			try {
				// Show confirmation dialog
				return new Promise((resolve) => {
					Alert.alert(
						'Eliminar comentario',
						'¿Estás seguro de que quieres eliminar este comentario?',
						[
							{
								text: 'Cancelar',
								style: 'cancel',
								onPress: () => resolve(false),
							},
							{
								text: 'Eliminar',
								style: 'destructive',
								onPress: async () => {
									try {
										const result = await CommentService.deleteComment(
											commentId,
										);

										if (result.success) {
											if (isReply && parentId) {
												// Remove from replies and update parent count
												setLoadedReplies((prev) => ({
													...prev,
													[parentId]:
														prev[parentId]?.filter(
															(reply) => reply.id !== commentId,
														) || [],
												}));

												// Update parent comment's replies count
												setComments((prev) =>
													prev.map((comment) =>
														comment.id === parentId
															? {
																	...comment,
																	replies_count: Math.max(
																		0,
																		(comment.replies_count || 0) - 1,
																	),
															  }
															: comment,
													),
												);
											} else {
												// Remove top-level comment
												setComments((prev) =>
													prev.filter((c) => c.id !== commentId),
												);
												setTotal((prev) => Math.max(0, prev - 1));

												// Remove any loaded replies for this comment
												setLoadedReplies((prev) => {
													const newReplies = { ...prev };
													delete newReplies[commentId];
													return newReplies;
												});
											}

											Alert.alert(
												'Éxito',
												'Comentario eliminado correctamente',
											);
											resolve(true);
										} else {
											const errorMessage =
												result.error || 'Failed to delete comment';
											Alert.alert('Error', errorMessage);
											resolve(false);
										}
									} catch (error) {
										const errorMessage =
											error instanceof Error
												? error.message
												: 'Failed to delete comment';
										console.error('Error deleting comment:', error);
										Alert.alert('Error', errorMessage);
										resolve(false);
									}
								},
							},
						],
					);
				});
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : 'Failed to delete comment';
				console.error('Error deleting comment:', error);
				Alert.alert('Error', errorMessage);
				return false;
			}
		},
		[],
	);

	// Report comment
	const reportComment = useCallback(
		async (commentId: string, reason: string): Promise<boolean> => {
			try {
				if (!viewerId) {
					Alert.alert(
						'Error',
						'Debes iniciar sesión para reportar comentarios',
					);
					return false;
				}

				const result = await CommentService.reportComment(
					commentId,
					viewerId,
					reason,
				);

				if (result.success) {
					Alert.alert(
						'Reporte enviado',
						'Hemos recibido tu reporte y lo estamos revisando.',
					);
					return true;
				} else {
					const errorMessage = result.error || 'Failed to report comment';
					Alert.alert('Error', errorMessage);
					return false;
				}
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : 'Failed to report comment';
				console.error('Error reporting comment:', error);
				Alert.alert('Error', errorMessage);
				return false;
			}
		},
		[viewerId],
	);

	// Toggle replies visibility
	const toggleReplies = useCallback(
		async (commentId: string) => {
			if (!loadedReplies[commentId]) {
				// Load replies for the first time
				await loadReplies(commentId, true);
			} else {
				// Toggle visibility by removing from state
				setLoadedReplies((prev) => {
					const newReplies = { ...prev };
					delete newReplies[commentId];
					return newReplies;
				});
			}
		},
		[loadReplies, loadedReplies],
	);

	// Load more replies for a comment
	const loadMoreReplies = useCallback(
		async (commentId: string) => {
			if (!loadingReplies[commentId] && repliesHasMore[commentId]) {
				await loadReplies(commentId, false);
			}
		},
		[loadReplies, loadingReplies, repliesHasMore],
	);

	// Load more comments (pagination)
	const loadMoreComments = useCallback(() => {
		if (!isLoadingMore && hasMore) {
			loadComments(false);
		}
	}, [isLoadingMore, hasMore, loadComments]);

	// Refresh comments
	const refreshComments = useCallback(() => {
		setHasMore(true);
		loadComments(true);
	}, [loadComments]);

	// Retry loading comments
	const retryLoad = useCallback(() => {
		setError(null);
		setHasMore(true);
		loadComments(true);
	}, [loadComments]);

	// Clear error
	const clearError = useCallback(() => {
		setError(null);
	}, []);

	// Load comments when videoId or viewerId changes
	useEffect(() => {
		if (videoId && viewerId) {
			setComments([]);
			setLoadedReplies({});
			setPage(0);
			setHasMore(true);
			setError(null);
			loadComments(true);
		}
	}, [videoId, viewerId]);

	// Add comment manually (for external updates)
	const addComment = useCallback((comment: Comment) => {
		setComments((prev) => [comment, ...prev]);
		setTotal((prev) => prev + 1);
	}, []);

	// Update comment manually (for external updates)
	const updateComment = useCallback(
		(commentId: string, updates: Partial<Comment>) => {
			setComments((prev) =>
				prev.map((comment) =>
					comment.id === commentId ? { ...comment, ...updates } : comment,
				),
			);
		},
		[],
	);

	// Remove comment manually (for external updates)
	const removeComment = useCallback((commentId: string) => {
		setComments((prev) => prev.filter((c) => c.id !== commentId));
		setTotal((prev) => Math.max(0, prev - 1));
	}, []);

	// Get comment by ID
	const getComment = useCallback(
		(commentId: string): Comment | undefined => {
			return comments.find((c) => c.id === commentId);
		},
		[comments],
	);

	// Check if comment is being liked
	const isCommentBeingLiked = useCallback(
		(commentId: string): boolean => {
			return likingComments[commentId] || false;
		},
		[likingComments],
	);

	return {
		// State
		comments,
		isLoading,
		isLoadingMore,
		isSubmitting,
		hasMore,
		error,
		total,
		page,

		// Replies state
		loadedReplies,
		loadingReplies,
		repliesHasMore,

		// Actions
		loadComments: loadComments,
		submitComment,
		editComment,
		deleteComment,
		reportComment,
		loadMoreComments,
		refreshComments,
		retryLoad,
		clearError,

		// Like functionality
		toggleCommentLike,
		isCommentBeingLiked,

		// Replies actions
		loadReplies,
		toggleReplies,
		loadMoreReplies,

		// Manual operations (for external state management)
		addComment,
		updateComment,
		removeComment,
		getComment,

		// Helper getters
		isEmpty: comments.length === 0 && !isLoading,
		hasComments: comments.length > 0,
		canLoadMore: hasMore && !isLoading && !isLoadingMore,
	};
};
