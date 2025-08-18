import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/Colors';
import { getCountryDisplayName } from '@/services/audienceAnalyticsService';
import { formatLargeNumber } from '@/services/analyticsService';
import type { AudienceGeographicData } from '@/shared/types';

interface AudienceGeographicChartProps {
	data: AudienceGeographicData[];
	title: string;
}

export const AudienceGeographicChart: React.FC<AudienceGeographicChartProps> = ({
	data,
	title,
}) => {
	if (!data || data.length === 0) {
		return (
			<View style={styles.container}>
				<Text style={styles.title}>{title}</Text>
				<View style={styles.emptyState}>
					<Feather name="globe" size={32} color={Colors.textTertiary} />
					<Text style={styles.emptyText}>No hay datos geográficos disponibles</Text>
				</View>
			</View>
		);
	}

	// Sort by views (descending) and take top 10
	const sortedData = [...data]
		.sort((a, b) => b.views - a.views)
		.slice(0, 10);

	const maxViews = sortedData[0]?.views || 1;
	const totalViews = sortedData.reduce((sum, item) => sum + item.views, 0);

	return (
		<View style={styles.container}>
			<Text style={styles.title}>{title}</Text>
			
			{/* Summary Stats */}
			<View style={styles.summaryContainer}>
				<View style={styles.summaryItem}>
					<Text style={styles.summaryLabel}>Países alcanzados</Text>
					<Text style={styles.summaryValue}>{data.length}</Text>
				</View>
				<View style={styles.summaryItem}>
					<Text style={styles.summaryLabel}>Vistas totales</Text>
					<Text style={styles.summaryValue}>{formatLargeNumber(totalViews)}</Text>
				</View>
				<View style={styles.summaryItem}>
					<Text style={styles.summaryLabel}>País principal</Text>
					<Text style={styles.summaryValue}>
						{getCountryDisplayName(sortedData[0]?.country || '')}
					</Text>
				</View>
			</View>

			{/* Countries List */}
			<View style={styles.countriesContainer}>
				{sortedData.map((country, index) => {
					const barWidth = (country.views / maxViews) * 100;
					const isTop3 = index < 3;
					
					return (
						<View key={country.country} style={styles.countryItem}>
							<View style={styles.countryInfo}>
								<View style={styles.countryRank}>
									<Text style={styles.countryRankText}>{index + 1}</Text>
								</View>
								<View style={styles.countryDetails}>
									<Text style={styles.countryName}>
										{getCountryDisplayName(country.country)}
									</Text>
									<Text style={styles.countryCode}>
										{country.country} • {country.cities_count} ciudades
									</Text>
								</View>
							</View>
							
							<View style={styles.countryStats}>
								<Text style={styles.countryViews}>
									{formatLargeNumber(country.views)}
								</Text>
								<Text style={styles.countryPercentage}>
									{country.percentage.toFixed(1)}%
								</Text>
							</View>
							
							{/* Progress Bar */}
							<View style={styles.progressBarContainer}>
								<View 
									style={[
										styles.progressBar,
										{
											width: `${barWidth}%`,
											backgroundColor: isTop3 ? Colors.primary : Colors.borderSecondary,
										}
									]}
								/>
							</View>
						</View>
					);
				})}
			</View>

			{/* Top 3 Countries Highlight */}
			<View style={styles.topCountriesContainer}>
				<Text style={styles.topCountriesTitle}>Top 3 países por audiencia</Text>
				<View style={styles.topCountriesList}>
					{sortedData.slice(0, 3).map((country, index) => {
						const medals = ['🥇', '🥈', '🥉'];
						return (
							<View key={country.country} style={styles.topCountryItem}>
								<Text style={styles.topCountryMedal}>{medals[index]}</Text>
								<View style={styles.topCountryInfo}>
									<Text style={styles.topCountryName}>
										{getCountryDisplayName(country.country)}
									</Text>
									<Text style={styles.topCountryStats}>
										{formatLargeNumber(country.views)} vistas ({country.percentage.toFixed(1)}%)
									</Text>
								</View>
							</View>
						);
					})}
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
	countriesContainer: {
		backgroundColor: Colors.background,
		borderRadius: 8,
		padding: 12,
		marginBottom: 16,
	},
	countryItem: {
		marginBottom: 16,
	},
	countryInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	countryRank: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: Colors.backgroundSecondary,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	countryRankText: {
		fontSize: 12,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
	},
	countryDetails: {
		flex: 1,
	},
	countryName: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.text,
	},
	countryCode: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
	countryStats: {
		position: 'absolute',
		right: 0,
		top: 0,
		alignItems: 'flex-end',
	},
	countryViews: {
		fontSize: 14,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
	},
	countryPercentage: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
	progressBarContainer: {
		height: 4,
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 2,
		overflow: 'hidden',
	},
	progressBar: {
		height: '100%',
		borderRadius: 2,
	},
	topCountriesContainer: {
		backgroundColor: Colors.background,
		borderRadius: 8,
		padding: 12,
	},
	topCountriesTitle: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.text,
		marginBottom: 8,
	},
	topCountriesList: {
		gap: 8,
	},
	topCountryItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	topCountryMedal: {
		fontSize: 16,
	},
	topCountryInfo: {
		flex: 1,
	},
	topCountryName: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.text,
	},
	topCountryStats: {
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