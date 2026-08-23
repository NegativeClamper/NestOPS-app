import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ViewStyle,
} from 'react-native';
import { Colors, Typography, Spacing } from '../theme';

interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  loading?: boolean;
  error?: string | null;
  scrollable?: boolean;
}

export const ScreenContainer: React.FC<ScreenProps> = ({
  children,
  style,
  loading,
  error,
}) => {
  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, style]}>
      {children}
    </SafeAreaView>
  );
};

export const EmptyState: React.FC<{ icon?: string; message: string; subtitle?: string }> = ({
  icon = '📭',
  message,
  subtitle,
}) => (
  <View style={styles.empty}>
    <Text style={styles.emptyIcon}>{icon}</Text>
    <Text style={styles.emptyMessage}>{message}</Text>
    {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
  </View>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    gap: Spacing[2],
  },
  loadingText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing[2],
  },
  errorEmoji: { fontSize: 40 },
  errorText: {
    fontSize: Typography.fontSize.base,
    color: Colors.danger,
    textAlign: 'center',
    paddingHorizontal: Spacing[8],
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[10],
  },
  emptyIcon: { fontSize: 48 },
  emptyMessage: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing[8],
  },
});
