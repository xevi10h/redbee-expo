import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
	useAnimatedProps,
	useSharedValue,
	withTiming,
	Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '@/constants/Colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularProgressProps {
	size?: number;
	strokeWidth?: number;
	progress: number; // 0 to 100
	color?: string;
	backgroundColor?: string;
	showPercentage?: boolean;
	duration?: number;
}

export function CircularProgress({
	size = 80,
	strokeWidth = 6,
	progress,
	color = Colors.primary,
	backgroundColor = Colors.textTertiary,
	showPercentage = true,
	duration = 300,
}: CircularProgressProps) {
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;
	const progressValue = useSharedValue(0);

	React.useEffect(() => {
		progressValue.value = withTiming(progress, {
			duration,
			easing: Easing.out(Easing.cubic),
		});
	}, [progress, duration, progressValue]);

	const animatedProps = useAnimatedProps(() => {
		const strokeDashoffset = circumference - (progressValue.value / 100) * circumference;
		return {
			strokeDashoffset,
		};
	});

	const center = size / 2;

	return (
		<View style={[styles.container, { width: size, height: size }]}>
			<Svg width={size} height={size}>
				{/* Background circle */}
				<Circle
					cx={center}
					cy={center}
					r={radius}
					stroke={backgroundColor}
					strokeWidth={strokeWidth}
					fill="transparent"
				/>
				{/* Progress circle */}
				<AnimatedCircle
					cx={center}
					cy={center}
					r={radius}
					stroke={color}
					strokeWidth={strokeWidth}
					fill="transparent"
					strokeDasharray={circumference}
					strokeLinecap="round"
					animatedProps={animatedProps}
					transform={`rotate(-90 ${center} ${center})`}
				/>
			</Svg>
			{showPercentage && (
				<View style={styles.textContainer}>
					<Text style={styles.percentageText}>{Math.round(progress)}%</Text>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	textContainer: {
		position: 'absolute',
		alignItems: 'center',
		justifyContent: 'center',
	},
	percentageText: {
		fontSize: 16,
		fontFamily: 'Inter-SemiBold',
		color: Colors.text,
		fontWeight: '600',
	},
});