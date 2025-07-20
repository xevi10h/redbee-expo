import es_ES from '@/locales/es_ES.json';
// Import other language files when ready

import { I18n } from 'i18n-js';
import { getDeviceLanguage } from './shared/functions/utils';

// FIX: Configure fallbacks during instantiation
export const i18n = new I18n(
	{
		es_ES,
		// Add other languages when ready
	},
	{
		defaultLocale: 'es_ES',
		enableFallback: true, // Set fallbacks here
		locale: getDeviceLanguage(),
	},
);

// Enable missing translation warnings in development
if (__DEV__) {
	i18n.missingBehavior = 'guess';
}

export function changeLanguage(lang: string) {
	i18n.locale = lang;
}

export default i18n;
