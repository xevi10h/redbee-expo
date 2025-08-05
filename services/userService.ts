import { supabase } from '@/lib/supabase';
import { AuthResponse, User } from '@/shared/types';

export class UserService {
	/**
	 * Toggle follow/unfollow a user
	 */
	static async toggleFollow(targetUserId: string, currentUserId: string): Promise<AuthResponse<{ following: boolean }>> {
		try {
			// Check if already following
			const { data: existingFollow, error: checkError } = await supabase
				.from('follows')
				.select('id')
				.eq('follower_id', currentUserId)
				.eq('following_id', targetUserId)
				.single();

			if (checkError && checkError.code !== 'PGRST116') {
				return {
					success: false,
					error: checkError.message,
				};
			}

			if (existingFollow) {
				// Unfollow
				const { error: deleteError } = await supabase
					.from('follows')
					.delete()
					.eq('id', existingFollow.id);

				if (deleteError) {
					return {
						success: false,
						error: deleteError.message,
					};
				}

				return {
					success: true,
					data: { following: false },
				};
			} else {
				// Follow
				const { error: insertError } = await supabase
					.from('follows')
					.insert({
						follower_id: currentUserId,
						following_id: targetUserId,
					});

				if (insertError) {
					return {
						success: false,
						error: insertError.message,
					};
				}

				return {
					success: true,
					data: { following: true },
				};
			}
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to toggle follow',
			};
		}
	}

	/**
	 * Update user profile
	 */
	static async updateProfile(userId: string, updates: {
		display_name?: string;
		username?: string;
		bio?: string;
		subscription_price?: number;
		avatar_url?: string;
	}): Promise<AuthResponse<User>> {
		try {
			const { data, error } = await supabase
				.from('profiles')
				.update(updates)
				.eq('id', userId)
				.select()
				.single();

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			return {
				success: true,
				data,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to update profile',
			};
		}
	}

	/**
	 * Get user profile with interaction states
	 */
	static async getUserProfile(userId: string, viewerId?: string): Promise<AuthResponse<User & {
		is_following?: boolean;
		is_subscribed?: boolean;
	}>> {
		try {
			const { data: profile, error } = await supabase
				.from('profiles')
				.select('*')
				.eq('id', userId)
				.single();

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			let is_following = false;
			let is_subscribed = false;

			if (viewerId && viewerId !== userId) {
				// Check if viewer is following this user
				const { data: followData } = await supabase
					.from('follows')
					.select('id')
					.eq('follower_id', viewerId)
					.eq('following_id', userId)
					.single();

				is_following = !!followData;

				// Check if viewer is subscribed to this user
				const { data: subscriptionData } = await supabase
					.from('subscriptions')
					.select('id')
					.eq('subscriber_id', viewerId)
					.eq('creator_id', userId)
					.eq('status', 'active')
					.gte('current_period_end', new Date().toISOString())
					.single();

				is_subscribed = !!subscriptionData;
			}

			return {
				success: true,
				data: {
					...profile,
					is_following,
					is_subscribed,
				},
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to get user profile',
			};
		}
	}
}
