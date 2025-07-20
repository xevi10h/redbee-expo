import { useAuthStore } from '@/stores/authStore';
import { useEffect, useState } from 'react';

interface AppInitializationState {
	isInitialized: boolean;
	isLoading: boolean;
	error: string | null;
}

export const useAppInitialization = (): AppInitializationState => {
	const [state, setState] = useState<AppInitializationState>({
		isInitialized: false,
		isLoading: true,
		error: null,
	});

	// Auth store
	const initialize = useAuthStore((state) => state.initialize);
	const isAuthInitialized = useAuthStore((state) => state.isInitialized);
	const isAuthLoading = useAuthStore((state) => state.isLoading);
	const authError = useAuthStore((state) => state.error);

	useEffect(() => {
		const initializeApp = async () => {
			try {
				setState((prev) => ({ ...prev, isLoading: true, error: null }));

				// Initialize authentication first
				await initialize();

				// TODO: Add other initialization tasks here
				// - Load app configuration
				// - Check for app updates
				// - Initialize analytics
				// - Load cached data

				// App is now initialized
				setState({
					isInitialized: true,
					isLoading: false,
					error: null,
				});
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : 'App initialization failed';
				console.error('App initialization error:', error);

				setState({
					isInitialized: false,
					isLoading: false,
					error: errorMessage,
				});
			}
		};

		initializeApp();
	}, [initialize]);

	// Update loading state based on auth loading state
	useEffect(() => {
		if (isAuthInitialized) {
			setState((prev) => ({
				...prev,
				isLoading: isAuthLoading,
				error: authError || prev.error,
			}));
		}
	}, [isAuthInitialized, isAuthLoading, authError]);

	return state;
};
