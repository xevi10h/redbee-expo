import { supabase } from '@/lib/supabase';
import { getDeviceLanguage } from '@/shared/functions/utils';
import {
	AuthResponse,
	LoginCredentials,
	RegisterCredentials,
	User,
} from '@/shared/types';

export class SupabaseAuthService {
	/**
	 * Sign in with email and password
	 */
	static async signInWithEmail(
		credentials: LoginCredentials,
	): Promise<AuthResponse<User>> {
		try {
			const { data: authData, error: authError } =
				await supabase.auth.signInWithPassword({
					email: credentials.email,
					password: credentials.password,
				});

			if (authError) {
				return {
					success: false,
					error: authError.message,
				};
			}

			if (!authData.user) {
				return {
					success: false,
					error: 'No user data received',
				};
			}

			// Get user profile from profiles table
			const { data: profile, error: profileError } = await supabase
				.from('profiles')
				.select('*')
				.eq('id', authData.user.id)
				.single();

			if (profileError) {
				return {
					success: false,
					error: 'Failed to fetch user profile',
				};
			}

			const user: User = {
				...profile,
				email: authData.user.email!,
				access_token: authData.session?.access_token,
				language: getDeviceLanguage(),
			};

			return {
				success: true,
				data: user,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Sign in failed',
			};
		}
	}

	/**
	 * Sign up with email and password
	 */
	static async signUpWithEmail(
		credentials: RegisterCredentials,
	): Promise<AuthResponse<User>> {
		try {
			// First check if username is available using the function
			const { data: isAvailable, error: availabilityError } =
				await supabase.rpc('check_username_availability', {
					username_to_check: credentials.username,
				});

			if (availabilityError) {
				return {
					success: false,
					error: 'Failed to check username availability',
				};
			}

			if (!isAvailable) {
				return {
					success: false,
					error: 'Username is not available',
				};
			}

			// Sign up with Supabase Auth
			const { data: authData, error: authError } = await supabase.auth.signUp({
				email: credentials.email,
				password: credentials.password,
				options: {
					data: {
						display_name: credentials.display_name,
						username: credentials.username,
					},
				},
			});

			if (authError) {
				return {
					success: false,
					error: authError.message,
				};
			}

			if (!authData.user) {
				return {
					success: false,
					error: 'No user data received',
				};
			}

			// Update the profile with the correct username (trigger creates initial profile)
			const { data: profile, error: profileError } = await supabase
				.from('profiles')
				.update({
					username: credentials.username,
					display_name: credentials.display_name,
					updated_at: new Date().toISOString(),
				})
				.eq('id', authData.user.id)
				.select()
				.single();

			if (profileError) {
				return {
					success: false,
					error: 'Failed to update user profile',
				};
			}

			const user: User = {
				...profile,
				email: authData.user.email!,
				access_token: authData.session?.access_token,
				language: getDeviceLanguage(),
			};

			return {
				success: true,
				data: user,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Sign up failed',
			};
		}
	}

	/**
	 * Sign in with Google
	 */
	static async signInWithGoogle(): Promise<AuthResponse<User>> {
		try {
			const { data, error } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: 'redbee://auth/callback',
				},
			});

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			// Note: For OAuth, the actual user data will be handled in the callback
			return {
				success: true,
				data: undefined,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Google sign in failed',
			};
		}
	}

	/**
	 * Sign in with Apple
	 */
	static async signInWithApple(): Promise<AuthResponse<User>> {
		try {
			const { data, error } = await supabase.auth.signInWithOAuth({
				provider: 'apple',
				options: {
					redirectTo: 'redbee://auth/callback',
				},
			});

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			// Note: For OAuth, the actual user data will be handled in the callback
			return {
				success: true,
				data: undefined,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Apple sign in failed',
			};
		}
	}

	/**
	 * Sign out
	 */
	static async signOut(): Promise<AuthResponse<void>> {
		try {
			const { error } = await supabase.auth.signOut();

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
				error: error instanceof Error ? error.message : 'Sign out failed',
			};
		}
	}

	/**
	 * Get current session
	 */
	static async getCurrentSession(): Promise<AuthResponse<User>> {
		try {
			const { data: session, error: sessionError } =
				await supabase.auth.getSession();

			if (sessionError) {
				return {
					success: false,
					error: sessionError.message,
				};
			}

			if (!session.session?.user) {
				return {
					success: false,
					error: 'No active session',
				};
			}

			// Get user profile from profiles table
			const { data: profile, error: profileError } = await supabase
				.from('profiles')
				.select('*')
				.eq('id', session.session.user.id)
				.single();

			if (profileError) {
				return {
					success: false,
					error: 'Failed to fetch user profile',
				};
			}

			const user: User = {
				...profile,
				email: session.session.user.email!,
				access_token: session.session.access_token,
				language: getDeviceLanguage(),
			};

			return {
				success: true,
				data: user,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to get session',
			};
		}
	}

	/**
	 * Refresh session
	 */
	static async refreshSession(): Promise<AuthResponse<User>> {
		try {
			const { data, error } = await supabase.auth.refreshSession();

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			if (!data.session?.user) {
				return {
					success: false,
					error: 'No session data received',
				};
			}

			return this.getCurrentSession();
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error.message : 'Failed to refresh session',
			};
		}
	}

	/**
	 * Check if username is available
	 */
	static async checkUsernameAvailability(
		username: string,
	): Promise<AuthResponse<{ available: boolean }>> {
		try {
			const { data, error } = await supabase.rpc(
				'check_username_availability',
				{
					username_to_check: username,
				},
			);

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			return {
				success: true,
				data: {
					available: data,
				},
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error.message : 'Failed to check username',
			};
		}
	}

	/**
	 * Check if username is available for update (excludes current user)
	 */
	static async checkUsernameAvailabilityForUpdate(
		username: string,
		currentUserId: string,
	): Promise<AuthResponse<{ available: boolean }>> {
		try {
			const { data, error } = await supabase.rpc(
				'check_username_availability_for_update',
				{
					username_to_check: username,
					user_id: currentUserId,
				},
			);

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			return {
				success: true,
				data: {
					available: data,
				},
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error.message : 'Failed to check username',
			};
		}
	}

	/**
	 * Check if email is available
	 */
	static async checkEmailAvailability(
		email: string,
	): Promise<AuthResponse<{ available: boolean }>> {
		try {
			// Check in auth.users (emails are managed by Supabase Auth)
			const { data: existingUsers, error } = await supabase
				.from('users_with_email')
				.select('id')
				.eq('email', email.toLowerCase())
				.limit(1);

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			return {
				success: true,
				data: {
					available: !existingUsers || existingUsers.length === 0,
				},
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to check email',
			};
		}
	}

	/**
	 * Reset password
	 */
	static async resetPassword(email: string): Promise<AuthResponse<void>> {
		try {
			const { error } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: 'redbee://auth/reset-password',
			});

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
					error instanceof Error ? error.message : 'Failed to send reset email',
			};
		}
	}

	/**
	 * Update password
	 */
	static async updatePassword(
		newPassword: string,
	): Promise<AuthResponse<void>> {
		try {
			const { error } = await supabase.auth.updateUser({
				password: newPassword,
			});

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
					error instanceof Error ? error.message : 'Failed to update password',
			};
		}
	}

	/**
	 * Update user profile
	 */
	static async updateProfile(
		userId: string,
		updates: Partial<User>,
	): Promise<AuthResponse<User>> {
		try {
			// Separate email updates from profile updates
			const { email, access_token, language, ...profileUpdates } = updates;

			// Update profile in profiles table
			const { data: profile, error: profileError } = await supabase
				.from('profiles')
				.update({
					...profileUpdates,
					updated_at: new Date().toISOString(),
				})
				.eq('id', userId)
				.select()
				.single();

			if (profileError) {
				return {
					success: false,
					error: profileError.message,
				};
			}

			// Update email if provided (this updates auth.users)
			if (email) {
				const { error: emailError } = await supabase.auth.updateUser({
					email: email,
				});

				if (emailError) {
					return {
						success: false,
						error: `Profile updated but email update failed: ${emailError.message}`,
					};
				}
			}

			// Get current email from auth
			const { data: session } = await supabase.auth.getSession();
			const currentEmail = session.session?.user?.email || '';

			return {
				success: true,
				data: {
					...profile,
					email: email || currentEmail,
					language: language || getDeviceLanguage(),
				},
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error.message : 'Failed to update profile',
			};
		}
	}

	/**
	 * Delete account
	 */
	static async deleteAccount(userId: string): Promise<AuthResponse<void>> {
		try {
			// Delete profile (cascade will handle related data)
			const { error: deleteError } = await supabase
				.from('profiles')
				.delete()
				.eq('id', userId);

			if (deleteError) {
				return {
					success: false,
					error: deleteError.message,
				};
			}

			// Sign out
			await this.signOut();

			return {
				success: true,
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error.message : 'Failed to delete account',
			};
		}
	}
}
