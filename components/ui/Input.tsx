import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
	StyleSheet,
	Text,
	TextInput,
	TextInputProps,
	TouchableOpacity,
	View,
	ViewStyle,
} from 'react-native';

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

export const Input: React.FC<InputProps> = ({
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
}) => {
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
		if (hasError) return '#DC3545';
		if (hasSuccess) return '#28A745';
		if (isFocused) return '#E1306C';
		return '#6C757D';
	};

	const getRightIcon = () => {
		if (isLoading) {
			return <Feather name="loader" size={20} color="#6C757D" />;
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
						color="#6C757D"
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
					<Feather name={rightIcon as any} size={20} color="#6C757D" />
				</TouchableOpacity>
			);
		}

		if (hasError) {
			return <Feather name="alert-circle" size={20} color="#DC3545" />;
		}

		if (hasSuccess) {
			return <Feather name="check-circle" size={20} color="#28A745" />;
		}

		return null;
	};

	return (
		<View style={[styles.container, containerStyle]}>
			{label && (
				<Text style={[styles.label, { color: getStatusColor() }]}>{label}</Text>
			)}

			<View style={[styles.inputContainer, { borderColor: getStatusColor() }]}>
				{leftIcon && (
					<View style={styles.leftIconContainer}>
						<Feather name={leftIcon as any} size={20} color="#6C757D" />
					</View>
				)}

				<TextInput
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
					placeholderTextColor="#6C757D"
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
};

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
		backgroundColor: '#1C1C1E',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#6C757D',
	},
	input: {
		flex: 1,
		paddingHorizontal: 16,
		paddingVertical: 12,
		fontSize: 16,
		fontFamily: 'Inter-Regular',
		color: '#FFFFFF',
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
		color: '#DC3545',
		marginTop: 4,
	},
	successText: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: '#28A745',
		marginTop: 4,
	},
	hintText: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: '#6C757D',
		marginTop: 4,
	},
});
