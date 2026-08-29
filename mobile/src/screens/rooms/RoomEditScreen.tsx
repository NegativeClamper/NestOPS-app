import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { roomsApi } from '../../api/rooms';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';

export default function RoomEditScreen({ route, navigation }: any) {
  const { id } = route.params;
  const queryClient = useQueryClient();

  // ── Fetch existing room data ────────────────────────────────────────────────
  const { data: room, isLoading } = useQuery({
    queryKey: ['room', id],
    queryFn: () => roomsApi.get(id),
  });

  const { data: sharingTypes = [] } = useQuery({
    queryKey: ['sharing-types'],
    queryFn: roomsApi.getSharingTypes,
  });

  // ── Form state — pre-filled once room loads ─────────────────────────────────
  const [roomNumber, setRoomNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedSharingTypeId, setSelectedSharingTypeId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (room) {
      setRoomNumber(room.room_number);
      setFloor(room.floor || '');
      setNotes(room.notes || '');
      setSelectedSharingTypeId(
        typeof room.sharing_type === 'number' ? room.sharing_type : null,
      );
    }
  }, [room]);

  // ── Over-capacity warning (non-blocking) ────────────────────────────────────
  const selectedST = sharingTypes.find((s) => s.id === selectedSharingTypeId);
  const totalBeds = room?.total_beds ?? 0;
  const isOverCapacity = selectedST != null && totalBeds > selectedST.max_occupants;

  // ── Save mutation ───────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: (data: any) => roomsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['room', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Alert.alert('✅ Saved', 'Room details updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (error: any) => {
      const data = error?.response?.data;
      if (data && typeof data === 'object') {
        const fieldErrors: Record<string, string> = {};
        Object.entries(data).forEach(([k, v]) => {
          fieldErrors[k] = Array.isArray(v) ? v[0] : String(v);
        });
        setErrors(fieldErrors);
      } else {
        Alert.alert('Error', 'Failed to update room. Please try again.');
      }
    },
  });

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!roomNumber.trim()) e.room_number = 'Room number is required.';
    if (!selectedSharingTypeId) e.sharing_type = 'Please select a sharing type.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    mutation.mutate({
      room_number: roomNumber.trim(),
      sharing_type: selectedSharingTypeId,
      floor: floor.trim(),
      notes: notes.trim(),
    });
  };

  // ── Loading state while fetching existing data ──────────────────────────────
  if (isLoading || !room) return <ScreenContainer loading />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>

      {/* Room Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Room Details</Text>
        <Input
          label="Room Number *"
          value={roomNumber}
          onChangeText={setRoomNumber}
          placeholder="e.g. 101, G-3, A1"
          error={errors.room_number}
          autoCapitalize="characters"
        />
        <Input
          label="Floor"
          value={floor}
          onChangeText={setFloor}
          placeholder="e.g. Ground, 1st, 2nd"
        />
        <Input
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Any notes about this room…"
          multiline
          numberOfLines={2}
        />
      </View>

      {/* Sharing Type */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sharing Type *</Text>
        {errors.sharing_type && <Text style={styles.errorText}>{errors.sharing_type}</Text>}
        {sharingTypes.length === 0 ? (
          <View style={styles.noSharingTypes}>
            <Text style={styles.noSharingTypesText}>
              No sharing types configured. Create them in Settings → Fee Tiers first.
            </Text>
          </View>
        ) : (
          <View style={styles.sharingTypeGrid}>
            {sharingTypes.map((st) => (
              <TouchableOpacity
                key={st.id}
                style={[
                  styles.sharingChip,
                  selectedSharingTypeId === st.id && styles.sharingChipActive,
                ]}
                onPress={() => setSelectedSharingTypeId(st.id)}
              >
                <Text style={[styles.sharingName, selectedSharingTypeId === st.id && styles.sharingNameActive]}>
                  {st.name}
                </Text>
                <Text style={[styles.sharingRate, selectedSharingTypeId === st.id && styles.sharingRateActive]}>
                  ₹{Number(st.monthly_rate).toLocaleString('en-IN')}/mo
                </Text>
                <Text style={[styles.sharingCapacity, selectedSharingTypeId === st.id && styles.sharingCapacityActive]}>
                  Up to {st.max_occupants} occupant{st.max_occupants > 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Over-capacity warning — shown but does NOT block save */}
        {isOverCapacity && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ This room has {totalBeds} bed{totalBeds > 1 ? 's' : ''}, which exceeds the selected
              sharing type's max of {selectedST!.max_occupants} occupant{selectedST!.max_occupants > 1 ? 's' : ''}.
              You can still save — resolve bed assignments separately.
            </Text>
          </View>
        )}
      </View>

      {/* Beds are intentionally not shown or editable here */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          🛏 This room has <Text style={styles.infoTextBold}>{totalBeds} bed{totalBeds !== 1 ? 's' : ''}</Text>.
          Bed management (adding beds) is done from the Room Detail screen.
        </Text>
      </View>

      <Button
        title={mutation.isPending ? 'Saving…' : 'Save Changes'}
        onPress={handleSave}
        loading={mutation.isPending}
        fullWidth
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing[4], gap: Spacing[5], paddingBottom: Spacing[12] },

  section: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    gap: Spacing[4],
    ...Shadow.sm,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  errorText: { fontSize: Typography.fontSize.sm, color: Colors.danger },

  noSharingTypes: {
    backgroundColor: Colors.warningLight,
    borderRadius: BorderRadius.md,
    padding: Spacing[3],
  },
  noSharingTypesText: { fontSize: Typography.fontSize.sm, color: Colors.warning },

  sharingTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[3] },
  sharingChip: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    gap: 2,
    minWidth: '46%',
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  sharingChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '08' },
  sharingName: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold, color: Colors.textPrimary },
  sharingNameActive: { color: Colors.primary },
  sharingRate: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  sharingRateActive: { color: Colors.primaryLight },
  sharingCapacity: { fontSize: Typography.fontSize.xs, color: Colors.textMuted },
  sharingCapacityActive: { color: Colors.textMuted },

  warningBox: {
    backgroundColor: Colors.warningLight,
    borderRadius: BorderRadius.md,
    padding: Spacing[3],
  },
  warningText: { fontSize: Typography.fontSize.sm, color: Colors.accentDark, lineHeight: 20 },

  infoBox: {
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    padding: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoText: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  infoTextBold: { fontWeight: Typography.fontWeight.semibold, color: Colors.textPrimary },
});
