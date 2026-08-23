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
import { expensesApi, Expense } from '../../api/expenses';
import { ScreenContainer, EmptyState } from '../../components/ScreenContainer';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { useAuthStore } from '../../store/authStore';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export default function ExpenseListScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-indexed

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['expenses', year, month],
    queryFn: () => expensesApi.list({ year, month }),
    placeholderData: (prev) => prev,
  });

  const { data: summaryData } = useQuery({
    queryKey: ['expense-summary', year, month],
    queryFn: () => expensesApi.getSummary(year, month),
  });

  const deleteMutation = useMutation({
    mutationFn: expensesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: () => Alert.alert('Error', 'Failed to delete expense.'),
  });

  const confirmDelete = (id: number, description: string) => {
    if (user?.role !== 'owner') return;
    Alert.alert(
      'Delete Expense',
      `Delete "${description}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
      ],
    );
  };

  const expenses: Expense[] = data?.results || data || [];

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

  const renderItem = ({ item }: { item: Expense }) => (
    <TouchableOpacity
      style={styles.card}
      onLongPress={() => confirmDelete(item.id, item.description)}
      activeOpacity={0.85}
    >
      <View style={styles.iconBox}>
        <Text style={styles.categoryIcon}>{item.category_icon || '📦'}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.description} numberOfLines={1}>{item.description}</Text>
        <Text style={styles.category}>{item.category_name}</Text>
        <Text style={styles.date}>{formatDate(item.date)}</Text>
      </View>
      <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      {/* Month navigator */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} style={styles.navArrow}>
          <Text style={styles.navArrowText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.monthLabel}>
          <Text style={styles.monthText}>{MONTHS[month - 1]} {year}</Text>
          {summaryData && (
            <Text style={styles.monthTotal}>Total: {formatCurrency(summaryData.total)}</Text>
          )}
        </View>
        <TouchableOpacity onPress={nextMonth} style={styles.navArrow}>
          <Text style={styles.navArrowText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Category breakdown */}
      {summaryData && Object.keys(summaryData.by_category).length > 0 && (
        <View style={styles.breakdown}>
          {Object.entries(summaryData.by_category).map(([cat, amt]) => (
            <View key={cat} style={styles.breakdownRow}>
              <Text style={styles.breakdownCat}>{cat}</Text>
              <Text style={styles.breakdownAmt}>{formatCurrency(amt)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Expense list */}
      <FlatList
        data={expenses}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: Spacing[2] }} />}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              icon="📭"
              message="No expenses this month"
              subtitle="Tap + to add an expense."
            />
          )
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddExpense')}>
        <Text style={styles.fabText}>+ Add Expense</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: Spacing[3],
  },
  navArrow: { padding: Spacing[3], paddingHorizontal: Spacing[5] },
  navArrowText: { fontSize: 28, color: Colors.primary, fontWeight: Typography.fontWeight.bold },
  monthLabel: { flex: 1, alignItems: 'center' },
  monthText: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, color: Colors.textPrimary },
  monthTotal: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary },

  breakdown: {
    backgroundColor: Colors.gray50,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    gap: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  breakdownCat: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  breakdownAmt: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, color: Colors.textPrimary },

  list: { padding: Spacing[4], paddingBottom: 100 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    gap: Spacing[3],
    ...Shadow.sm,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIcon: { fontSize: 22 },
  cardInfo: { flex: 1 },
  description: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.medium, color: Colors.textPrimary },
  category: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  date: { fontSize: Typography.fontSize.xs, color: Colors.textMuted },
  amount: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold, color: Colors.textPrimary },

  fab: {
    position: 'absolute',
    bottom: Spacing[6],
    right: Spacing[4],
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    ...Shadow.lg,
  },
  fabText: { color: Colors.white, fontWeight: Typography.fontWeight.bold, fontSize: Typography.fontSize.base },
});
