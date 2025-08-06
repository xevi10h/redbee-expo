import { SupabaseAuthService } from '@/services/supabaseAuth';
import { getDeviceLanguage } from '@/shared/functions/utils';
import {
	Language,
	LoginCredentials,
	RegisterCredentials,
	User,
} from '@/shared/types';
import { create } from 'zustand';

interface AuthState {
	// State
	user: User | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	isInitialized: boolean;
	error: string | null;

	// Actions
	initialize: () => Promise<void>;
	signIn: (credentials: LoginCredentials) => Promise<boolean>;
	signUp: (credentials: RegisterCredentials) => Promise<boolean>;
	signInWithGoogle: () => Promise<boolean>;
	signInWithGoogleOAuth: () => Promise<boolean>;
	signInWithApple: () => Promise<boolean>;
	signOut: () => Promise<void>;
	updateProfile: (updates: Partial<User>) => Promise<boolean>;
	setLanguage: (language: Language) => void;
	clearError: () => void;
	setUser: (user: User | null) => void;

	// Helper actions
	refreshSession: () => Promise<boolean>;
	deleteAccount: () => Promise<boolean>;
}

const createDefaultUser = (): User => ({
	id: '',
	email: '',
	username: '',
	display_name: '',
	bio: '',
	avatar_url: '',
	has_premium_content: false,
	subscription_price: 0,
	subscription_currency: 'USD',
	commission_rate: 30,
	followers_count: 0,
	subscribers_count: 0,
	videos_count: 0,
	created_at: '',
	updated_at: '',
	language: getDeviceLanguage(),
});

export const useAuthStore = create<AuthState>((set, get) => ({
	// Initial state
	user: null,
	isAuthenticated: false,
	isLoading: false,
	isInitialized: false,
	error: null,

	// Initialize auth state from stored session
	initialize: async () => {
		set({ isLoading: true, error: null });

		try {
			// Initialize Google Sign-In configuration
			SupabaseAuthService.initializeGoogleSignIn();

			const result = await SupabaseAuthService.getCurrentSession();

			if (result.success && result.data) {
				set({
					user: result.data,
					isAuthenticated: true,
					isLoading: false,
					isInitialized: true,
					error: null,
				});
			} else {
				set({
					user: null,
					isAuthenticated: false,
					isLoading: false,
					isInitialized: true,
					error: null,
				});
			}
		} catch (error) {
			console.error('Auth initialization error:', error);
			set({
				user: null,
				isAuthenticated: false,
				isLoading: false,
				isInitialized: true,
				error: error instanceof Error ? error.message : 'Initialization failed',
			});
		}
	},

	// Sign in with email and password
	signIn: async (credentials: LoginCredentials) => {
		set({ isLoading: true, error: null });

		try {
			const result = await SupabaseAuthService.signInWithEmail(credentials);

			if (result.success && result.data) {
				set({
					user: result.data,
					isAuthenticated: true,
					isLoading: false,
					error: null,
				});
				return true;
			} else {
				set({
					isLoading: false,
					error: result.error || 'Sign in failed',
				});
				return false;
			}
		} catch (error) {
			set({
				isLoading: false,
				error: error instanceof Error ? error.message : 'Sign in failed',
			});
			return false;
		}
	},

	// Sign up with email and password
	signUp: async (credentials: RegisterCredentials) => {
		set({ isLoading: true, error: null });

		try {
			const result = await SupabaseAuthService.signUpWithEmail(credentials);

			if (result.success && result.data) {
				set({
					user: result.data,
					isAuthenticated: true,
					isLoading: false,
					error: null,
				});
				return true;
			} else {
				set({
					isLoading: false,
					error: result.error || 'Sign up failed',
				});
				return false;
			}
		} catch (error) {
			set({
				isLoading: false,
				error: error instanceof Error ? error.message : 'Sign up failed',
			});
			return false;
		}
	},

	// Sign in with Google (native method)
	signInWithGoogle: async () => {
		set({ isLoading: true, error: null });

		try {
			const result = await SupabaseAuthService.signInWithGoogle();

			console.log('Google sign in result:', result);

			if (result.success && result.data) {
				set({
					user: result.data,
					isAuthenticated: true,
					isLoading: false,
					error: null,
				});
				return true;
			} else {
				set({
					isLoading: false,
					error: result.error || 'Google sign in failed',
				});
				return false;
			}
		} catch (error) {
			set({
				isLoading: false,
				error: error instanceof Error ? error.message : 'Google sign in failed',
			});
			return false;
		}
	},

	// Sign in with Google (OAuth WebBrowser method)
	signInWithGoogleOAuth: async () => {
		set({ isLoading: true, error: null });

		try {
			const result = await SupabaseAuthService.signInWithGoogleOAuth();

			if (result.success && result.data) {
				set({
					user: result.data,
					isAuthenticated: true,
					isLoading: false,
					error: null,
				});
				return true;
			} else {
				set({
					isLoading: false,
					error: result.error || 'Google OAuth sign in failed',
				});
				return false;
			}
		} catch (error) {
			set({
				isLoading: false,
				error:
					error instanceof Error
						? error.message
						: 'Google OAuth sign in failed',
			});
			return false;
		}
	},

	// Sign in with Apple
	signInWithApple: async () => {
		set({ isLoading: true, error: null });

		try {
			const result = await SupabaseAuthService.signInWithApple();

			if (result.success && result.data) {
				set({
					user: result.data,
					isAuthenticated: true,
					isLoading: false,
					error: null,
				});
				return true;
			} else {
				set({
					isLoading: false,
					error: result.error || 'Apple sign in failed',
				});
				return false;
			}
		} catch (error) {
			set({
				isLoading: false,
				error: error instanceof Error ? error.message : 'Apple sign in failed',
			});
			return false;
		}
	},

	// Sign out
	signOut: async () => {
		set({ isLoading: true });

		try {
			await SupabaseAuthService.signOut();
			set({
				user: null,
				isAuthenticated: false,
				isLoading: false,
				error: null,
			});
		} catch (error) {
			console.error('Sign out error:', error);
			// Even if sign out fails, clear local state
			set({
				user: null,
				isAuthenticated: false,
				isLoading: false,
				error: null,
			});
		}
	},

	// Update user profile
	updateProfile: async (updates: Partial<User>) => {
		const { user } = get();
		if (!user) return false;

		set({ isLoading: true, error: null });

		try {
			const result = await SupabaseAuthService.updateProfile(user.id, updates);

			if (result.success && result.data) {
				set({
					user: { ...user, ...result.data },
					isLoading: false,
					error: null,
				});
				return true;
			} else {
				set({
					isLoading: false,
					error: result.error || 'Profile update failed',
				});
				return false;
			}
		} catch (error) {
			set({
				isLoading: false,
				error: error instanceof Error ? error.message : 'Profile update failed',
			});
			return false;
		}
	},

	// Set language
	setLanguage: (language: Language) => {
		const { user } = get();
		if (user) {
			set({
				user: { ...user, language },
			});
		}
	},

	// Clear error
	clearError: () => {
		set({ error: null });
	},

	// Set user (for OAuth callbacks)
	setUser: (user: User | null) => {
		set({
			user,
			isAuthenticated: !!user,
			isLoading: false,
			error: null,
		});
	},

	// Refresh session
	refreshSession: async () => {
		try {
			const result = await SupabaseAuthService.refreshSession();

			if (result.success && result.data) {
				set({
					user: result.data,
					isAuthenticated: true,
					error: null,
				});
				return true;
			} else {
				set({
					user: null,
					isAuthenticated: false,
					error: result.error || 'Session refresh failed',
				});
				return false;
			}
		} catch (error) {
			set({
				user: null,
				isAuthenticated: false,
				error:
					error instanceof Error ? error.message : 'Session refresh failed',
			});
			return false;
		}
	},

	// Delete account
	deleteAccount: async () => {
		const { user } = get();
		if (!user) return false;

		set({ isLoading: true, error: null });

		try {
			const result = await SupabaseAuthService.deleteAccount(user.id);

			if (result.success) {
				set({
					user: null,
					isAuthenticated: false,
					isLoading: false,
					error: null,
				});
				return true;
			} else {
				set({
					isLoading: false,
					error: result.error || 'Account deletion failed',
				});
				return false;
			}
		} catch (error) {
			set({
				isLoading: false,
				error:
					error instanceof Error ? error.message : 'Account deletion failed',
			});
			return false;
		}
	},
}));
