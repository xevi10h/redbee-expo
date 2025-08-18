import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors } from '@/constants/Colors';
import { formatLargeNumber, formatDuration } from '@/services/analyticsService';
import type { AudienceVideoPerformance as VideoPerformanceType } from '@/shared/types';

interface AudienceVideoPerformanceProps {
	data: VideoPerformanceType[];
	title: string;
}

export const AudienceVideoPerformance: React.FC<AudienceVideoPerformanceProps> = ({
	data,
	title,
}) => {
	const router = useRouter();

	if (!data || data.length === 0) {
		return (
			<View style={styles.container}>
				<Text style={styles.title}>{title}</Text>
				<View style={styles.emptyState}>
					<Feather name="bar-chart-2" size={32} color={Colors.textTertiary} />
					<Text style={styles.emptyText}>No hay datos de rendimiento de videos</Text>
				</View>
			</View>
		);
	}

	// Sort videos by engagement rate
	const sortedVideos = [...data]
		.sort((a, b) => b.engagement_rate - a.engagement_rate)
		.slice(0, 10); // Top 10 videos

	// Calculate averages
	const avgEngagement = sortedVideos.reduce((sum, v) => sum + v.engagement_rate, 0) / sortedVideos.length;
	const avgCompletionRate = sortedVideos.reduce((sum, v) => sum + v.completion_rate, 0) / sortedVideos.length;
	const totalViews = sortedVideos.reduce((sum, v) => sum + v.views, 0);

	const handleVideoPress = (videoId: string) => {
		router.push(`/video/${videoId}/analytics`);
	};

	const formatRelativeDate = (dateStr: string) => {
		const date = new Date(dateStr);
		const now = new Date();
		const diffTime = Math.abs(now.getTime() - date.getTime());
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		
		if (diffDays === 1) return 'hace 1 día';
		if (diffDays < 7) return `hace ${diffDays} días`;
		if (diffDays < 30) return `hace ${Math.ceil(diffDays / 7)} semanas`;
		return `hace ${Math.ceil(diffDays / 30)} meses`;
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>{title}</Text>
			
			{/* Summary Stats */}
			<View style={styles.summaryContainer}>
				<View style={styles.summaryItem}>
					<Text style={styles.summaryLabel}>Videos analizados</Text>
					<Text style={styles.summaryValue}>{sortedVideos.length}</Text>
				</View>
				<View style={styles.summaryItem}>
					<Text style={styles.summaryLabel}>Engagement promedio</Text>
					<Text style={styles.summaryValue}>{avgEngagement.toFixed(1)}%</Text>
				</View>
				<View style={styles.summaryItem}>
					<Text style={styles.summaryLabel}>Vistas totales</Text>
					<Text style={styles.summaryValue}>{formatLargeNumber(totalViews)}</Text>
				</View>
			</View>

			{/* Performance Rankings */}
			<View style={styles.rankingsContainer}>
				<Text style={styles.rankingsTitle}>Top videos por engagement</Text>
				
				{sortedVideos.map((video, index) => {
					const isTop3 = index < 3;
					const medals = ['🥇', '🥈', '🥉'];
					
					return (
						<TouchableOpacity
							key={video.video_id}
							style={styles.videoItem}
							onPress={() => handleVideoPress(video.video_id)}
							activeOpacity={0.7}
						>
							<View style={styles.videoRank}>
								{isTop3 ? (
									<Text style={styles.videoMedal}>{medals[index]}</Text>
								) : (
									<Text style={styles.videoRankText}>{index + 1}</Text>
								)}
							</View>
							
							<View style={styles.videoInfo}>
								<Text style={styles.videoTitle} numberOfLines={2}>
									{video.title}
								</Text>
								<Text style={styles.videoDate}>
									{formatRelativeDate(video.created_at)}
								</Text>
								
								{/* Quick Stats */}
								<View style={styles.videoQuickStats}>
									<View style={styles.quickStat}>
										<Feather name="eye" size={12} color={Colors.textTertiary} />
										<Text style={styles.quickStatText}>
											{formatLargeNumber(video.views)}
										</Text>
									</View>
									<View style={styles.quickStat}>
										<Feather name="heart" size={12} color={Colors.textTertiary} />
										<Text style={styles.quickStatText}>
											{formatLargeNumber(video.likes)}
										</Text>
									</View>
									<View style={styles.quickStat}>
										<Feather name="message-circle" size={12} color={Colors.textTertiary} />
										<Text style={styles.quickStatText}>
											{formatLargeNumber(video.comments)}
										</Text>
									</View>
								</View>
							</View>
							
							<View style={styles.videoMetrics}>
								<View style={styles.metricItem}>
									<Text style={styles.metricValue}>
										{video.engagement_rate.toFixed(1)}%
									</Text>
									<Text style={styles.metricLabel}>Engagement</Text>
								</View>
								<View style={styles.metricItem}>
									<Text style={styles.metricValue}>
										{video.completion_rate.toFixed(1)}%
									</Text>
									<Text style={styles.metricLabel}>Completado</Text>
								</View>
								<View style={styles.metricItem}>
									<Text style={styles.metricValue}>
										{formatDuration(video.avg_watch_duration)}
									</Text>
									<Text style={styles.metricLabel}>Duración</Text>
								</View>
							</View>
							
							<Feather name="chevron-right" size={16} color={Colors.textTertiary} />
						</TouchableOpacity>
					);
				})}
			</View>

			{/* Performance Insights */}
			<View style={styles.insightsContainer}>
				<Text style={styles.insightsTitle}>Insights de rendimiento</Text>
				
				<View style={styles.insightItem}>
					<View style={styles.insightIcon}>
						<Feather name="trending-up" size={16} color={Colors.success} />
					</View>
					<View style={styles.insightInfo}>
						<Text style={styles.insightLabel}>Video con mayor engagement</Text>
						<Text style={styles.insightValue}>
							{sortedVideos[0]?.title} - {sortedVideos[0]?.engagement_rate.toFixed(1)}%
						</Text>
					</View>
				</View>
				
				<View style={styles.insightItem}>
					<View style={styles.insightIcon}>
						<Feather name="clock" size={16} color={Colors.primary} />
					</View>
					<View style={styles.insightInfo}>
						<Text style={styles.insightLabel}>Mejor tasa de finalización</Text>
						<Text style={styles.insightValue}>
							{[...sortedVideos].sort((a, b) => b.completion_rate - a.completion_rate)[0]?.completion_rate.toFixed(1)}% promedio
						</Text>
					</View>
				</View>
				
				<View style={styles.insightItem}>
					<View style={styles.insightIcon}>
						<Feather name="target" size={16} color={Colors.accent} />
					</View>
					<View style={styles.insightInfo}>
						<Text style={styles.insightLabel}>Tiempo de retención promedio</Text>
						<Text style={styles.insightValue}>
							{formatDuration(avgCompletionRate * 180 / 100)} de video
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
	rankingsContainer: {
		backgroundColor: Colors.background,
		borderRadius: 8,
		padding: 12,
		marginBottom: 16,
	},
	rankingsTitle: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.text,
		marginBottom: 12,
	},
	videoItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
		gap: 12,
	},
	videoRank: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: Colors.backgroundSecondary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	videoMedal: {
		fontSize: 16,
	},
	videoRankText: {
		fontSize: 14,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
	},
	videoInfo: {
		flex: 1,
	},
	videoTitle: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.text,
		marginBottom: 4,
	},
	videoDate: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
		marginBottom: 4,
	},
	videoQuickStats: {
		flexDirection: 'row',
		gap: 12,
	},
	quickStat: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	quickStatText: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
	videoMetrics: {
		alignItems: 'flex-end',
		gap: 4,
	},
	metricItem: {
		alignItems: 'center',
	},
	metricValue: {
		fontSize: 12,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
	},
	metricLabel: {
		fontSize: 10,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
	insightsContainer: {
		backgroundColor: Colors.background,
		borderRadius: 8,
		padding: 12,
	},
	insightsTitle: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.text,
		marginBottom: 12,
	},
	insightItem: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
		gap: 8,
	},
	insightIcon: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: Colors.backgroundSecondary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	insightInfo: {
		flex: 1,
	},
	insightLabel: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
	insightValue: {
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