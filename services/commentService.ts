import { supabase } from '@/lib/supabase';
import { AuthResponse, Comment } from '@/shared/types';

export class CommentService {
	/**
	 * Get comments for a video with likes support
	 */
	static async getVideoComments(
		videoId: string,
		viewerId: string,
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

			// Use the new function that includes likes information
			const { data: comments, error } = await supabase.rpc(
				'get_video_comments_paginated_with_likes',
				{
					video_id_param: videoId,
					viewer_id_param: viewerId,
					page_offset: startRange,
					page_limit: limit,
				},
			);

			console.log('get_video_comments_paginated_with_likes', comments);

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			// Get total count for pagination
			const { count } = await supabase
				.from('comments')
				.select('*', { count: 'exact', head: true })
				.eq('video_id', videoId)
				.is('reply_to', null);

			// Transform the data to match our Comment type
			const processedComments: Comment[] = (comments || []).map(
				(comment: any) => ({
					id: comment.id,
					user_id: comment.user_id,
					video_id: comment.video_id,
					text: comment.text,
					reply_to: comment.reply_to,
					replies_count: comment.replies_count || 0,
					likes_count: comment.likes_count || 0,
					created_at: comment.created_at,
					updated_at: comment.updated_at,
					is_liked: comment.is_liked || false,
					user: {
						id: comment.user_id,
						username: comment.username,
						display_name: comment.display_name,
						avatar_url: comment.avatar_url,
					},
				}),
			);

			const total = count || 0;
			const hasMore = startRange + limit < total;

			return {
				success: true,
				data: {
					comments: processedComments,
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
	 * Get replies for a specific comment with likes support
	 */
	static async getCommentReplies(
		commentId: string,
		viewerId: string,
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

			// Use the new function that includes likes information
			const { data: replies, error } = await supabase.rpc(
				'get_comment_replies_with_likes',
				{
					comment_id_param: commentId,
					viewer_id_param: viewerId,
					page_offset: startRange,
					page_limit: limit,
				},
			);

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			// Get total count for pagination
			const { count } = await supabase
				.from('comments')
				.select('*', { count: 'exact', head: true })
				.eq('reply_to', commentId);

			// Transform the data to match our Comment type
			const processedReplies: Comment[] = (replies || []).map((reply: any) => ({
				id: reply.id,
				user_id: reply.user_id,
				video_id: reply.video_id,
				text: reply.text,
				reply_to: reply.reply_to,
				replies_count: 0, // Replies don't have sub-replies
				likes_count: reply.likes_count || 0,
				created_at: reply.created_at,
				updated_at: reply.updated_at,
				is_liked: reply.is_liked || false,
				user: {
					id: reply.user_id,
					username: reply.username,
					display_name: reply.display_name,
					avatar_url: reply.avatar_url,
				},
			}));

			const total = count || 0;
			const hasMore = startRange + limit < total;

			return {
				success: true,
				data: {
					replies: processedReplies,
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

			// Initialize likes_count and is_liked for new comments
			const processedComment: Comment = {
				...comment,
				likes_count: 0,
				is_liked: false,
				replies_count: 0,
			};

			return {
				success: true,
				data: processedComment,
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

			// Delete the comment (this will also cascade delete comment_likes)
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
	 * Toggle like on a comment
	 */
	static async toggleCommentLike(
		commentId: string,
		userId: string,
	): Promise<AuthResponse<{ liked: boolean; likes_count: number }>> {
		try {
			const { data, error } = await supabase.rpc('toggle_comment_like', {
				comment_id_param: commentId,
				user_id_param: userId,
			});

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			if (!data || data.length === 0) {
				return {
					success: false,
					error: 'Failed to toggle comment like',
				};
			}

			const result = data[0];

			return {
				success: true,
				data: {
					liked: result.liked,
					likes_count: result.likes_count,
				},
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Failed to toggle comment like',
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
				reported_comment_id: commentId,
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
