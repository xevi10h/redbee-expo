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
import { useRequireAuth } from '@/hooks/useAuth';
import { AudienceAnalyticsService } from '@/services/audienceAnalyticsService';
import type { AudienceAnalyticsData } from '@/shared/types';

import { AudienceSummaryCards } from '@/components/audience/AudienceSummaryCards';
import { AudienceEngagementChart } from '@/components/audience/AudienceEngagementChart';
import { AudienceGeographicChart } from '@/components/audience/AudienceGeographicChart';
import { AudienceHourlyChart } from '@/components/audience/AudienceHourlyChart';
import { AudienceVideoPerformance } from '@/components/audience/AudienceVideoPerformance';

export default function AudienceCenterScreen() {
	const router = useRouter();
	const { user } = useRequireAuth();
	const [analyticsData, setAnalyticsData] = useState<AudienceAnalyticsData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedPeriod, setSelectedPeriod] = useState<number>(30); // días

	const loadAnalytics = useCallback(
		async (showRefresh = false) => {
			try {
				if (!user?.id) return;

				if (showRefresh) {
					setIsRefreshing(true);
				} else {
					setIsLoading(true);
				}
				setError(null);

				const response = await AudienceAnalyticsService.getUserAudienceAnalytics(
					user.id,
					selectedPeriod
				);

				if (response.success && response.data) {
					setAnalyticsData(response.data);
				} else {
					setError(response.error || 'Error al cargar analíticas de audiencia');
				}
			} catch (error) {
				console.error('Error loading audience analytics:', error);
				setError('Error inesperado al cargar los datos');
			} finally {
				setIsLoading(false);
				setIsRefreshing(false);
			}
		},
		[user?.id, selectedPeriod]
	);

	useEffect(() => {
		loadAnalytics();
	}, [loadAnalytics]);

	const handleRefresh = useCallback(() => {
		loadAnalytics(true);
	}, [loadAnalytics]);

	const handlePeriodChange = (newPeriod: number) => {
		setSelectedPeriod(newPeriod);
	};

	const PeriodSelector: React.FC = () => {
		const periods = [
			{ label: '7 días', value: 7 },
			{ label: '30 días', value: 30 },
			{ label: '90 días', value: 90 },
			{ label: '1 año', value: 365 },
		];

		return (
			<View style={styles.periodSelector}>
				{periods.map((period) => (
					<TouchableOpacity
						key={period.value}
						style={[
							styles.periodButton,
							selectedPeriod === period.value && styles.activePeriodButton,
						]}
						onPress={() => handlePeriodChange(period.value)}
					>
						<Text
							style={[
								styles.periodButtonText,
								selectedPeriod === period.value && styles.activePeriodButtonText,
							]}
						>
							{period.label}
						</Text>
					</TouchableOpacity>
				))}
			</View>
		);
	};

	if (isLoading) {
		return (
			<SafeAreaView style={styles.container}>
				<StatusBar style="light" />
				<View style={styles.header}>
					<TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
						<Feather name="arrow-left" size={24} color={Colors.text} />
					</TouchableOpacity>
					<Text style={styles.headerTitle}>Cargando centro de audiencia...</Text>
				</View>
				<View style={styles.loadingContainer}>
					<Feather name="bar-chart-2" size={48} color={Colors.primary} />
					<Text style={styles.loadingText}>Analizando tu audiencia...</Text>
				</View>
			</SafeAreaView>
		);
	}

	if (error) {
		return (
			<SafeAreaView style={styles.container}>
				<StatusBar style="light" />
				<View style={styles.header}>
					<TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
						<Feather name="arrow-left" size={24} color={Colors.text} />
					</TouchableOpacity>
					<Text style={styles.headerTitle}>Error</Text>
				</View>
				<View style={styles.errorContainer}>
					<Feather name="alert-circle" size={48} color={Colors.error} />
					<Text style={styles.errorTitle}>
						No se pudieron cargar las analíticas de audiencia
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

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar style="light" />

			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
					<Feather name="arrow-left" size={24} color={Colors.text} />
				</TouchableOpacity>
				<View style={styles.headerContent}>
					<Text style={styles.headerTitle}>Centro de Audiencia</Text>
					<Text style={styles.headerSubtitle}>
						Analíticas generales de todos tus videos
					</Text>
				</View>
				<TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
					<Feather name="refresh-cw" size={20} color={Colors.primary} />
				</TouchableOpacity>
			</View>

			{/* Period Selector */}
			<PeriodSelector />

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
				{/* Summary Cards */}
				<View style={styles.section}>
					<AudienceSummaryCards summary={analyticsData.summary} />
				</View>

				{/* Engagement Trends */}
				{analyticsData.engagement_trends.length > 0 && (
					<View style={styles.section}>
						<AudienceEngagementChart
							data={analyticsData.engagement_trends}
							title="Tendencias de Engagement"
						/>
					</View>
				)}

				{/* Hourly Patterns */}
				{analyticsData.hourly_patterns.length > 0 && (
					<View style={styles.section}>
						<AudienceHourlyChart
							data={analyticsData.hourly_patterns}
							title="Patrones de Visualización por Horas"
						/>
					</View>
				)}

				{/* Geographic Data */}
				{analyticsData.geographic_data.length > 0 && (
					<View style={styles.section}>
						<AudienceGeographicChart
							data={analyticsData.geographic_data}
							title="Alcance Geográfico"
						/>
					</View>
				)}

				{/* Video Performance */}
				{analyticsData.video_performance.length > 0 && (
					<View style={styles.section}>
						<AudienceVideoPerformance
							data={analyticsData.video_performance}
							title="Rendimiento de Videos"
						/>
					</View>
				)}

				{/* Bottom Spacing */}
				<View style={{ height: 40 }} />
			</ScrollView>
		</SafeAreaView>
	);
}

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
	backButton: {
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
	headerSubtitle: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		marginTop: 2,
	},
	refreshButton: {
		padding: 4,
		marginLeft: 12,
	},
	periodSelector: {
		flexDirection: 'row',
		paddingHorizontal: 16,
		paddingVertical: 16,
		backgroundColor: Colors.background,
		gap: 8,
	},
	periodButton: {
		flex: 1,
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 8,
		backgroundColor: Colors.backgroundSecondary,
		borderWidth: 1,
		borderColor: Colors.borderSecondary,
		alignItems: 'center',
	},
	activePeriodButton: {
		backgroundColor: 'rgba(255, 107, 129, 0.1)',
		borderColor: Colors.primary,
	},
	periodButtonText: {
		fontSize: 12,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.textTertiary,
	},
	activePeriodButtonText: {
		color: Colors.primary,
	},
	scrollView: {
		flex: 1,
	},
	section: {
		paddingHorizontal: 16,
		paddingVertical: 8,
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