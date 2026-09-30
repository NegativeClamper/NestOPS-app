import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { hostelsApi, Hostel, HostelPayload } from '../../api/hostels';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';

type Props = {
  navigation: any;
  route: any; // { params?: { hostel?: Hostel } }
};

export default function HostelFormScreen({ navigation, route }: Props) {
  const existingHostel: Hostel | undefined = route.params?.hostel;
  const isEditing = !!existingHostel;

  const [name, setName] = useState(existingHostel?.name ?? '');
  const [gender, setGender] = useState<'boys' | 'girls'>(existingHostel?.gender ?? 'boys');
  const [monthlyRate, setMonthlyRate] = useState(existingHostel?.monthly_rate ?? '');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Edit Hostel' : 'Add Hostel' });
  }, [isEditing]);

  const validate = (): string | null => {
    if (!name.trim()) return 'Hostel name is required.';
    if (!monthlyRate.trim() || isNaN(Number(monthlyRate)) || Number(monthlyRate) <= 0)
      return 'Monthly rate must be a positive number.';
    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error) { Alert.alert('Validation Error', error); return; }

    const payload: HostelPayload = {
      name: name.trim(),
      gender,
      monthly_rate: monthlyRate.trim(),
    };

    setIsLoading(true);
    try {
      if (isEditing) {
        await hostelsApi.update(existingHostel!.id, payload);
      } else {
        await hostelsApi.create(payload);
      }
      navigation.goBack();
    } catch (err: any) {
      const msg =
        err?.response?.data?.name?.[0] ||
        err?.response?.data?.detail ||
        err?.response?.data?.monthly_rate?.[0] ||
        'Something went wrong. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Hostel Name */}
        <Input
          label="Hostel Name *"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Boys Block A"
        />

        {/* Gender toggle */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Type *</Text>
          <View style={styles.genderRow}>
            <TouchableOpacity
              style={[styles.genderBtn, gender === 'boys' && styles.genderBtnActive]}
              onPress={() => setGender('boys')}
              activeOpacity={0.8}
            >
              <Text style={[styles.genderText, gender === 'boys' && styles.genderTextActive]}>
                👦 Boys
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.genderBtn, gender === 'girls' && styles.genderBtnActive]}
              onPress={() => setGender('girls')}
              activeOpacity={0.8}
            >
              <Text style={[styles.genderText, gender === 'girls' && styles.genderTextActive]}>
                👧 Girls
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Monthly Rate */}
        <Input
          label="Monthly Rent (₹) *"
          value={monthlyRate}
          onChangeText={setMonthlyRate}
          placeholder="e.g. 5000"
          keyboardType="numeric"
        />

        <Button
          title={isLoading ? (isEditing ? 'Saving…' : 'Creating…') : isEditing ? 'Save Changes' : 'Create Hostel'}
          onPress={handleSave}
          loading={isLoading}
          fullWidth
          style={{ marginTop: Spacing[6] }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing[5],
    gap: Spacing[4],
    flexGrow: 1,
  },
  fieldGroup: {
    gap: Spacing[2],
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium as any,
    color: Colors.textSecondary,
  },
  genderRow: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  genderBtn: {
    flex: 1,
    padding: Spacing[3],
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  genderBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}15`,
  },
  genderText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium as any,
  },
  genderTextActive: {
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold as any,
  },
});
