import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';

export const useHapticFeedback = () => {
	const playLightImpact = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
	}, []);

	const playMediumImpact = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
	}, []);

	const playHeavyImpact = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
	}, []);

	const playSuccessNotification = useCallback(() => {
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
	}, []);

	const playErrorNotification = useCallback(() => {
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
	}, []);

	const playWarningNotification = useCallback(() => {
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
	}, []);

	return {
		// Use for button taps, minor interactions
		light: playLightImpact,
		// Use for significant actions like like, follow
		medium: playMediumImpact,
		// Use for major actions like subscribe, report
		heavy: playHeavyImpact,
		// Use for successful operations
		success: playSuccessNotification,
		// Use for errors
		error: playErrorNotification,
		// Use for warnings
		warning: playWarningNotification,
	};
};