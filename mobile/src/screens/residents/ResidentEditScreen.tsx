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
import { residentsApi } from '../../api/residents';
import { hostelsApi, Hostel } from '../../api/hostels';
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

  const { data: hostels = [] } = useQuery({
    queryKey: ['hostels'],
    queryFn: hostelsApi.list,
  });

  // Form state — pre-filled from resident
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [joinDate, setJoinDate] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedHostel, setSelectedHostel] = useState<Hostel | null>(null);
  const [showHostelPicker, setShowHostelPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (resident) {
      setName(resident.name);
      setPhone(resident.phone);
      setParentName(resident.parent_name || '');
      setParentPhone(resident.parent_phone || '');
      setJoinDate(resident.check_in_date);
      setNotes(resident.notes || '');
    }
  }, [resident]);

  // Pre-select the resident's current hostel once both are loaded
  useEffect(() => {
    if (resident?.hostel && hostels.length > 0) {
      const match = hostels.find((h) => h.id === resident.hostel);
      if (match) setSelectedHostel(match);
    }
  }, [resident, hostels]);

  const mutation = useMutation({
    mutationFn: (formData: FormData) => residentsApi.update(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      queryClient.invalidateQueries({ queryKey: ['resident', id] });
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
    if (!selectedHostel) e.hostel = 'Please select a hostel.';
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
    formData.append('check_in_date', joinDate);
    formData.append('hostel', String(selectedHostel!.id));
    if (notes) formData.append('notes', notes.trim());
    mutation.mutate(formData);
  };

  if (isLoading) return <ScreenContainer loading />;

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
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickerValue}>{selectedHostel.name}</Text>
                  <Text style={styles.pickerSub}>
                    {selectedHostel.gender === 'boys' ? '👦 Boys' : '👧 Girls'} · ₹{selectedHostel.monthly_rate}/mo
                  </Text>
                </View>
              ) : (
                <Text style={[styles.pickerPlaceholder, { flex: 1 }]}>Select a hostel…</Text>
              )}
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            {errors.hostel ? <Text style={styles.fieldError}>{errors.hostel}</Text> : null}
          </View>
        </View>

        {/* Section: Personal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <Input label="Full Name *" value={name} onChangeText={setName} error={errors.name} autoCapitalize="words" />
          <Input label="Phone *" value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={errors.phone} />
          <Input label="Parent Name" value={parentName} onChangeText={setParentName} autoCapitalize="words" />
          <Input label="Parent Phone" value={parentPhone} onChangeText={setParentPhone} keyboardType="phone-pad" />
        </View>

        {/* Section: Stay */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stay Details</Text>
          <Input
            label="Join Date *"
            value={joinDate}
            onChangeText={setJoinDate}
            placeholder="YYYY-MM-DD"
            hint="Due dates are anchored to this day of month"
          />
          <Input label="Notes" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />
        </View>

        <Button title={mutation.isPending ? 'Saving…' : 'Save Changes'} onPress={handleSave} loading={mutation.isPending} fullWidth />
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
    fontSize: Typography.fontSize.xs,
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
