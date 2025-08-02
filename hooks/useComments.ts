import { CommentService } from '@/services/commentService';
import { Comment } from '@/shared/types';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

export const useComments = (videoId: string) => {
	const [comments, setComments] = useState<Comment[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [page, setPage] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [total, setTotal] = useState(0);

	// Load initial comments
	const loadComments = useCallback(
		async (refresh = false) => {
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
					refresh ? 0 : page,
					20,
				);

				if (result.success && result.data) {
					const dataPayload = result.data;
					if (refresh) {
						setComments(result.data.comments);
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
		[videoId, page, hasMore, isLoadingMore],
	);

	// Submit new comment
	const submitComment = useCallback(
		async (text: string): Promise<Comment | null> => {
			if (!text.trim()) return null;

			setIsSubmitting(true);
			setError(null);

			try {
				const result = await CommentService.createComment({
					video_id: videoId,
					text: text.trim(),
				});

				if (result.success && result.data) {
					const dataPayload = result.data;
					setComments((prev) => [dataPayload, ...prev]);
					setTotal((prev) => prev + 1);
					return dataPayload;
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

	// Delete comment
	const deleteComment = useCallback(
		async (commentId: string): Promise<boolean> => {
			try {
				// Optimistic update
				const originalComments = comments;
				setComments((prev) => prev.filter((c) => c.id !== commentId));
				setTotal((prev) => prev - 1);

				const result = await CommentService.deleteComment(commentId);

				if (result.success) {
					Alert.alert('Éxito', 'Comentario eliminado correctamente');
					return true;
				} else {
					// Revert optimistic update
					setComments(originalComments);
					setTotal((prev) => prev + 1);

					const errorMessage = result.error || 'Failed to delete comment';
					Alert.alert('Error', errorMessage);
					return false;
				}
			} catch (error) {
				// Revert optimistic update
				setComments((prev) => [
					...prev.filter((c) => c.id !== commentId),
					...comments.filter((c) => c.id === commentId),
				]);
				setTotal((prev) => prev + 1);

				const errorMessage =
					error instanceof Error ? error.message : 'Failed to delete comment';
				console.error('Error deleting comment:', error);
				Alert.alert('Error', errorMessage);
				return false;
			}
		},
		[comments],
	);

	// Report comment
	const reportComment = useCallback(
		async (commentId: string, reason: string): Promise<boolean> => {
			try {
				const { useAuthStore } = await import('@/stores/authStore');
				const { user } = useAuthStore.getState();

				if (!user) {
					Alert.alert(
						'Error',
						'Debes iniciar sesión para reportar comentarios',
					);
					return false;
				}

				const result = await CommentService.reportComment(
					commentId,
					user.id,
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
		[],
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

	// Load comments when videoId changes
	useEffect(() => {
		if (videoId) {
			setComments([]);
			setPage(0);
			setHasMore(true);
			setError(null);
			loadComments(true);
		}
	}, [videoId]);

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

		// Actions
		loadComments: loadComments,
		submitComment,
		deleteComment,
		reportComment,
		loadMoreComments,
		refreshComments,
		retryLoad,
		clearError,

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
