import { supabase } from '@/lib/supabase';
import { AuthResponse, Comment } from '@/shared/types';

export class CommentService {
	/**
	 * Get comments for a video
	 */
	static async getVideoComments(videoId: string, page = 0, limit = 20): Promise<AuthResponse<{
		comments: Comment[];
		hasMore: boolean;
		total: number;
	}>> {
		try {
			const startRange = page * limit;
			const endRange = startRange + limit - 1;

			const { data: comments, error, count } = await supabase
				.from('comments')
				.select(`
					*,
					user:profiles!comments_user_id_fkey (
						id,
						username,
						display_name,
						avatar_url
					)
				`, { count: 'exact' })
				.eq('video_id', videoId)
				.order('created_at', { ascending: false })
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
					comments: comments || [],
					hasMore,
					total,
				},
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to load comments',
			};
		}
	}

	/**
	 * Create a new comment
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
				})
				.select(`
					*,
					user:profiles!comments_user_id_fkey (
						id,
						username,
						display_name,
						avatar_url
					)
				`)
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
				error: error instanceof Error ? error.message : 'Failed to create comment',
			};
		}
	}

	/**
	 * Delete a comment
	 */
	static async deleteComment(commentId: string): Promise<AuthResponse<void>> {
		try {
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
				error: error instanceof Error ? error.message : 'Failed to delete comment',
			};
		}
	}

	/**
	 * Report a comment
	 */
	static async reportComment(
		commentId: string,
		reporterId: string,
		reason: string
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
			const { error: reportError } = await supabase
				.from('reports')
				.insert({
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
				error: error instanceof Error ? error.message : 'Failed to report comment',
			};
		}
	}
}