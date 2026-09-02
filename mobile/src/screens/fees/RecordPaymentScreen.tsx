/**
 * RecordPaymentScreen
 *
 * Cycle selection strategy:
 * - Default: server picks the current cycle automatically (no period_month sent)
 * - The screen shows the current cycle's due date from resident.current_cycle
 * - If the user needs to record a payment for a past cycle they can type the
 *   year + month manually and the server resolves the exact cycle-start date
 *   via cycle_year + cycle_month fields.
 */
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
import { feesApi } from '../../api/fees';
import { residentsApi } from '../../api/residents';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';
import { formatCurrency } from '../../utils/formatters';

const PAYMENT_METHODS = [
  { value: 'cash',          label: '💵 Cash' },
  { value: 'upi',           label: '📱 UPI' },
  { value: 'bank_transfer', label: '🏦 Bank Transfer' },
  { value: 'cheque',        label: '📝 Cheque' },
];

function formatDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function RecordPaymentScreen({ route, navigation }: any) {
  const { residentId, residentName } = route.params || {};
  const queryClient = useQueryClient();

  const today = new Date().toISOString().split('T')[0];
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [datePaid, setDatePaid] = useState(today);
  const [notes, setNotes] = useState('');

  // Past cycle override: if user wants to pay for a different month
  const [overrideCycle, setOverrideCycle] = useState(false);
  const [cycleYear, setCycleYear] = useState(String(new Date().getFullYear()));
  const [cycleMonth, setCycleMonth] = useState(String(new Date().getMonth() + 1));

  const { data: resident, isLoading } = useQuery({
    queryKey: ['resident', residentId],
    queryFn: () => residentsApi.get(residentId),
    enabled: !!residentId,
  });

  const mutation = useMutation({
    mutationFn: feesApi.createPayment,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['all-dues'] });
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      queryClient.invalidateQueries({ queryKey: ['resident', residentId] });
      queryClient.invalidateQueries({ queryKey: ['resident-dues', residentId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Alert.alert(
        '✅ Payment Recorded',
        `₹${Number(data.amount).toLocaleString('en-IN')} recorded for ${residentName}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.detail ||
        JSON.stringify(error?.response?.data) ||
        'Failed to record payment.';
      Alert.alert('Error', msg);
    },
  });

  const handleSubmit = () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid payment amount.');
      return;
    }

    const payload: Parameters<typeof feesApi.createPayment>[0] = {
      resident: residentId,
      amount,
      date_paid: datePaid,
      payment_method: method,
      notes,
    };

    if (overrideCycle) {
      const y = parseInt(cycleYear, 10);
      const m = parseInt(cycleMonth, 10);
      if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
        Alert.alert('Invalid cycle', 'Enter a valid year and month (1-12).');
        return;
      }
      payload.cycle_year  = y;
      payload.cycle_month = m;
    }
    // If not overriding, omit period_month → server uses current cycle

    mutation.mutate(payload);
  };

  const cycle = resident?.current_cycle;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Resident info banner */}
      <View style={styles.residentBanner}>
        <Text style={styles.bannerLabel}>Recording payment for</Text>
        <Text style={styles.bannerName}>{residentName}</Text>
        {resident?.hostel_name && (
          <Text style={styles.bannerSub}>🏠 {resident.hostel_name}</Text>
        )}
        {resident?.monthly_fee && (
          <Text style={styles.bannerSub}>{formatCurrency(resident.monthly_fee)}/month</Text>
        )}
      </View>

      {/* Current cycle status card */}
      {cycle && (
        <View style={[styles.cycleCard, cycle.is_overdue ? styles.cycleCardOverdue : cycle.is_paid ? styles.cycleCardPaid : styles.cycleCardPending]}>
          <View style={styles.cycleRow}>
            <Text style={styles.cycleLabel}>Current Cycle</Text>
            <View style={[
              styles.cycleBadge,
              { backgroundColor: cycle.is_paid ? Colors.successLight : cycle.is_overdue ? Colors.dangerLight : Colors.warningLight },
            ]}>
              <Text style={[
                styles.cycleBadgeText,
                { color: cycle.is_paid ? Colors.success : cycle.is_overdue ? Colors.danger : Colors.accentDark },
              ]}>
                {cycle.is_paid ? 'Paid' : cycle.is_overdue ? 'Overdue' : 'Due'}
              </Text>
            </View>
          </View>
          <Text style={styles.cycleDue}>
            Due: <Text style={{ fontWeight: Typography.fontWeight.bold }}>
              {formatDate(cycle.cycle_due_date)}
            </Text>
          </Text>
          {cycle.balance && parseFloat(cycle.balance) > 0 && (
            <Text style={styles.cycleBalance}>
              Balance: {formatCurrency(cycle.balance)}
            </Text>
          )}
        </View>
      )}

      <View style={styles.form}>
        <Input
          label="Amount (₹) *"
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
          hint="When the payment was received"
        />

        {/* Cycle selector */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Billing Cycle</Text>
          {!overrideCycle ? (
            <View style={styles.cycleDefaultRow}>
              <Text style={styles.cycleDefaultText}>
                {cycle?.cycle_start
                  ? `Current cycle (from ${formatDate(cycle.cycle_start)})`
                  : 'Current cycle (server will determine)'}
              </Text>
              <TouchableOpacity onPress={() => setOverrideCycle(true)}>
                <Text style={styles.changeLink}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.overrideRow}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Year"
                  value={cycleYear}
                  onChangeText={setCycleYear}
                  keyboardType="numeric"
                  placeholder="2025"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Month (1-12)"
                  value={cycleMonth}
                  onChangeText={setCycleMonth}
                  keyboardType="numeric"
                  placeholder="8"
                />
              </View>
              <TouchableOpacity style={styles.cancelOverride} onPress={() => setOverrideCycle(false)}>
                <Text style={styles.cancelOverrideText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

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
  content: { gap: Spacing[3], paddingBottom: Spacing[12] },

  residentBanner: {
    backgroundColor: Colors.primary,
    padding: Spacing[5],
    alignItems: 'center',
    gap: 3,
  },
  bannerLabel: { fontSize: Typography.fontSize.sm, color: Colors.gray300 },
  bannerName: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, color: Colors.white },
  bannerSub: { fontSize: Typography.fontSize.sm, color: Colors.gray300 },

  // Cycle card
  cycleCard: {
    marginHorizontal: Spacing[4],
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    gap: Spacing[1] + 2,
    borderLeftWidth: 4,
    ...Shadow.sm,
  },
  cycleCardOverdue: { backgroundColor: Colors.dangerLight, borderLeftColor: Colors.danger },
  cycleCardPaid:    { backgroundColor: Colors.successLight, borderLeftColor: Colors.success },
  cycleCardPending: { backgroundColor: Colors.warningLight, borderLeftColor: Colors.warning },
  cycleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cycleLabel: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, color: Colors.textPrimary },
  cycleBadge: { paddingHorizontal: Spacing[2] + 2, paddingVertical: 2, borderRadius: BorderRadius.full },
  cycleBadgeText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  cycleDue: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  cycleBalance: { fontSize: Typography.fontSize.sm, color: Colors.danger, fontWeight: Typography.fontWeight.semibold },

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

  // Cycle row
  cycleDefaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
  },
  cycleDefaultText: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, flex: 1 },
  changeLink: { fontSize: Typography.fontSize.sm, color: Colors.primary, fontWeight: Typography.fontWeight.semibold, marginLeft: Spacing[2] },

  overrideRow: { flexDirection: 'row', gap: Spacing[2], alignItems: 'flex-end' },
  cancelOverride: {
    height: 48,
    width: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 1,
  },
  cancelOverrideText: { fontSize: Typography.fontSize.base, color: Colors.textSecondary },

  submitBtn: { marginTop: Spacing[2] },
});
