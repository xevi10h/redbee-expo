import { Colors } from '@/constants/Colors';
import { formatCurrency } from '@/shared/functions/utils';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SubscriptionModalProps {
	visible: boolean;
	onClose: () => void;
	onConfirm: () => Promise<void>;
	creatorName: string;
	price: number;
	currency: string;
	isSubscribed: boolean;
	loading?: boolean;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
	visible,
	onClose,
	onConfirm,
	creatorName,
	price,
	currency,
	isSubscribed,
	loading = false,
}) => {
	const handleConfirm = async () => {
		try {
			await onConfirm();
			onClose();
		} catch (error) {
			// Error handling is done in the parent component
		}
	};

	const renderSubscribeContent = () => (
		<>
			<View style={styles.iconContainer}>
				<LinearGradient
					colors={Colors.gradientPrimary}
					style={styles.iconGradient}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 0 }}
				>
					<MaterialCommunityIcons name="crown" size={32} color={Colors.text} />
				</LinearGradient>
			</View>

			<Text style={styles.title}>¿Suscribirse a {creatorName}?</Text>

			<View style={styles.priceContainer}>
				<Text style={styles.price}>
					{formatCurrency(price, currency)}
					<Text style={styles.priceUnit}>/mes</Text>
				</Text>
			</View>

			<Text style={styles.description}>Al suscribirte tendrás acceso a:</Text>

			<View style={styles.benefitsList}>
				<View style={styles.benefitItem}>
					<Feather name="check-circle" size={16} color={Colors.success} />
					<Text style={styles.benefitText}>Todo el contenido premium</Text>
				</View>
				<View style={styles.benefitItem}>
					<Feather name="check-circle" size={16} color={Colors.success} />
					<Text style={styles.benefitText}>
						Distintivo especial en comentarios
					</Text>
				</View>
				<View style={styles.benefitItem}>
					<Feather name="check-circle" size={16} color={Colors.success} />
					<Text style={styles.benefitText}>Apoyo directo al creador</Text>
				</View>
			</View>

			<Text style={styles.disclaimer}>
				Tu suscripción se renovará automáticamente cada mes. Puedes cancelarla
				en cualquier momento.
			</Text>
		</>
	);

	const renderUnsubscribeContent = () => (
		<>
			<View style={styles.iconContainer}>
				<View style={styles.warningIconContainer}>
					<Feather name="alert-triangle" size={32} color={Colors.warning} />
				</View>
			</View>

			<Text style={styles.title}>¿Cancelar suscripción?</Text>

			<Text style={styles.description}>
				Si cancelas tu suscripción a {creatorName}:
			</Text>

			<View style={styles.consequencesList}>
				<View style={styles.consequenceItem}>
					<Feather name="x-circle" size={16} color={Colors.error} />
					<Text style={styles.consequenceText}>
						Perderás acceso al contenido premium
					</Text>
				</View>
				<View style={styles.consequenceItem}>
					<Feather name="x-circle" size={16} color={Colors.error} />
					<Text style={styles.consequenceText}>
						Ya no tendrás el distintivo en comentarios
					</Text>
				</View>
				<View style={styles.consequenceItem}>
					<Feather name="x-circle" size={16} color={Colors.error} />
					<Text style={styles.consequenceText}>
						Dejarás de apoyar directamente al creador
					</Text>
				</View>
			</View>

			<Text style={styles.disclaimer}>
				Mantendrás acceso hasta el final del período actual de facturación.
			</Text>
		</>
	);

	return (
		<Modal
			visible={visible}
			transparent={true}
			animationType="fade"
			onRequestClose={onClose}
		>
			<View style={styles.overlay}>
				<View style={styles.modalContainer}>
					{isSubscribed ? renderUnsubscribeContent() : renderSubscribeContent()}

					<View style={styles.buttonContainer}>
						<TouchableOpacity
							style={styles.cancelButton}
							onPress={onClose}
							disabled={loading}
						>
							<Text style={styles.cancelButtonText}>Mantener suscripción</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={[
								styles.confirmButton,
								isSubscribed && styles.unsubscribeButton,
								loading && styles.disabledButton,
							]}
							onPress={handleConfirm}
							disabled={loading}
						>
							{loading ? (
								<Text style={styles.confirmButtonText}>Procesando...</Text>
							) : (
								<Text style={styles.confirmButtonText}>
									{isSubscribed ? 'Cancelar suscripción' : 'Suscribirse'}
								</Text>
							)}
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	modalContainer: {
		backgroundColor: Colors.background,
		borderRadius: 16,
		padding: 24,
		width: '100%',
		maxWidth: 400,
		alignItems: 'center',
	},
	iconContainer: {
		marginBottom: 20,
	},
	iconGradient: {
		width: 64,
		height: 64,
		borderRadius: 32,
		alignItems: 'center',
		justifyContent: 'center',
	},
	warningIconContainer: {
		width: 64,
		height: 64,
		borderRadius: 32,
		backgroundColor: 'rgba(255, 193, 7, 0.1)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	title: {
		fontSize: 20,
		fontFamily: 'Raleway-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		textAlign: 'center',
		marginBottom: 16,
	},
	priceContainer: {
		marginBottom: 20,
	},
	price: {
		fontSize: 28,
		fontFamily: 'Raleway-Bold',
		fontWeight: '700',
		color: Colors.primary,
		textAlign: 'center',
	},
	priceUnit: {
		fontSize: 16,
		fontFamily: 'Inter-Regular',
		fontWeight: '400',
		color: Colors.textSecondary,
	},
	description: {
		fontSize: 16,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
		textAlign: 'center',
		marginBottom: 16,
	},
	benefitsList: {
		width: '100%',
		marginBottom: 20,
	},
	benefitItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
		gap: 12,
	},
	benefitText: {
		flex: 1,
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
	},
	consequencesList: {
		width: '100%',
		marginBottom: 20,
	},
	consequenceItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
		gap: 12,
	},
	consequenceText: {
		flex: 1,
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
	},
	disclaimer: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
		textAlign: 'center',
		marginBottom: 24,
		lineHeight: 16,
	},
	buttonContainer: {
		flexDirection: 'row',
		width: '100%',
		gap: 12,
	},
	cancelButton: {
		flex: 1,
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: Colors.borderSecondary,
		backgroundColor: Colors.backgroundSecondary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cancelButtonText: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.textSecondary,
		textAlign: 'center',
	},
	confirmButton: {
		flex: 1,
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 8,
		backgroundColor: Colors.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	unsubscribeButton: {
		backgroundColor: Colors.error,
	},
	disabledButton: {
		opacity: 0.5,
	},
	confirmButtonText: {
		fontSize: 14,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		textAlign: 'center',
	},
});
