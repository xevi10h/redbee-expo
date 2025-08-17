import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Colors } from '@/constants/Colors';

const { width: screenWidth } = Dimensions.get('window');
const TRIMMER_WIDTH = screenWidth - 32;

interface SimpleTrimmerBarProps {
	duration: number;
}

export function SimpleTrimmerBar({ duration }: SimpleTrimmerBarProps) {
	// Generate simple time markers
	const markerCount = Math.min(10, Math.max(5, Math.ceil(duration / 30)));
	const markerWidth = TRIMMER_WIDTH / markerCount;

	return (
		<View style={styles.container}>
			{Array.from({ length: markerCount }, (_, index) => (
				<View
					key={index}
					style={[
						styles.marker,
						{
							width: markerWidth,
							backgroundColor: index % 2 === 0 ? '#3a3a3a' : '#2a2a2a',
						},
					]}
				/>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		height: 60,
		width: TRIMMER_WIDTH,
		backgroundColor: '#1a1a1a',
		borderRadius: 8,
		overflow: 'hidden',
	},
	marker: {
		height: 60,
		borderRightWidth: 1,
		borderRightColor: '#4a4a4a',
	},
});