import es_ES from '@/locales/es_ES.json';
import en_US from '@/locales/en_US.json';
import ca_ES from '@/locales/ca_ES.json';
import fr_FR from '@/locales/fr_FR.json';
import it_IT from '@/locales/it_IT.json';
import pt_PT from '@/locales/pt_PT.json';

import { I18n } from 'i18n-js';
import { getDeviceLanguage } from './shared/functions/utils';

// Configure all available languages
export const i18n = new I18n(
	{
		es_ES,
		en_US,
		ca_ES,
		fr_FR,
		it_IT,
		pt_PT,
	},
	{
		defaultLocale: 'es_ES',
		enableFallback: true,
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
