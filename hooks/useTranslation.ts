import { changeLanguage, i18n } from '@/i18n';
import { useAuthStore } from '@/stores/authStore';
import { useEffect } from 'react';

export function useTranslation() {
	const user = useAuthStore((state) => state.user);
	const language = user?.language || 'es_ES';

	useEffect(() => {
		try {
			changeLanguage(language);
		} catch (error) {
			console.warn('Failed to change language:', error);
		}
	}, [language]);

	// Provide fallback if i18n is not available
	const t = (key: string, options?: any) => {
		try {
			return i18n?.t ? i18n.t(key, options) : key;
		} catch (error) {
			console.warn('Translation error for key:', key, error);
			return key;
		}
	};

	return {
		t,
		locale: i18n?.locale || language,
		changeLanguage,
	};
}
