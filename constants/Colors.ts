/**
 * Color constants for the Redbee app
 * Centralized color definitions for consistent theming
 */

export const Colors = {
	// Primary brand colors
	primary: '#E1306C',
	primaryDark: '#C12B5C',
	primaryLight: '#F77737',

	// Background colors
	background: '#000000',
	backgroundSecondary: '#1C1C1E',
	backgroundTertiary: '#2C2C2E',

	// Text colors
	text: '#FFFFFF',
	textSecondary: '#ADB5BD',
	textTertiary: '#6C757D',
	textDisabled: '#495057',

	// Status colors
	success: '#28A745',
	error: '#DC3545',
	warning: '#FFC107',
	info: '#17A2B8',

	// Interactive colors
	link: '#E1306C',
	linkHover: '#C12B5C',

	// Border colors
	border: '#6C757D',
	borderSecondary: '#1C1C1E',
	borderFocus: '#E1306C',

	// Button colors
	buttonPrimary: '#E1306C',
	buttonSecondary: '#1C1C1E',
	buttonOutline: 'transparent',
	buttonText: 'transparent',
	buttonDisabled: '#6C757D',

	// Input colors
	inputBackground: '#1C1C1E',
	inputBorder: '#6C757D',
	inputBorderFocus: '#E1306C',
	inputBorderError: '#DC3545',
	inputBorderSuccess: '#28A745',
	inputPlaceholder: '#6C757D',

	// Gradient colors
	gradientPrimary: ['#E1306C', '#F77737'],
	gradientSecondary: ['#000000', '#1C1C1E'],

	// Overlay colors
	overlay: 'rgba(0, 0, 0, 0.7)',
	overlayLight: 'rgba(0, 0, 0, 0.5)',
	overlayDark: 'rgba(0, 0, 0, 0.9)',

	// Premium/subscription colors
	premium: '#E1306C',
	premiumBackground: 'rgba(225, 48, 108, 0.1)',

	// Social colors
	google: '#4285F4',
	apple: '#000000',
	facebook: '#1877F2',
	twitter: '#1DA1F2',

	// Video player colors
	videoBackground: '#000000',
	videoControls: 'rgba(255, 255, 255, 0.9)',
	videoProgress: '#E1306C',
	videoProgressBackground: 'rgba(255, 255, 255, 0.3)',

	// Loading and skeleton colors
	skeleton: '#2C2C2E',
	skeletonHighlight: '#3C3C3E',
	loader: '#E1306C',

	// Tab bar colors
	tabBarActive: '#E1306C',
	tabBarInactive: '#6C757D',
	tabBarBackground: '#000000',
	tabBarBorder: '#1C1C1E',

	// Modal colors
	modalBackground: '#000000',
	modalOverlay: 'rgba(0, 0, 0, 0.8)',

	// Card colors
	cardBackground: '#1C1C1E',
	cardBorder: '#2C2C2E',

	// Icon colors
	iconPrimary: '#FFFFFF',
	iconSecondary: '#6C757D',
	iconAccent: '#E1306C',

	// Notification colors
	notificationSuccess: '#28A745',
	notificationError: '#DC3545',
	notificationWarning: '#FFC107',
	notificationInfo: '#17A2B8',
} as const;

// Type for accessing colors with autocomplete
export type ColorKey = keyof typeof Colors;

// Helper function to get color by key
export const getColor = (key: ColorKey) => Colors[key];

// Opacity helper functions
export const withOpacity = (color: string, opacity: number): string => {
	if (color.startsWith('#')) {
		const r = parseInt(color.slice(1, 3), 16);
		const g = parseInt(color.slice(3, 5), 16);
		const b = parseInt(color.slice(5, 7), 16);
		return `rgba(${r}, ${g}, ${b}, ${opacity})`;
	}
	return color;
};

// Common color combinations
export const ColorCombinations = {
	primaryButton: {
		background: Colors.gradientPrimary,
		text: Colors.text,
		border: 'transparent',
	},
	secondaryButton: {
		background: Colors.buttonSecondary,
		text: Colors.text,
		border: 'transparent',
	},
	outlineButton: {
		background: 'transparent',
		text: Colors.primary,
		border: Colors.primary,
	},
	textButton: {
		background: 'transparent',
		text: Colors.primary,
		border: 'transparent',
	},
	input: {
		background: Colors.inputBackground,
		text: Colors.text,
		border: Colors.inputBorder,
		placeholder: Colors.inputPlaceholder,
	},
	inputFocused: {
		background: Colors.inputBackground,
		text: Colors.text,
		border: Colors.inputBorderFocus,
		placeholder: Colors.inputPlaceholder,
	},
	inputError: {
		background: Colors.inputBackground,
		text: Colors.text,
		border: Colors.inputBorderError,
		placeholder: Colors.inputPlaceholder,
	},
	inputSuccess: {
		background: Colors.inputBackground,
		text: Colors.text,
		border: Colors.inputBorderSuccess,
		placeholder: Colors.inputPlaceholder,
	},
} as const;
