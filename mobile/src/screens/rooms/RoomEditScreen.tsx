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
import { roomsApi, Bed } from '../../api/rooms';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';

// ─── Local types ──────────────────────────────────────────────────────────────

/** A bed that exists on the server already. */
interface ExistingBed extends Bed {
  _pendingLabel: string; // tracks unsaved label edits
}

/** A bed the user has just added — not yet saved to server. */
interface NewBed {
  _key: string; // local-only uuid-ish key for React list
  label: string;
}

export default function RoomEditScreen({ route, navigation }: any) {
  const { id } = route.params;
  const queryClient = useQueryClient();

  // ── Remote data ─────────────────────────────────────────────────────────────
  const { data: room, isLoading } = useQuery({
    queryKey: ['room', id],
    queryFn: () => roomsApi.get(id),
  });

  const { data: sharingTypes = [] } = useQuery({
    queryKey: ['sharing-types'],
    queryFn: roomsApi.getSharingTypes,
  });

  // ── Room-level form state ────────────────────────────────────────────────────
  const [roomNumber, setRoomNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedSharingTypeId, setSelectedSharingTypeId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Bed state ────────────────────────────────────────────────────────────────
  const [existingBeds, setExistingBeds] = useState<ExistingBed[]>([]);
  const [newBeds, setNewBeds] = useState<NewBed[]>([]);
  const [deletedBedIds, setDeletedBedIds] = useState<Set<number>>(new Set());

  // Pre-fill everything from fetched room
  useEffect(() => {
    if (room) {
      setRoomNumber(room.room_number);
      setFloor(room.floor || '');
      setNotes(room.notes || '');
      setSelectedSharingTypeId(
        typeof room.sharing_type === 'number' ? room.sharing_type : null,
      );
      setExistingBeds(
        (room.beds ?? []).map((b) => ({ ...b, _pendingLabel: b.bed_label })),
      );
    }
  }, [room]);

  // ── Derived values ───────────────────────────────────────────────────────────
  const selectedST = sharingTypes.find((s) => s.id === selectedSharingTypeId);
  const visibleExistingBeds = existingBeds.filter((b) => !deletedBedIds.has(b.id));
  const totalBedCount = visibleExistingBeds.length + newBeds.length;
  const isOverCapacity = selectedST != null && totalBedCount > selectedST.max_occupants;

  // ── Bed helpers ──────────────────────────────────────────────────────────────

  const handleRelabelExisting = (bedId: number, label: string) => {
    setExistingBeds((prev) =>
      prev.map((b) => (b.id === bedId ? { ...b, _pendingLabel: label } : b)),
    );
  };

  const handleRemoveExisting = (bed: ExistingBed) => {
    if (bed.status === 'occupied') {
      // Safety net — UI should not show a remove button for occupied beds,
      // but guard here in case.
      Alert.alert(
        'Cannot Remove',
        `This bed is occupied by ${bed.resident_name ?? 'a resident'} — move or check them out before removing it.`,
      );
      return;
    }
    setDeletedBedIds((prev) => new Set(prev).add(bed.id));
  };

  const handleAddNewBed = () => {
    // Generate a label suggestion: next letter after all existing visible labels
    const allLabels = [
      ...visibleExistingBeds.map((b) => b._pendingLabel),
      ...newBeds.map((b) => b.label),
    ];
    const usedLetters = allLabels
      .map((l) => l.trim().toUpperCase())
      .filter((l) => l.length === 1 && l >= 'A' && l <= 'Z');
    let suggestion = '';
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(65 + i);
      if (!usedLetters.includes(letter)) {
        suggestion = letter;
        break;
      }
    }
    setNewBeds((prev) => [
      ...prev,
      { _key: `new-${Date.now()}-${Math.random()}`, label: suggestion },
    ]);
  };

  const handleRelabelNew = (key: string, label: string) => {
    setNewBeds((prev) => prev.map((b) => (b._key === key ? { ...b, label } : b)));
  };

  const handleRemoveNew = (key: string) => {
    setNewBeds((prev) => prev.filter((b) => b._key !== key));
  };

  // ── Validation ───────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!roomNumber.trim()) e.room_number = 'Room number is required.';
    if (!selectedSharingTypeId) e.sharing_type = 'Please select a sharing type.';
    // Check for duplicate labels across existing + new
    const allLabels = [
      ...visibleExistingBeds.map((b) => b._pendingLabel.trim().toLowerCase()),
      ...newBeds.map((b) => b.label.trim().toLowerCase()),
    ].filter(Boolean);
    const hasDupes = allLabels.length !== new Set(allLabels).size;
    if (hasDupes) e.beds = 'Bed labels must be unique within this room.';
    if (newBeds.some((b) => !b.label.trim())) e.beds = 'All new beds must have a label.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Save (room fields + bed changes) ─────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      // 1. Save room-level fields
      await roomsApi.update(id, {
        room_number: roomNumber.trim(),
        sharing_type: selectedSharingTypeId,
        floor: floor.trim(),
        notes: notes.trim(),
      });

      // 2. Delete removed beds (vacant only — server rejects occupied)
      for (const bedId of Array.from(deletedBedIds)) {
        try {
          await roomsApi.deleteBed(bedId);
        } catch (err: any) {
          const msg = err?.response?.data?.detail ?? 'Failed to remove a bed.';
          Alert.alert('Bed Removal Failed', msg);
          setIsSaving(false);
          return;
        }
      }

      // 3. Relabel changed existing beds
      for (const bed of existingBeds) {
        if (!deletedBedIds.has(bed.id) && bed._pendingLabel.trim() !== bed.bed_label) {
          await roomsApi.updateBed(bed.id, bed._pendingLabel.trim());
        }
      }

      // 4. Create new beds
      for (const nb of newBeds) {
        if (nb.label.trim()) {
          await roomsApi.createBedForRoom(id, nb.label.trim());
        }
      }

      // 5. Invalidate and go back
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['room', id] });
      queryClient.invalidateQueries({ queryKey: ['vacant-beds'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      Alert.alert('✅ Saved', 'Room updated successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      const data = err?.response?.data;
      if (data && typeof data === 'object') {
        const fieldErrors: Record<string, string> = {};
        Object.entries(data).forEach(([k, v]) => {
          fieldErrors[k] = Array.isArray(v) ? v[0] : String(v);
        });
        setErrors(fieldErrors);
      } else {
        Alert.alert('Error', 'Failed to update room. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (isLoading || !room) return <ScreenContainer loading />;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Room Details ─────────────────────────────────────────────────── */}
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

      {/* ── Sharing Type ─────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sharing Type *</Text>
        {errors.sharing_type && <Text style={styles.errorText}>{errors.sharing_type}</Text>}
        {sharingTypes.length === 0 ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
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

        {/* Over-capacity warning — shown but does not block save */}
        {isOverCapacity && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ This room has {totalBedCount} bed{totalBedCount > 1 ? 's' : ''}, which exceeds
              the selected sharing type's max of {selectedST!.max_occupants} occupant{selectedST!.max_occupants > 1 ? 's' : ''}.
              You can still save — resolve bed assignments separately.
            </Text>
          </View>
        )}
      </View>

      {/* ── Bed Management ───────────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.bedHeader}>
          <Text style={styles.sectionTitle}>Beds ({totalBedCount})</Text>
          <TouchableOpacity style={styles.addBedBtn} onPress={handleAddNewBed}>
            <Text style={styles.addBedText}>+ Add Bed</Text>
          </TouchableOpacity>
        </View>

        {errors.beds && <Text style={styles.errorText}>{errors.beds}</Text>}

        {/* Existing beds from server */}
        {visibleExistingBeds.map((bed) => {
          const isOccupied = bed.status === 'occupied';
          return (
            <View key={bed.id} style={styles.bedRow}>
              {/* Status dot */}
              <View style={[styles.statusDot, { backgroundColor: isOccupied ? Colors.occupied : Colors.vacant }]} />

              {/* Label input */}
              <Input
                containerStyle={styles.bedInput}
                label={isOccupied ? `Bed (occupied — ${bed.resident_name ?? 'resident'})` : 'Bed label'}
                value={bed._pendingLabel}
                onChangeText={(v) => handleRelabelExisting(bed.id, v)}
                placeholder="e.g. A, Top, Bottom"
                autoCapitalize="characters"
              />

              {/* Remove button — only for vacant beds */}
              {!isOccupied && (
                <TouchableOpacity
                  style={styles.removeBedBtn}
                  onPress={() => handleRemoveExisting(bed)}
                >
                  <Text style={styles.removeBedText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {/* New (unsaved) beds */}
        {newBeds.map((nb) => (
          <View key={nb._key} style={styles.bedRow}>
            <View style={[styles.statusDot, { backgroundColor: Colors.primary + '60' }]} />
            <Input
              containerStyle={styles.bedInput}
              label="New bed label"
              value={nb.label}
              onChangeText={(v) => handleRelabelNew(nb._key, v)}
              placeholder="e.g. A, Top, Bottom"
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.removeBedBtn} onPress={() => handleRemoveNew(nb._key)}>
              <Text style={styles.removeBedText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        {totalBedCount === 0 && (
          <View style={styles.emptyBeds}>
            <Text style={styles.emptyBedsText}>No beds yet — tap "+ Add Bed" to add one.</Text>
          </View>
        )}

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.occupied }]} />
            <Text style={styles.legendLabel}>Occupied — cannot remove</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.vacant }]} />
            <Text style={styles.legendLabel}>Vacant — can remove</Text>
          </View>
        </View>
      </View>

      <Button
        title={isSaving ? 'Saving…' : 'Save Changes'}
        onPress={handleSave}
        loading={isSaving}
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

  // Sharing type chip grid — identical to RoomCreateScreen
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

  // Bed management
  bedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addBedBtn: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1] + 2,
  },
  addBedText: { fontSize: Typography.fontSize.sm, color: Colors.white, fontWeight: Typography.fontWeight.semibold },

  bedRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing[2] },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: Spacing[4],   // aligns with the input bottom
    flexShrink: 0,
  },
  bedInput: { flex: 1 },
  removeBedBtn: {
    width: 36,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dangerLight,
    borderRadius: BorderRadius.md,
  },
  removeBedText: { fontSize: 16, color: Colors.danger, fontWeight: Typography.fontWeight.bold },

  emptyBeds: { alignItems: 'center', paddingVertical: Spacing[3] },
  emptyBedsText: { fontSize: Typography.fontSize.sm, color: Colors.textMuted },

  legend: { flexDirection: 'row', gap: Spacing[5], paddingTop: Spacing[1] },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: Typography.fontSize.xs, color: Colors.textMuted },
});
