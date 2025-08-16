import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { Colors } from '@/constants/Colors';
import { AnalyticsService } from '@/services/analyticsService';
import type { ReportsByReason } from '@/shared/types';

interface ReportsDetailModalProps {
	isVisible: boolean;
	videoId: string;
	videoTitle?: string;
	onClose: () => void;
}

export const ReportsDetailModal: React.FC<ReportsDetailModalProps> = ({
	isVisible,
	videoId,
	videoTitle,
	onClose,
}) => {
	const [reportsData, setReportsData] = useState<ReportsByReason[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const loadReportsData = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			const response = await AnalyticsService.getReportsByReason(videoId);
			
			if (response.success && response.data) {
				setReportsData(response.data);
			} else {
				setError(response.error || 'Error al cargar reportes');
			}
		} catch (error) {
			console.error('Error loading reports:', error);
			setError('Error inesperado al cargar los datos');
		} finally {
			setIsLoading(false);
		}
	}, [videoId]);

	useEffect(() => {
		if (isVisible) {
			loadReportsData();
		} else {
			setReportsData([]);
			setError(null);
		}
	}, [isVisible, loadReportsData]);

	const getReasonLabel = (reason: string): string => {
		const labels: Record<string, string> = {
			'inappropriate': 'Contenido Inapropiado',
			'spam': 'Spam',
			'harassment': 'Acoso',
			'copyright': 'Derechos de Autor',
			'violence': 'Violencia',
			'adult_content': 'Contenido Adulto',
			'hate_speech': 'Discurso de Odio',
			'misinformation': 'Desinformación',
			'other': 'Otros'
		};
		return labels[reason] || reason;
	};

	const getReasonColor = (index: number): string => {
		const colors = [
			Colors.error,
			Colors.warning,
			Colors.primary,
			Colors.success,
			'#9333EA', // Purple
			'#EC4899', // Pink
			'#F97316', // Orange
			'#06B6D4', // Cyan
			'#84CC16', // Lime
		];
		return colors[index % colors.length];
	};

	const totalReports = reportsData.reduce((sum, item) => sum + item.count, 0);

	const PieChart = () => {
		const size = 200;
		const strokeWidth = 20;
		const radius = (size - strokeWidth) / 2;
		const circumference = radius * 2 * Math.PI;
		let cumulativePercentage = 0;

		if (reportsData.length === 0) {
			return (
				<View style={[styles.chartContainer, { width: size, height: size }]}>
					<Svg width={size} height={size}>
						<Circle
							cx={size / 2}
							cy={size / 2}
							r={radius}
							stroke={Colors.borderSecondary}
							strokeWidth={strokeWidth}
							fill="none"
						/>
					</Svg>
					<View style={styles.chartCenter}>
						<Text style={styles.centerNumber}>0</Text>
						<Text style={styles.centerLabel}>Reportes</Text>
					</View>
				</View>
			);
		}

		return (
			<View style={[styles.chartContainer, { width: size, height: size }]}>
				<Svg width={size} height={size}>
					{reportsData.map((item, index) => {
						const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
						const strokeDashoffset = -cumulativePercentage * circumference / 100;
						cumulativePercentage += item.percentage;

						return (
							<Circle
								key={item.reason}
								cx={size / 2}
								cy={size / 2}
								r={radius}
								stroke={getReasonColor(index)}
								strokeWidth={strokeWidth}
								fill="none"
								strokeDasharray={strokeDasharray}
								strokeDashoffset={strokeDashoffset}
								transform={`rotate(-90 ${size / 2} ${size / 2})`}
							/>
						);
					})}
				</Svg>
				<View style={styles.chartCenter}>
					<Text style={styles.centerNumber}>{totalReports}</Text>
					<Text style={styles.centerLabel}>Reportes</Text>
				</View>
			</View>
		);
	};

	const renderEmptyState = () => (
		<View style={styles.emptyState}>
			<Feather name="flag" size={48} color={Colors.textTertiary} />
			<Text style={styles.emptyTitle}>No hay reportes</Text>
			<Text style={styles.emptySubtitle}>
				Tu video no ha recibido ningún reporte. ¡Eso es bueno!
			</Text>
		</View>
	);

	return (
		<Modal
			visible={isVisible}
			animationType="slide"
			presentationStyle="fullScreen"
			onRequestClose={onClose}
		>
			<SafeAreaView style={styles.container} edges={['top']}>
				<StatusBar style="light" />
				
				{/* Header */}
				<View style={styles.header}>
					<TouchableOpacity onPress={onClose} style={styles.closeButton}>
						<Feather name="x" size={24} color={Colors.text} />
					</TouchableOpacity>
					<View style={styles.headerContent}>
						<Text style={styles.headerTitle}>Reportes ({totalReports})</Text>
						{videoTitle && (
							<Text style={styles.videoTitle} numberOfLines={1}>
								{videoTitle}
							</Text>
						)}
					</View>
					<View style={styles.placeholder} />
				</View>

				{/* Content */}
				{isLoading ? (
					<View style={styles.loadingContainer}>
						<Feather name="flag" size={48} color={Colors.primary} />
						<Text style={styles.loadingText}>Cargando reportes...</Text>
					</View>
				) : error ? (
					<View style={styles.errorContainer}>
						<Feather name="alert-circle" size={48} color={Colors.error} />
						<Text style={styles.errorTitle}>Error al cargar reportes</Text>
						<Text style={styles.errorMessage}>{error}</Text>
						<TouchableOpacity onPress={loadReportsData} style={styles.retryButton}>
							<Text style={styles.retryButtonText}>Reintentar</Text>
						</TouchableOpacity>
					</View>
				) : reportsData.length === 0 ? (
					renderEmptyState()
				) : (
					<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
						{/* Pie Chart */}
						<View style={styles.chartSection}>
							<PieChart />
						</View>

						{/* Legend */}
						<View style={styles.legendSection}>
							<Text style={styles.sectionTitle}>Motivos de Reporte</Text>
							{reportsData.map((item, index) => (
								<View key={item.reason} style={styles.legendItem}>
									<View style={[styles.legendColor, { backgroundColor: getReasonColor(index) }]} />
									<View style={styles.legendContent}>
										<Text style={styles.legendLabel}>{getReasonLabel(item.reason)}</Text>
										<View style={styles.legendStats}>
											<Text style={styles.legendCount}>{item.count} reportes</Text>
											<Text style={styles.legendPercentage}>{item.percentage}%</Text>
										</View>
									</View>
								</View>
							))}
						</View>

						{/* Summary */}
						<View style={styles.summarySection}>
							<Text style={styles.sectionTitle}>Resumen</Text>
							<View style={styles.summaryCard}>
								<Text style={styles.summaryText}>
									Tu video ha recibido <Text style={styles.summaryBold}>{totalReports} reportes</Text> en total.
								</Text>
								{reportsData.length > 0 && (
									<Text style={styles.summaryText}>
										El motivo más común es{' '}
										<Text style={styles.summaryBold}>
											{getReasonLabel(reportsData[0].reason).toLowerCase()}
										</Text>{' '}
										({reportsData[0].percentage}%).
									</Text>
								)}
							</View>
						</View>

						{/* Bottom spacing */}
						<View style={{ height: 40 }} />
					</ScrollView>
				)}
			</SafeAreaView>
		</Modal>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingTop: 20,
		paddingBottom: 12,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
	},
	closeButton: {
		padding: 4,
		marginRight: 12,
	},
	headerContent: {
		flex: 1,
		alignItems: 'center',
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
	placeholder: {
		width: 40,
	},
	content: {
		flex: 1,
	},
	chartSection: {
		alignItems: 'center',
		paddingVertical: 32,
	},
	chartContainer: {
		justifyContent: 'center',
		alignItems: 'center',
		position: 'relative',
	},
	chartCenter: {
		position: 'absolute',
		justifyContent: 'center',
		alignItems: 'center',
	},
	centerNumber: {
		fontSize: 28,
		fontFamily: 'Raleway-Bold',
		fontWeight: 'bold',
		color: Colors.text,
	},
	centerLabel: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		marginTop: 4,
	},
	legendSection: {
		paddingHorizontal: 16,
		paddingBottom: 24,
	},
	sectionTitle: {
		fontSize: 18,
		fontFamily: 'Inter-Bold',
		fontWeight: 'bold',
		color: Colors.text,
		marginBottom: 16,
	},
	legendItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
	},
	legendColor: {
		width: 16,
		height: 16,
		borderRadius: 8,
		marginRight: 12,
	},
	legendContent: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	legendLabel: {
		fontSize: 16,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.text,
		flex: 1,
	},
	legendStats: {
		alignItems: 'flex-end',
	},
	legendCount: {
		fontSize: 14,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
	},
	legendPercentage: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		marginTop: 2,
	},
	summarySection: {
		paddingHorizontal: 16,
		paddingBottom: 24,
	},
	summaryCard: {
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 12,
		padding: 16,
		borderWidth: 1,
		borderColor: Colors.borderSecondary,
	},
	summaryText: {
		fontSize: 15,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
		lineHeight: 22,
		marginBottom: 8,
	},
	summaryBold: {
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
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
	emptyState: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 32,
	},
	emptyTitle: {
		fontSize: 20,
		fontFamily: 'Raleway-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginTop: 16,
		marginBottom: 8,
		textAlign: 'center',
	},
	emptySubtitle: {
		fontSize: 16,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
		lineHeight: 24,
	},
});