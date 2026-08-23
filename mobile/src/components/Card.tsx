import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Typography, BorderRadius, Shadow, Spacing } from '../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  title?: string;
  rightElement?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, style, title, rightElement }) => (
  <View style={[styles.card, style]}>
    {(title || rightElement) && (
      <View style={styles.header}>
        {title && <Text style={styles.title}>{title}</Text>}
        {rightElement}
      </View>
    )}
    {children}
  </View>
);

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  accent?: string;
  icon?: string;
  style?: ViewStyle;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtitle,
  accent = Colors.primary,
  icon,
  style,
}) => (
  <View style={[styles.statCard, style]}>
    {icon && <Text style={styles.icon}>{icon}</Text>}
    <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </View>
);

interface BadgeProps {
  label: string;
  color?: string;
  bg?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  color = Colors.white,
  bg = Colors.primary,
}) => (
  <View style={[styles.badge, { backgroundColor: bg }]}>
    <Text style={[styles.badgeText, { color }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    ...Shadow.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[3],
  },
  title: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },

  statCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    alignItems: 'flex-start',
    ...Shadow.sm,
  },
  icon: { fontSize: 22, marginBottom: Spacing[1] },
  statValue: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    lineHeight: 32,
  },
  statLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },

  badge: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
});
