import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/Colors';
import { formatLargeNumber } from '@/services/analyticsService';
import type { AudienceEngagementTrends } from '@/shared/types';

interface AudienceEngagementChartProps {
	data: AudienceEngagementTrends[];
	title: string;
}

const { width } = Dimensions.get('window');
const chartWidth = width - 64;
const chartHeight = 160;

export const AudienceEngagementChart: React.FC<AudienceEngagementChartProps> = ({
	data,
	title,
}) => {
	if (!data || data.length === 0) {
		return (
			<View style={styles.container}>
				<Text style={styles.title}>{title}</Text>
				<View style={styles.emptyState}>
					<Feather name="trending-up" size={32} color={Colors.textTertiary} />
					<Text style={styles.emptyText}>No hay datos de tendencias disponibles</Text>
				</View>
			</View>
		);
	}

	// Sort data by date
	const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date));
	
	// Calculate chart dimensions
	const maxEngagementRate = Math.max(...sortedData.map(d => d.engagement_rate));
	const maxHeight = chartHeight - 40;
	
	// Calculate totals for summary
	const totalViews = sortedData.reduce((sum, d) => sum + d.views, 0);
	const totalLikes = sortedData.reduce((sum, d) => sum + d.likes, 0);
	const totalComments = sortedData.reduce((sum, d) => sum + d.comments, 0);
	const totalShares = sortedData.reduce((sum, d) => sum + d.shares, 0);
	const avgEngagementRate = sortedData.reduce((sum, d) => sum + d.engagement_rate, 0) / sortedData.length;

	// Point spacing
	const pointSpacing = chartWidth / Math.max(sortedData.length - 1, 1);

	// Format date for display
	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr);
		return `${date.getDate()}/${date.getMonth() + 1}`;
	};

	// Find best and worst performing days
	const bestDay = sortedData.reduce((prev, current) => 
		prev.engagement_rate > current.engagement_rate ? prev : current
	);
	const worstDay = sortedData.reduce((prev, current) => 
		prev.engagement_rate < current.engagement_rate ? prev : current
	);

	return (
		<View style={styles.container}>
			<Text style={styles.title}>{title}</Text>
			
			{/* Summary Stats */}
			<View style={styles.summaryContainer}>
				<View style={styles.summaryItem}>
					<Text style={styles.summaryLabel}>Vistas totales</Text>
					<Text style={styles.summaryValue}>{formatLargeNumber(totalViews)}</Text>
				</View>
				<View style={styles.summaryItem}>
					<Text style={styles.summaryLabel}>Engagement promedio</Text>
					<Text style={styles.summaryValue}>{avgEngagementRate.toFixed(1)}%</Text>
				</View>
				<View style={styles.summaryItem}>
					<Text style={styles.summaryLabel}>Interacciones</Text>
					<Text style={styles.summaryValue}>
						{formatLargeNumber(totalLikes + totalComments + totalShares)}
					</Text>
				</View>
			</View>

			{/* Chart */}
			<View style={styles.chartContainer}>
				<View style={styles.chart}>
					{/* Grid lines */}
					<View style={styles.gridLines}>
						{[0, 25, 50, 75, 100].map((percentage) => (
							<View 
								key={percentage}
								style={[
									styles.gridLine,
									{ bottom: (percentage / 100) * maxHeight }
								]}
							/>
						))}
					</View>
					
					{/* Y-axis labels */}
					<View style={styles.yAxisLabels}>
						{[0, 25, 50, 75, 100].map((percentage) => (
							<Text 
								key={percentage}
								style={[
									styles.yAxisLabel,
									{ bottom: (percentage / 100) * maxHeight - 6 }
								]}
							>
								{percentage}%
							</Text>
						))}
					</View>

					{/* Data line and points */}
					<View style={styles.dataContainer}>
						{/* Engagement rate line */}
						{sortedData.map((item, index) => {
							if (index === sortedData.length - 1) return null;
							
							const currentHeight = maxEngagementRate > 0 
								? (item.engagement_rate / maxEngagementRate) * maxHeight 
								: 0;
							const nextHeight = maxEngagementRate > 0 
								? (sortedData[index + 1].engagement_rate / maxEngagementRate) * maxHeight 
								: 0;
							
							const x1 = index * pointSpacing;
							const x2 = (index + 1) * pointSpacing;
							const y1 = maxHeight - currentHeight;
							const y2 = maxHeight - nextHeight;
							
							// Simple line approximation using a rotated view
							const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
							const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
							
							return (
								<View
									key={index}
									style={[
										styles.lineSegment,
										{
											left: x1,
											top: y1,
											width: length,
											transform: [{ rotate: `${angle}deg` }],
										},
									]}
								/>
							);
						})}
						
						{/* Data points */}
						{sortedData.map((item, index) => {
							const pointHeight = maxEngagementRate > 0 
								? (item.engagement_rate / maxEngagementRate) * maxHeight 
								: 0;
							const x = index * pointSpacing;
							const y = maxHeight - pointHeight;
							
							return (
								<View
									key={`point-${index}`}
									style={[
										styles.dataPoint,
										{
											left: x - 3,
											top: y - 3,
										},
									]}
								/>
							);
						})}
					</View>
					
					{/* X-axis labels */}
					<View style={styles.xAxisLabels}>
						{sortedData.map((item, index) => {
							// Show every 3rd label to avoid crowding
							if (index % 3 !== 0 && index !== sortedData.length - 1) return null;
							
							return (
								<Text
									key={index}
									style={[
										styles.xAxisLabel,
										{ left: index * pointSpacing - 15 }
									]}
								>
									{formatDate(item.date)}
								</Text>
							);
						})}
					</View>
				</View>
			</View>

			{/* Breakdown */}
			<View style={styles.breakdownContainer}>
				<Text style={styles.breakdownTitle}>Desglose de interacciones</Text>
				<View style={styles.breakdownItems}>
					<View style={styles.breakdownItem}>
						<Feather name="heart" size={16} color={Colors.error} />
						<Text style={styles.breakdownLabel}>Likes</Text>
						<Text style={styles.breakdownValue}>{formatLargeNumber(totalLikes)}</Text>
					</View>
					<View style={styles.breakdownItem}>
						<Feather name="message-circle" size={16} color={Colors.primary} />
						<Text style={styles.breakdownLabel}>Comentarios</Text>
						<Text style={styles.breakdownValue}>{formatLargeNumber(totalComments)}</Text>
					</View>
					<View style={styles.breakdownItem}>
						<Feather name="share" size={16} color={Colors.accent} />
						<Text style={styles.breakdownLabel}>Compartidos</Text>
						<Text style={styles.breakdownValue}>{formatLargeNumber(totalShares)}</Text>
					</View>
				</View>
			</View>

			{/* Performance highlights */}
			<View style={styles.performanceContainer}>
				<View style={styles.performanceItem}>
					<View style={styles.performanceIcon}>
						<Feather name="trending-up" size={16} color={Colors.success} />
					</View>
					<View style={styles.performanceInfo}>
						<Text style={styles.performanceLabel}>Mejor día</Text>
						<Text style={styles.performanceValue}>
							{formatDate(bestDay.date)} - {bestDay.engagement_rate.toFixed(1)}%
						</Text>
					</View>
				</View>
				<View style={styles.performanceItem}>
					<View style={styles.performanceIcon}>
						<Feather name="trending-down" size={16} color={Colors.warning} />
					</View>
					<View style={styles.performanceInfo}>
						<Text style={styles.performanceLabel}>Día más bajo</Text>
						<Text style={styles.performanceValue}>
							{formatDate(worstDay.date)} - {worstDay.engagement_rate.toFixed(1)}%
						</Text>
					</View>
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
	summaryContainer: {
		flexDirection: 'row',
		backgroundColor: Colors.background,
		borderRadius: 8,
		padding: 12,
		marginBottom: 16,
		justifyContent: 'space-around',
	},
	summaryItem: {
		alignItems: 'center',
	},
	summaryLabel: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
		marginBottom: 4,
		textAlign: 'center',
	},
	summaryValue: {
		fontSize: 16,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		textAlign: 'center',
	},
	chartContainer: {
		backgroundColor: Colors.background,
		borderRadius: 8,
		padding: 16,
		marginBottom: 16,
	},
	chart: {
		height: chartHeight,
		position: 'relative',
	},
	gridLines: {
		position: 'absolute',
		left: 30,
		right: 0,
		top: 0,
		bottom: 20,
	},
	gridLine: {
		position: 'absolute',
		left: 0,
		right: 0,
		height: 1,
		backgroundColor: Colors.borderSecondary,
	},
	yAxisLabels: {
		position: 'absolute',
		left: 0,
		top: 0,
		bottom: 20,
		width: 25,
	},
	yAxisLabel: {
		position: 'absolute',
		fontSize: 10,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
		textAlign: 'right',
	},
	dataContainer: {
		position: 'absolute',
		left: 30,
		right: 0,
		top: 0,
		bottom: 20,
	},
	lineSegment: {
		position: 'absolute',
		height: 2,
		backgroundColor: Colors.primary,
	},
	dataPoint: {
		position: 'absolute',
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: Colors.primary,
		borderWidth: 2,
		borderColor: Colors.background,
	},
	xAxisLabels: {
		position: 'absolute',
		left: 30,
		right: 0,
		bottom: 0,
		height: 20,
	},
	xAxisLabel: {
		position: 'absolute',
		fontSize: 10,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
		width: 30,
		textAlign: 'center',
	},
	breakdownContainer: {
		backgroundColor: Colors.background,
		borderRadius: 8,
		padding: 12,
		marginBottom: 16,
	},
	breakdownTitle: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.text,
		marginBottom: 8,
	},
	breakdownItems: {
		flexDirection: 'row',
		justifyContent: 'space-around',
	},
	breakdownItem: {
		alignItems: 'center',
		gap: 4,
	},
	breakdownLabel: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
	breakdownValue: {
		fontSize: 14,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
	},
	performanceContainer: {
		backgroundColor: Colors.background,
		borderRadius: 8,
		padding: 12,
		gap: 8,
	},
	performanceItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	performanceIcon: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: Colors.backgroundSecondary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	performanceInfo: {
		flex: 1,
	},
	performanceLabel: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
	performanceValue: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.text,
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