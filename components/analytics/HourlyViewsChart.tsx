import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';

import { Colors } from '@/constants/Colors';
import { VideoHourlyData } from '@/shared/types';

interface HourlyViewsChartProps {
	data: VideoHourlyData[];
	title?: string;
	height?: number;
}

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 32; // Padding horizontal

export const HourlyViewsChart: React.FC<HourlyViewsChartProps> = ({
	data,
	title = 'Vistas por Hora',
	height = 200,
}) => {
	// Llenar las 24 horas con datos (0 si no hay datos)
	const fullDayData = Array.from({ length: 24 }, (_, hour) => {
		const hourData = data.find(d => d.hour === hour);
		return {
			hour,
			views: hourData?.views || 0,
			unique_views: hourData?.unique_views || 0,
		};
	});

	const maxViews = Math.max(...fullDayData.map(d => d.views), 1);
	const chartHeight = height - 60; // Espacio para etiquetas
	const barWidth = (chartWidth - 80) / 24; // Espacio para etiquetas laterales

	const formatHour = (hour: number): string => {
		if (hour === 0) return '12AM';
		if (hour < 12) return `${hour}AM`;
		if (hour === 12) return '12PM';
		return `${hour - 12}PM`;
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>{title}</Text>
			
			<View style={styles.chartContainer}>
				<Svg width={chartWidth} height={height}>
					{/* Líneas de cuadrícula horizontales */}
					{Array.from({ length: 5 }, (_, i) => {
						const y = 40 + (chartHeight * i) / 4;
						const value = Math.round(maxViews * (4 - i) / 4);
						return (
							<React.Fragment key={i}>
								<Line
									x1={50}
									y1={y}
									x2={chartWidth - 10}
									y2={y}
									stroke={Colors.borderSecondary}
									strokeWidth={0.5}
									strokeDasharray="2,2"
								/>
								<SvgText
									x={45}
									y={y + 4}
									fontSize={10}
									fill={Colors.textTertiary}
									textAnchor="end"
									fontFamily="Inter-Regular"
								>
									{value}
								</SvgText>
							</React.Fragment>
						);
					})}

					{/* Barras */}
					{fullDayData.map((item, index) => {
						const barHeight = (item.views / maxViews) * chartHeight;
						const x = 50 + index * barWidth;
						const y = 40 + chartHeight - barHeight;

						return (
							<React.Fragment key={index}>
								<Rect
									x={x}
									y={y}
									width={barWidth - 2}
									height={barHeight}
									fill={item.views > 0 ? Colors.primary : Colors.backgroundTertiary}
									rx={1}
								/>
								
								{/* Etiquetas de horas cada 4 horas */}
								{index % 4 === 0 && (
									<SvgText
										x={x + barWidth / 2}
										y={height - 10}
										fontSize={9}
										fill={Colors.textTertiary}
										textAnchor="middle"
										fontFamily="Inter-Regular"
									>
										{formatHour(item.hour)}
									</SvgText>
								)}
							</React.Fragment>
						);
					})}
				</Svg>
			</View>

			<View style={styles.legend}>
				<View style={styles.legendItem}>
					<View style={[styles.legendColor, { backgroundColor: Colors.primary }]} />
					<Text style={styles.legendText}>Vistas</Text>
				</View>
				<Text style={styles.subtitle}>
					Total: {fullDayData.reduce((sum, d) => sum + d.views, 0)} vistas
				</Text>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 12,
		padding: 16,
		marginVertical: 8,
		borderWidth: 1,
		borderColor: Colors.borderSecondary,
	},
	title: {
		fontSize: 16,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginBottom: 16,
	},
	chartContainer: {
		alignItems: 'center',
		marginBottom: 12,
	},
	legend: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	legendItem: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	legendColor: {
		width: 12,
		height: 12,
		borderRadius: 6,
		marginRight: 6,
	},
	legendText: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
	},
	subtitle: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
});