import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomsApi } from '../../api/rooms';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';
import { useAuthStore } from '../../store/authStore';

export default function RoomDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data: room, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['room', id],
    queryFn: () => roomsApi.get(id),
  });

  if (isLoading || !room) return <ScreenContainer loading />;

  const { beds = [] } = room;
  const occupiedBeds = beds.filter((b) => b.status === 'occupied');
  const vacantBeds = beds.filter((b) => b.status === 'vacant');

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      {/* Room header */}
      <View style={styles.headerCard}>
        <View style={styles.headerLeft}>
          <Text style={styles.roomNumber}>Room {room.room_number}</Text>
          <Text style={styles.sharingType}>{room.sharing_type_name}</Text>
          {room.floor ? <Text style={styles.floor}>Floor {room.floor}</Text> : null}
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.rate}>₹{Number(room.monthly_rate).toLocaleString('en-IN')}</Text>
          <Text style={styles.rateLabel}>per month</Text>
        </View>
      </View>

      {/* Occupancy summary */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: Colors.occupiedBg }]}>
          <Text style={[styles.statNum, { color: Colors.occupied }]}>{occupiedBeds.length}</Text>
          <Text style={styles.statLabel}>Occupied</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: Colors.vacantBg }]}>
          <Text style={[styles.statNum, { color: Colors.vacant }]}>{vacantBeds.length}</Text>
          <Text style={styles.statLabel}>Vacant</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: Colors.gray100 }]}>
          <Text style={[styles.statNum, { color: Colors.textPrimary }]}>{beds.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {/* Bed grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Beds</Text>
        <View style={styles.bedGrid}>
          {beds.map((bed) => {
            const isOccupied = bed.status === 'occupied';
            return (
              <TouchableOpacity
                key={bed.id}
                style={[
                  styles.bedCard,
                  isOccupied ? styles.bedOccupied : styles.bedVacant,
                ]}
                onPress={() => {
                  if (isOccupied && bed.resident_id) {
                    navigation.navigate('Residents', {
                      screen: 'ResidentDetail',
                      params: { id: bed.resident_id },
                    });
                  }
                }}
                activeOpacity={isOccupied ? 0.7 : 1}
              >
                {/* Bed label */}
                <Text style={[styles.bedLabel, isOccupied ? styles.bedLabelOccupied : styles.bedLabelVacant]}>
                  {bed.bed_label}
                </Text>

                {/* Status indicator */}
                <View style={[styles.statusDot, { backgroundColor: isOccupied ? Colors.occupied : Colors.vacant }]} />

                {/* Resident name or "Vacant" */}
                <Text
                  style={[styles.bedOccupantText, isOccupied ? styles.occupiedText : styles.vacantText]}
                  numberOfLines={2}
                >
                  {isOccupied ? (bed.resident_name || 'Occupied') : 'Vacant'}
                </Text>

                {/* Tap hint for occupied */}
                {isOccupied && (
                  <Text style={styles.tapHint}>Tap to view →</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {beds.length === 0 && (
          <View style={styles.emptyBeds}>
            <Text style={styles.emptyBedsText}>No beds added to this room yet.</Text>
          </View>
        )}
      </View>

      {/* Notes */}
      {room.notes ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notesText}>{room.notes}</Text>
        </View>
      ) : null}

      {/* Owner-only actions */}
      {user?.role === 'owner' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('RoomEdit', { id })}
          >
            <Text style={styles.actionBtnText}>✏️ Edit Room</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing[4], gap: Spacing[4], paddingBottom: Spacing[12] },

  headerCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing[5],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: { gap: 2 },
  roomNumber: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, color: Colors.white },
  sharingType: { fontSize: Typography.fontSize.base, color: Colors.gray300 },
  floor: { fontSize: Typography.fontSize.sm, color: Colors.gray400 },
  headerRight: { alignItems: 'flex-end' },
  rate: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, color: Colors.accentLight },
  rateLabel: { fontSize: Typography.fontSize.xs, color: Colors.gray300 },

  statsRow: { flexDirection: 'row', gap: Spacing[3] },
  statBox: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing[3],
    alignItems: 'center',
    gap: 2,
  },
  statNum: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold },
  statLabel: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary, fontWeight: Typography.fontWeight.medium },

  section: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    gap: Spacing[3],
    ...Shadow.sm,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  bedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[3],
  },
  bedCard: {
    width: '47%',
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    gap: Spacing[1],
    borderWidth: 1.5,
    minHeight: 100,
    justifyContent: 'space-between',
  },
  bedOccupied: {
    backgroundColor: Colors.occupiedBg,
    borderColor: Colors.occupied + '50',
  },
  bedVacant: {
    backgroundColor: Colors.vacantBg,
    borderColor: Colors.vacant + '50',
  },
  bedLabel: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.extrabold,
  },
  bedLabelOccupied: { color: Colors.occupied },
  bedLabelVacant: { color: Colors.vacant },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    alignSelf: 'flex-end',
    marginTop: -24,
  },
  bedOccupantText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  occupiedText: { color: Colors.textPrimary },
  vacantText: { color: Colors.vacant },
  tapHint: { fontSize: 10, color: Colors.textMuted },

  emptyBeds: { alignItems: 'center', paddingVertical: Spacing[5] },
  emptyBedsText: { fontSize: Typography.fontSize.base, color: Colors.textSecondary },

  notesText: { fontSize: Typography.fontSize.base, color: Colors.textSecondary, lineHeight: 22 },

  actions: { gap: Spacing[3] },
  actionBtn: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  actionBtnText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: Colors.primary },
});
