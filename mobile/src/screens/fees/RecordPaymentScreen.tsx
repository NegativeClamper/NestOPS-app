import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { feesApi } from '../../api/fees';
import { residentsApi } from '../../api/residents';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';
import { currentMonthStart, formatCurrency } from '../../utils/formatters';

const PAYMENT_METHODS = [
  { value: 'cash', label: '💵 Cash' },
  { value: 'upi', label: '📱 UPI' },
  { value: 'bank_transfer', label: '🏦 Bank Transfer' },
  { value: 'cheque', label: '📝 Cheque' },
];

export default function RecordPaymentScreen({ route, navigation }: any) {
  const { residentId, residentName } = route.params || {};
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [datePaid, setDatePaid] = useState(new Date().toISOString().split('T')[0]);
  const [periodMonth, setPeriodMonth] = useState(currentMonthStart());
  const [notes, setNotes] = useState('');

  const { data: resident } = useQuery({
    queryKey: ['resident', residentId],
    queryFn: () => residentsApi.get(residentId),
    enabled: !!residentId,
  });

  const mutation = useMutation({
    mutationFn: feesApi.createPayment,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['all-dues'] });
      queryClient.invalidateQueries({ queryKey: ['resident-dues', residentId] });
      queryClient.invalidateQueries({ queryKey: ['resident-payments', residentId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Alert.alert(
        '✅ Payment Recorded',
        `₹${Number(data.amount).toLocaleString('en-IN')} recorded for ${residentName}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.detail || JSON.stringify(error?.response?.data) || 'Failed to record payment.';
      Alert.alert('Error', msg);
    },
  });

  const handleSubmit = () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid payment amount.');
      return;
    }
    mutation.mutate({
      resident: residentId,
      amount,
      date_paid: datePaid,
      payment_method: method,
      period_month: periodMonth,
      notes,
    });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Resident info banner */}
      <View style={styles.residentBanner}>
        <Text style={styles.bannerLabel}>Recording payment for</Text>
        <Text style={styles.bannerName}>{residentName}</Text>
        {resident?.room_number && (
          <Text style={styles.bannerRoom}>Room {resident.room_number} • {formatCurrency(resident.monthly_fee || 0)}/mo</Text>
        )}
      </View>

      <View style={styles.form}>
        <Input
          label="Amount (₹)"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder={resident?.monthly_fee ? `e.g. ${resident.monthly_fee}` : 'Enter amount'}
        />

        {/* Payment method selector */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Payment Method</Text>
          <View style={styles.methodGrid}>
            {PAYMENT_METHODS.map((m) => (
              <TouchableOpacity
                key={m.value}
                style={[styles.methodChip, method === m.value && styles.methodChipActive]}
                onPress={() => setMethod(m.value)}
              >
                <Text style={[styles.methodText, method === m.value && styles.methodTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Input
          label="Date Paid"
          value={datePaid}
          onChangeText={setDatePaid}
          placeholder="YYYY-MM-DD"
          hint="Format: YYYY-MM-DD"
        />

        <Input
          label="Period (Month this covers)"
          value={periodMonth}
          onChangeText={setPeriodMonth}
          placeholder="YYYY-MM-01"
          hint="Set to the 1st of the billing month, e.g. 2025-08-01"
        />

        <Input
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Any notes about this payment…"
          multiline
          numberOfLines={3}
        />

        <Button
          title={mutation.isPending ? 'Recording…' : 'Record Payment'}
          onPress={handleSubmit}
          loading={mutation.isPending}
          fullWidth
          style={styles.submitBtn}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { gap: Spacing[4], paddingBottom: Spacing[12] },

  residentBanner: {
    backgroundColor: Colors.primary,
    padding: Spacing[5],
    alignItems: 'center',
    gap: 2,
  },
  bannerLabel: { fontSize: Typography.fontSize.sm, color: Colors.gray300 },
  bannerName: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, color: Colors.white },
  bannerRoom: { fontSize: Typography.fontSize.sm, color: Colors.gray300 },

  form: { padding: Spacing[4], gap: Spacing[4] },

  fieldGroup: { gap: Spacing[2] },
  fieldLabel: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium, color: Colors.textPrimary },
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  methodChip: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray100,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  methodChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  methodText: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, fontWeight: Typography.fontWeight.medium },
  methodTextActive: { color: Colors.white },

  submitBtn: { marginTop: Spacing[2] },
});
