import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import {
	Animated,
	Dimensions,
	StyleSheet,
	Text,
	View,
} from 'react-native';

import { Colors } from '@/constants/Colors';
import { useTranslation } from '@/hooks/useTranslation';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface VideoFeedLoaderProps {
	message?: string;
	showIcon?: boolean;
}

export const VideoFeedLoader: React.FC<VideoFeedLoaderProps> = ({
	message,
	showIcon = true,
}) => {
	const { t } = useTranslation();
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const scaleAnim = useRef(new Animated.Value(0.8)).current;
	const rotateAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		// Animación de entrada
		Animated.parallel([
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 600,
				useNativeDriver: true,
			}),
			Animated.spring(scaleAnim, {
				toValue: 1,
				tension: 50,
				friction: 8,
				useNativeDriver: true,
			}),
		]).start();

		// Animación de rotación continua para el ícono
		const rotateAnimation = Animated.loop(
			Animated.timing(rotateAnim, {
				toValue: 1,
				duration: 2000,
				useNativeDriver: true,
			}),
		);
		rotateAnimation.start();

		return () => {
			rotateAnimation.stop();
		};
	}, [fadeAnim, scaleAnim, rotateAnim]);

	const rotateInterpolate = rotateAnim.interpolate({
		inputRange: [0, 1],
		outputRange: ['0deg', '360deg'],
	});

	return (
		<View style={styles.container}>
			<LinearGradient
				colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.3)']}
				style={styles.gradient}
			>
				<Animated.View
					style={[
						styles.loaderContent,
						{
							opacity: fadeAnim,
							transform: [{ scale: scaleAnim }],
						},
					]}
				>
					{showIcon && (
						<Animated.View
							style={[
								styles.iconContainer,
								{
									transform: [{ rotate: rotateInterpolate }],
								},
							]}
						>
							<LinearGradient
								colors={Colors.gradientPrimary}
								style={styles.iconGradient}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 1 }}
							>
								<Feather name="play" size={32} color={Colors.text} />
							</LinearGradient>
						</Animated.View>
					)}

					<View style={styles.textContainer}>
						<Text style={styles.loadingTitle}>
							{message || t('home.refreshToSeeNew')}
						</Text>
						
						{/* Puntos animados */}
						<View style={styles.dotsContainer}>
							{[0, 1, 2].map((index) => (
								<LoadingDot key={index} delay={index * 200} />
							))}
						</View>
					</View>
				</Animated.View>
			</LinearGradient>
		</View>
	);
};

const LoadingDot: React.FC<{ delay: number }> = ({ delay }) => {
	const scaleAnim = useRef(new Animated.Value(0.5)).current;

	useEffect(() => {
		const animation = Animated.loop(
			Animated.sequence([
				Animated.timing(scaleAnim, {
					toValue: 1,
					duration: 400,
					useNativeDriver: true,
				}),
				Animated.timing(scaleAnim, {
					toValue: 0.5,
					duration: 400,
					useNativeDriver: true,
				}),
			]),
		);

		// Delay inicial
		const timer = setTimeout(() => {
			animation.start();
		}, delay);

		return () => {
			clearTimeout(timer);
			animation.stop();
		};
	}, [scaleAnim, delay]);

	return (
		<Animated.View
			style={[
				styles.dot,
				{
					transform: [{ scale: scaleAnim }],
				},
			]}
		/>
	);
};

const styles = StyleSheet.create({
	container: {
		width: SCREEN_WIDTH,
		height: SCREEN_HEIGHT,
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		zIndex: 10,
	},
	gradient: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loaderContent: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 32,
	},
	iconContainer: {
		marginBottom: 24,
	},
	iconGradient: {
		width: 80,
		height: 80,
		borderRadius: 40,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: Colors.primary,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 8,
	},
	textContainer: {
		alignItems: 'center',
	},
	loadingTitle: {
		fontSize: 18,
		fontFamily: 'Poppins-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		textAlign: 'center',
		marginBottom: 16,
		textShadowColor: 'rgba(0, 0, 0, 0.8)',
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 3,
	},
	dotsContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	dot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: Colors.primary,
		shadowColor: Colors.primary,
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.8,
		shadowRadius: 4,
		elevation: 4,
	},
});