import React, { useState } from 'react';
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
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';

interface BedEntry {
  label: string;
}

export default function RoomCreateScreen({ navigation }: any) {
  const queryClient = useQueryClient();

  const [roomNumber, setRoomNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedSharingTypeId, setSelectedSharingTypeId] = useState<number | null>(null);
  const [beds, setBeds] = useState<BedEntry[]>([{ label: 'A' }]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: sharingTypes = [] } = useQuery({
    queryKey: ['sharing-types'],
    queryFn: roomsApi.getSharingTypes,
  });

  const selectedST = sharingTypes.find((s) => s.id === selectedSharingTypeId);

  // Room create mutation
  const roomMutation = useMutation({
    mutationFn: (data: any) => roomsApi.create(data),
    onSuccess: async (room) => {
      // Create beds for this room
      await Promise.all(
        beds.filter((b) => b.label.trim()).map((b) =>
          roomsApi.createBedForRoom(room.id, b.label.trim()),
        ),
      );
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Alert.alert('✅ Room Created', `Room ${roomNumber} added with ${beds.length} bed(s).`, [
        { text: 'View', onPress: () => navigation.replace('RoomDetail', { id: room.id }) },
        { text: 'Add Another', onPress: () => navigation.replace('RoomCreate') },
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
        Alert.alert('Error', 'Failed to create room.');
      }
    },
  });

  const addBed = () => {
    const nextLabel = String.fromCharCode(65 + beds.length); // A, B, C...
    setBeds([...beds, { label: nextLabel }]);
  };

  const removeBed = (idx: number) => {
    if (beds.length === 1) return;
    setBeds(beds.filter((_, i) => i !== idx));
  };

  const updateBedLabel = (idx: number, label: string) => {
    setBeds(beds.map((b, i) => (i === idx ? { ...b, label } : b)));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!roomNumber.trim()) e.room_number = 'Room number is required.';
    if (!selectedSharingTypeId) e.sharing_type = 'Please select a sharing type.';
    const hasDupeLabels = beds.some(
      (b, i) => beds.findIndex((x) => x.label.trim() === b.label.trim()) !== i,
    );
    if (hasDupeLabels) e.beds = 'Bed labels must be unique within this room.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = () => {
    if (!validate()) return;
    roomMutation.mutate({
      room_number: roomNumber.trim(),
      sharing_type: selectedSharingTypeId,
      floor: floor.trim(),
      notes: notes.trim(),
    });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Room Info */}
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
      </View>

      {/* Beds */}
      <View style={styles.section}>
        <View style={styles.bedHeader}>
          <Text style={styles.sectionTitle}>Beds ({beds.length})</Text>
          <TouchableOpacity onPress={addBed} style={styles.addBedBtn}>
            <Text style={styles.addBedText}>+ Add Bed</Text>
          </TouchableOpacity>
        </View>
        {errors.beds && <Text style={styles.errorText}>{errors.beds}</Text>}
        {beds.map((bed, idx) => (
          <View key={idx} style={styles.bedRow}>
            <Input
              containerStyle={styles.bedInput}
              label={`Bed ${idx + 1} label`}
              value={bed.label}
              onChangeText={(v) => updateBedLabel(idx, v)}
              placeholder="e.g. A, B, Top, Bottom"
              autoCapitalize="characters"
            />
            {beds.length > 1 && (
              <TouchableOpacity style={styles.removeBedBtn} onPress={() => removeBed(idx)}>
                <Text style={styles.removeBedText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        {selectedST && beds.length > selectedST.max_occupants && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ You've added more beds than the sharing type's max occupants ({selectedST.max_occupants}).
            </Text>
          </View>
        )}
      </View>

      <Button
        title={roomMutation.isPending ? 'Creating…' : 'Create Room'}
        onPress={handleCreate}
        loading={roomMutation.isPending}
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

  bedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addBedBtn: { backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.md, paddingHorizontal: Spacing[3], paddingVertical: Spacing[1] + 2 },
  addBedText: { fontSize: Typography.fontSize.sm, color: Colors.white, fontWeight: Typography.fontWeight.semibold },

  bedRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing[3] },
  bedInput: { flex: 1 },
  removeBedBtn: {
    width: 36,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dangerLight,
    borderRadius: BorderRadius.md,
    marginBottom: 0,
  },
  removeBedText: { fontSize: 16, color: Colors.danger, fontWeight: Typography.fontWeight.bold },

  warningBox: {
    backgroundColor: Colors.warningLight,
    borderRadius: BorderRadius.md,
    padding: Spacing[3],
  },
  warningText: { fontSize: Typography.fontSize.sm, color: Colors.accentDark },
});
