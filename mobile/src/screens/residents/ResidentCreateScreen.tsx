import React, { useState } from 'react';
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
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';

export default function ResidentCreateScreen({ navigation }: any) {
  const queryClient = useQueryClient();

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [idProof, setIdProof] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [showBedPicker, setShowBedPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch vacant beds for picker
  const { data: vacantBeds = [], isLoading: loadingBeds } = useQuery({
    queryKey: ['vacant-beds'],
    queryFn: roomsApi.getVacantBeds,
  });

  const mutation = useMutation({
    mutationFn: (formData: FormData) => residentsApi.create(formData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['vacant-beds'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Alert.alert('✅ Resident Added', `${name} has been added successfully.`, [
        { text: 'View', onPress: () => navigation.replace('ResidentDetail', { id: data.id }) },
        { text: 'Add Another', onPress: () => navigation.replace('ResidentCreate') },
      ]);
    },
    onError: (error: any) => {
      const data = error?.response?.data;
      if (data && typeof data === 'object') {
        // Map field-level validation errors
        const fieldErrors: Record<string, string> = {};
        Object.entries(data).forEach(([k, v]) => {
          fieldErrors[k] = Array.isArray(v) ? v[0] : String(v);
        });
        setErrors(fieldErrors);
      } else {
        Alert.alert('Error', data?.detail || 'Failed to add resident.');
      }
    },
  });

  const pickIdProof = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setIdProof({
        uri: asset.uri,
        name: asset.fileName || 'id_proof.jpg',
        type: asset.mimeType || 'image/jpeg',
      });
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required.';
    if (!phone.trim()) e.phone = 'Phone number is required.';
    else if (!/^\d{10,15}$/.test(phone.replace(/\s/g, ''))) e.phone = 'Enter a valid phone number.';
    if (!checkInDate) e.check_in_date = 'Check-in date is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('phone', phone.trim());
    if (parentName) formData.append('parent_name', parentName.trim());
    if (parentPhone) formData.append('parent_phone', parentPhone.trim());
    formData.append('check_in_date', checkInDate);
    if (notes) formData.append('notes', notes.trim());
    if (selectedBed) formData.append('bed', String(selectedBed.id));
    if (idProof) {
      formData.append('id_proof', { uri: idProof.uri, name: idProof.name, type: idProof.type } as any);
    }
    mutation.mutate(formData);
  };

  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {/* Section: Personal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <Input
            label="Full Name *"
            value={name}
            onChangeText={setName}
            placeholder="Resident's full name"
            error={errors.name}
            autoCapitalize="words"
          />
          <Input
            label="Phone Number *"
            value={phone}
            onChangeText={setPhone}
            placeholder="10-digit mobile number"
            keyboardType="phone-pad"
            error={errors.phone}
          />
          <Input
            label="Parent / Guardian Name"
            value={parentName}
            onChangeText={setParentName}
            placeholder="Optional"
            autoCapitalize="words"
          />
          <Input
            label="Parent / Guardian Phone"
            value={parentPhone}
            onChangeText={setParentPhone}
            placeholder="Optional"
            keyboardType="phone-pad"
          />
        </View>

        {/* Section: Room Assignment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Room Assignment</Text>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Bed</Text>
            <TouchableOpacity
              style={[styles.bedPickerBtn, errors.bed && styles.errorBorder]}
              onPress={() => setShowBedPicker(true)}
            >
              {selectedBed ? (
                <View>
                  <Text style={styles.bedPickerValue}>
                    Room {selectedBed.room_number} — Bed {selectedBed.bed_label}
                  </Text>
                  <Text style={styles.bedPickerSub}>{selectedBed.sharing_type}</Text>
                </View>
              ) : (
                <Text style={styles.bedPickerPlaceholder}>
                  {loadingBeds ? 'Loading vacant beds…' : `Select a bed (${vacantBeds.length} vacant)`}
                </Text>
              )}
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            {selectedBed && (
              <TouchableOpacity onPress={() => setSelectedBed(null)}>
                <Text style={styles.clearBed}>✕ Clear bed selection</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Section: Stay Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stay Details</Text>
          <Input
            label="Check-In Date *"
            value={checkInDate}
            onChangeText={setCheckInDate}
            placeholder="YYYY-MM-DD"
            hint="Format: YYYY-MM-DD"
            error={errors.check_in_date}
          />
          <Input
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Any notes about this resident…"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Section: ID Proof */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ID Proof</Text>
          <TouchableOpacity style={styles.idPickerBtn} onPress={pickIdProof}>
            {idProof ? (
              <Text style={styles.idFileName}>📎 {idProof.name}</Text>
            ) : (
              <>
                <Text style={styles.idPickerIcon}>🪪</Text>
                <Text style={styles.idPickerText}>Attach Aadhaar / ID photo</Text>
                <Text style={styles.idPickerSub}>Optional — tap to select from gallery</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Button
          title={mutation.isPending ? 'Adding Resident…' : 'Add Resident'}
          onPress={handleSubmit}
          loading={mutation.isPending}
          fullWidth
        />
      </ScrollView>

      {/* Bed Picker Modal */}
      <Modal visible={showBedPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select a Vacant Bed</Text>
            <TouchableOpacity onPress={() => setShowBedPicker(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          {vacantBeds.length === 0 ? (
            <View style={styles.modalEmpty}>
              <Text style={styles.modalEmptyIcon}>🛏️</Text>
              <Text style={styles.modalEmptyText}>No vacant beds available.</Text>
              <Text style={styles.modalEmptySub}>Add more beds from the Rooms screen.</Text>
            </View>
          ) : (
            <FlatList
              data={vacantBeds}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.bedList}
              ItemSeparatorComponent={() => <View style={{ height: Spacing[2] }} />}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.bedItem,
                    selectedBed?.id === item.id && styles.bedItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedBed(item);
                    setShowBedPicker(false);
                  }}
                >
                  <View style={styles.bedItemLeft}>
                    <Text style={styles.bedItemRoom}>Room {item.room_number}</Text>
                    <Text style={styles.bedItemLabel}>Bed {item.bed_label}</Text>
                  </View>
                  <View style={styles.bedItemRight}>
                    <Text style={styles.bedItemType}>{item.sharing_type}</Text>
                    <View style={styles.vacantDot} />
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>
    </>
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
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  fieldGroup: { gap: Spacing[2] },
  fieldLabel: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium, color: Colors.textPrimary },

  bedPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
    minHeight: 52,
    backgroundColor: Colors.white,
  },
  errorBorder: { borderColor: Colors.danger },
  bedPickerValue: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.medium, color: Colors.textPrimary },
  bedPickerSub: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  bedPickerPlaceholder: { fontSize: Typography.fontSize.base, color: Colors.gray400 },
  chevron: { fontSize: 22, color: Colors.gray400 },
  clearBed: { fontSize: Typography.fontSize.sm, color: Colors.danger, marginTop: 4 },

  idPickerBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing[5],
    alignItems: 'center',
    gap: Spacing[1],
  },
  idPickerIcon: { fontSize: 32 },
  idPickerText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.medium, color: Colors.textPrimary },
  idPickerSub: { fontSize: Typography.fontSize.sm, color: Colors.textMuted },
  idFileName: { fontSize: Typography.fontSize.base, color: Colors.primary, fontWeight: Typography.fontWeight.medium },

  // Modal
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

  modalEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing[2] },
  modalEmptyIcon: { fontSize: 48 },
  modalEmptyText: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.semibold, color: Colors.textSecondary },
  modalEmptySub: { fontSize: Typography.fontSize.sm, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: Spacing[8] },

  bedList: { padding: Spacing[4], paddingBottom: Spacing[10] },
  bedItem: {
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
  bedItemSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '08' },
  bedItemLeft: { gap: 2 },
  bedItemRoom: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, color: Colors.textPrimary },
  bedItemLabel: { fontSize: Typography.fontSize.base, color: Colors.textSecondary },
  bedItemRight: { alignItems: 'flex-end', gap: Spacing[1] },
  bedItemType: { fontSize: Typography.fontSize.sm, color: Colors.textMuted },
  vacantDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.vacant },
});
