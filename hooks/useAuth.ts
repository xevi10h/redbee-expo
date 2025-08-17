import { useAuthStore } from '@/stores/authStore';
import { RelativePathString, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

// Main auth hook
export const useAuth = () => {
	const user = useAuthStore((state) => state.user);
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
	const isLoading = useAuthStore((state) => state.isLoading);
	const isInitialized = useAuthStore((state) => state.isInitialized);
	const error = useAuthStore((state) => state.error);

	const signIn = useAuthStore((state) => state.signIn);
	const signInLocal = useAuthStore((state) => state.signInLocal);
	const signUp = useAuthStore((state) => state.signUp);
	const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);
	const signInWithGoogleLocal = useAuthStore((state) => state.signInWithGoogleLocal);
	const signInWithGoogleOAuth = useAuthStore(
		(state) => state.signInWithGoogleOAuth,
	);
	const signInWithGoogleOAuthLocal = useAuthStore((state) => state.signInWithGoogleOAuthLocal);
	const signInWithApple = useAuthStore((state) => state.signInWithApple);
	const signInWithAppleLocal = useAuthStore((state) => state.signInWithAppleLocal);
	const signOut = useAuthStore((state) => state.signOut);
	const updateProfile = useAuthStore((state) => state.updateProfile);
	const clearError = useAuthStore((state) => state.clearError);

	return {
		user,
		isAuthenticated,
		isLoading,
		isInitialized,
		error,
		signIn,
		signInLocal,
		signUp,
		signInWithGoogle,
		signInWithGoogleLocal,
		signInWithGoogleOAuth,
		signInWithGoogleOAuthLocal,
		signInWithApple,
		signInWithAppleLocal,
		signOut,
		updateProfile,
		clearError,
	};
};

// Auth guard options
interface UseAuthGuardOptions {
	requireAuth?: boolean;
	redirectTo?: string;
	onAuthChange?: (isAuthenticated: boolean) => void;
}

export const useAuthGuard = (options: UseAuthGuardOptions = {}) => {
	const { requireAuth = false, redirectTo, onAuthChange } = options;

	const router = useRouter();
	const [hasRedirected, setHasRedirected] = useState(false);
	const { isAuthenticated, isLoading, isInitialized, user, error } = useAuth();

	// Handle authentication state changes
	useEffect(() => {
		if (!isInitialized || isLoading || hasRedirected) return;

		// Call onAuthChange callback if provided
		if (onAuthChange) {
			onAuthChange(isAuthenticated);
		}

		// Handle redirects based on authentication state
		if (requireAuth && !isAuthenticated) {
			// User needs to be authenticated but isn't
			const targetRoute = redirectTo || '/auth/sign-in';
			router.replace(targetRoute as RelativePathString);
			setHasRedirected(true);
		} else if (!requireAuth && isAuthenticated && redirectTo) {
			// User is authenticated but shouldn't be (e.g., on auth pages)
			router.replace(redirectTo as RelativePathString);
			setHasRedirected(true);
		}
	}, [
		isAuthenticated,
		isLoading,
		isInitialized,
		requireAuth,
		redirectTo,
		router,
		onAuthChange,
		hasRedirected,
	]);

	// Reset redirect flag when authentication state changes
	useEffect(() => {
		setHasRedirected(false);
	}, [isAuthenticated]);

	return {
		isAuthenticated,
		isLoading: isLoading || !isInitialized,
		isInitialized,
		user,
		error,
	};
};

// Hook for pages that require authentication
export const useRequireAuth = (redirectTo?: string) => {
	return useAuthGuard({
		requireAuth: true,
		redirectTo: redirectTo || '/auth/sign-in',
	});
};

// Hook for guest-only pages (login, register, etc.)
export const useGuestOnly = (redirectTo?: string) => {
	return useAuthGuard({
		requireAuth: false,
		redirectTo: redirectTo || '/',
	});
};

// Hook for getting auth status without redirects
export const useAuthStatus = () => {
	const { isAuthenticated, isLoading, isInitialized, user } = useAuth();

	return {
		isAuthenticated,
		isLoading: isLoading || !isInitialized,
		isInitialized,
		user,
		isGuest: isInitialized && !isLoading && !isAuthenticated,
	};
};
