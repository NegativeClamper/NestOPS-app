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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feesApi, Payment } from '../../api/fees';
import { ScreenContainer, EmptyState } from '../../components/ScreenContainer';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';
import { formatDate, formatCurrency, paymentMethodLabel } from '../../utils/formatters';
import { useAuthStore } from '../../store/authStore';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const METHOD_COLORS: Record<string, string> = {
  cash: '#10B981',
  upi: '#3B82F6',
  bank_transfer: '#8B5CF6',
  cheque: '#F59E0B',
};

export default function PaymentListScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const periodMonth = `${year}-${String(month).padStart(2, '0')}-01`;

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['payments', year, month],
    queryFn: () => feesApi.listPayments({ period_month: periodMonth }),
    placeholderData: (prev) => prev,
  });

  const deleteMutation = useMutation({
    mutationFn: feesApi.deletePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['all-dues'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: () => Alert.alert('Error', 'Failed to delete payment.'),
  });

  const confirmDelete = (id: number, residentName: string) => {
    if (user?.role !== 'owner') return;
    Alert.alert(
      'Delete Payment',
      `Delete payment record for ${residentName}? This will restore the dues.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
      ],
    );
  };

  const payments: Payment[] = data?.results || data || [];
  const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    const now = new Date();
    if (year === now.getFullYear() && month === now.getMonth() + 1) return;
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const renderItem = ({ item }: { item: Payment }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Residents', {
        screen: 'ResidentDetail',
        params: { id: item.resident },
      })}
      onLongPress={() => confirmDelete(item.id, item.resident_name)}
      activeOpacity={0.8}
    >
      {/* Method color stripe */}
      <View style={[styles.stripe, { backgroundColor: METHOD_COLORS[item.payment_method] || Colors.primary }]} />
      <View style={styles.cardInfo}>
        <Text style={styles.residentName}>{item.resident_name}</Text>
        <Text style={styles.room}>{item.room_number ? `Room ${item.room_number}` : ''}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.method}>{paymentMethodLabel(item.payment_method)}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.date}>{formatDate(item.date_paid)}</Text>
        </View>
        {item.notes ? <Text style={styles.notes} numberOfLines={1}>{item.notes}</Text> : null}
      </View>
      <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      {/* Month nav */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} style={styles.navArrow}>
          <Text style={styles.navArrowText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.monthLabel}>
          <Text style={styles.monthText}>{MONTHS[month - 1]} {year}</Text>
          <Text style={styles.monthTotal}>{payments.length} payments · {formatCurrency(totalRevenue)}</Text>
        </View>
        <TouchableOpacity onPress={nextMonth} style={styles.navArrow}>
          <Text style={styles.navArrowText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Method breakdown pills */}
      {payments.length > 0 && (
        <View style={styles.methodSummary}>
          {Object.entries(METHOD_COLORS).map(([method, color]) => {
            const count = payments.filter((p) => p.payment_method === method).length;
            if (count === 0) return null;
            const total = payments
              .filter((p) => p.payment_method === method)
              .reduce((sum, p) => sum + parseFloat(p.amount), 0);
            return (
              <View key={method} style={[styles.methodPill, { borderColor: color + '60', backgroundColor: color + '10' }]}>
                <Text style={[styles.methodPillText, { color }]}>
                  {paymentMethodLabel(method)}: {formatCurrency(total)}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <FlatList
        data={payments}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: Spacing[2] }} />}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              icon="💳"
              message="No payments this month"
              subtitle={`Use "Record Payment" to add a payment for ${MONTHS[month - 1]} ${year}.`}
            />
          )
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('RecordPayment', {})}>
        <Text style={styles.fabText}>+ Record Payment</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  monthNav: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: Spacing[3] },
  navArrow: { padding: Spacing[3], paddingHorizontal: Spacing[5] },
  navArrowText: { fontSize: 28, color: Colors.primary, fontWeight: Typography.fontWeight.bold },
  monthLabel: { flex: 1, alignItems: 'center' },
  monthText: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, color: Colors.textPrimary },
  monthTotal: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary },

  methodSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2], padding: Spacing[3], borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.gray50 },
  methodPill: { paddingHorizontal: Spacing[3], paddingVertical: Spacing[1], borderRadius: BorderRadius.full, borderWidth: 1 },
  methodPillText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },

  list: { padding: Spacing[4], paddingBottom: 100 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, overflow: 'hidden', ...Shadow.sm },
  stripe: { width: 4, alignSelf: 'stretch' },
  cardInfo: { flex: 1, padding: Spacing[4], gap: 2 },
  residentName: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: Colors.textPrimary },
  room: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[1] },
  method: { fontSize: Typography.fontSize.sm, color: Colors.textMuted },
  dot: { fontSize: Typography.fontSize.sm, color: Colors.textMuted },
  date: { fontSize: Typography.fontSize.sm, color: Colors.textMuted },
  notes: { fontSize: Typography.fontSize.xs, color: Colors.textMuted, fontStyle: 'italic' },
  amount: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold, color: Colors.success, paddingRight: Spacing[4] },

  fab: { position: 'absolute', bottom: Spacing[6], right: Spacing[4], backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingHorizontal: Spacing[5], paddingVertical: Spacing[3], ...Shadow.lg },
  fabText: { color: Colors.white, fontWeight: Typography.fontWeight.bold, fontSize: Typography.fontSize.base },
});
