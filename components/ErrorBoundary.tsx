import { Colors } from '@/constants/Colors';
import { Feather } from '@expo/vector-icons';
import { Component, ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ErrorBoundaryState {
	hasError: boolean;
	error?: Error;
	errorInfo?: any;
}

interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: ReactNode;
	onError?: (error: Error, errorInfo: any) => void;
}

export class ErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: any) {
		console.error('ErrorBoundary caught an error:', error, errorInfo);
		this.setState({ errorInfo });
		this.props.onError?.(error, errorInfo);
	}

	handleRetry = () => {
		this.setState({ hasError: false, error: undefined, errorInfo: undefined });
	};

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<View style={styles.errorContainer}>
					<Feather name="alert-triangle" size={48} color={Colors.error} />
					<Text style={styles.errorTitle}>Algo salió mal</Text>
					<Text style={styles.errorMessage}>
						{this.state.error?.message || 'Error inesperado en la aplicación'}
					</Text>
					<TouchableOpacity
						style={styles.retryButton}
						onPress={this.handleRetry}
					>
						<Text style={styles.retryText}>Intentar de nuevo</Text>
					</TouchableOpacity>
				</View>
			);
		}

		return this.props.children;
	}
}

const styles = StyleSheet.create({
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 32,
		backgroundColor: Colors.background,
	},
	errorTitle: {
		fontSize: 20,
		fontFamily: 'Poppins-SemiBold',
		color: Colors.text,
		marginTop: 16,
		marginBottom: 8,
		textAlign: 'center',
	},
	errorMessage: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
		lineHeight: 20,
		marginBottom: 24,
	},
	retryButton: {
		paddingHorizontal: 24,
		paddingVertical: 12,
		backgroundColor: Colors.primary,
		borderRadius: 8,
	},
	retryText: {
		fontSize: 16,
		fontFamily: 'Inter-SemiBold',
		color: Colors.text,
	},
});
