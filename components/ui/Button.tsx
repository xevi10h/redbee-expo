import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
	ActivityIndicator,
	StyleSheet,
	Text,
	TextStyle,
	TouchableOpacity,
	ViewStyle,
} from 'react-native';

interface ButtonProps {
	title: string;
	onPress: () => void;
	variant?: 'primary' | 'secondary' | 'outline' | 'text';
	size?: 'small' | 'medium' | 'large';
	disabled?: boolean;
	loading?: boolean;
	style?: ViewStyle;
	textStyle?: TextStyle;
	icon?: React.ReactNode;
	fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
	title,
	onPress,
	variant = 'primary',
	size = 'medium',
	disabled = false,
	loading = false,
	style,
	textStyle,
	icon,
	fullWidth = false,
}) => {
	const buttonStyle = [
		styles.base,
		styles[size],
		fullWidth && styles.fullWidth,
		disabled && styles.disabled,
		style,
	];

	const textStyles = [
		// FIX: Use the renamed 'baseText' style
		styles.baseText,
		styles[`${size}Text`],
		styles[`${variant}Text`],
		disabled && styles.disabledText,
		textStyle,
	];

	// ... (rest of the component is unchanged)
	const renderContent = () => (
		<>
			{loading ? (
				<ActivityIndicator
					color={variant === 'primary' ? '#FFFFFF' : '#E1306C'}
					size="small"
					style={icon ? styles.iconSpacing : undefined}
				/>
			) : (
				icon && (
					<Text style={[styles.icon, icon ? styles.iconSpacing : undefined]}>
						{icon}
					</Text>
				)
			)}
			<Text style={textStyles}>{title}</Text>
		</>
	);

	if (variant === 'primary') {
		return (
			<TouchableOpacity
				onPress={onPress}
				disabled={disabled || loading}
				style={buttonStyle}
				activeOpacity={0.8}
			>
				<LinearGradient
					colors={['#E1306C', '#F77737']}
					style={[styles.gradient, styles[size]]}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 0 }}
				>
					{renderContent()}
				</LinearGradient>
			</TouchableOpacity>
		);
	}

	return (
		<TouchableOpacity
			onPress={onPress}
			disabled={disabled || loading}
			style={[buttonStyle, styles[variant]]}
			activeOpacity={0.8}
		>
			{renderContent()}
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	// ... (base, gradient, fullWidth, disabled, sizes are unchanged)
	base: {
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
	},
	gradient: {
		flex: 1,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
	},
	fullWidth: {
		width: '100%',
	},
	disabled: {
		opacity: 0.5,
	},
	small: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		minHeight: 36,
	},
	medium: {
		paddingHorizontal: 24,
		paddingVertical: 12,
		minHeight: 48,
	},
	large: {
		paddingHorizontal: 32,
		paddingVertical: 16,
		minHeight: 56,
	},

	// Variants
	primary: {
		// Handled by LinearGradient
	},
	secondary: {
		backgroundColor: '#1C1C1E',
	},
	outline: {
		backgroundColor: 'transparent',
		borderWidth: 1,
		borderColor: '#E1306C',
	},
	text: {
		backgroundColor: 'transparent',
	},

	// Text styles
	// FIX: Renamed 'text' to 'baseText' to avoid key collision
	baseText: {
		fontFamily: 'Poppins-SemiBold',
		fontWeight: '600',
		textAlign: 'center',
	},
	smallText: {
		fontSize: 14,
	},
	mediumText: {
		fontSize: 16,
	},
	largeText: {
		fontSize: 18,
	},

	// ... (rest of the styles are unchanged)
	primaryText: {
		color: '#FFFFFF',
	},
	secondaryText: {
		color: '#FFFFFF',
	},
	outlineText: {
		color: '#E1306C',
	},
	textText: {
		color: '#E1306C',
	},
	disabledText: {
		opacity: 0.5,
	},
	icon: {
		fontSize: 18,
	},
	iconSpacing: {
		marginRight: 8,
	},
});
