import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { residentsApi } from '../../api/residents';
import { roomsApi, Bed } from '../../api/rooms';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';

export default function ResidentEditScreen({ route, navigation }: any) {
  const { id } = route.params;
  const queryClient = useQueryClient();

  const { data: resident, isLoading } = useQuery({
    queryKey: ['resident', id],
    queryFn: () => residentsApi.get(id),
  });

  const { data: vacantBeds = [] } = useQuery({
    queryKey: ['vacant-beds'],
    queryFn: roomsApi.getVacantBeds,
  });

  // Form state — pre-filled from resident
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedBedId, setSelectedBedId] = useState<number | null>(null);
  const [selectedBedLabel, setSelectedBedLabel] = useState<string>('');
  const [showBedPicker, setShowBedPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (resident) {
      setName(resident.name);
      setPhone(resident.phone);
      setParentName(resident.parent_name || '');
      setParentPhone(resident.parent_phone || '');
      setCheckInDate(resident.check_in_date);
      setNotes(resident.notes || '');
      if (resident.bed) {
        setSelectedBedId(resident.bed);
        setSelectedBedLabel(`Room ${resident.room_number} — Bed ${resident.bed_label}`);
      }
    }
  }, [resident]);

  const mutation = useMutation({
    mutationFn: (formData: FormData) => residentsApi.update(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      queryClient.invalidateQueries({ queryKey: ['resident', id] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['vacant-beds'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Alert.alert('✅ Saved', 'Resident details updated.', [
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
        Alert.alert('Error', 'Failed to update resident.');
      }
    },
  });

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required.';
    if (!phone.trim()) e.phone = 'Phone is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('phone', phone.trim());
    formData.append('parent_name', parentName.trim());
    formData.append('parent_phone', parentPhone.trim());
    formData.append('check_in_date', checkInDate);
    formData.append('notes', notes.trim());
    if (selectedBedId) formData.append('bed', String(selectedBedId));
    mutation.mutate(formData);
  };

  // Move the loading check UP here
  if (isLoading) return <ScreenContainer loading><></></ScreenContainer>;

  // 1. Extract the actual array, whether it's raw or hiding inside DRF's 'results'
  const safeVacantBeds = Array.isArray(vacantBeds) 
    ? vacantBeds 
    : ((vacantBeds as any)?.results || []);

  // 2. Safely spread the guaranteed array
  const availableBeds: Bed[] = [
    ...safeVacantBeds,
    // Add the current bed logic here if you have it
  ];


  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <Input label="Full Name *" value={name} onChangeText={setName} error={errors.name} autoCapitalize="words" />
          <Input label="Phone *" value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={errors.phone} />
          <Input label="Parent Name" value={parentName} onChangeText={setParentName} autoCapitalize="words" />
          <Input label="Parent Phone" value={parentPhone} onChangeText={setParentPhone} keyboardType="phone-pad" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Room Assignment</Text>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Bed</Text>
            <TouchableOpacity style={styles.bedPickerBtn} onPress={() => setShowBedPicker(true)}>
              <Text style={selectedBedId ? styles.bedPickerValue : styles.bedPickerPlaceholder}>
                {selectedBedLabel || 'Select a bed…'}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            {selectedBedId && (
              <TouchableOpacity onPress={() => { setSelectedBedId(null); setSelectedBedLabel(''); }}>
                <Text style={styles.clearBed}>✕ Remove bed assignment</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stay Details</Text>
          <Input label="Check-In Date *" value={checkInDate} onChangeText={setCheckInDate} placeholder="YYYY-MM-DD" />
          <Input label="Notes" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />
        </View>

        <Button title={mutation.isPending ? 'Saving…' : 'Save Changes'} onPress={handleSave} loading={mutation.isPending} fullWidth />
      </ScrollView>

      <Modal visible={showBedPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select a Bed</Text>
            <TouchableOpacity onPress={() => setShowBedPicker(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={availableBeds}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.bedList}
            ListEmptyComponent={
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>No vacant beds available.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.bedItem, selectedBedId === item.id && styles.bedItemSelected]}
                onPress={() => {
                  setSelectedBedId(item.id);
                  setSelectedBedLabel(`Room ${item.room_number} — Bed ${item.bed_label}`);
                  setShowBedPicker(false);
                }}
              >
                <Text style={styles.bedItemRoom}>Room {item.room_number} — Bed {item.bed_label}</Text>
                <Text style={styles.bedItemType}>{item.sharing_type}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing[4], gap: Spacing[5], paddingBottom: Spacing[12] },
  section: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing[4], gap: Spacing[4], ...Shadow.sm },
  sectionTitle: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.bold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  fieldGroup: { gap: Spacing[2] },
  fieldLabel: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium, color: Colors.textPrimary },
  bedPickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing[3], paddingVertical: Spacing[3], minHeight: 52, backgroundColor: Colors.white },
  bedPickerValue: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.medium, color: Colors.textPrimary },
  bedPickerPlaceholder: { fontSize: Typography.fontSize.base, color: Colors.gray400 },
  chevron: { fontSize: 22, color: Colors.gray400 },
  clearBed: { fontSize: Typography.fontSize.sm, color: Colors.danger },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing[5], borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  modalTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, color: Colors.textPrimary },
  modalClose: { fontSize: 22, color: Colors.textSecondary },
  modalEmpty: { flex: 1, alignItems: 'center', padding: Spacing[8] },
  modalEmptyText: { fontSize: Typography.fontSize.base, color: Colors.textSecondary },
  bedList: { padding: Spacing[4], gap: Spacing[2] },
  bedItem: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing[4], borderWidth: 1.5, borderColor: Colors.border, ...Shadow.sm },
  bedItemSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '08' },
  bedItemRoom: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold, color: Colors.textPrimary },
  bedItemType: { fontSize: Typography.fontSize.sm, color: Colors.textMuted, marginTop: 2 },
});
