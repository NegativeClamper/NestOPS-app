import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { roomsApi, Room } from '../../api/rooms';
import { ScreenContainer, EmptyState } from '../../components/ScreenContainer';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';
import { useAuthStore } from '../../store/authStore';

export default function RoomListScreen({ navigation }: any) {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomsApi.list(),
  });

  const rooms: Room[] = data?.results || data || [];

  const renderRoom = ({ item }: { item: Room }) => {
    const isFullyOccupied = item.vacant_beds === 0;
    const vacantRatio = item.total_beds > 0 ? (item.vacant_beds / item.total_beds) : 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('RoomDetail', { id: item.id })}
        activeOpacity={0.75}
      >
        {/* Room header */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.roomNumber}>Room {item.room_number}</Text>
            <Text style={styles.sharingType}>{item.sharing_type_name}</Text>
            {item.floor ? <Text style={styles.floor}>Floor {item.floor}</Text> : null}
          </View>
          <View style={styles.rateBox}>
            <Text style={styles.rate}>₹{Number(item.monthly_rate).toLocaleString('en-IN')}</Text>
            <Text style={styles.rateLabel}>/ month</Text>
          </View>
        </View>

        {/* Bed occupancy bar */}
        <View style={styles.bedBar}>
          <View style={[styles.bedBarFill, { flex: item.total_beds - item.vacant_beds, backgroundColor: Colors.occupied + 'CC' }]} />
          <View style={[styles.bedBarFill, { flex: item.vacant_beds, backgroundColor: Colors.vacant + 'CC' }]} />
        </View>

        {/* Bed counts */}
        <View style={styles.bedStats}>
          <View style={styles.bedStat}>
            <View style={[styles.dot, { backgroundColor: Colors.occupied }]} />
            <Text style={styles.bedStatText}>{item.total_beds - item.vacant_beds} occupied</Text>
          </View>
          <View style={styles.bedStat}>
            <View style={[styles.dot, { backgroundColor: Colors.vacant }]} />
            <Text style={styles.bedStatText}>{item.vacant_beds} vacant</Text>
          </View>
          <Text style={styles.totalBeds}>{item.total_beds} beds total</Text>
        </View>

        {/* Vacant highlight badge */}
        {item.vacant_beds > 0 && (
          <View style={styles.vacantBadge}>
            <Text style={styles.vacantBadgeText}>
              {item.vacant_beds} bed{item.vacant_beds > 1 ? 's' : ''} available
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer>
      {isLoading ? (
        <ScreenContainer loading />
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderRoom}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: Spacing[3] }} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={
            <EmptyState icon="🏨" message="No rooms yet" subtitle="Add rooms from Settings." />
          }
        />
      )}

      {user?.role === 'owner' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('RoomCreate')}
        >
          <Text style={styles.fabText}>+ Add Room</Text>
        </TouchableOpacity>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing[4], paddingBottom: 100 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    gap: Spacing[3],
    ...Shadow.md,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  roomNumber: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, color: Colors.textPrimary },
  sharingType: { fontSize: Typography.fontSize.base, color: Colors.textSecondary },
  floor: { fontSize: Typography.fontSize.sm, color: Colors.textMuted },
  rateBox: { alignItems: 'flex-end' },
  rate: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, color: Colors.primary },
  rateLabel: { fontSize: Typography.fontSize.xs, color: Colors.textMuted },

  bedBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: Colors.gray100 },
  bedBarFill: { height: '100%' },

  bedStats: { flexDirection: 'row', alignItems: 'center', gap: Spacing[4] },
  bedStat: { flexDirection: 'row', alignItems: 'center', gap: Spacing[1] },
  dot: { width: 8, height: 8, borderRadius: 4 },
  bedStatText: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  totalBeds: { fontSize: Typography.fontSize.sm, color: Colors.textMuted, marginLeft: 'auto' },

  vacantBadge: {
    backgroundColor: Colors.vacantBg,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.vacant + '40',
  },
  vacantBadgeText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.vacant,
  },

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
