import { supabase } from '@/lib/supabase';
import { AuthResponse, Comment } from '@/shared/types';

export class CommentService {
	/**
	 * Get comments for a video with replies support
	 */
	static async getVideoComments(
		videoId: string,
		page = 0,
		limit = 20,
	): Promise<
		AuthResponse<{
			comments: Comment[];
			hasMore: boolean;
			total: number;
		}>
	> {
		try {
			const startRange = page * limit;
			const endRange = startRange + limit - 1;

			// Get top-level comments (no reply_to)
			const {
				data: comments,
				error,
				count,
			} = await supabase
				.from('comments')
				.select(
					`
					*,
					user:profiles!comments_user_id_fkey (
						id,
						username,
						display_name,
						avatar_url
					)
				`,
					{ count: 'exact' },
				)
				.eq('video_id', videoId)
				.is('reply_to', null) // Only top-level comments
				.order('created_at', { ascending: false })
				.range(startRange, endRange);

			console.log('comments', comments);

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			// Get reply counts for each comment
			if (comments && comments.length > 0) {
				const commentIds = comments.map((c) => c.id);
				const { data: replyCounts } = await supabase
					.from('comments')
					.select('reply_to')
					.in('reply_to', commentIds);

				// Add reply counts to comments
				const replyCountMap = (replyCounts || []).reduce((acc, reply) => {
					acc[reply.reply_to] = (acc[reply.reply_to] || 0) + 1;
					return acc;
				}, {} as Record<string, number>);

				comments.forEach((comment) => {
					comment.replies_count = replyCountMap[comment.id] || 0;
				});
			}

			const total = count || 0;
			const hasMore = startRange + limit < total;

			return {
				success: true,
				data: {
					comments: comments || [],
					hasMore,
					total,
				},
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error.message : 'Failed to load comments',
			};
		}
	}

	/**
	 * Get replies for a specific comment
	 */
	static async getCommentReplies(
		commentId: string,
		page = 0,
		limit = 10,
	): Promise<
		AuthResponse<{
			replies: Comment[];
			hasMore: boolean;
			total: number;
		}>
	> {
		try {
			const startRange = page * limit;
			const endRange = startRange + limit - 1;

			const {
				data: replies,
				error,
				count,
			} = await supabase
				.from('comments')
				.select(
					`
					*,
					user:profiles!comments_user_id_fkey (
						id,
						username,
						display_name,
						avatar_url
					)
				`,
					{ count: 'exact' },
				)
				.eq('reply_to', commentId)
				.order('created_at', { ascending: true }) // Replies in chronological order
				.range(startRange, endRange);

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			const total = count || 0;
			const hasMore = startRange + limit < total;

			return {
				success: true,
				data: {
					replies: replies || [],
					hasMore,
					total,
				},
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error.message : 'Failed to load replies',
			};
		}
	}

	/**
	 * Create a new comment or reply
	 */
	static async createComment(data: {
		video_id: string;
		text: string;
		reply_to?: string;
	}): Promise<AuthResponse<Comment>> {
		try {
			const currentUser = await supabase.auth.getUser();
			if (!currentUser.data.user) {
				return {
					success: false,
					error: 'User not authenticated',
				};
			}

			const { data: comment, error } = await supabase
				.from('comments')
				.insert({
					video_id: data.video_id,
					text: data.text,
					user_id: currentUser.data.user.id,
					reply_to: data.reply_to || null,
				})
				.select(
					`
					*,
					user:profiles!comments_user_id_fkey (
						id,
						username,
						display_name,
						avatar_url
					)
				`,
				)
				.single();

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			// Initialize replies_count for new comments
			comment.replies_count = 0;

			return {
				success: true,
				data: comment,
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error.message : 'Failed to create comment',
			};
		}
	}

	/**
	 * Update/edit a comment
	 */
	static async updateComment(
		commentId: string,
		text: string,
	): Promise<AuthResponse<Comment>> {
		try {
			const currentUser = await supabase.auth.getUser();
			if (!currentUser.data.user) {
				return {
					success: false,
					error: 'User not authenticated',
				};
			}

			const { data: comment, error } = await supabase
				.from('comments')
				.update({
					text: text.trim(),
					updated_at: new Date().toISOString(),
				})
				.eq('id', commentId)
				.eq('user_id', currentUser.data.user.id) // Ensure user owns the comment
				.select(
					`
					*,
					user:profiles!comments_user_id_fkey (
						id,
						username,
						display_name,
						avatar_url
					)
				`,
				)
				.single();

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			return {
				success: true,
				data: comment,
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error.message : 'Failed to update comment',
			};
		}
	}

	/**
	 * Delete a comment
	 */
	static async deleteComment(commentId: string): Promise<AuthResponse<void>> {
		try {
			const currentUser = await supabase.auth.getUser();
			if (!currentUser.data.user) {
				return {
					success: false,
					error: 'User not authenticated',
				};
			}

			// Check if user owns the comment
			const { data: comment, error: checkError } = await supabase
				.from('comments')
				.select('user_id, reply_to')
				.eq('id', commentId)
				.single();

			if (checkError || !comment) {
				return {
					success: false,
					error: 'Comment not found',
				};
			}

			if (comment.user_id !== currentUser.data.user.id) {
				return {
					success: false,
					error: 'You can only delete your own comments',
				};
			}

			// Delete all replies to this comment first
			if (!comment.reply_to) {
				// Only for top-level comments
				await supabase.from('comments').delete().eq('reply_to', commentId);
			}

			// Delete the comment
			const { error } = await supabase
				.from('comments')
				.delete()
				.eq('id', commentId);

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			return {
				success: true,
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error.message : 'Failed to delete comment',
			};
		}
	}

	/**
	 * Report a comment
	 */
	static async reportComment(
		commentId: string,
		reporterId: string,
		reason: string,
	): Promise<AuthResponse<void>> {
		try {
			// Get comment details
			const { data: comment, error: commentError } = await supabase
				.from('comments')
				.select('user_id, video_id')
				.eq('id', commentId)
				.single();

			if (commentError) {
				return {
					success: false,
					error: 'Comment not found',
				};
			}

			// Create report
			const { error: reportError } = await supabase.from('reports').insert({
				comment_id: commentId,
				video_id: comment.video_id,
				reporter_id: reporterId,
				reported_user_id: comment.user_id,
				reason: reason,
				status: 'pending',
			});

			if (reportError) {
				return {
					success: false,
					error: reportError.message,
				};
			}

			return {
				success: true,
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error.message : 'Failed to report comment',
			};
		}
	}
}
