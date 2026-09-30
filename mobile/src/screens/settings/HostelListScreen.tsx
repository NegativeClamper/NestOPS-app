import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { hostelsApi, Hostel } from '../../api/hostels';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';

type Props = { navigation: any };

const GENDER_LABEL: Record<string, string> = { boys: '👦 Boys', girls: '👧 Girls' };
const GENDER_COLOR: Record<string, string> = { boys: '#3B82F6', girls: '#EC4899' };

export default function HostelListScreen({ navigation }: Props) {
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await hostelsApi.list();
      setHostels(data);
    } catch {
      Alert.alert('Error', 'Could not load hostels.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Reload every time the screen comes into focus (e.g. after creating/editing)
  useFocusEffect(useCallback(() => { load(); }, []));

  const handleDelete = (hostel: Hostel) => {
    Alert.alert(
      'Delete Hostel',
      `Delete "${hostel.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await hostelsApi.delete(hostel.id);
              setHostels(prev => prev.filter(h => h.id !== hostel.id));
            } catch (err: any) {
              const msg =
                err?.response?.data?.detail ||
                'Cannot delete this hostel — it may have rooms or residents assigned to it.';
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  };

  const renderHostel = ({ item }: { item: Hostel }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={[styles.genderBadge, { backgroundColor: `${GENDER_COLOR[item.gender]}20` }]}>
          <Text style={[styles.genderText, { color: GENDER_COLOR[item.gender] }]}>
            {GENDER_LABEL[item.gender]}
          </Text>
        </View>
        <Text style={styles.hostelName}>{item.name}</Text>
        <Text style={styles.rate}>₹{Number(item.monthly_rate).toLocaleString('en-IN')}/month</Text>
        <Text style={styles.residentCount}>
          {item.resident_count} resident{item.resident_count !== 1 ? 's' : ''}
        </Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('HostelForm', { hostel: item })}
        >
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item)}
        >
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={hostels}
        keyExtractor={h => String(h.id)}
        renderItem={renderHostel}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={hostels.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏠</Text>
            <Text style={styles.emptyTitle}>No Hostels Yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your first hostel to start managing rooms and residents.
            </Text>
          </View>
        }
      />
      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('HostelForm')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+ Add Hostel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: Spacing[4], gap: Spacing[3], paddingBottom: 90 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing[6] },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardLeft: { flex: 1, gap: Spacing[1] },
  genderBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing[1],
  },
  genderText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold as any },
  hostelName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.textPrimary,
  },
  rate: { fontSize: Typography.fontSize.sm, color: Colors.primary, fontWeight: Typography.fontWeight.medium as any },
  residentCount: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary },

  cardActions: { gap: Spacing[2], alignItems: 'flex-end' },
  editBtn: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  editBtnText: { fontSize: Typography.fontSize.sm, color: Colors.primary, fontWeight: Typography.fontWeight.medium as any },
  deleteBtn: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.sm,
    backgroundColor: '#FEE2E2',
  },
  deleteBtnText: { fontSize: Typography.fontSize.sm, color: '#EF4444', fontWeight: Typography.fontWeight.medium as any },

  emptyState: { alignItems: 'center', gap: Spacing[3] },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold as any, color: Colors.textPrimary },
  emptySubtitle: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, textAlign: 'center' },

  fab: {
    position: 'absolute',
    bottom: Spacing[6],
    right: Spacing[5],
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: Colors.white, fontWeight: Typography.fontWeight.bold as any, fontSize: Typography.fontSize.base },
});
