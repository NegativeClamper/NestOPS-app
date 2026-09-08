import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { intakeApi, PendingPayment } from '../../api/intake';
import { ScreenContainer, EmptyState } from '../../components/ScreenContainer';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { useAuthStore } from '../../store/authStore';

export default function PendingVerificationScreen() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['pending-verification'],
    queryFn: intakeApi.getPendingVerification,
  });

  const verifyMutation = useMutation({
    mutationFn: intakeApi.verifyPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-verification'] });
      setSelectedPayment(null);
      Alert.alert('Approved', 'Payment has been marked as verified.');
    },
    onError: () => Alert.alert('Error', 'Failed to verify payment. Try again.'),
  });

  const confirmVerify = (payment: PendingPayment) => {
    Alert.alert(
      'Approve Payment?',
      `Mark ₹${Number(payment.amount).toLocaleString('en-IN')} from ${payment.resident_name} as verified?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => verifyMutation.mutate(payment.id),
        },
      ],
    );
  };

  const payments: PendingPayment[] = data?.results ?? [];

  const renderItem = ({ item }: { item: PendingPayment }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setSelectedPayment(item)}
      activeOpacity={0.8}
    >
      <View style={styles.cardLeft}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.resident_name[0].toUpperCase()}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.residentName}>{item.resident_name}</Text>
          <Text style={styles.hostelName}>{item.hostel_name}</Text>
          <Text style={styles.txnId}>UTR: {item.transaction_id || '—'}</Text>
          <Text style={styles.date}>{formatDate(item.date_paid)}</Text>
        </View>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingBadgeText}>Pending</Text>
        </View>
        <Text style={styles.viewHint}>Tap to review</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      {isLoading ? (
        <ScreenContainer loading />
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: Spacing[2] }} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListHeaderComponent={
            payments.length > 0 ? (
              <View style={styles.listHeader}>
                <Text style={styles.listHeaderText}>
                  {payments.length} payment{payments.length !== 1 ? 's' : ''} awaiting approval
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="✅"
              message="All caught up!"
              subtitle="No payments are waiting for verification."
            />
          }
        />
      )}

      {/* ── Detail / Screenshot Modal ─────────────────────────── */}
      <Modal
        visible={!!selectedPayment}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedPayment(null)}
      >
        {selectedPayment && (
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Review Payment</Text>
              <TouchableOpacity onPress={() => setSelectedPayment(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={[selectedPayment]}
              keyExtractor={() => 'detail'}
              renderItem={() => (
                <View style={styles.detailContent}>
                  {/* Resident info */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Resident</Text>
                    <Text style={styles.detailValue}>{selectedPayment.resident_name}</Text>
                    <Text style={styles.detailSub}>{selectedPayment.resident_phone}</Text>
                  </View>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Hostel</Text>
                    <Text style={styles.detailValue}>{selectedPayment.hostel_name}</Text>
                  </View>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Amount</Text>
                    <Text style={styles.detailValue}>{formatCurrency(selectedPayment.amount)}</Text>
                  </View>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Transaction ID / UTR</Text>
                    <Text style={styles.detailValue}>{selectedPayment.transaction_id || '—'}</Text>
                  </View>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Submitted on</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedPayment.created_at)}</Text>
                  </View>

                  {/* Screenshot */}
                  <Text style={[styles.detailLabel, { marginTop: Spacing[4] }]}>
                    Payment Screenshot
                  </Text>
                  {selectedPayment.screenshot_url ? (
                    <Image
                      source={{ uri: selectedPayment.screenshot_url }}
                      style={styles.screenshot}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.noScreenshot}>
                      <Text style={styles.noScreenshotText}>No screenshot uploaded</Text>
                    </View>
                  )}

                  {/* Approve button */}
                  {user?.role === 'owner' && (
                    <TouchableOpacity
                      style={[
                        styles.approveBtn,
                        verifyMutation.isPending && styles.approveBtnDisabled,
                      ]}
                      onPress={() => confirmVerify(selectedPayment)}
                      disabled={verifyMutation.isPending}
                    >
                      {verifyMutation.isPending ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.approveBtnText}>✓  Approve Payment</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              )}
            />
          </View>
        )}
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing[4], paddingBottom: 60 },
  listHeader: {
    backgroundColor: Colors.infoLight || '#EFF6FF',
    borderRadius: BorderRadius.md,
    padding: Spacing[3],
    marginBottom: Spacing[3],
  },
  listHeaderText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.info || Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    ...Shadow.sm,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: Spacing[3] },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: Colors.white, fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold },
  cardInfo: { flex: 1 },
  residentName: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: Colors.textPrimary },
  hostelName: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, marginTop: 1 },
  txnId: { fontSize: Typography.fontSize.xs, color: Colors.textMuted, marginTop: 2 },
  date: { fontSize: Typography.fontSize.xs, color: Colors.textMuted },

  cardRight: { alignItems: 'flex-end', gap: Spacing[1] },
  amount: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold, color: Colors.textPrimary },
  pendingBadge: { backgroundColor: '#FEF3C7', borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 2 },
  pendingBadgeText: { fontSize: Typography.fontSize.xs, color: '#D97706', fontWeight: Typography.fontWeight.semibold },
  viewHint: { fontSize: Typography.fontSize.xs, color: Colors.textMuted },

  // Modal
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing[5], borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  modalTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, color: Colors.textPrimary },
  modalClose: { fontSize: 22, color: Colors.textSecondary },

  detailContent: { padding: Spacing[5], gap: Spacing[1] },
  detailSection: { marginBottom: Spacing[3] },
  detailLabel: { fontSize: Typography.fontSize.xs, color: Colors.textMuted, fontWeight: Typography.fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  detailValue: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.medium, color: Colors.textPrimary },
  detailSub: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary },

  screenshot: { width: '100%', height: 320, borderRadius: BorderRadius.lg, backgroundColor: Colors.gray100, marginTop: Spacing[2] },
  noScreenshot: { backgroundColor: Colors.gray100, borderRadius: BorderRadius.lg, height: 120, alignItems: 'center', justifyContent: 'center', marginTop: Spacing[2] },
  noScreenshotText: { color: Colors.textMuted, fontSize: Typography.fontSize.sm },

  approveBtn: {
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing[4],
    alignItems: 'center',
    marginTop: Spacing[6],
  },
  approveBtnDisabled: { opacity: 0.6 },
  approveBtnText: { color: Colors.white, fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold },
});
