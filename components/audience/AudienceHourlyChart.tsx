import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/Colors';
import { formatHourDisplay } from '@/services/audienceAnalyticsService';
import type { AudienceHourlyPattern } from '@/shared/types';

interface AudienceHourlyChartProps {
	data: AudienceHourlyPattern[];
	title: string;
}

const { width } = Dimensions.get('window');
const chartWidth = width - 64; // Account for padding
const chartHeight = 200;

export const AudienceHourlyChart: React.FC<AudienceHourlyChartProps> = ({
	data,
	title,
}) => {
	if (!data || data.length === 0) {
		return (
			<View style={styles.container}>
				<Text style={styles.title}>{title}</Text>
				<View style={styles.emptyState}>
					<Feather name="clock" size={32} color={Colors.textTertiary} />
					<Text style={styles.emptyText}>No hay datos de patrones horarios</Text>
				</View>
			</View>
		);
	}

	// Find the maximum value for scaling
	const maxViews = Math.max(...data.map(d => d.views));
	const maxHeight = chartHeight - 40; // Leave space for labels

	// Calculate bar width and spacing
	const barWidth = (chartWidth - (data.length - 1) * 4) / data.length;

	// Find peak hours (top 3)
	const sortedByViews = [...data].sort((a, b) => b.views - a.views);
	const peakHours = sortedByViews.slice(0, 3).map(d => d.hour);

	return (
		<View style={styles.container}>
			<Text style={styles.title}>{title}</Text>
			
			{/* Chart */}
			<View style={styles.chartContainer}>
				<View style={styles.chart}>
					{data.map((item, index) => {
						const barHeight = maxViews > 0 ? (item.views / maxViews) * maxHeight : 0;
						const isPeak = peakHours.includes(item.hour);
						
						return (
							<View key={item.hour} style={styles.barContainer}>
								<View style={styles.barWrapper}>
									<View
										style={[
											styles.bar,
											{
												height: barHeight,
												width: barWidth,
												backgroundColor: isPeak ? Colors.primary : Colors.backgroundSecondary,
											},
										]}
									/>
								</View>
								
								{/* Hour label - show every 3 hours for readability */}
								{item.hour % 3 === 0 && (
									<Text style={styles.hourLabel}>
										{formatHourDisplay(item.hour)}
									</Text>
								)}
							</View>
						);
					})}
				</View>
			</View>

			{/* Stats */}
			<View style={styles.statsContainer}>
				<View style={styles.statItem}>
					<Text style={styles.statLabel}>Hora pico</Text>
					<Text style={styles.statValue}>
						{formatHourDisplay(sortedByViews[0]?.hour || 0)}
					</Text>
				</View>
				<View style={styles.statItem}>
					<Text style={styles.statLabel}>Vistas máx/hora</Text>
					<Text style={styles.statValue}>
						{sortedByViews[0]?.views || 0}
					</Text>
				</View>
				<View style={styles.statItem}>
					<Text style={styles.statLabel}>Promedio/hora</Text>
					<Text style={styles.statValue}>
						{Math.round(data.reduce((sum, d) => sum + d.views, 0) / data.length)}
					</Text>
				</View>
			</View>

			{/* Peak Hours Info */}
			<View style={styles.peakHoursContainer}>
				<Text style={styles.peakHoursTitle}>Horas de mayor actividad:</Text>
				<View style={styles.peakHoursList}>
					{peakHours.slice(0, 3).map((hour, index) => (
						<View key={hour} style={styles.peakHourItem}>
							<View style={styles.peakHourRank}>
								<Text style={styles.peakHourRankText}>{index + 1}</Text>
							</View>
							<Text style={styles.peakHourText}>
								{formatHourDisplay(hour)}
							</Text>
							<Text style={styles.peakHourViews}>
								{data.find(d => d.hour === hour)?.views || 0} vistas
							</Text>
						</View>
					))}
				</View>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 12,
		padding: 16,
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
		backgroundColor: Colors.background,
		borderRadius: 8,
		padding: 16,
		marginBottom: 16,
	},
	chart: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		height: chartHeight,
		justifyContent: 'space-between',
	},
	barContainer: {
		alignItems: 'center',
	},
	barWrapper: {
		height: chartHeight - 20,
		justifyContent: 'flex-end',
	},
	bar: {
		borderRadius: 2,
		minHeight: 2,
	},
	hourLabel: {
		fontSize: 10,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
		marginTop: 4,
		textAlign: 'center',
	},
	statsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		backgroundColor: Colors.background,
		borderRadius: 8,
		padding: 12,
		marginBottom: 16,
	},
	statItem: {
		alignItems: 'center',
	},
	statLabel: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
		marginBottom: 4,
	},
	statValue: {
		fontSize: 16,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
	},
	peakHoursContainer: {
		backgroundColor: Colors.background,
		borderRadius: 8,
		padding: 12,
	},
	peakHoursTitle: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.text,
		marginBottom: 8,
	},
	peakHoursList: {
		gap: 8,
	},
	peakHourItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	peakHourRank: {
		width: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: Colors.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	peakHourRankText: {
		fontSize: 10,
		fontFamily: 'Inter-Bold',
		fontWeight: 'bold',
		color: Colors.text,
	},
	peakHourText: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.text,
		flex: 1,
	},
	peakHourViews: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
	emptyState: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 40,
	},
	emptyText: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
		marginTop: 8,
	},
});