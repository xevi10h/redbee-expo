/**
 * Polyfill for structuredClone in React Native
 * Must be imported BEFORE any Supabase code
 */

import 'react-native-get-random-values';

if (typeof global.structuredClone === 'undefined') {
	global.structuredClone = function structuredClone(obj: any) {
		if (obj === null || typeof obj !== 'object') {
			return obj;
		}

		if (obj instanceof Date) {
			return new Date(obj.getTime());
		}

		if (obj instanceof Array) {
			return obj.map((item) => structuredClone(item));
		}

		if (typeof obj === 'object') {
			const copy: any = {};
			for (const key in obj) {
				if (obj.hasOwnProperty(key)) {
					copy[key] = structuredClone(obj[key]);
				}
			}
			return copy;
		}

		return obj;
	};
}
