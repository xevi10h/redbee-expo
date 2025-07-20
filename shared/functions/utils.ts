import * as Localization from 'expo-localization';
import { Language } from '../types';

export function deviceLanguageToLanguage(deviceLanguage: string): Language {
	switch (deviceLanguage) {
		case 'es':
			return 'es_ES';
		case 'ca':
			return 'ca_ES';
		case 'fr':
			return 'fr_FR';
		case 'it':
			return 'it_IT';
		case 'en':
			return 'en_US';
		case 'ja':
			return 'ja_JP';
		case 'zh':
			return 'zh_CN';
		case 'pt':
			return 'pt_PT';
		case 'th':
			return 'th_TH';
		case 'id':
			return 'id_ID';
		case 'ms':
			return 'ms_MY';
		default:
			return 'es_ES'; // Default to Spanish
	}
}

export const getDeviceLanguage = (): Language => {
	const deviceLocale = Localization.getLocales()[0]?.languageCode;
	if (!deviceLocale) {
		return 'es_ES';
	}
	return deviceLanguageToLanguage(deviceLocale);
};

export function secondsToMinutes(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	const paddedMinutes = String(minutes);
	const paddedSeconds = String(remainingSeconds.toFixed(0)).padStart(2, '0');
	return `${paddedMinutes}:${paddedSeconds}`;
}

export function formatTimeAgo(dateString: string): string {
	const now = new Date();
	const date = new Date(dateString);
	const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

	const timeUnits = [
		{ unit: 'year', seconds: 31536000 },
		{ unit: 'month', seconds: 2592000 },
		{ unit: 'week', seconds: 604800 },
		{ unit: 'day', seconds: 86400 },
		{ unit: 'hour', seconds: 3600 },
		{ unit: 'minute', seconds: 60 },
	];

	for (const { unit, seconds } of timeUnits) {
		const count = Math.floor(diffInSeconds / seconds);
		if (count > 0) {
			return `${count}${unit.charAt(0)}`;
		}
	}

	return 'now';
}

export function validateEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

export function validateUsername(username: string): boolean {
	// Username must be 3-20 characters, alphanumeric + underscore
	const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
	return usernameRegex.test(username);
}

export function validatePassword(password: string): boolean {
	// Password must be at least 8 characters
	return password.length >= 8;
}

export function sanitizeUsername(input: string): string {
	// Remove spaces and special characters except underscore
	return input.toLowerCase().replace(/[^a-z0-9_]/g, '');
}

export function formatNumber(num: number): string {
	if (num >= 1000000) {
		return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
	}
	if (num >= 1000) {
		return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
	}
	return num.toString();
}

export function generateVideoThumbnail(videoUri: string): Promise<string> {
	// This will be implemented later with expo-av
	// For now, return a placeholder
	return Promise.resolve('');
}

export function extractHashtags(text: string): string[] {
	const hashtagRegex = /#(\w+)/g;
	const hashtags: string[] = [];
	let match;

	while ((match = hashtagRegex.exec(text)) !== null) {
		hashtags.push(match[1].toLowerCase());
	}

	return Array.from(new Set(hashtags));
}

export function formatCurrency(
	amount: number,
	currency: string = 'USD',
): string {
	return new Intl.NumberFormat('es-ES', {
		style: 'currency',
		currency: currency,
	}).format(amount);
}

export function debounce<T extends (...args: any[]) => any>(
	func: T,
	delay: number,
): (...args: Parameters<T>) => void {
	// FIX: Use ReturnType<typeof setTimeout> for portability
	let timeoutId: ReturnType<typeof setTimeout>;

	return (...args: Parameters<T>) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => func(...args), delay);
	};
}

export function createFormData(data: Record<string, any>): FormData {
	const formData = new FormData();

	Object.keys(data).forEach((key) => {
		const value = data[key];
		if (value !== null && value !== undefined) {
			formData.append(key, value);
		}
	});

	return formData;
}

export function generateUniqueId(): string {
	return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function isIOS(): boolean {
	return process.env.EXPO_OS === 'ios';
}

export function isAndroid(): boolean {
	return process.env.EXPO_OS === 'android';
}

export function getFileExtension(filename: string): string {
	return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
}

export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
