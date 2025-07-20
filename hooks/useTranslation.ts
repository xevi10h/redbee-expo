import { changeLanguage, i18n } from '@/i18n';
import { useAuthStore } from '@/stores/authStore';
import { useEffect } from 'react';

export function useTranslation() {
	const user = useAuthStore((state) => state.user);
	const language = user?.language || 'es_ES';

	useEffect(() => {
		changeLanguage(language);
	}, [language]);

	return {
		t: i18n.t.bind(i18n),
		locale: i18n.locale,
		changeLanguage,
	};
}
