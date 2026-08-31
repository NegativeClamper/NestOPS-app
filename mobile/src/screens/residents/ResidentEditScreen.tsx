import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { residentsApi } from '../../api/residents';
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

  // Form state — pre-filled from resident
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (resident) {
      setName(resident.name);
      setPhone(resident.phone);
      setParentName(resident.parent_name || '');
      setParentPhone(resident.parent_phone || '');
      setCheckInDate(resident.check_in_date);
      setNotes(resident.notes || '');
    }
  }, [resident]);

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
    if (notes) formData.append('notes', notes.trim());
    mutation.mutate(formData);
  };

  if (isLoading) return <ScreenContainer loading />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <Input label="Full Name *" value={name} onChangeText={setName} error={errors.name} autoCapitalize="words" />
        <Input label="Phone *" value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={errors.phone} />
        <Input label="Parent Name" value={parentName} onChangeText={setParentName} autoCapitalize="words" />
        <Input label="Parent Phone" value={parentPhone} onChangeText={setParentPhone} keyboardType="phone-pad" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stay Details</Text>
        <Input label="Check-In Date *" value={checkInDate} onChangeText={setCheckInDate} placeholder="YYYY-MM-DD" />
        <Input label="Notes" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />
      </View>

      <Button title={mutation.isPending ? 'Saving…' : 'Save Changes'} onPress={handleSave} loading={mutation.isPending} fullWidth />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing[4], gap: Spacing[5], paddingBottom: Spacing[12] },
  section: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing[4], gap: Spacing[4], ...Shadow.sm },
  sectionTitle: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.bold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
});
