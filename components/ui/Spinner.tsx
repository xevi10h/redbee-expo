import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming,
	interpolate,
	Easing,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';

interface SpinnerProps {
	size?: number;
	color?: string;
	duration?: number;
}

export function Spinner({ 
	size = 24, 
	color = Colors.primary, 
	duration = 1000 
}: SpinnerProps) {
	const rotation = useSharedValue(0);

	useEffect(() => {
		rotation.value = withRepeat(
			withTiming(360, {
				duration,
				easing: Easing.linear,
			}),
			-1, // Infinite repeat
			false
		);
	}, [duration, rotation]);

	const animatedStyle = useAnimatedStyle(() => {
		const rotateValue = interpolate(
			rotation.value,
			[0, 360],
			[0, 360]
		);

		return {
			transform: [
				{
					rotate: `${rotateValue}deg`,
				},
			],
		};
	});

	return (
		<Animated.View style={[styles.container, animatedStyle]}>
			<Feather name="loader" size={size} color={color} />
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		justifyContent: 'center',
	},
});