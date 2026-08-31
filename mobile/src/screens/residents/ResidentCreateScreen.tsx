import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { residentsApi } from '../../api/residents';
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
  const [idProof, setIdProof] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    if (idProof) {
      formData.append('id_proof', { uri: idProof.uri, name: idProof.name, type: idProof.type } as any);
    }
    mutation.mutate(formData);
  };

  return (
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
});
