import React, { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Dimensions,
	Image,
	StyleSheet,
	View,
} from 'react-native';
import { getThumbnailAsync } from 'expo-video-thumbnails';

import { Colors } from '@/constants/Colors';

interface VideoFramePreviewProps {
	videoUri: string;
	timeInSeconds: number;
	isVisible: boolean;
	thumbPosition: number; // Posición X del thumb del slider
}

const PREVIEW_WIDTH = 60;   // Más estrecho
const PREVIEW_HEIGHT = 100; // Más alto para formato vertical (9:16 aproximado)

export const VideoFramePreview: React.FC<VideoFramePreviewProps> = ({
	videoUri,
	timeInSeconds,
	isVisible,
	thumbPosition,
}) => {
	const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
	const [isGenerating, setIsGenerating] = useState(false);
	const [lastGeneratedTime, setLastGeneratedTime] = useState(-1);

	useEffect(() => {
		if (!isVisible) {
			// Limpiar thumbnail cuando no es visible para liberar memoria
			setThumbnailUri(null);
			setLastGeneratedTime(-1);
			setIsGenerating(false);
			return;
		}

		// Solo generar nuevo thumbnail si el tiempo ha cambiado significativamente (±0.3s)
		const timeDiff = Math.abs(timeInSeconds - lastGeneratedTime);
		if (timeDiff < 0.3 && thumbnailUri) {
			return;
		}

		// No generar si ya estamos generando uno
		if (isGenerating) {
			return;
		}

		const generateThumbnail = async () => {
			try {
				setIsGenerating(true);
				
				// Convertir tiempo a milisegundos para expo-video-thumbnails
				const timeInMs = Math.max(0, Math.round(timeInSeconds * 1000));
				
				console.log(`🖼️ Generating thumbnail at ${timeInSeconds}s (${timeInMs}ms)`);
				
				const { uri } = await getThumbnailAsync(videoUri, {
					time: timeInMs,
					quality: 0.5, // Calidad más baja para mejor rendimiento
					size: { width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT },
				});

				// Verificar si el componente aún está visible antes de setear el resultado
				if (isVisible) {
					setThumbnailUri(uri);
					setLastGeneratedTime(timeInSeconds);
					console.log(`✅ Thumbnail generated successfully`);
				}
			} catch (error) {
				console.error('❌ Error generating thumbnail:', error);
				if (isVisible) {
					setThumbnailUri(null);
				}
			} finally {
				if (isVisible) {
					setIsGenerating(false);
				}
			}
		};

		// Debounce más agresivo para evitar demasiadas llamadas
		const debounceTimer = setTimeout(generateThumbnail, 200);
		
		return () => {
			clearTimeout(debounceTimer);
		};
	}, [videoUri, timeInSeconds, isVisible, lastGeneratedTime, thumbnailUri, isGenerating]);

	if (!isVisible) {
		return null;
	}

	// Calcular posición de la vista previa centrada sobre el thumb
	const { width: screenWidth } = Dimensions.get('window');
	const previewLeft = Math.max(
		10, // Margen mínimo del borde izquierdo
		Math.min(
			thumbPosition - PREVIEW_WIDTH / 2, 
			screenWidth - PREVIEW_WIDTH - 10 // Margen del borde derecho
		)
	);

	return (
		<View
			style={[
				styles.container,
				{
					left: previewLeft,
				},
			]}
		>
			{/* Contenedor de la imagen con borde redondeado */}
			<View style={styles.imageContainer}>
				{isGenerating ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator 
							size="small" 
							color={Colors.primary} 
						/>
					</View>
				) : thumbnailUri ? (
					<Image
						source={{ uri: thumbnailUri }}
						style={styles.thumbnailImage}
						resizeMode="cover"
					/>
				) : (
					<View style={styles.errorContainer}>
						<View style={styles.errorDot} />
					</View>
				)}
			</View>
			
			{/* Flecha que apunta hacia abajo al thumb */}
			<View style={styles.arrow} />
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		bottom: 35, // Aparecer arriba del slider
		alignItems: 'center',
		zIndex: 200,
	},
	imageContainer: {
		width: PREVIEW_WIDTH,
		height: PREVIEW_HEIGHT,
		borderRadius: 8,
		overflow: 'hidden',
		backgroundColor: Colors.backgroundSecondary,
		borderWidth: 2,
		borderColor: Colors.primary,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 6,
		elevation: 8,
	},
	thumbnailImage: {
		width: '100%',
		height: '100%',
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: Colors.backgroundSecondary,
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: Colors.backgroundSecondary,
	},
	errorDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: Colors.error,
	},
	arrow: {
		width: 0,
		height: 0,
		backgroundColor: 'transparent',
		borderStyle: 'solid',
		borderLeftWidth: 6,
		borderRightWidth: 6,
		borderTopWidth: 8,
		borderLeftColor: 'transparent',
		borderRightColor: 'transparent',
		borderTopColor: Colors.primary,
		marginTop: -1,
	},
});