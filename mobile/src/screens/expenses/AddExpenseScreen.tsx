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
import * as ImagePicker from 'expo-image-picker';
import { expensesApi } from '../../api/expenses';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';

export default function AddExpenseScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [receipt, setReceipt] = useState<{ uri: string; name: string; type: string } | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: expensesApi.getCategories,
  });

  const mutation = useMutation({
    mutationFn: (formData: FormData) => expensesApi.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Alert.alert('✅ Expense Added', 'Expense recorded successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to record expense.');
    },
  });

  const pickReceipt = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setReceipt({
        uri: asset.uri,
        name: asset.fileName || 'receipt.jpg',
        type: asset.mimeType || 'image/jpeg',
      });
    }
  };

  const handleSubmit = () => {
    if (!category) {
      Alert.alert('Required', 'Please select an expense category.');
      return;
    }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required', 'Please enter a description.');
      return;
    }

    const formData = new FormData();
    formData.append('category', String(category));
    formData.append('amount', amount);
    formData.append('description', description.trim());
    formData.append('date', date);
    if (receipt) {
      formData.append('receipt', {
        uri: receipt.uri,
        name: receipt.name,
        type: receipt.type,
      } as any);
    }

    mutation.mutate(formData);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Category picker */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Category *</Text>
        <View style={styles.categoryGrid}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, category === cat.id && styles.categoryChipActive]}
              onPress={() => setCategory(cat.id)}
            >
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text style={[styles.categoryText, category === cat.id && styles.categoryTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Input
        label="Amount (₹) *"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        placeholder="Enter amount"
      />

      <Input
        label="Description *"
        value={description}
        onChangeText={setDescription}
        placeholder="What is this expense for?"
        multiline
        numberOfLines={2}
      />

      <Input
        label="Date"
        value={date}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD"
        hint="Format: YYYY-MM-DD"
      />

      {/* Receipt picker */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Receipt (optional)</Text>
        <TouchableOpacity style={styles.receiptPicker} onPress={pickReceipt}>
          {receipt ? (
            <Text style={styles.receiptName}>📎 {receipt.name}</Text>
          ) : (
            <Text style={styles.receiptPlaceholder}>📷 Attach receipt photo</Text>
          )}
        </TouchableOpacity>
      </View>

      <Button
        title={mutation.isPending ? 'Saving…' : 'Add Expense'}
        onPress={handleSubmit}
        loading={mutation.isPending}
        fullWidth
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing[4], gap: Spacing[4], paddingBottom: Spacing[12] },

  fieldGroup: { gap: Spacing[2] },
  fieldLabel: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium, color: Colors.textPrimary },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray100,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  categoryChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  categoryIcon: { fontSize: 16 },
  categoryText: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, fontWeight: Typography.fontWeight.medium },
  categoryTextActive: { color: Colors.white },

  receiptPicker: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing[4],
    alignItems: 'center',
  },
  receiptName: { fontSize: Typography.fontSize.base, color: Colors.primary },
  receiptPlaceholder: { fontSize: Typography.fontSize.base, color: Colors.textMuted },
});
