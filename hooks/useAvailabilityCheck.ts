import { SupabaseAuthService } from '@/services/supabaseAuth';
import { useAuthStore } from '@/stores/authStore';
import { useCallback, useEffect, useState } from 'react';

interface AvailabilityState {
	isChecking: boolean;
	isAvailable: boolean | null;
	error: string | null;
}

/**
 * Hook to check username availability in real time
 */
export const useUsernameAvailability = (
	username: string,
	debounceMs: number = 500,
) => {
	const [state, setState] = useState<AvailabilityState>({
		isChecking: false,
		isAvailable: null,
		error: null,
	});

	const currentUserId = useAuthStore((state) => state.user?.id);

	const checkAvailability = useCallback(
		async (usernameToCheck: string) => {
			if (!usernameToCheck || usernameToCheck.length < 3) {
				setState({
					isChecking: false,
					isAvailable: null,
					error: 'Username must be at least 3 characters',
				});
				return;
			}

			setState((prev) => ({ ...prev, isChecking: true, error: null }));

			try {
				let result;

				if (currentUserId) {
					// For authenticated users, exclude their own username
					result = await SupabaseAuthService.checkUsernameAvailabilityForUpdate(
						usernameToCheck,
						currentUserId,
					);
				} else {
					// For new users
					result = await SupabaseAuthService.checkUsernameAvailability(
						usernameToCheck,
					);
				}

				if (result.success) {
					setState({
						isChecking: false,
						isAvailable: result.data?.available ?? false,
						error: null,
					});
				} else {
					setState({
						isChecking: false,
						isAvailable: null,
						error: result.error || 'Failed to check username availability',
					});
				}
			} catch (error) {
				setState({
					isChecking: false,
					isAvailable: null,
					error:
						error instanceof Error ? error.message : 'Failed to check username',
				});
			}
		},
		[currentUserId],
	);

	useEffect(() => {
		const timer = setTimeout(() => {
			checkAvailability(username);
		}, debounceMs);

		return () => clearTimeout(timer);
	}, [username, checkAvailability, debounceMs]);

	return {
		...state,
		checkNow: () => checkAvailability(username),
	};
};

/**
 * Hook to check email availability in real time
 */
export const useEmailAvailability = (
	email: string,
	debounceMs: number = 500,
) => {
	const [state, setState] = useState<AvailabilityState>({
		isChecking: false,
		isAvailable: null,
		error: null,
	});

	const checkAvailability = useCallback(async (emailToCheck: string) => {
		// Basic email validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailToCheck || !emailRegex.test(emailToCheck)) {
			setState({
				isChecking: false,
				isAvailable: null,
				error: 'Please enter a valid email address',
			});
			return;
		}

		setState((prev) => ({ ...prev, isChecking: true, error: null }));

		try {
			const result = await SupabaseAuthService.checkEmailAvailability(
				emailToCheck,
			);

			if (result.success) {
				setState({
					isChecking: false,
					isAvailable: result.data?.available ?? false,
					error: null,
				});
			} else {
				setState({
					isChecking: false,
					isAvailable: null,
					error: result.error || 'Failed to check email availability',
				});
			}
		} catch (error) {
			setState({
				isChecking: false,
				isAvailable: null,
				error: error instanceof Error ? error.message : 'Failed to check email',
			});
		}
	}, []);

	useEffect(() => {
		const timer = setTimeout(() => {
			checkAvailability(email);
		}, debounceMs);

		return () => clearTimeout(timer);
	}, [email, checkAvailability, debounceMs]);

	return {
		...state,
		checkNow: () => checkAvailability(email),
	};
};

/**
 * Utilities for displaying availability messages
 */
export const getAvailabilityMessage = (
	isChecking: boolean,
	isAvailable: boolean | null,
	error: string | null,
	fieldName: string = 'Field',
) => {
	if (error) {
		return { type: 'error', message: error };
	}

	if (isChecking) {
		return {
			type: 'loading',
			message: `Checking ${fieldName.toLowerCase()} availability...`,
		};
	}

	if (isAvailable === true) {
		return { type: 'success', message: `${fieldName} is available!` };
	}

	if (isAvailable === false) {
		return { type: 'error', message: `${fieldName} is already taken` };
	}

	return null;
};
