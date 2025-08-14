/**
 * Utility to get the correct web URLs for legal pages
 * depending on the environment (development vs production)
 */

// Configuration for different environments
const WEB_URLS = {
	// Production URLs (when deployed)
	production: 'https://redbeeapp.com',

	// Staging URLs (Netlify)
	staging: 'https://redbee-expo.netlify.app',

	// Development URLs (local server)
	development: 'http://localhost:3000', // Local serve of dist folder
} as const;

/**
 * Get the base URL for web pages based on current environment
 */
export function getWebBaseUrl(): string {
	// In development, try to detect if we're running Expo web dev server
	if (__DEV__) {
		return WEB_URLS.development;
	}

	// Use staging URL for now (Netlify), which redirects to production
	// Once redbeeapp.com is fully configured, we can switch to production
	return WEB_URLS.staging;
}

/**
 * Get the URL for Terms of Service page
 * @param language Language code (e.g., 'es_ES', 'en_US')
 * @returns Complete URL to the terms page
 */
export function getTermsUrl(language: string): string {
	return `https://redbeeapp.com/terms/${language}`;
}

/**
 * Get the URL for Privacy Policy page
 * @param language Language code (e.g., 'es_ES', 'en_US')
 * @returns Complete URL to the privacy policy page
 */
export function getPrivacyUrl(language: string): string {
	return `https://redbeeapp.com/privacy/${language}`;
}

/**
 * Check if web pages are likely to be available
 * @returns true if web pages should be available
 */
export function areWebPagesAvailable(): boolean {
	const baseUrl = getWebBaseUrl();

	// In development, assume pages are available if running web build
	if (__DEV__) {
		return true; // You can set this to false to disable links in development
	}

	// In production, always try to open (pages should be deployed)
	return true;
}

/**
 * Get fallback message when web pages are not available
 */
export function getWebPagesUnavailableMessage(): string {
	return 'Las páginas web aún no están disponibles. Por favor, inténtalo más tarde.';
}
