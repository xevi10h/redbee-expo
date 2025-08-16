import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/Colors';
import { getCountryName } from '@/services/analyticsService';
import { CountryMetric } from '@/shared/types';

interface CountryMetricsProps {
	data: CountryMetric[];
	title?: string;
	showPercentages?: boolean;
}

export const CountryMetrics: React.FC<CountryMetricsProps> = ({
	data,
	title = 'Top Países',
	showPercentages = true,
}) => {
	const totalViews = data.reduce((sum, item) => sum + item.count, 0);
	const maxCount = Math.max(...data.map(item => item.count), 1);

	const getCountryFlag = (countryCode: string): string => {
		// Convertir código ISO a emoji de bandera
		const flags: Record<string, string> = {
			ES: '🇪🇸',
			US: '🇺🇸', 
			FR: '🇫🇷',
			DE: '🇩🇪',
			IT: '🇮🇹',
			GB: '🇬🇧',
			BR: '🇧🇷',
			AR: '🇦🇷',
			MX: '🇲🇽',
			CO: '🇨🇴',
			PE: '🇵🇪',
			CL: '🇨🇱',
			CA: '🇨🇦',
			PT: '🇵🇹',
			NL: '🇳🇱',
			BE: '🇧🇪',
			CH: '🇨🇭',
			AT: '🇦🇹',
			SE: '🇸🇪',
			NO: '🇳🇴',
			DK: '🇩🇰',
			FI: '🇫🇮',
			PL: '🇵🇱',
			RU: '🇷🇺',
			JP: '🇯🇵',
			KR: '🇰🇷',
			CN: '🇨🇳',
			IN: '🇮🇳',
			AU: '🇦🇺',
			NZ: '🇳🇿',
		};
		return flags[countryCode] || '🌍';
	};

	if (data.length === 0) {
		return (
			<View style={styles.container}>
				<Text style={styles.title}>{title}</Text>
				<View style={styles.emptyState}>
					<Feather name="globe" size={24} color={Colors.textTertiary} />
					<Text style={styles.emptyText}>No hay datos geográficos</Text>
				</View>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>{title}</Text>
				<Text style={styles.totalText}>
					{totalViews} vistas totales
				</Text>
			</View>

			<View style={styles.metricsContainer}>
				{data.slice(0, 8).map((item, index) => {
					const percentage = totalViews > 0 ? (item.count / totalViews) * 100 : 0;
					const barWidth = (item.count / maxCount) * 100;

					return (
						<View key={item.country} style={styles.metricRow}>
							<View style={styles.countryInfo}>
								<Text style={styles.countryFlag}>
									{getCountryFlag(item.country)}
								</Text>
								<Text style={styles.countryName} numberOfLines={1}>
									{getCountryName(item.country)}
								</Text>
							</View>

							<View style={styles.metricData}>
								<View style={styles.barContainer}>
									<View 
										style={[
											styles.bar, 
											{ 
								width: `${barWidth}%`,
												backgroundColor: index === 0 ? Colors.primary : Colors.primaryLight
											}
										]} 
									/>
								</View>
								
								<View style={styles.valueContainer}>
									<Text style={styles.countValue}>{item.count}</Text>
									{showPercentages && (
										<Text style={styles.percentage}>
											({percentage.toFixed(1)}%)
										</Text>
									)}
								</View>
							</View>
						</View>
					);
				})}
			</View>

			{data.length > 8 && (
				<Text style={styles.moreText}>
					+{data.length - 8} países más
				</Text>
			)}
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
	title: {
		fontSize: 16,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
	},
	totalText: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
	metricsContainer: {
		gap: 12,
	},
	metricRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	countryInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		marginRight: 12,
	},
	countryFlag: {
		fontSize: 16,
		marginRight: 8,
		width: 20,
		textAlign: 'center',
	},
	countryName: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.text,
		flex: 1,
	},
	metricData: {
		flex: 2,
		flexDirection: 'row',
		alignItems: 'center',
	},
	barContainer: {
		flex: 1,
		height: 6,
		backgroundColor: Colors.backgroundTertiary,
		borderRadius: 3,
		marginRight: 8,
	},
	bar: {
		height: '100%',
		borderRadius: 3,
		minWidth: 2,
	},
	valueContainer: {
		minWidth: 60,
		alignItems: 'flex-end',
	},
	countValue: {
		fontSize: 14,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
	},
	percentage: {
		fontSize: 11,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
	emptyState: {
		alignItems: 'center',
		paddingVertical: 24,
		gap: 8,
	},
	emptyText: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
	moreText: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
		marginTop: 12,
		fontStyle: 'italic',
	},
});