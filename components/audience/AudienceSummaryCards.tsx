import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/Colors';
import { formatLargeNumber, formatDuration } from '@/services/analyticsService';
import type { AudienceMetricsSummary } from '@/shared/types';

interface AudienceSummaryCardsProps {
	summary: AudienceMetricsSummary;
}

interface MetricCardProps {
	title: string;
	value: string | number;
	subtitle?: string;
	icon: string;
	iconType?: 'feather' | 'material-community';
	iconColor?: string;
	growth?: number;
	showGrowth?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
	title,
	value,
	subtitle,
	icon,
	iconType = 'feather',
	iconColor = Colors.primary,
	growth,
	showGrowth = false,
}) => {
	const renderIcon = () => {
		if (iconType === 'material-community') {
			return (
				<MaterialCommunityIcons
					name={icon as any}
					size={20}
					color={iconColor}
				/>
			);
		}
		return <Feather name={icon as any} size={20} color={iconColor} />;
	};

	const renderGrowth = () => {
		if (!showGrowth || growth === undefined) return null;

		const isPositive = growth > 0;
		const isNegative = growth < 0;
		const growthColor = isPositive ? Colors.success : isNegative ? Colors.error : Colors.textTertiary;

		return (
			<View style={styles.growthContainer}>
				<Feather
					name={isPositive ? 'trending-up' : isNegative ? 'trending-down' : 'minus'}
					size={12}
					color={growthColor}
				/>
				<Text style={[styles.growthText, { color: growthColor }]}>
					{growth > 0 ? '+' : ''}{growth.toFixed(1)}%
				</Text>
			</View>
		);
	};

	return (
		<View style={styles.metricCard}>
			<View style={styles.metricHeader}>
				<View style={styles.metricIcon}>
					{renderIcon()}
				</View>
				{renderGrowth()}
			</View>
			<Text style={styles.metricValue}>{value}</Text>
			<Text style={styles.metricTitle}>{title}</Text>
			{subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
		</View>
	);
};

export const AudienceSummaryCards: React.FC<AudienceSummaryCardsProps> = ({
	summary,
}) => {
	return (
		<View style={styles.container}>
			<Text style={styles.sectionTitle}>Resumen de Audiencia</Text>
			
			{/* Main Metrics Grid */}
			<View style={styles.metricsGrid}>
				<MetricCard
					title="Total de Videos"
					value={summary.total_videos}
					icon="video"
				/>
				<MetricCard
					title="Vistas Totales"
					value={formatLargeNumber(summary.total_views)}
					subtitle={`${formatLargeNumber(summary.unique_viewers)} únicos`}
					icon="eye"
					growth={summary.period_growth.views_growth}
					showGrowth={true}
				/>
				<MetricCard
					title="Likes Totales"
					value={formatLargeNumber(summary.total_likes)}
					icon="heart"
					iconColor={Colors.error}
					growth={summary.period_growth.likes_growth}
					showGrowth={true}
				/>
				<MetricCard
					title="Comentarios"
					value={formatLargeNumber(summary.total_comments)}
					icon="message-circle"
				/>
				<MetricCard
					title="Compartidos"
					value={formatLargeNumber(summary.total_shares)}
					icon="share"
				/>
				<MetricCard
					title="Reportes"
					value={formatLargeNumber(summary.total_reports)}
					icon="flag"
					iconColor={summary.total_reports > 0 ? Colors.warning : Colors.textTertiary}
				/>
			</View>

			{/* Performance Metrics */}
			<View style={styles.performanceSection}>
				<Text style={styles.subsectionTitle}>Métricas de Rendimiento</Text>
				<View style={styles.performanceGrid}>
					<MetricCard
						title="Duración Media"
						value={formatDuration(summary.avg_watch_duration)}
						subtitle={`${summary.avg_completion_rate.toFixed(1)}% completado`}
						icon="clock"
					/>
					<MetricCard
						title="Retención"
						value={`${summary.audience_retention_rate.toFixed(1)}%`}
						subtitle="de la audiencia"
						icon="repeat"
					/>
					<MetricCard
						title="Seguidores"
						value={`${summary.follower_percentage.toFixed(1)}%`}
						subtitle="de las vistas"
						icon="users"
					/>
					<MetricCard
						title="Premium"
						value={`${summary.premium_viewer_percentage.toFixed(1)}%`}
						subtitle="de las vistas"
						icon="crown"
						iconType="material-community"
						iconColor={Colors.premium}
					/>
				</View>
			</View>

			{/* Top Performing Videos */}
			{summary.top_performing_videos.length > 0 && (
				<View style={styles.topVideosSection}>
					<Text style={styles.subsectionTitle}>Videos Destacados</Text>
					{summary.top_performing_videos.slice(0, 3).map((video, index) => (
						<View key={video.id} style={styles.topVideoItem}>
							<View style={styles.topVideoRank}>
								<Text style={styles.topVideoRankText}>{index + 1}</Text>
							</View>
							<View style={styles.topVideoInfo}>
								<Text style={styles.topVideoTitle} numberOfLines={1}>
									{video.title}
								</Text>
								<View style={styles.topVideoStats}>
									<View style={styles.topVideoStat}>
										<Feather name="eye" size={12} color={Colors.textTertiary} />
										<Text style={styles.topVideoStatText}>
											{formatLargeNumber(video.views)}
										</Text>
									</View>
									<View style={styles.topVideoStat}>
										<Feather name="heart" size={12} color={Colors.textTertiary} />
										<Text style={styles.topVideoStatText}>
											{formatLargeNumber(video.likes)}
										</Text>
									</View>
								</View>
							</View>
						</View>
					))}
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: Colors.background,
	},
	sectionTitle: {
		fontSize: 20,
		fontFamily: 'Raleway-Bold',
		fontWeight: 'bold',
		color: Colors.text,
		marginBottom: 16,
	},
	subsectionTitle: {
		fontSize: 16,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginBottom: 12,
		marginTop: 24,
	},
	metricsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
		marginBottom: 8,
	},
	performanceSection: {
		marginTop: 8,
	},
	performanceGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
	},
	metricCard: {
		width: '48%',
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 12,
		padding: 16,
		borderWidth: 1,
		borderColor: Colors.borderSecondary,
	},
	metricHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	metricIcon: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: 'rgba(255, 107, 129, 0.1)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	growthContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 2,
	},
	growthText: {
		fontSize: 10,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
	},
	metricValue: {
		fontSize: 22,
		fontFamily: 'Raleway-Bold',
		fontWeight: 'bold',
		color: Colors.text,
		marginBottom: 4,
	},
	metricTitle: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.text,
		marginBottom: 2,
	},
	metricSubtitle: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
	topVideosSection: {
		marginTop: 8,
	},
	topVideoItem: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 8,
		padding: 12,
		marginBottom: 8,
		borderWidth: 1,
		borderColor: Colors.borderSecondary,
	},
	topVideoRank: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: Colors.primary,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	topVideoRankText: {
		fontSize: 12,
		fontFamily: 'Inter-Bold',
		fontWeight: 'bold',
		color: Colors.text,
	},
	topVideoInfo: {
		flex: 1,
	},
	topVideoTitle: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.text,
		marginBottom: 4,
	},
	topVideoStats: {
		flexDirection: 'row',
		gap: 16,
	},
	topVideoStat: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	topVideoStatText: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
});