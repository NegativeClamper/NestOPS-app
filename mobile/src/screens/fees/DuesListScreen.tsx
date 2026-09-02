/**
 * DuesListScreen — Cycle Status Overview
 *
 * Shows EVERY active resident with their current billing cycle status:
 *   • Hostel name
 *   • Cycle due date
 *   • "Paid" (green) or "Overdue" (red) badge
 *
 * Data comes from GET /api/residents/?status=active which now includes
 * `current_cycle` per resident — computed server-side, no client-side
 * date math required.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { residentsApi, ResidentListItem } from '../../api/residents';
import { ScreenContainer, EmptyState } from '../../components/ScreenContainer';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDueDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatCurrency(val: string | null): string {
  if (!val) return '—';
  const n = parseFloat(val);
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

type CycleStatus = 'paid' | 'overdue' | 'pending' | 'unknown';

function getCycleStatus(resident: ResidentListItem): CycleStatus {
  const c = resident.current_cycle;
  if (!c || c.is_paid === null) return 'unknown';
  if (c.is_paid) return 'paid';
  if (c.is_overdue) return 'overdue';
  return 'pending';   // cycle started but due date hasn't passed yet
}

const STATUS_CONFIG: Record<CycleStatus, { label: string; bg: string; text: string }> = {
  paid:    { label: 'Paid',    bg: Colors.successLight, text: Colors.success },
  overdue: { label: 'Overdue', bg: Colors.dangerLight,  text: Colors.danger  },
  pending: { label: 'Due',     bg: Colors.warningLight, text: Colors.accentDark },
  unknown: { label: '—',       bg: Colors.gray100,      text: Colors.textMuted },
};

function StatusBadge({ status }: { status: CycleStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Summary counts ───────────────────────────────────────────────────────────

function SummaryBar({
  paid, overdue, pending, total,
}: { paid: number; overdue: number; pending: number; total: number }) {
  return (
    <View style={styles.summaryBar}>
      <View style={styles.summaryItem}>
        <Text style={[styles.summaryCount, { color: Colors.success }]}>{paid}</Text>
        <Text style={styles.summaryLabel}>Paid</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={[styles.summaryCount, { color: Colors.danger }]}>{overdue}</Text>
        <Text style={styles.summaryLabel}>Overdue</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={[styles.summaryCount, { color: Colors.accentDark }]}>{pending}</Text>
        <Text style={styles.summaryLabel}>Due Soon</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={[styles.summaryCount, { color: Colors.textPrimary }]}>{total}</Text>
        <Text style={styles.summaryLabel}>Total</Text>
      </View>
    </View>
  );
}

// ─── Resident row card ────────────────────────────────────────────────────────

function ResidentCycleCard({
  item,
  onPress,
  onCollect,
}: {
  item: ResidentListItem;
  onPress: () => void;
  onCollect: () => void;
}) {
  const status = getCycleStatus(item);
  const cycle  = item.current_cycle;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Left accent bar */}
      <View style={[
        styles.accentBar,
        {
          backgroundColor:
            status === 'paid'    ? Colors.success :
            status === 'overdue' ? Colors.danger  :
            status === 'pending' ? Colors.warning :
            Colors.gray300,
        },
      ]} />

      <View style={styles.cardBody}>
        {/* Top row: name + badge */}
        <View style={styles.cardRow}>
          <Text style={styles.residentName} numberOfLines={1}>{item.name}</Text>
          <StatusBadge status={status} />
        </View>

        {/* Hostel */}
        <Text style={styles.hostelLabel}>
          🏠 {item.hostel_name ?? 'No hostel assigned'}
        </Text>

        {/* Cycle due date + balance */}
        <View style={styles.cardRow}>
          <Text style={styles.dueLabel}>
            Due: <Text style={status === 'overdue' ? styles.dueDateOverdue : styles.dueDate}>
              {formatDueDate(cycle?.cycle_due_date ?? null)}
            </Text>
          </Text>
          {cycle?.balance && parseFloat(cycle.balance) > 0 ? (
            <Text style={styles.balanceText}>{formatCurrency(cycle.balance)} owed</Text>
          ) : null}
        </View>
      </View>

      {/* Collect button — only shown when not paid */}
      {status !== 'paid' && (
        <TouchableOpacity style={styles.collectBtn} onPress={onCollect}>
          <Text style={styles.collectBtnText}>Collect</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DuesListScreen({ navigation }: any) {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['residents', { status: 'active' }],
    queryFn: () => residentsApi.list({ status: 'active' }),
    refetchInterval: 60000,
  });

  // The endpoint returns { results: [...] } if paginated, or [...] directly
  const residents: ResidentListItem[] = Array.isArray(data)
    ? data
    : (data?.results ?? []);

  // Compute summary counts
  const counts = residents.reduce(
    (acc, r) => {
      const s = getCycleStatus(r);
      if (s === 'paid')    acc.paid++;
      else if (s === 'overdue') acc.overdue++;
      else if (s === 'pending') acc.pending++;
      return acc;
    },
    { paid: 0, overdue: 0, pending: 0 },
  );

  // Sort: overdue first, then pending, then paid
  const ORDER: Record<CycleStatus, number> = { overdue: 0, pending: 1, unknown: 2, paid: 3 };
  const sorted = [...residents].sort(
    (a, b) => ORDER[getCycleStatus(a)] - ORDER[getCycleStatus(b)],
  );

  if (isLoading) return <ScreenContainer loading />;

  return (
    <ScreenContainer>
      <SummaryBar
        paid={counts.paid}
        overdue={counts.overdue}
        pending={counts.pending}
        total={residents.length}
      />
      <FlatList
        data={sorted}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: Spacing[2] }} />}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        renderItem={({ item }) => (
          <ResidentCycleCard
            item={item}
            onPress={() => navigation.navigate('ResidentDetail', { id: item.id })}
            onCollect={() =>
              navigation.navigate('RecordPayment', {
                residentId: item.id,
                residentName: item.name,
              })
            }
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="👥"
            message="No active residents"
            subtitle="Add residents to track dues here."
          />
        }
      />
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Summary bar
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Shadow.sm,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryCount: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold },
  summaryLabel: { fontSize: Typography.fontSize.xs, color: Colors.textMuted, marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },

  // List
  list: { padding: Spacing[4], paddingBottom: Spacing[12] },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  accentBar: { width: 4, alignSelf: 'stretch' },
  cardBody: { flex: 1, padding: Spacing[4], gap: Spacing[1] + 2 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  residentName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: Spacing[2],
  },
  hostelLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  dueLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  dueDate: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
  },
  dueDateOverdue: {
    color: Colors.danger,
    fontWeight: Typography.fontWeight.semibold,
  },
  balanceText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.danger,
    fontWeight: Typography.fontWeight.semibold,
  },

  // Badge
  badge: {
    paddingHorizontal: Spacing[2] + 2,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Collect button
  collectBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[4],
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  collectBtnText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.white,
    fontWeight: Typography.fontWeight.semibold,
  },
});
