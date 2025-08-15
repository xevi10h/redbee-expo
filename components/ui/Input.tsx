import { Feather } from '@expo/vector-icons';
import React, { forwardRef, useState } from 'react';
import {
	StyleSheet,
	Text,
	TextInput,
	TextInputProps,
	TouchableOpacity,
	View,
	ViewStyle,
} from 'react-native';

import { Colors } from '@/constants/Colors';

interface InputProps extends TextInputProps {
	label?: string;
	error?: string;
	success?: string;
	hint?: string;
	leftIcon?: string;
	rightIcon?: string;
	onRightIconPress?: () => void;
	isPassword?: boolean;
	showPasswordToggle?: boolean;
	isLoading?: boolean;
	containerStyle?: ViewStyle;
}

export const Input = forwardRef<TextInput, InputProps>(({
	label,
	error,
	success,
	hint,
	leftIcon,
	rightIcon,
	onRightIconPress,
	isPassword = false,
	showPasswordToggle = false,
	isLoading = false,
	containerStyle,
	style,
	...props
}, ref) => {
	const [isPasswordVisible, setIsPasswordVisible] = useState(false);
	const [isFocused, setIsFocused] = useState(false);

	const hasError = !!error;
	const hasSuccess = !!success && !hasError;

	const inputStyle = [
		styles.input,
		leftIcon && styles.inputWithLeftIcon,
		(rightIcon || showPasswordToggle || isLoading) && styles.inputWithRightIcon,
		isFocused && styles.inputFocused,
		hasError && styles.inputError,
		hasSuccess && styles.inputSuccess,
		style,
	];

	const getStatusColor = () => {
		if (hasError) return Colors.error;
		if (hasSuccess) return Colors.success;
		if (isFocused) return Colors.primary;
		return Colors.border;
	};

	const getLabelColor = () => {
		if (hasError) return Colors.error;
		if (hasSuccess) return Colors.success;
		if (isFocused) return Colors.primary;
		return Colors.textSecondary;
	};

	const getRightIcon = () => {
		if (isLoading) {
			return <Feather name="loader" size={20} color={Colors.textTertiary} />;
		}

		if (showPasswordToggle && isPassword) {
			return (
				<TouchableOpacity
					onPress={() => setIsPasswordVisible(!isPasswordVisible)}
					style={styles.iconButton}
				>
					<Feather
						name={isPasswordVisible ? 'eye-off' : 'eye'}
						size={20}
						color={Colors.textTertiary}
					/>
				</TouchableOpacity>
			);
		}

		if (rightIcon) {
			return (
				<TouchableOpacity
					onPress={onRightIconPress}
					style={styles.iconButton}
					disabled={!onRightIconPress}
				>
					<Feather
						name={rightIcon as any}
						size={20}
						color={Colors.textTertiary}
					/>
				</TouchableOpacity>
			);
		}

		if (hasError) {
			return <Feather name="alert-circle" size={20} color={Colors.error} />;
		}

		if (hasSuccess) {
			return <Feather name="check-circle" size={20} color={Colors.success} />;
		}

		return null;
	};

	return (
		<View style={[styles.container, containerStyle]}>
			{label && (
				<Text style={[styles.label, { color: getLabelColor() }]}>{label}</Text>
			)}

			<View style={[styles.inputContainer, { borderColor: getStatusColor() }]}>
				{leftIcon && (
					<View style={styles.leftIconContainer}>
						<Feather
							name={leftIcon as any}
							size={20}
							color={Colors.textTertiary}
						/>
					</View>
				)}

				<TextInput
					ref={ref}
					{...props}
					style={inputStyle}
					secureTextEntry={isPassword && !isPasswordVisible}
					onFocus={(e) => {
						setIsFocused(true);
						props.onFocus?.(e);
					}}
					onBlur={(e) => {
						setIsFocused(false);
						props.onBlur?.(e);
					}}
					placeholderTextColor={Colors.inputPlaceholder}
				/>

				{getRightIcon() && (
					<View style={styles.rightIconContainer}>{getRightIcon()}</View>
				)}
			</View>

			{error && <Text style={styles.errorText}>{error}</Text>}

			{success && !error && <Text style={styles.successText}>{success}</Text>}

			{hint && !error && !success && (
				<Text style={styles.hintText}>{hint}</Text>
			)}
		</View>
	);
});

Input.displayName = 'Input';

const styles = StyleSheet.create({
	container: {
		marginBottom: 16,
	},
	label: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		marginBottom: 8,
	},
	inputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: Colors.inputBackground,
		borderRadius: 12,
		borderWidth: 1,
	},
	input: {
		flex: 1,
		paddingHorizontal: 16,
		paddingVertical: 12,
		fontSize: 16,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
		minHeight: 48,
	},
	inputWithLeftIcon: {
		paddingLeft: 8,
	},
	inputWithRightIcon: {
		paddingRight: 8,
	},
	inputFocused: {
		// Handled by container border color
	},
	inputError: {
		// Handled by container border color
	},
	inputSuccess: {
		// Handled by container border color
	},
	leftIconContainer: {
		paddingLeft: 16,
		paddingRight: 8,
	},
	rightIconContainer: {
		paddingLeft: 8,
		paddingRight: 16,
	},
	iconButton: {
		padding: 4,
	},
	errorText: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.error,
		marginTop: 4,
	},
	successText: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.success,
		marginTop: 4,
	},
	hintText: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
		marginTop: 4,
	},
});
