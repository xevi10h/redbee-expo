import React from 'react';
import {
	ActivityIndicator,
	Dimensions,
	StyleSheet,
	Text,
	View,
} from 'react-native';

import { Colors } from '@/constants/Colors';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface VideoFeedLoaderProps {
	message?: string;
	showIcon?: boolean;
}

// COMPONENTE COMPLETAMENTE NUEVO - SIN ANIMACIONES RARAS
export const VideoFeedLoader: React.FC<VideoFeedLoaderProps> = ({
	message,
	showIcon = true,
}) => {
	return (
		<View style={styles.fullscreenContainer}>
			<View style={styles.centeredContent}>
				{showIcon && (
					<ActivityIndicator 
						size="large" 
						color={Colors.primary}
						style={styles.nativeSpinner}
					/>
				)}
				
				<Text style={styles.loadingText}>
					{message || 'Cargando videos...'}
				</Text>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	// Container que ocupa toda la pantalla y centra desde el inicio
	fullscreenContainer: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		width: SCREEN_WIDTH,
		height: SCREEN_HEIGHT,
		backgroundColor: Colors.background,
		zIndex: 999,
		// CENTRADO PERFECTO DESDE EL INICIO
		justifyContent: 'center',
		alignItems: 'center',
	},
	// Contenido centrado sin transform ni animation
	centeredContent: {
		alignItems: 'center',
		justifyContent: 'center',
		// Sin position absolute para evitar saltos
	},
	// Spinner nativo sin modificaciones que causen movimiento
	nativeSpinner: {
		marginBottom: 16,
		// Sin transform que pueda causar reposicionamiento
	},
	// Texto simple centrado
	loadingText: {
		fontSize: 16,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.text,
		textAlign: 'center',
	},
});