import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomsApi, SharingType } from '../../api/rooms';
import { authApi } from '../../api/auth';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';
import { useAuthStore } from '../../store/authStore';

// ─── Sharing Type Modal ───────────────────────────────────────────────────────
interface SharingTypeModalProps {
  visible: boolean;
  existing?: SharingType | null;
  onClose: () => void;
  onSaved: () => void;
}

function SharingTypeModal({ visible, existing, onClose, onSaved }: SharingTypeModalProps) {
  const [name, setName] = useState(existing?.name || '');
  const [rate, setRate] = useState(existing?.monthly_rate || '');
  const [maxOcc, setMaxOcc] = useState(existing?.max_occupants?.toString() || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (visible) {
      setName(existing?.name || '');
      setRate(existing?.monthly_rate || '');
      setMaxOcc(existing?.max_occupants?.toString() || '');
      setErrors({});
    }
  }, [visible, existing]);

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: roomsApi.createSharingType,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sharing-types'] }); onSaved(); },
    onError: (e: any) => handleErrors(e),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => roomsApi.updateSharingType(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sharing-types'] }); onSaved(); },
    onError: (e: any) => handleErrors(e),
  });

  const handleErrors = (e: any) => {
    const d = e?.response?.data;
    if (d && typeof d === 'object') {
      const fe: Record<string, string> = {};
      Object.entries(d).forEach(([k, v]) => { fe[k] = Array.isArray(v) ? v[0] : String(v); });
      setErrors(fe);
    } else {
      Alert.alert('Error', 'Failed to save sharing type.');
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required.';
    if (!rate || isNaN(parseFloat(rate)) || parseFloat(rate) <= 0) e.monthly_rate = 'Enter a valid rate.';
    if (!maxOcc || isNaN(parseInt(maxOcc)) || parseInt(maxOcc) < 1) e.max_occupants = 'Enter max occupants ≥ 1.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const payload = { name: name.trim(), monthly_rate: rate, max_occupants: parseInt(maxOcc) };
    if (existing) {
      updateMutation.mutate({ id: existing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{existing ? 'Edit Fee Tier' : 'New Fee Tier'}</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Input label="Name *" value={name} onChangeText={setName} placeholder="e.g. Single, Double, Triple" error={errors.name} />
          <Input label="Monthly Rate (₹) *" value={rate} onChangeText={setRate} keyboardType="numeric" placeholder="e.g. 6000" error={errors.monthly_rate} />
          <Input label="Max Occupants *" value={maxOcc} onChangeText={setMaxOcc} keyboardType="numeric" placeholder="e.g. 2" hint="Number of residents this room type accommodates." error={errors.max_occupants} />

          {existing && (
            <View style={styles.rateNote}>
              <Text style={styles.rateNoteText}>
                ℹ️ Changing the rate updates future due calculations for all rooms using this tier. Existing payments are unaffected.
              </Text>
            </View>
          )}

          <Button title={isPending ? 'Saving…' : 'Save'} onPress={handleSave} loading={isPending} fullWidth style={{ marginTop: Spacing[4] }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Add Staff Modal ──────────────────────────────────────────────────────────
function AddStaffModal({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: () => void }) {
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (visible) {
      setUsername(''); setFirstName(''); setLastName('');
      setPhone(''); setPassword(''); setErrors({});
    }
  }, [visible]);

  const mutation = useMutation({
    mutationFn: authApi.createStaff,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff'] }); onSaved(); },
    onError: (e: any) => {
      const d = e?.response?.data;
      if (d && typeof d === 'object') {
        const fe: Record<string, string> = {};
        Object.entries(d).forEach(([k, v]) => { fe[k] = Array.isArray(v) ? v[0] : String(v); });
        setErrors(fe);
      } else {
        Alert.alert('Error', 'Failed to create staff account.');
      }
    },
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!username.trim()) e.username = 'Username is required.';
    if (!password || password.length < 8) e.password = 'Password must be at least 8 characters.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = () => {
    if (!validate()) return;
    mutation.mutate({ username: username.trim(), first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim(), password });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Staff Account</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Input label="Username *" value={username} onChangeText={setUsername} placeholder="Login username" autoCapitalize="none" error={errors.username} />
          <Input label="First Name" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
          <Input label="Last Name" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
          <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Input label="Password *" value={password} onChangeText={setPassword} secureTextEntry error={errors.password} placeholder="Min 8 characters" />
          <Button title={mutation.isPending ? 'Creating…' : 'Create Staff Account'} onPress={handleCreate} loading={mutation.isPending} fullWidth style={{ marginTop: Spacing[4] }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Main Settings Screen ─────────────────────────────────────────────────────
export default function SettingsScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();

  const [sharingTypeModal, setSharingTypeModal] = useState<{ visible: boolean; existing?: SharingType | null }>({ visible: false });
  const [addStaffModal, setAddStaffModal] = useState(false);

  const { data: sharingTypes = [] } = useQuery({
    queryKey: ['sharing-types'],
    queryFn: roomsApi.getSharingTypes,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: authApi.getStaff,
    enabled: user?.role === 'owner',
  });

  const deleteSharingType = useMutation({
    mutationFn: roomsApi.deleteSharingType,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sharing-types'] }),
    onError: (e: any) => {
      Alert.alert('Cannot Delete', e?.response?.data?.detail || 'This sharing type is in use by one or more rooms.');
    },
  });

  const deleteStaff = useMutation({
    mutationFn: authApi.deleteStaff,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] }),
    onError: () => Alert.alert('Error', 'Failed to delete staff account.'),
  });

  const confirmDeleteSharingType = (st: SharingType) => {
    Alert.alert('Delete Fee Tier', `Delete "${st.name}"? This cannot be done if any rooms use it.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteSharingType.mutate(st.id) },
    ]);
  };

  const confirmDeleteStaff = (id: number, name: string) => {
    Alert.alert('Remove Staff', `Remove "${name}" from the system?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteStaff.mutate(id) },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Current User */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{(user?.full_name || user?.username || '?')[0].toUpperCase()}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.full_name || user?.username}</Text>
            <Text style={styles.profileRole}>{user?.role === 'owner' ? '👑 Owner' : '👤 Staff'}</Text>
          </View>
        </View>

        {/* Fee Tiers — Owner only */}
        {user?.role === 'owner' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Fee Tiers</Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => setSharingTypeModal({ visible: true, existing: null })}
              >
                <Text style={styles.addBtnText}>+ New Tier</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionHint}>Monthly rent rates by sharing type. Changes apply to future dues only.</Text>

            {sharingTypes.length === 0 ? (
              <View style={styles.emptySection}>
                <Text style={styles.emptySectionText}>No fee tiers yet. Add your first one.</Text>
              </View>
            ) : (
              sharingTypes.map((st) => (
                <View key={st.id} style={styles.tierRow}>
                  <View style={styles.tierInfo}>
                    <Text style={styles.tierName}>{st.name}</Text>
                    <Text style={styles.tierDetail}>
                      ₹{Number(st.monthly_rate).toLocaleString('en-IN')}/mo · max {st.max_occupants} occupant{st.max_occupants > 1 ? 's' : ''}
                    </Text>
                  </View>
                  <View style={styles.tierActions}>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => setSharingTypeModal({ visible: true, existing: st })}
                    >
                      <Text style={styles.editIcon}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.iconBtn, styles.deleteBtn]}
                      onPress={() => confirmDeleteSharingType(st)}
                    >
                      <Text style={styles.deleteIcon}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Staff accounts — Owner only */}
        {user?.role === 'owner' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Staff Accounts</Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => setAddStaffModal(true)}>
                <Text style={styles.addBtnText}>+ Add Staff</Text>
              </TouchableOpacity>
            </View>

            {staff.length === 0 ? (
              <View style={styles.emptySection}>
                <Text style={styles.emptySectionText}>No staff accounts. Add trusted members below.</Text>
              </View>
            ) : (
              staff.map((s: any) => (
                <View key={s.id} style={styles.staffRow}>
                  <View style={styles.staffAvatar}>
                    <Text style={styles.staffAvatarText}>{(s.first_name || s.username)[0].toUpperCase()}</Text>
                  </View>
                  <View style={styles.staffInfo}>
                    <Text style={styles.staffName}>{s.first_name ? `${s.first_name} ${s.last_name}` : s.username}</Text>
                    <Text style={styles.staffUsername}>@{s.username}</Text>
                    {s.phone ? <Text style={styles.staffPhone}>{s.phone}</Text> : null}
                  </View>
                  <TouchableOpacity
                    style={[styles.iconBtn, styles.deleteBtn]}
                    onPress={() => confirmDeleteStaff(s.id, s.first_name || s.username)}
                  >
                    <Text style={styles.deleteIcon}>🗑</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* Sign Out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modals */}
      <SharingTypeModal
        visible={sharingTypeModal.visible}
        existing={sharingTypeModal.existing}
        onClose={() => setSharingTypeModal({ visible: false })}
        onSaved={() => setSharingTypeModal({ visible: false })}
      />
      <AddStaffModal
        visible={addStaffModal}
        onClose={() => setAddStaffModal(false)}
        onSaved={() => setAddStaffModal(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing[4], gap: Spacing[4], paddingBottom: Spacing[12] },

  profileCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing[5],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
  },
  profileAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.white + '25', alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { fontSize: 24, fontWeight: Typography.fontWeight.bold, color: Colors.white },
  profileInfo: { gap: 2 },
  profileName: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, color: Colors.white },
  profileRole: { fontSize: Typography.fontSize.base, color: Colors.gray300 },

  section: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing[4], gap: Spacing[3], ...Shadow.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold, color: Colors.textPrimary },
  sectionHint: { fontSize: Typography.fontSize.sm, color: Colors.textMuted },
  addBtn: { backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.md, paddingHorizontal: Spacing[3], paddingVertical: Spacing[1] + 2 },
  addBtnText: { fontSize: Typography.fontSize.sm, color: Colors.white, fontWeight: Typography.fontWeight.semibold },

  emptySection: { backgroundColor: Colors.gray50, borderRadius: BorderRadius.md, padding: Spacing[4], alignItems: 'center' },
  emptySectionText: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, textAlign: 'center' },

  tierRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing[3], borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing[3] },
  tierInfo: { flex: 1 },
  tierName: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: Colors.textPrimary },
  tierDetail: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  tierActions: { flexDirection: 'row', gap: Spacing[2] },
  iconBtn: { width: 36, height: 36, borderRadius: BorderRadius.md, backgroundColor: Colors.gray100, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { backgroundColor: Colors.dangerLight },
  editIcon: { fontSize: 16 },
  deleteIcon: { fontSize: 16 },

  staffRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing[3], borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing[3] },
  staffAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  staffAvatarText: { fontSize: 18, fontWeight: Typography.fontWeight.bold, color: Colors.white },
  staffInfo: { flex: 1 },
  staffName: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.medium, color: Colors.textPrimary },
  staffUsername: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  staffPhone: { fontSize: Typography.fontSize.sm, color: Colors.textMuted },

  logoutBtn: { backgroundColor: Colors.dangerLight, borderRadius: BorderRadius.lg, padding: Spacing[4], alignItems: 'center', marginTop: Spacing[4] },
  logoutText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: Colors.danger },

  // Modals
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing[5], borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  modalTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, color: Colors.textPrimary },
  modalClose: { fontSize: 22, color: Colors.textSecondary },
  modalContent: { padding: Spacing[5], gap: Spacing[4] },
  rateNote: { backgroundColor: Colors.infoLight, borderRadius: BorderRadius.md, padding: Spacing[3] },
  rateNoteText: { fontSize: Typography.fontSize.sm, color: Colors.info },
});
