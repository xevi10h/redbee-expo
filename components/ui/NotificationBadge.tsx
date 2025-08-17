import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

interface NotificationBadgeProps {
  count: number;
  size?: 'small' | 'medium';
  style?: any;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  size = 'medium',
  style,
}) => {
  if (count <= 0) return null;

  const displayCount = count > 99 ? '99+' : count.toString();
  const isSmall = size === 'small';

  return (
    <View style={[
      styles.badge,
      isSmall ? styles.badgeSmall : styles.badgeMedium,
      style
    ]}>
      <Text style={[
        styles.badgeText,
        isSmall ? styles.badgeTextSmall : styles.badgeTextMedium
      ]}>
        {displayCount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    position: 'absolute',
    top: -8,
    right: -8,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  badgeSmall: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    top: -6,
    right: -6,
  },
  badgeMedium: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    top: -8,
    right: -8,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  badgeTextSmall: {
    fontSize: 10,
  },
  badgeTextMedium: {
    fontSize: 12,
  },
});