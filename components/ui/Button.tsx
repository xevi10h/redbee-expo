import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
	ActivityIndicator,
	StyleSheet,
	Text,
	TextStyle,
	TouchableOpacity,
	View,
	ViewStyle,
} from 'react-native';

import { Colors } from '@/constants/Colors';

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
		styles.baseText,
		styles[`${size}Text`],
		styles[`${variant}Text`],
		disabled && styles.disabledText,
		textStyle,
	];

	const getLoadingColor = () => {
		switch (variant) {
			case 'primary':
				return Colors.text;
			case 'secondary':
				return Colors.text;
			case 'outline':
			case 'text':
				return Colors.primary;
			default:
				return Colors.primary;
		}
	};

	const renderContent = () => (
		<>
			{loading ? (
				<ActivityIndicator
					color={getLoadingColor()}
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
				style={[buttonStyle, { paddingHorizontal: 0, paddingVertical: 0 }]}
				activeOpacity={0.8}
			>
				<View style={{ flex: 1 }}>
					<LinearGradient
						colors={Colors.gradientPrimary}
						style={[styles.gradient]}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 0 }}
					>
						{renderContent()}
					</LinearGradient>
				</View>
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
	base: {
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
	},
	gradient: {
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
		flex: 1,
	},
	fullWidth: {
		width: '100%',
	},
	disabled: {
		opacity: 0.5,
	},

	// Sizes
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

	// Variants - using Colors constants
	primary: {
		// Handled by LinearGradient
	},
	secondary: {
		backgroundColor: Colors.backgroundSecondary,
	},
	outline: {
		backgroundColor: 'transparent',
		borderWidth: 1,
		borderColor: Colors.primary,
	},
	text: {
		backgroundColor: 'transparent',
	},

	// Text styles
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

	// Text colors using Colors constants
	primaryText: {
		color: Colors.text,
	},
	secondaryText: {
		color: Colors.text,
	},
	outlineText: {
		color: Colors.primary,
	},
	textText: {
		color: Colors.primary,
	},
	disabledText: {
		opacity: 0.5,
	},

	// Icon styles
	icon: {
		fontSize: 18,
	},
	iconSpacing: {
		marginRight: 8,
	},
});
