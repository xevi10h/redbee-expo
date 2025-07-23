/**
 * Polyfill for structuredClone in React Native
 * Must be imported BEFORE any Supabase code
 */

import 'react-native-get-random-values';

// Type definition for structuredClone
type StructuredCloneable =
	| null
	| undefined
	| boolean
	| number
	| string
	| Date
	| RegExp
	| StructuredCloneable[]
	| { [key: string]: StructuredCloneable }
	| { [key: number]: StructuredCloneable };

if (typeof global.structuredClone === 'undefined') {
	global.structuredClone = function structuredClone<
		T extends StructuredCloneable,
	>(obj: T): T {
		// Handle null and undefined
		if (obj === null || obj === undefined) {
			return obj;
		}

		// Handle primitive types
		if (typeof obj !== 'object') {
			return obj;
		}

		// Handle Date objects
		if (obj instanceof Date) {
			return new Date(obj.getTime()) as T;
		}

		// Handle RegExp objects
		if (obj instanceof RegExp) {
			return new RegExp(obj.source, obj.flags) as T;
		}

		// Handle Arrays
		if (Array.isArray(obj)) {
			return obj.map((item) => structuredClone(item)) as T;
		}

		// Handle Objects
		if (typeof obj === 'object' && obj.constructor === Object) {
			const copy: any = {};
			for (const key in obj) {
				if (Object.prototype.hasOwnProperty.call(obj, key)) {
					copy[key] = structuredClone(obj[key]);
				}
			}
			return copy as T;
		}

		// Handle other object types by attempting to clone their enumerable properties
		// This is a fallback for objects that don't match the above cases
		try {
			const copy = Object.create(Object.getPrototypeOf(obj));
			for (const key in obj) {
				if (Object.prototype.hasOwnProperty.call(obj, key)) {
					copy[key] = structuredClone((obj as any)[key]);
				}
			}
			return copy as T;
		} catch (error) {
			// If cloning fails, return the original object
			// This is not ideal but prevents crashes
			console.warn(
				'structuredClone: Unable to clone object, returning original:',
				error,
			);
			return obj;
		}
	};
}

// Extend the global interface to include structuredClone
declare global {
	var structuredClone: <T>(value: T) => T;
}
