import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

import { Colors } from '@/constants/Colors';
import { formatLargeNumber } from '@/services/analyticsService';

interface AnalyticsCardProps {
	title: string;
	value: number | string;
	subtitle?: string;
	icon?: keyof typeof Feather.glyphMap | keyof typeof MaterialCommunityIcons.glyphMap;
	iconType?: 'feather' | 'material-community';
	iconColor?: string;
	trend?: number; // Porcentaje de cambio (positivo = subida, negativo = bajada)
	format?: 'number' | 'duration' | 'percentage';
	style?: ViewStyle;
	onPress?: () => void;
	showClickableIcon?: boolean;
}

export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
	title,
	value,
	subtitle,
	icon,
	iconType = 'feather',
	iconColor = Colors.primary,
	trend,
	format = 'number',
	style,
	onPress,
	showClickableIcon = false,
}) => {
	const formatValue = (val: number | string): string => {
		if (typeof val === 'string') return val;
		
		switch (format) {
			case 'duration':
				const mins = Math.floor(val / 60);
				const secs = val % 60;
				return `${mins}:${secs.toString().padStart(2, '0')}`;
			case 'percentage':
				return `${val}%`;
			case 'number':
			default:
				return formatLargeNumber(val);
		}
	};

	const getTrendColor = (trendValue?: number) => {
		if (!trendValue) return Colors.textSecondary;
		return trendValue > 0 ? Colors.success : Colors.error;
	};

	const getTrendIcon = (trendValue?: number) => {
		if (!trendValue) return null;
		return trendValue > 0 ? 'trending-up' : 'trending-down';
	};

	const CardContent = () => (
		<>
			<View style={styles.header}>
				<View style={styles.titleContainer}>
					{icon && (
						iconType === 'material-community' ? (
							<MaterialCommunityIcons 
								name={icon as any} 
								size={16} 
								color={iconColor} 
								style={styles.icon}
							/>
						) : (
							<Feather 
								name={icon as any} 
								size={16} 
								color={iconColor} 
								style={styles.icon}
							/>
						)
					)}
					<Text style={styles.title}>{title}</Text>
				</View>
				<View style={styles.rightSection}>
					{showClickableIcon && onPress && (
						<View style={styles.clickableIcon}>
							<Feather name="chevron-right" size={16} color={Colors.primary} />
						</View>
					)}
					{trend !== undefined && (
						<View style={styles.trendContainer}>
							<Feather 
								name={getTrendIcon(trend) as any} 
								size={12} 
								color={getTrendColor(trend)}
							/>
							<Text style={[styles.trendText, { color: getTrendColor(trend) }]}>
								{Math.abs(trend)}%
							</Text>
						</View>
					)}
				</View>
			</View>
			
			<Text style={styles.value}>{formatValue(value)}</Text>
			
			{subtitle && (
				<Text style={styles.subtitle}>{subtitle}</Text>
			)}
		</>
	);

	if (onPress) {
		return (
			<TouchableOpacity style={[styles.container, style]} onPress={onPress} activeOpacity={0.8}>
				<CardContent />
			</TouchableOpacity>
		);
	}

	return (
		<View style={[styles.container, style]}>
			<CardContent />
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
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	titleContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	rightSection: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	clickableIcon: {
		padding: 2,
		borderRadius: 4,
		backgroundColor: Colors.backgroundSecondary,
	},
	icon: {
		marginRight: 6,
	},
	title: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.textSecondary,
		flexShrink: 1,
	},
	trendContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 2,
	},
	trendText: {
		fontSize: 12,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
	},
	value: {
		fontSize: 24,
		fontFamily: 'Raleway-Bold',
		fontWeight: 'bold',
		color: Colors.text,
		marginBottom: 2,
	},
	subtitle: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
});