/**
 * HostelSwitcherBar
 *
 * A compact top-bar that shows the currently selected hostel and opens a
 * bottom-sheet style modal to switch.  Used on Dashboard, Payments, Expenses,
 * and Residents screens.
 *
 * Props:
 *  hostels       — full hostel list (pass from a useQuery result)
 *  selectedId    — currently selected hostel id, or null for "All Hostels"
 *  onSelect      — callback with the new id (or null for "All Hostels")
 *  allowAll      — when true, prepends an "All Hostels" row (Dashboard only)
 *  loading       — show a skeleton while hostels are fetching
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Hostel } from '../api/hostels';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../theme';
import { formatCurrency } from '../utils/formatters';

interface Props {
  hostels: Hostel[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  allowAll?: boolean;
  loading?: boolean;
}

interface HostelRow {
  id: number | null;
  name: string;
  gender?: 'boys' | 'girls';
  monthly_rate?: string;
  resident_count?: number;
}

const GENDER_ICON: Record<string, string> = { boys: '👨', girls: '👩' };

export function HostelSwitcherBar({ hostels, selectedId, onSelect, allowAll = false, loading = false }: Props) {
  const [open, setOpen] = useState(false);

  const selectedHostel = hostels.find((h) => h.id === selectedId);
  const label = selectedId === null
    ? (allowAll ? 'All Hostels' : hostels[0]?.name ?? 'Select Hostel')
    : (selectedHostel?.name ?? 'Select Hostel');

  const rows: HostelRow[] = [
    ...(allowAll ? [{ id: null, name: 'All Hostels' }] : []),
    ...hostels.map((h) => ({
      id: h.id,
      name: h.name,
      gender: h.gender,
      monthly_rate: h.monthly_rate,
      resident_count: h.resident_count,
    })),
  ];

  const handleSelect = (id: number | null) => {
    setOpen(false);
    onSelect(id);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.bar}
        onPress={() => setOpen(true)}
        activeOpacity={0.75}
      >
        {loading ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <>
            <Text style={styles.barIcon}>🏠</Text>
            <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>
            <Text style={styles.barChevron}>▾</Text>
          </>
        )}
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Select Hostel</Text>
          <FlatList
            data={rows}
            keyExtractor={(item) => String(item.id ?? 'all')}
            renderItem={({ item }) => {
              const isActive = item.id === selectedId || (item.id === null && selectedId === null && allowAll);
              return (
                <TouchableOpacity
                  style={[styles.row, isActive && styles.rowActive]}
                  onPress={() => handleSelect(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowIcon}>
                      {item.id === null ? '🏘️' : (GENDER_ICON[item.gender ?? ''] ?? '🏠')}
                    </Text>
                    <View>
                      <Text style={[styles.rowName, isActive && styles.rowNameActive]}>
                        {item.name}
                      </Text>
                      {item.monthly_rate && (
                        <Text style={styles.rowSub}>
                          {formatCurrency(item.monthly_rate)}/mo
                          {item.resident_count !== undefined ? `  ·  ${item.resident_count} residents` : ''}
                        </Text>
                      )}
                    </View>
                  </View>
                  {isActive && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={{ paddingBottom: Spacing[8] }}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[2],
  },
  barIcon: { fontSize: 16 },
  barLabel: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  barChevron: { fontSize: 14, color: Colors.gray300 },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing[3],
    maxHeight: '75%',
    ...Shadow.lg,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gray300,
    alignSelf: 'center',
    marginBottom: Spacing[3],
  },
  sheetTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
  },
  rowActive: { backgroundColor: Colors.primaryLight + '18' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], flex: 1 },
  rowIcon: { fontSize: 22 },
  rowName: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.medium, color: Colors.textPrimary },
  rowNameActive: { color: Colors.primary, fontWeight: Typography.fontWeight.bold },
  rowSub: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  checkmark: { fontSize: 18, color: Colors.primary, fontWeight: Typography.fontWeight.bold },
  sep: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing[4] },
});
