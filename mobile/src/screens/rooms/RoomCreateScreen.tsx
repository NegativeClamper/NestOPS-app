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
import { hostelsApi, Hostel } from '../../api/hostels';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';
import { FlatList, Modal } from 'react-native';

interface BedEntry {
  label: string;
}

export default function RoomCreateScreen({ navigation }: any) {
  const queryClient = useQueryClient();

  const [roomNumber, setRoomNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedSharingTypeId, setSelectedSharingTypeId] = useState<number | null>(null);
  const [selectedHostel, setSelectedHostel] = useState<Hostel | null>(null);
  const [showHostelPicker, setShowHostelPicker] = useState(false);
  const [beds, setBeds] = useState<BedEntry[]>([{ label: 'A' }]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: sharingTypes = [] } = useQuery({
    queryKey: ['sharing-types'],
    queryFn: roomsApi.getSharingTypes,
  });

  const { data: hostels = [] } = useQuery({
    queryKey: ['hostels'],
    queryFn: hostelsApi.list,
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
    if (!selectedHostel) e.hostel = 'Please select a hostel.';
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
      hostel: selectedHostel?.id,
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

      {/* Hostel Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hostel *</Text>
        <TouchableOpacity
          style={[styles.pickerBtn, errors.hostel ? styles.pickerBtnError : null]}
          onPress={() => setShowHostelPicker(true)}
        >
          {selectedHostel ? (
            <View>
              <Text style={styles.pickerValue}>{selectedHostel.name}</Text>
            </View>
          ) : (
            <Text style={styles.pickerPlaceholder}>Select a hostel…</Text>
          )}
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        {errors.hostel ? <Text style={styles.errorText}>{errors.hostel}</Text> : null}
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
      
      {/* Hostel Picker Modal */}
      <Modal visible={showHostelPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Hostel</Text>
            <TouchableOpacity onPress={() => setShowHostelPicker(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={hostels}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.hostelList}
            ItemSeparatorComponent={() => <View style={{ height: Spacing[2] }} />}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.hostelItem,
                  selectedHostel?.id === item.id && styles.hostelItemSelected,
                ]}
                onPress={() => {
                  setSelectedHostel(item);
                  setShowHostelPicker(false);
                  if (errors.hostel) setErrors(e => ({ ...e, hostel: '' }));
                }}
              >
                <View style={styles.hostelItemLeft}>
                  <Text style={styles.hostelItemName}>{item.name}</Text>
                  <Text style={styles.hostelItemSub}>
                    {item.gender === 'boys' ? '👦 Boys' : '👧 Girls'} · ₹{item.monthly_rate}/mo
                  </Text>
                </View>
                {selectedHostel?.id === item.id && (
                  <Text style={styles.hostelCheckmark}>✓</Text>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
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

  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
    minHeight: 54,
    backgroundColor: Colors.white,
  },
  pickerBtnError: { borderColor: Colors.danger },
  pickerValue: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.medium, color: Colors.textPrimary },
  pickerPlaceholder: { fontSize: Typography.fontSize.base, color: Colors.gray400 },
  chevron: { fontSize: 22, color: Colors.gray400 },

  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  modalTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, color: Colors.textPrimary },
  modalClose: { fontSize: 22, color: Colors.textSecondary, padding: Spacing[1] },

  hostelList: { padding: Spacing[4], paddingBottom: Spacing[10] },
  hostelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  hostelItemSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '08' },
  hostelItemLeft: { gap: 2, flex: 1 },
  hostelItemName: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, color: Colors.textPrimary },
  hostelItemSub: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  hostelCheckmark: { fontSize: Typography.fontSize.base, color: Colors.primary, fontWeight: Typography.fontWeight.bold },
});
