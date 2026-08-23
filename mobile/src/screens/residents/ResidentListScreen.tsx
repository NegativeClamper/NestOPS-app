import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { residentsApi, ResidentListItem } from '../../api/residents';
import { ScreenContainer, EmptyState } from '../../components/ScreenContainer';
import { Badge } from '../../components/Card';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';

type Status = 'active' | 'checked_out' | '';

export default function ResidentListScreen({ navigation }: any) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status>('active');

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['residents', search, statusFilter],
    queryFn: () =>
      residentsApi.list({
        search: search || undefined,
        status: statusFilter || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const residents: ResidentListItem[] = data?.results || data || [];

  const renderItem = ({ item }: { item: ResidentListItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ResidentDetail', { id: item.id })}
      activeOpacity={0.75}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name[0].toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.sub}>
          {item.room_number ? `Room ${item.room_number}` : 'No room assigned'}
          {item.sharing_type_name ? ` • ${item.sharing_type_name}` : ''}
        </Text>
        <Text style={styles.phone}>{item.phone}</Text>
      </View>
      <View style={styles.right}>
        <Badge
          label={item.status === 'active' ? 'Active' : 'Checked Out'}
          bg={item.status === 'active' ? Colors.successLight : Colors.gray100}
          color={item.status === 'active' ? Colors.success : Colors.textSecondary}
        />
        {item.monthly_fee && (
          <Text style={styles.fee}>₹{Number(item.monthly_fee).toLocaleString('en-IN')}/mo</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      {/* Search + Filter bar */}
      <View style={styles.filterBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, room, phone…"
          placeholderTextColor={Colors.gray400}
          value={search}
          onChangeText={setSearch}
        />
        <View style={styles.statusFilters}>
          {(['active', 'checked_out', ''] as Status[]).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
              onPress={() => setStatusFilter(s)}
            >
              <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>
                {s === 'active' ? 'Active' : s === 'checked_out' ? 'Checked Out' : 'All'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <ScreenContainer loading />
      ) : (
        <FlatList
          data={residents}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: Spacing[2] }} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={
            <EmptyState
              icon="🧑‍🎓"
              message="No residents found"
              subtitle={search ? 'Try a different search term.' : 'Add your first resident.'}
            />
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ResidentCreate')}
      >
        <Text style={styles.fabText}>+ Add Resident</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  filterBar: {
    backgroundColor: Colors.surface,
    padding: Spacing[4],
    gap: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchInput: {
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  statusFilters: { flexDirection: 'row', gap: Spacing[2] },
  filterChip: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1] + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
  },
  filterChipActive: { backgroundColor: Colors.primary },
  filterChipText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  filterChipTextActive: { color: Colors.white },

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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  info: { flex: 1 },
  name: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: Colors.textPrimary },
  sub: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  phone: { fontSize: Typography.fontSize.sm, color: Colors.textMuted, marginTop: 1 },
  right: { alignItems: 'flex-end', gap: Spacing[1] },
  fee: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium, color: Colors.primary },

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
