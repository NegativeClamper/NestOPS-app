import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { feesApi, Payment } from '../../api/fees';
import { ScreenContainer, EmptyState } from '../../components/ScreenContainer';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';
import { formatDate, formatCurrency } from '../../utils/formatters';

export default function DuesListScreen({ navigation }: any) {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['all-dues'],
    queryFn: feesApi.getAllDues,
    refetchInterval: 120000,
  });

  const duesData = data || { total_residents_with_dues: 0, total_outstanding: 0, residents: [] };

  return (
    <ScreenContainer>
      {/* Summary banner */}
      {duesData.total_outstanding > 0 && (
        <View style={styles.banner}>
          <Text style={styles.bannerLabel}>Total Outstanding</Text>
          <Text style={styles.bannerAmount}>{formatCurrency(duesData.total_outstanding)}</Text>
          <Text style={styles.bannerSub}>{duesData.total_residents_with_dues} resident(s)</Text>
        </View>
      )}

      {isLoading ? (
        <ScreenContainer loading />
      ) : (
        <FlatList
          data={duesData.residents}
          keyExtractor={(item) => String(item.resident_id)}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: Spacing[2] }} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('ResidentDetail', { id: item.resident_id })}
              activeOpacity={0.75}
            >
              <View style={styles.cardLeft}>
                <View style={[styles.overdueIndicator, { backgroundColor: item.overdue_months_count > 0 ? Colors.danger : Colors.warning }]} />
                <View style={styles.cardInfo}>
                  <Text style={styles.residentName}>{item.resident_name}</Text>
                  <Text style={styles.roomText}>Room {item.room_number || '—'}</Text>
                  {item.overdue_months_count > 0 && (
                    <Text style={styles.overdueText}>
                      {item.overdue_months_count} month{item.overdue_months_count > 1 ? 's' : ''} overdue
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.balance}>{formatCurrency(item.total_balance)}</Text>
                <TouchableOpacity
                  style={styles.collectBtn}
                  onPress={() => navigation.navigate('RecordPayment', {
                    residentId: item.resident_id,
                    residentName: item.resident_name,
                  })}
                >
                  <Text style={styles.collectBtnText}>Collect</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="✅"
              message="All dues cleared!"
              subtitle="No residents have outstanding dues."
            />
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.danger,
    padding: Spacing[5],
    alignItems: 'center',
    gap: 2,
  },
  bannerLabel: { fontSize: Typography.fontSize.sm, color: Colors.white + 'CC', fontWeight: Typography.fontWeight.medium },
  bannerAmount: { fontSize: Typography.fontSize['3xl'], fontWeight: Typography.fontWeight.bold, color: Colors.white },
  bannerSub: { fontSize: Typography.fontSize.sm, color: Colors.white + 'CC' },

  list: { padding: Spacing[4], paddingBottom: Spacing[10] },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadow.sm,
    overflow: 'hidden',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], flex: 1 },
  overdueIndicator: { width: 4, height: 52, borderRadius: 2 },
  cardInfo: { flex: 1 },
  residentName: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: Colors.textPrimary },
  roomText: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  overdueText: { fontSize: Typography.fontSize.xs, color: Colors.danger, fontWeight: Typography.fontWeight.medium, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: Spacing[2] },
  balance: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, color: Colors.danger },
  collectBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1] + 2,
  },
  collectBtnText: { fontSize: Typography.fontSize.sm, color: Colors.white, fontWeight: Typography.fontWeight.semibold },
});
