import React, { useCallback, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Animated,
	Dimensions,
	GestureResponderEvent,
	PanResponder,
	Platform,
	StyleSheet,
	View,
} from 'react-native';

import { Colors } from '@/constants/Colors';
import { VideoFramePreview } from './VideoFramePreview';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH; // Sin padding, de borde a borde
const THUMB_SIZE = 16;
const TRACK_HEIGHT = 3;
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 140 : 120; // Perfecto - 5px más arriba
const FULLSCREEN_BOTTOM_MARGIN = Platform.OS === 'ios' ? 50 : 45; // Espacio aumentado para evitar solaparse con info del video

interface VideoProgressSliderProps {
	currentTime: number;
	duration: number;
	onSeek: (time: number) => void;
	isActive: boolean;
	isSeeking?: boolean;
	isFullscreen?: boolean; // Para detectar si estamos en pantalla completa
	videoUri: string; // URI del video para generar thumbnails
}

export const VideoProgressSlider: React.FC<VideoProgressSliderProps> = ({
	currentTime,
	duration,
	onSeek,
	isActive,
	isSeeking = false,
	isFullscreen = false,
	videoUri,
}) => {
	// Debug logging for props (only when duration changes)
	React.useEffect(() => {
		if (duration > 0) {
			console.log('📊 VideoProgressSlider duration set:', duration.toFixed(2));
		}
	}, [duration]);
	const [isDragging, setIsDragging] = useState(false);
	const [localProgress, setLocalProgress] = useState(0);
	const thumbPosition = useRef(new Animated.Value(0)).current;
	const containerOpacity = useRef(new Animated.Value(isActive ? 1 : 0)).current;
	const sliderRef = useRef<View>(null);

	// Calcular el progreso
	const progress = duration > 0 ? currentTime / duration : 0;
	const effectiveProgress = isDragging ? localProgress : progress;
	
	// Calcular tiempo para la vista previa del fotograma
	const previewTime = effectiveProgress * duration;

	// Animar la opacidad basada en isActive
	React.useEffect(() => {
		Animated.timing(containerOpacity, {
			toValue: isActive ? 1 : 0,
			duration: 300,
			useNativeDriver: true,
		}).start();
	}, [isActive, containerOpacity]);

	// Actualizar posición del thumb cuando no estamos arrastrando
	React.useEffect(() => {
		if (!isDragging) {
			const position = progress * SLIDER_WIDTH;
			Animated.timing(thumbPosition, {
				toValue: position,
				duration: 100,
				useNativeDriver: false,
			}).start();
		}
	}, [progress, isDragging, thumbPosition]);

	const handleTouch = useCallback(
		(event: GestureResponderEvent) => {
			const { locationX } = event.nativeEvent;
			const clampedX = Math.max(0, Math.min(SLIDER_WIDTH, locationX));
			const newProgress = clampedX / SLIDER_WIDTH;

			// Touch logging only for debugging - can be removed
			
			setLocalProgress(newProgress);
			thumbPosition.setValue(clampedX);
		},
		[thumbPosition],
	);

	const durationRef = useRef(duration);
	const onSeekRef = useRef(onSeek);
	
	// Keep refs up to date
	React.useEffect(() => {
		durationRef.current = duration;
		onSeekRef.current = onSeek;
	}, [duration, onSeek]);

	const panResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => true,
			onMoveShouldSetPanResponder: () => true,

			onPanResponderGrant: (event) => {
				setIsDragging(true);
				handleTouch(event);
			},

			onPanResponderMove: (event) => {
				handleTouch(event);
			},

			onPanResponderRelease: (event) => {
				// Use current refs to avoid stale closure values
				const currentDuration = durationRef.current;
				const currentOnSeek = onSeekRef.current;
				
				// Calcular el progreso basado en la posición actual del evento
				const { locationX } = event.nativeEvent;
				const clampedX = Math.max(0, Math.min(SLIDER_WIDTH, locationX));
				const finalProgress = clampedX / SLIDER_WIDTH;
				const newTime = finalProgress * currentDuration;

				console.log(
					'🎯 Slider releasing at:',
					'locationX:', locationX,
					'clampedX:', clampedX,
					'progress:', finalProgress,
					'newTime:', newTime,
					'currentDuration:', currentDuration,
				);

				// Solo hacer seek si tenemos una duración válida
				if (currentDuration > 0 && newTime >= 0) {
					console.log('✅ Calling onSeek with time:', newTime);
					currentOnSeek(newTime);
				} else {
					console.warn('❌ Cannot seek: invalid duration or time', { 
						currentDuration, 
						newTime,
						originalDuration: duration 
					});
				}
				
				setIsDragging(false);
			},

			onPanResponderTerminate: (event) => {
				// Use current refs to avoid stale closure values
				const currentDuration = durationRef.current;
				const currentOnSeek = onSeekRef.current;
				
				// Calcular el progreso basado en la posición actual del evento
				const { locationX } = event.nativeEvent;
				const clampedX = Math.max(0, Math.min(SLIDER_WIDTH, locationX));
				const finalProgress = clampedX / SLIDER_WIDTH;
				const newTime = finalProgress * currentDuration;

				console.log(
					'🔄 Slider terminating at:',
					'locationX:', locationX,
					'clampedX:', clampedX, 
					'progress:', finalProgress,
					'newTime:', newTime,
					'currentDuration:', currentDuration,
				);

				// Solo hacer seek si tenemos una duración válida
				if (currentDuration > 0 && newTime >= 0) {
					console.log('✅ Calling onSeek with time:', newTime);
					currentOnSeek(newTime);
				} else {
					console.warn('❌ Cannot seek: invalid duration or time', { 
						currentDuration, 
						newTime,
						originalDuration: duration 
					});
				}
				
				setIsDragging(false);
			},
		}),
	).current;

	if (!isActive) {
		return null;
	}

	const bottomMargin = isFullscreen ? FULLSCREEN_BOTTOM_MARGIN : TAB_BAR_HEIGHT;

	return (
		<Animated.View style={[
			styles.container, 
			{ opacity: containerOpacity, bottom: bottomMargin }
		]}>
			{/* Vista previa del fotograma - solo visible cuando se arrastra */}
			<VideoFramePreview
				videoUri={videoUri}
				timeInSeconds={previewTime}
				isVisible={isDragging && duration > 0}
				thumbPosition={effectiveProgress * SLIDER_WIDTH}
			/>
			
			{/* Slider sutil sin tiempos */}
			<View
				style={styles.sliderContainer}
				ref={sliderRef}
				{...panResponder.panHandlers}
			>
				{/* Track de fondo */}
				<View style={styles.track} />

				{/* Track de progreso */}
				<View
					style={[
						styles.progressTrack,
						{ width: `${effectiveProgress * 100}%` },
					]}
				/>

				{/* Thumb que solo se ve prominente al arrastrar */}
				<Animated.View
					style={[
						styles.thumb,
						{
							transform: [
								{ translateX: thumbPosition },
								{ scale: isDragging ? 1.5 : 0 }, // Invisible cuando no se arrastra
							],
							opacity: isDragging ? 1 : 0, // Solo visible al arrastrar
						},
					]}
				>
					{/* Loader cuando se está buscando */}
					{isDragging && isSeeking && (
						<View style={styles.thumbLoader}>
							<ActivityIndicator size="small" color={Colors.text} />
						</View>
					)}
				</Animated.View>
			</View>
		</Animated.View>
	);
};

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		left: 0,
		right: 0,
		height: TRACK_HEIGHT + 20, // Altura mínima para permitir toques
		zIndex: 100,
	},
	sliderContainer: {
		height: TRACK_HEIGHT + 20, // Más área de toque
		justifyContent: 'center',
		position: 'relative',
		paddingVertical: 10, // Más espacio para toques más fáciles
	},
	track: {
		height: TRACK_HEIGHT,
		backgroundColor: 'rgba(255, 255, 255, 0.2)', // Más sutil
		position: 'absolute',
		left: 0,
		right: 0,
	},
	progressTrack: {
		height: TRACK_HEIGHT,
		backgroundColor: Colors.primary,
		position: 'absolute',
		left: 0,
		shadowColor: Colors.primary,
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.6,
		shadowRadius: 2,
	},
	thumb: {
		width: THUMB_SIZE,
		height: THUMB_SIZE,
		borderRadius: THUMB_SIZE / 2,
		backgroundColor: Colors.primary,
		position: 'absolute',
		top: (TRACK_HEIGHT + 20) / 2 - THUMB_SIZE / 2,
		marginLeft: -THUMB_SIZE / 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.4,
		shadowRadius: 3,
		elevation: 6,
		borderWidth: 2,
		borderColor: Colors.text,
		justifyContent: 'center',
		alignItems: 'center',
	},
	thumbLoader: {
		position: 'absolute',
		justifyContent: 'center',
		alignItems: 'center',
	},
});
