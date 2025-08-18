import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/Colors';
import { ReportsByReason } from '@/shared/types';

interface ReportsMetricsProps {
	data: ReportsByReason[];
	title?: string;
}

export const ReportsMetrics: React.FC<ReportsMetricsProps> = ({
	data,
	title = 'Análisis de Reportes',
}) => {
	const getReasonLabel = (reason: string): string => {
		const labels: Record<string, string> = {
			inappropriate: 'Contenido Inapropiado',
			spam: 'Spam',
			harassment: 'Acoso',
			copyright: 'Derechos de Autor',
			violence: 'Violencia',
			adult_content: 'Contenido Adulto',
			hate_speech: 'Discurso de Odio',
			misinformation: 'Desinformación',
			other: 'Otros',
		};
		return labels[reason] || reason;
	};

	const getReasonIcon = (reason: string) => {
		const icons: Record<string, keyof typeof Feather.glyphMap> = {
			inappropriate: 'alert-triangle',
			spam: 'message-square',
			harassment: 'user-x',
			copyright: 'shield',
			violence: 'alert-octagon',
			adult_content: 'eye-off',
			hate_speech: 'frown',
			misinformation: 'info',
			other: 'help-circle',
		};
		return icons[reason] || 'flag';
	};

	const getReasonColor = (reason: string): string => {
		// Colores diferenciados por tipo de reporte
		const colors: Record<string, string> = {
			inappropriate: Colors.error,
			spam: Colors.warning,
			harassment: Colors.error,
			copyright: Colors.primary,
			violence: '#ff4757',
			adult_content: '#ff6b7a',
			hate_speech: '#ff4757',
			misinformation: Colors.warning,
			other: Colors.textTertiary,
		};
		return colors[reason] || Colors.error;
	};

	const totalReports = data.reduce((sum, item) => sum + item.count, 0);

	if (data.length === 0) {
		return (
			<View style={styles.container}>
				<Text style={styles.title}>{title}</Text>
				<View style={styles.emptyState}>
					<Feather name="shield-off" size={24} color={Colors.success} />
					<Text style={styles.emptyText}>No hay reportes</Text>
					<Text style={styles.emptySubtext}>
						¡Tu contenido cumple las normas!
					</Text>
				</View>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<View style={styles.titleContainer}>
					<Feather name="flag" size={16} color={Colors.error} />
					<Text style={styles.title}>{title}</Text>
				</View>
				<View style={styles.totalContainer}>
					<Text style={styles.totalCount}>{totalReports}</Text>
					<Text style={styles.totalLabel}>total</Text>
				</View>
			</View>

			<View style={styles.alertBox}>
				<Feather name="info" size={16} color={Colors.warning} />
				<Text style={styles.alertText}>
					Los reportes se revisan automáticamente. Contenido con muchos reportes
					puede ser ocultado temporalmente.
				</Text>
			</View>

			<View style={styles.reasonsList}>
				{data.map((item) => {
					const reasonColor = getReasonColor(item.reason);
					return (
						<View key={item.reason} style={styles.reasonItem}>
							<View style={styles.reasonHeader}>
								<View style={styles.reasonInfo}>
									<View
										style={[
											styles.reasonIcon,
											{ backgroundColor: `${reasonColor}20` },
										]}
									>
										<Feather
											name={getReasonIcon(item.reason)}
											size={14}
											color={reasonColor}
										/>
									</View>
									<Text style={styles.reasonLabel}>
										{getReasonLabel(item.reason)}
									</Text>
								</View>

								<View style={styles.reasonStats}>
									<Text style={styles.reasonCount}>{item.count}</Text>
									<Text style={styles.reasonPercentage}>
										({item.percentage}%)
									</Text>
								</View>
							</View>

							{/* Barra de progreso */}
							<View style={styles.progressBarContainer}>
								<View
									style={[
										styles.progressBar,
										{
											width: `${item.percentage}%`,
											backgroundColor: reasonColor,
										},
									]}
								/>
							</View>
						</View>
					);
				})}
			</View>

			<View style={styles.footer}>
				<Text style={styles.footerText}>
					💡 Tip: Revisa las normas de la comunidad para evitar reportes futuros
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
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	titleContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	title: {
		fontSize: 16,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginLeft: 8,
	},
	totalContainer: {
		alignItems: 'flex-end',
	},
	totalCount: {
		fontSize: 18,
		fontFamily: 'Inter-Bold',
		fontWeight: 'bold',
		color: Colors.error,
	},
	totalLabel: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
	alertBox: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: `${Colors.warning}15`,
		borderRadius: 8,
		padding: 12,
		marginBottom: 16,
		gap: 8,
	},
	alertText: {
		flex: 1,
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		lineHeight: 16,
	},
	reasonsList: {
		gap: 12,
	},
	reasonItem: {
		backgroundColor: Colors.background,
		borderRadius: 8,
		padding: 12,
		borderWidth: 1,
		borderColor: Colors.borderSecondary,
	},
	reasonHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	reasonInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	reasonIcon: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 10,
	},
	reasonLabel: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.text,
		flex: 1,
	},
	reasonStats: {
		alignItems: 'flex-end',
	},
	reasonCount: {
		fontSize: 16,
		fontFamily: 'Inter-Bold',
		fontWeight: 'bold',
		color: Colors.text,
	},
	reasonPercentage: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
	progressBarContainer: {
		height: 4,
		backgroundColor: Colors.backgroundTertiary,
		borderRadius: 2,
	},
	progressBar: {
		height: '100%',
		borderRadius: 2,
	},
	footer: {
		marginTop: 16,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: Colors.borderSecondary,
	},
	footerText: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
		lineHeight: 16,
	},
	emptyState: {
		alignItems: 'center',
		paddingVertical: 24,
		gap: 8,
	},
	emptyText: {
		fontSize: 16,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
	},
	emptySubtext: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
	},
});
