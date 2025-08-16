import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { AnalyticsService } from '@/services/analyticsService';
import type { VideoAnalyticsData } from '@/shared/types';

import { AnalyticsCard } from './AnalyticsCard';
import { CountryMetrics } from './CountryMetrics';
import { HourlyViewsChart } from './HourlyViewsChart';

interface VideoAnalyticsPanelProps {
	videoId: string;
	videoTitle?: string;
	onClose: () => void;
}

export const VideoAnalyticsPanel: React.FC<VideoAnalyticsPanelProps> = ({
	videoId,
	videoTitle,
	onClose,
}) => {
	const router = useRouter();
	const [analyticsData, setAnalyticsData] = useState<VideoAnalyticsData | null>(
		null,
	);
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadAnalytics = useCallback(
		async (showRefresh = false) => {
			try {
				if (showRefresh) {
					setIsRefreshing(true);
				} else {
					setIsLoading(true);
				}
				setError(null);

				// Primero verificar permisos
				const canAccess = await AnalyticsService.canAccessAnalytics(videoId);
				if (!canAccess) {
					setError('No tienes permisos para ver estas analíticas');
					return;
				}

				// Cargar datos de analíticas (desde siempre)
				const response = await AnalyticsService.getVideoAnalytics(
					videoId,
					null,
				);

				if (response.success && response.data) {
					setAnalyticsData(response.data);
				} else {
					setError(response.error || 'Error al cargar analíticas');
				}
			} catch (error) {
				console.error('Error loading analytics:', error);
				setError('Error inesperado al cargar los datos');
			} finally {
				setIsLoading(false);
				setIsRefreshing(false);
			}
		},
		[videoId],
	);

	useEffect(() => {
		loadAnalytics();
	}, [loadAnalytics]);

	const handleRefresh = useCallback(() => {
		loadAnalytics(true);
	}, [loadAnalytics]);

	const formatDuration = (seconds: number): string => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	if (isLoading) {
		return (
			<SafeAreaView style={styles.container}>
				<StatusBar style="light" />
				<View style={styles.header}>
					<TouchableOpacity onPress={onClose} style={styles.closeButton}>
						<Feather name="arrow-left" size={24} color={Colors.text} />
					</TouchableOpacity>
					<Text style={styles.headerTitle}>Cargando analíticas...</Text>
				</View>
				<View style={styles.loadingContainer}>
					<Feather name="bar-chart-2" size={48} color={Colors.primary} />
					<Text style={styles.loadingText}>Analizando datos...</Text>
				</View>
			</SafeAreaView>
		);
	}

	if (error) {
		return (
			<SafeAreaView style={styles.container}>
				<StatusBar style="light" />
				<View style={styles.header}>
					<TouchableOpacity onPress={onClose} style={styles.closeButton}>
						<Feather name="arrow-left" size={24} color={Colors.text} />
					</TouchableOpacity>
					<Text style={styles.headerTitle}>Error</Text>
				</View>
				<View style={styles.errorContainer}>
					<Feather name="alert-circle" size={48} color={Colors.error} />
					<Text style={styles.errorTitle}>
						No se pudieron cargar las analíticas
					</Text>
					<Text style={styles.errorMessage}>{error}</Text>
					<TouchableOpacity
						onPress={() => loadAnalytics()}
						style={styles.retryButton}
					>
						<Text style={styles.retryButtonText}>Reintentar</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}

	if (!analyticsData) {
		return null;
	}

	const { summary } = analyticsData;

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar style="light" />

			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={onClose} style={styles.closeButton}>
					<Feather name="x" size={24} color={Colors.text} />
				</TouchableOpacity>
				<View style={styles.headerContent}>
					<Text style={styles.headerTitle}>Analíticas</Text>
					{videoTitle && (
						<Text style={styles.videoTitle} numberOfLines={1}>
							{videoTitle}
						</Text>
					)}
				</View>
				<TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
					<Feather name="refresh-cw" size={20} color={Colors.primary} />
				</TouchableOpacity>
			</View>

			<ScrollView
				style={styles.scrollView}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={isRefreshing}
						onRefresh={handleRefresh}
						tintColor={Colors.primary}
						colors={[Colors.primary]}
						progressBackgroundColor={Colors.backgroundSecondary}
					/>
				}
			>
				{/* Métricas Principales */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Resumen General</Text>
					<View style={styles.metricsGrid}>
						<AnalyticsCard
							title="Vistas"
							value={summary.total_views}
							subtitle={`${summary.unique_views} únicas`}
							icon="eye"
							style={styles.metricCard}
						/>
						<AnalyticsCard
							title="Likes"
							value={summary.total_likes}
							icon="heart"
							iconColor={Colors.error}
							style={styles.metricCard}
							onPress={() => router.push(`/video/${videoId}/analytics/likes`)}
							showClickableIcon={true}
						/>
						<AnalyticsCard
							title="Comentarios"
							value={summary.total_comments}
							icon="message-circle"
							style={styles.metricCard}
							onPress={() => router.push(`/video/${videoId}/analytics/comments`)}
							showClickableIcon={true}
						/>
						<AnalyticsCard
							title="Compartidos"
							value={summary.total_shares}
							icon="share"
							style={styles.metricCard}
						/>
						<AnalyticsCard
							title="Duración Media"
							value={formatDuration(summary.avg_watch_duration)}
							subtitle={`${summary.avg_completion_rate.toFixed(1)}% completado`}
							icon="clock"
							style={styles.metricCard}
						/>
						<AnalyticsCard
							title="Reportes"
							value={summary.total_reports}
							icon="flag"
							iconColor={Colors.primary}
							style={styles.metricCard}
							onPress={() => router.push(`/video/${videoId}/analytics/reports`)}
							showClickableIcon={true}
						/>
					</View>
				</View>

				{/* Métricas de Audiencia */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Audiencia</Text>
					<View style={styles.audienceGrid}>
						<AnalyticsCard
							title="Seguidores"
							value={`${summary.follower_percentage}%`}
							subtitle="de las vistas"
							icon="users"
							style={styles.audienceCard}
						/>
						<AnalyticsCard
							title="Premium"
							value={`${summary.premium_viewer_percentage}%`}
							subtitle="de las vistas"
							icon="crown"
							iconType="material-community"
							iconColor={Colors.premium}
							style={styles.audienceCard}
						/>
					</View>
				</View>

				{/* Gráfico de Horas */}
				<View style={styles.section}>
					<HourlyViewsChart
						data={analyticsData.hourly_views}
						title="Patrones de Visualización"
					/>
				</View>

				{/* Top Países */}
				{summary.top_countries.length > 0 && (
					<View style={styles.section}>
						<CountryMetrics
							data={summary.top_countries}
							title="Alcance Geográfico"
						/>
					</View>
				)}

				{/* Espaciado final */}
				<View style={{ height: 40 }} />
			</ScrollView>

		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background,
		paddingTop: 1,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
	},
	closeButton: {
		padding: 4,
		marginRight: 12,
	},
	headerContent: {
		flex: 1,
	},
	headerTitle: {
		fontSize: 20,
		fontFamily: 'Raleway-Bold',
		fontWeight: 'bold',
		color: Colors.text,
	},
	videoTitle: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		marginTop: 2,
	},
	refreshButton: {
		padding: 4,
		marginLeft: 12,
	},
	scrollView: {
		flex: 1,
	},
	section: {
		paddingHorizontal: 16,
		paddingVertical: 8,
	},
	sectionTitle: {
		fontSize: 18,
		fontFamily: 'Inter-Bold',
		fontWeight: 'bold',
		color: Colors.text,
		marginBottom: 16,
	},
	metricsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
	},
	metricCard: {
		width: '48%',
	},
	audienceGrid: {
		flexDirection: 'row',
		gap: 12,
	},
	audienceCard: {
		flex: 1,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		gap: 16,
	},
	loadingText: {
		fontSize: 16,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 32,
		gap: 16,
	},
	errorTitle: {
		fontSize: 18,
		fontFamily: 'Inter-Bold',
		fontWeight: 'bold',
		color: Colors.text,
		textAlign: 'center',
	},
	errorMessage: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
		lineHeight: 20,
	},
	retryButton: {
		backgroundColor: Colors.primary,
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 8,
		marginTop: 8,
	},
	retryButtonText: {
		fontSize: 14,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
	},
});
