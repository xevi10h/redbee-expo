import { supabase } from '@/lib/supabase';
import { getDeviceLanguage } from '@/shared/functions/utils';
import {
	AuthResponse,
	LoginCredentials,
	RegisterCredentials,
	User,
} from '@/shared/types';
import {
	GoogleSignin,
	statusCodes,
} from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

// Complete auth session for WebBrowser
WebBrowser.maybeCompleteAuthSession();

export class SupabaseAuthService {
	/**
	 * Initialize Google Sign-In configuration
	 * Call this in your app's initialization (App.tsx or index.tsx)
	 */
	static initializeGoogleSignIn() {
		GoogleSignin.configure({
			// You'll get these from your Google Cloud Console
			// webClientId should be your Supabase project's Google OAuth client ID
			webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
			iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
			// Include any additional scopes you need
			scopes: ['email', 'profile'],
			// Ensure offline access to get refresh tokens
			offlineAccess: true,
		});
	}

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
	 * Sign in with Google using native GoogleSignin
	 * Recommended method for Google authentication
	 */
	static async signInWithGoogle(): Promise<AuthResponse<User>> {
		try {
			// Check if device supports Google Play Services
			await GoogleSignin.hasPlayServices();

			console.log('Google Play Services are available');

			// Get user info and id token
			const userInfo = await GoogleSignin.signIn();

			console.log('Google user info:', userInfo);

			if (!userInfo.data?.idToken) {
				return {
					success: false,
					error: 'No ID token received from Google',
				};
			}

			// Sign in to Supabase with the ID token
			const { data, error } = await supabase.auth.signInWithIdToken({
				provider: 'google',
				token: userInfo.data?.idToken,
			});

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			if (!data.user) {
				return {
					success: false,
					error: 'No user data received from Supabase',
				};
			}

			// Check if user has a profile, create one if not
			let { data: profile, error: profileError } = await supabase
				.from('profiles')
				.select('*')
				.eq('id', data.user.id)
				.single();

			if (profileError && profileError.code === 'PGRST116') {
				// Profile doesn't exist, create one
				const username = this.generateUsernameFromEmail(data.user.email || '');
				const { data: newProfile, error: createError } = await supabase
					.from('profiles')
					.insert({
						id: data.user.id,
						username,
						display_name: data.user.user_metadata?.full_name || username,
						avatar_url: data.user.user_metadata?.avatar_url,
					})
					.select()
					.single();

				if (createError) {
					return {
						success: false,
						error: 'Failed to create user profile',
					};
				}

				profile = newProfile;
			} else if (profileError) {
				return {
					success: false,
					error: 'Failed to fetch user profile',
				};
			}

			const user: User = {
				...profile!,
				email: data.user.email!,
				access_token: data.session?.access_token,
				language: getDeviceLanguage(),
			};

			return {
				success: true,
				data: user,
			};
		} catch (error: any) {
			let errorMessage = 'Google sign in failed';

			console.error('Google sign in error:', error);

			if (error.code === statusCodes.SIGN_IN_CANCELLED) {
				errorMessage = 'Google sign in was cancelled';
			} else if (error.code === statusCodes.IN_PROGRESS) {
				errorMessage = 'Google sign in is already in progress';
			} else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
				errorMessage = 'Google Play Services not available';
			}

			return {
				success: false,
				error: errorMessage,
			};
		}
	}

	/**
	 * Sign in with Google using OAuth WebBrowser flow
	 * Alternative method, works on all platforms
	 */
	static async signInWithGoogleOAuth(): Promise<AuthResponse<User>> {
		try {
			const redirectUrl = Linking.createURL('auth/callback');

			// Start OAuth flow with Supabase
			const { data, error } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: redirectUrl,
					queryParams: {
						access_type: 'offline',
						prompt: 'consent',
					},
				},
			});

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			if (!data.url) {
				return {
					success: false,
					error: 'No authorization URL received',
				};
			}

			// Open browser for authentication
			const result = await WebBrowser.openAuthSessionAsync(
				data.url,
				redirectUrl,
				{
					showInRecents: true,
				},
			);

			if (result.type !== 'success') {
				return {
					success: false,
					error: 'Authentication was cancelled or failed',
				};
			}

			// Extract tokens from URL
			const url = new URL(result.url);
			const accessToken = url.searchParams.get('access_token');
			const refreshToken = url.searchParams.get('refresh_token');

			if (!accessToken || !refreshToken) {
				return {
					success: false,
					error: 'No tokens received from authentication',
				};
			}

			// Set session in Supabase
			const { data: sessionData, error: sessionError } =
				await supabase.auth.setSession({
					access_token: accessToken,
					refresh_token: refreshToken,
				});

			if (sessionError || !sessionData.user) {
				return {
					success: false,
					error: sessionError?.message || 'Failed to establish session',
				};
			}

			// Get or create user profile
			let { data: profile, error: profileError } = await supabase
				.from('profiles')
				.select('*')
				.eq('id', sessionData.user.id)
				.single();

			if (profileError && profileError.code === 'PGRST116') {
				// Profile doesn't exist, create one
				const username = this.generateUsernameFromEmail(
					sessionData.user.email || '',
				);
				const { data: newProfile, error: createError } = await supabase
					.from('profiles')
					.insert({
						id: sessionData.user.id,
						username,
						display_name: sessionData.user.user_metadata?.full_name || username,
						avatar_url: sessionData.user.user_metadata?.avatar_url,
					})
					.select()
					.single();

				if (createError) {
					return {
						success: false,
						error: 'Failed to create user profile',
					};
				}

				profile = newProfile;
			} else if (profileError) {
				return {
					success: false,
					error: 'Failed to fetch user profile',
				};
			}

			const user: User = {
				...profile!,
				email: sessionData.user.email!,
				access_token: sessionData.session?.access_token,
				language: getDeviceLanguage(),
			};

			return {
				success: true,
				data: user,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Google OAuth failed',
			};
		}
	}

	/**
	 * Sign in with Apple (iOS only)
	 */
	static async signInWithApple(): Promise<AuthResponse<User>> {
		try {
			// Check if Apple Sign In is available
			const isAvailable = await AppleAuthentication.isAvailableAsync();
			if (!isAvailable) {
				return {
					success: false,
					error: 'Apple Sign In is not available on this device',
				};
			}

			// Request Apple authentication
			const credential = await AppleAuthentication.signInAsync({
				requestedScopes: [
					AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
					AppleAuthentication.AppleAuthenticationScope.EMAIL,
				],
			});

			if (!credential.identityToken) {
				return {
					success: false,
					error: 'No identity token received from Apple',
				};
			}

			// Sign in to Supabase with the identity token
			const { data, error } = await supabase.auth.signInWithIdToken({
				provider: 'apple',
				token: credential.identityToken,
			});

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			if (!data.user) {
				return {
					success: false,
					error: 'No user data received from Supabase',
				};
			}

			// Check if user has a profile, create one if not
			let { data: profile, error: profileError } = await supabase
				.from('profiles')
				.select('*')
				.eq('id', data.user.id)
				.single();

			if (profileError && profileError.code === 'PGRST116') {
				// Profile doesn't exist, create one
				let displayName = data.user.user_metadata?.full_name;

				// Apple provides full name only on first sign in
				if (!displayName && credential.fullName) {
					displayName = `${credential.fullName.givenName || ''} ${
						credential.fullName.familyName || ''
					}`.trim();
				}

				const username = this.generateUsernameFromEmail(
					data.user.email || credential.email || '',
				);

				const { data: newProfile, error: createError } = await supabase
					.from('profiles')
					.insert({
						id: data.user.id,
						username,
						display_name: displayName || username,
					})
					.select()
					.single();

				if (createError) {
					return {
						success: false,
						error: 'Failed to create user profile',
					};
				}

				profile = newProfile;
			} else if (profileError) {
				return {
					success: false,
					error: 'Failed to fetch user profile',
				};
			}

			const user: User = {
				...profile!,
				email: data.user.email || credential.email || '',
				access_token: data.session?.access_token,
				language: getDeviceLanguage(),
			};

			return {
				success: true,
				data: user,
			};
		} catch (error: any) {
			if (error.code === 'ERR_REQUEST_CANCELED') {
				return {
					success: false,
					error: 'Apple sign in was cancelled',
				};
			}

			return {
				success: false,
				error: error instanceof Error ? error.message : 'Apple sign in failed',
			};
		}
	}

	/**
	 * Sign out and clean up Google/Apple sessions
	 */
	static async signOut(): Promise<AuthResponse<void>> {
		try {
			// Clean up Google session if signed in
			const hasPreviousSignIn = GoogleSignin.hasPreviousSignIn();
			if (hasPreviousSignIn) {
				const currentUser = GoogleSignin.getCurrentUser();
				if (currentUser) {
					await GoogleSignin.signOut();
				}
			}

			// Clean up Apple session (Apple doesn't provide a sign out method)
			// Apple recommends just clearing local session data

			// Sign out from Supabase
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
	 * Helper method to generate username from email
	 */
	private static generateUsernameFromEmail(email: string): string {
		const baseUsername = email.split('@')[0].toLowerCase();
		// Remove any non-alphanumeric characters except underscore
		const cleanUsername = baseUsername.replace(/[^a-z0-9_]/g, '');
		// Add random suffix to avoid conflicts
		const randomSuffix = Math.floor(Math.random() * 1000);
		return `${cleanUsername}${randomSuffix}`;
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
				redirectTo: 'redbeeexpo://auth/reset-password',
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
