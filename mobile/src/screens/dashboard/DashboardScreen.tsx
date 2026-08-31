import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { reportsApi } from '../../api/reports';
import { ScreenContainer, EmptyState } from '../../components/ScreenContainer';
import { Card, StatCard, Badge } from '../../components/Card';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';
import { formatCurrency } from '../../utils/formatters';

// ── Pure-RN bar chart (no external charting library) ─────────────────────────
function SimpleBarChart({ data }: { data: Array<{ month_label: string; revenue: number; expenses: number }> }) {
  if (!data || data.length === 0) {
    return <Text style={{ color: Colors.textMuted, fontSize: 13, padding: 16 }}>No trend data yet.</Text>;
  }
  const maxVal = Math.max(...data.flatMap((d) => [d.revenue, d.expenses]), 1);
  const BAR_HEIGHT = 160;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingVertical: 8 }}>
      {data.map((d) => (
        <View key={d.month_label} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: BAR_HEIGHT }}>
            <View style={{ width: 8, height: Math.max(4, (d.revenue / maxVal) * BAR_HEIGHT), backgroundColor: Colors.success, borderRadius: 3 }} />
            <View style={{ width: 8, height: Math.max(4, (d.expenses / maxVal) * BAR_HEIGHT), backgroundColor: Colors.danger, borderRadius: 3 }} />
          </View>
          <Text style={{ fontSize: 9, color: Colors.textMuted, textAlign: 'center' }}>{d.month_label}</Text>
        </View>
      ))}
    </View>
  );
}

export default function DashboardScreen({ navigation }: any) {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: reportsApi.getDashboard,
    refetchInterval: 60000, // auto-refresh every minute
  });

  if (isLoading) {
    return <ScreenContainer loading />;
  }

  if (error || !data) {
    return (
      <ScreenContainer error="Failed to load dashboard. Check your connection." />
    );
  }

  const { monthly_revenue, monthly_expenses, net_pl, pl_trend, pending_dues } = data;
  const isProfit = net_pl >= 0;

  // P&L chart data
  const chartData = pl_trend.slice(-6); // last 6 months for readability

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Dashboard</Text>
        <Text style={styles.subGreeting}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>
      </View>


      {/* Revenue / Expense / P&L */}
      <View style={styles.row}>
        <StatCard
          label="Revenue (this month)"
          value={formatCurrency(monthly_revenue)}
          accent={Colors.success}
          icon="💰"
          style={styles.halfCard}
        />
        <StatCard
          label="Expenses (this month)"
          value={formatCurrency(monthly_expenses.total)}
          accent={Colors.danger}
          icon="📤"
          style={styles.halfCard}
        />
      </View>
      <Card style={[styles.plCard, { borderLeftColor: isProfit ? Colors.success : Colors.danger }]}>
        <Text style={styles.plLabel}>Net P&L — This Month</Text>
        <Text style={[styles.plValue, { color: isProfit ? Colors.success : Colors.danger }]}>
          {isProfit ? '+' : ''}{formatCurrency(net_pl)}
        </Text>
      </Card>

      {/* P&L Trend Chart — pure RN, no charting library */}
      <Card title="Revenue vs Expenses (6 months)">
        <SimpleBarChart data={chartData} />
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
            <Text style={styles.legendLabel}>Revenue</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.danger }]} />
            <Text style={styles.legendLabel}>Expenses</Text>
          </View>
        </View>
      </Card>

      {/* Pending Dues */}
      <Card
        title={`Pending Dues (${pending_dues.residents_count} residents)`}
        rightElement={
          <Text style={styles.duesTotal}>{formatCurrency(pending_dues.total_outstanding)}</Text>
        }
      >
        {pending_dues.residents.length === 0 ? (
          <Text style={styles.allClearText}>✅ All dues are cleared!</Text>
        ) : (
          <>
            {pending_dues.residents.slice(0, 5).map((r) => (
              <TouchableOpacity
                key={r.resident_id}
                style={styles.dueRow}
                onPress={() => navigation.navigate('Payments', { screen: 'DuesList' })}
              >
                <View style={styles.dueInfo}>
                  <Text style={styles.dueName}>{r.resident_name}</Text>
                  <Text style={styles.dueRoom}>Room {r.room_number || '—'}</Text>
                </View>
                <View style={styles.dueRight}>
                  <Text style={styles.dueAmount}>{formatCurrency(r.total_balance)}</Text>
                  {r.overdue_months_count > 0 && (
                    <Badge
                      label={`${r.overdue_months_count}mo overdue`}
                      bg={Colors.dangerLight}
                      color={Colors.danger}
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))}
            {pending_dues.residents.length > 5 && (
              <TouchableOpacity
                onPress={() => navigation.navigate('Payments', { screen: 'DuesList' })}
              >
                <Text style={styles.seeAllDues}>
                  See all {pending_dues.residents.length} residents →
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </Card>

      {/* Expenses breakdown */}
      {Object.keys(monthly_expenses.by_category).length > 0 && (
        <Card title="Expenses by Category">
          {Object.entries(monthly_expenses.by_category).map(([cat, amt]) => (
            <View key={cat} style={styles.expenseRow}>
              <Text style={styles.expenseCat}>{cat}</Text>
              <Text style={styles.expenseAmt}>{formatCurrency(amt)}</Text>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing[4], gap: Spacing[4], paddingBottom: Spacing[10] },

  header: {
    paddingVertical: Spacing[2],
  },
  greeting: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  subGreeting: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  occupancyBadge: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    alignItems: 'center',
  },
  occupancyPct: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  occupancyLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.gray300,
  },

  row: { flexDirection: 'row', gap: Spacing[3] },
  flexCard: { flex: 1 },
  halfCard: { flex: 1 },

  plCard: {
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  plLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  plValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
  },

  chartLegend: { flexDirection: 'row', gap: Spacing[4], justifyContent: 'center', marginTop: Spacing[1] },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing[1] },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary },


  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dueInfo: { gap: 2 },
  dueName: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.medium, color: Colors.textPrimary },
  dueRoom: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  dueRight: { alignItems: 'flex-end', gap: Spacing[1] },
  dueAmount: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold, color: Colors.danger },
  duesTotal: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold, color: Colors.danger },
  allClearText: { fontSize: Typography.fontSize.base, color: Colors.success, textAlign: 'center', paddingVertical: Spacing[4] },
  seeAllDues: { fontSize: Typography.fontSize.sm, color: Colors.primary, textAlign: 'center', marginTop: Spacing[3], fontWeight: Typography.fontWeight.medium },

  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  expenseCat: { fontSize: Typography.fontSize.base, color: Colors.textPrimary },
  expenseAmt: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: Colors.textPrimary },
});
