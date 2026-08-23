import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { residentsApi } from '../../api/residents';
import { feesApi } from '../../api/fees';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card, Badge } from '../../components/Card';
import { Button } from '../../components/Button';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { useAuthStore } from '../../store/authStore';

export default function ResidentDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data: resident, isLoading } = useQuery({
    queryKey: ['resident', id],
    queryFn: () => residentsApi.get(id),
  });

  const { data: duesData } = useQuery({
    queryKey: ['resident-dues', id],
    queryFn: () => feesApi.getResidentDues(id),
    enabled: !!resident,
  });

  const { data: paymentsData } = useQuery({
    queryKey: ['resident-payments', id],
    queryFn: () => feesApi.listPayments({ resident: id }),
    enabled: !!resident,
  });

  const checkoutMutation = useMutation({
    mutationFn: (data: { check_out_date: string }) => residentsApi.checkout(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      queryClient.invalidateQueries({ queryKey: ['resident', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Alert.alert('Success', 'Resident checked out successfully.');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to check out.');
    },
  });

  const handleCheckout = () => {
    Alert.alert(
      'Check Out Resident',
      `Are you sure you want to check out ${resident?.name}? This will free their bed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Check Out',
          style: 'destructive',
          onPress: () => {
            const today = new Date().toISOString().split('T')[0];
            checkoutMutation.mutate({ check_out_date: today });
          },
        },
      ],
    );
  };

  if (isLoading || !resident) return <ScreenContainer loading />;

  const isActive = resident.status === 'active';
  const payments = paymentsData?.results || paymentsData || [];
  const dues = duesData?.dues || [];
  const totalBalance = dues.reduce((sum: number, d: any) => sum + parseFloat(d.balance), 0);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header card */}
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{resident.name[0].toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{resident.name}</Text>
        <Badge
          label={isActive ? 'Active' : 'Checked Out'}
          bg={isActive ? Colors.successLight : Colors.gray100}
          color={isActive ? Colors.success : Colors.textSecondary}
        />
        {resident.room_number && (
          <Text style={styles.roomText}>
            Room {resident.room_number} • Bed {resident.bed_label} • {resident.sharing_type_name}
          </Text>
        )}
      </View>

      {/* Contact info */}
      <Card title="Contact">
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Phone</Text>
          <TouchableOpacity onPress={() => Linking.openURL(`tel:${resident.phone}`)}>
            <Text style={[styles.detailValue, styles.link]}>{resident.phone}</Text>
          </TouchableOpacity>
        </View>
        {resident.parent_name && (
          <>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Parent / Guardian</Text>
              <Text style={styles.detailValue}>{resident.parent_name}</Text>
            </View>
            {resident.parent_phone && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Parent Phone</Text>
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${resident.parent_phone}`)}>
                  <Text style={[styles.detailValue, styles.link]}>{resident.parent_phone}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Checked In</Text>
          <Text style={styles.detailValue}>{formatDate(resident.check_in_date)}</Text>
        </View>
        {resident.check_out_date && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Checked Out</Text>
            <Text style={styles.detailValue}>{formatDate(resident.check_out_date)}</Text>
          </View>
        )}
        {resident.monthly_fee && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Monthly Fee</Text>
            <Text style={[styles.detailValue, styles.feeValue]}>
              {formatCurrency(resident.monthly_fee)}
            </Text>
          </View>
        )}
      </Card>

      {/* Dues summary */}
      {totalBalance > 0 && (
        <View style={styles.duesBanner}>
          <Text style={styles.duesBannerTitle}>Outstanding Dues</Text>
          <Text style={styles.duesBannerAmount}>{formatCurrency(totalBalance)}</Text>
        </View>
      )}

      {/* Due months */}
      {dues.filter((d: any) => d.balance > 0).length > 0 && (
        <Card title="Unpaid Periods">
          {dues.filter((d: any) => d.balance > 0).map((d: any) => (
            <View key={d.period_month} style={styles.dueRow}>
              <View>
                <Text style={styles.dueMonth}>{d.period_label}</Text>
                <Text style={styles.dueDetail}>
                  Paid: {formatCurrency(d.amount_paid)} / Due: {formatCurrency(d.amount_due)}
                </Text>
              </View>
              <View style={styles.dueRightCol}>
                <Text style={styles.dueBalance}>{formatCurrency(d.balance)}</Text>
                {d.is_overdue && <Badge label="Overdue" bg={Colors.dangerLight} color={Colors.danger} />}
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* Payment history */}
      {payments.length > 0 && (
        <Card title={`Payment History (${payments.length})`}>
          {payments.slice(0, 8).map((p: any) => (
            <View key={p.id} style={styles.paymentRow}>
              <View>
                <Text style={styles.paymentPeriod}>{p.period_label}</Text>
                <Text style={styles.paymentMethod}>{p.payment_method.toUpperCase()} • {formatDate(p.date_paid)}</Text>
              </View>
              <Text style={styles.paymentAmount}>{formatCurrency(p.amount)}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* Actions */}
      {isActive && (
        <View style={styles.actions}>
          <Button
            title="Record Payment"
            onPress={() => navigation.navigate('Payments', {
              screen: 'RecordPayment',
              params: { residentId: id, residentName: resident.name },
            })}
            fullWidth
          />
          <Button
            title="Edit Details"
            variant="secondary"
            onPress={() => navigation.navigate('ResidentEdit', { id })}
            fullWidth
          />
          <Button
            title="Check Out"
            variant="danger"
            onPress={handleCheckout}
            loading={checkoutMutation.isPending}
            fullWidth
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing[4], gap: Spacing[4], paddingBottom: Spacing[12] },

  headerCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing[6],
    alignItems: 'center',
    gap: Spacing[2],
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.white + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 32, color: Colors.white, fontWeight: Typography.fontWeight.bold },
  name: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, color: Colors.white },
  roomText: { fontSize: Typography.fontSize.sm, color: Colors.gray300 },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabel: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  detailValue: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.medium, color: Colors.textPrimary },
  link: { color: Colors.primary },
  feeValue: { color: Colors.primary, fontWeight: Typography.fontWeight.bold },

  duesBanner: {
    backgroundColor: Colors.dangerLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  duesBannerTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: Colors.danger },
  duesBannerAmount: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, color: Colors.danger },

  dueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dueMonth: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.medium, color: Colors.textPrimary },
  dueDetail: { fontSize: Typography.fontSize.sm, color: Colors.textMuted, marginTop: 2 },
  dueRightCol: { alignItems: 'flex-end', gap: Spacing[1] },
  dueBalance: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold, color: Colors.danger },

  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  paymentPeriod: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.medium, color: Colors.textPrimary },
  paymentMethod: { fontSize: Typography.fontSize.sm, color: Colors.textMuted },
  paymentAmount: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold, color: Colors.success },

  actions: { gap: Spacing[3] },
});
