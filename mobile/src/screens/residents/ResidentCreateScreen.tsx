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
import { hostelsApi, Hostel } from '../../api/hostels';
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
  const [joinDate, setJoinDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [selectedHostel, setSelectedHostel] = useState<Hostel | null>(null);
  const [showHostelPicker, setShowHostelPicker] = useState(false);
  const [idProof, setIdProof] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: hostels = [] } = useQuery({
    queryKey: ['hostels'],
    queryFn: hostelsApi.list,
  });

  const mutation = useMutation({
    mutationFn: (formData: FormData) => residentsApi.create(formData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Alert.alert('✅ Resident Added', `${name} has been added successfully.`, [
        { text: 'View', onPress: () => navigation.replace('ResidentDetail', { id: data.id }) },
        { text: 'Add Another', onPress: () => navigation.replace('ResidentCreate') },
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
    if (!selectedHostel) e.hostel = 'Please select a hostel.';
    if (!joinDate) e.check_in_date = 'Join date is required.';
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(joinDate)) e.check_in_date = 'Use YYYY-MM-DD format.';
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
    formData.append('check_in_date', joinDate);
    formData.append('hostel', String(selectedHostel!.id));
    if (notes) formData.append('notes', notes.trim());
    if (idProof) {
      formData.append('id_proof', { uri: idProof.uri, name: idProof.name, type: idProof.type } as any);
    }
    mutation.mutate(formData);
  };

  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>

        {/* Section: Hostel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hostel Assignment</Text>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Hostel *</Text>
            <TouchableOpacity
              style={[styles.pickerBtn, errors.hostel ? styles.pickerBtnError : null]}
              onPress={() => setShowHostelPicker(true)}
            >
              {selectedHostel ? (
                <View>
                  <Text style={styles.pickerValue}>{selectedHostel.name}</Text>
                  <Text style={styles.pickerSub}>
                    {selectedHostel.gender === 'boys' ? '👦 Boys' : '👧 Girls'} · ₹{selectedHostel.monthly_rate}/mo
                  </Text>
                </View>
              ) : (
                <Text style={styles.pickerPlaceholder}>Select a hostel…</Text>
              )}
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            {errors.hostel ? <Text style={styles.fieldError}>{errors.hostel}</Text> : null}
          </View>
        </View>

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

        {/* Section: Stay Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stay Details</Text>
          <Input
            label="Join Date *"
            value={joinDate}
            onChangeText={setJoinDate}
            placeholder="YYYY-MM-DD"
            hint="Due dates will be anchored to this day each month"
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
                    {item.gender === 'boys' ? '👦 Boys' : '👧 Girls'} · {item.resident_count} resident{item.resident_count !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.hostelItemRight}>
                  <Text style={styles.hostelItemRate}>₹{item.monthly_rate}/mo</Text>
                  {selectedHostel?.id === item.id && (
                    <Text style={styles.hostelCheckmark}>✓</Text>
                  )}
                </View>
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
  fieldError: { fontSize: Typography.fontSize.xs, color: Colors.danger, marginTop: 2 },

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
  pickerSub: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  pickerPlaceholder: { fontSize: Typography.fontSize.base, color: Colors.gray400 },
  chevron: { fontSize: 22, color: Colors.gray400 },

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
  hostelItemRight: { alignItems: 'flex-end', gap: Spacing[1] },
  hostelItemRate: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: Colors.primary },
  hostelCheckmark: { fontSize: Typography.fontSize.base, color: Colors.primary, fontWeight: Typography.fontWeight.bold },
});
