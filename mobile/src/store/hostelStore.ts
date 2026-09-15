/**
 * useHostelStore
 *
 * Single source of truth for hostel selection, split into two independent slots:
 *
 * 1. dashboardHostelId  — used by DashboardScreen only. null = "All Hostels".
 *    Persisted under "dashboard_hostel_id".
 *
 * 2. selectedHostelId   — used by Residents, Payments, Expenses screens.
 *    null = "All Hostels". Persisted under "selected_hostel_id".
 *
 * The two slots are completely independent so selecting a hostel in Residents
 * does NOT change what Dashboard shows, and vice-versa.
 */
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const DASHBOARD_KEY  = 'dashboard_hostel_id';
const OPS_KEY        = 'selected_hostel_id';

interface HostelState {
  // Dashboard slot
  dashboardHostelId: number | null;
  setDashboardHostel: (id: number | null) => Promise<void>;

  // Operational screens slot (Residents / Payments / Expenses)
  selectedHostelId: number | null;
  setSelectedHostel: (id: number | null) => Promise<void>;

  // Shared loader — loads both slots from SecureStore once
  isLoaded: boolean;
  loadPersistedHostel: () => Promise<void>;
}

export const useHostelStore = create<HostelState>((set) => ({
  dashboardHostelId: null,
  selectedHostelId:  null,
  isLoaded: false,

  setDashboardHostel: async (id) => {
    set({ dashboardHostelId: id });
    try {
      if (id === null) await SecureStore.deleteItemAsync(DASHBOARD_KEY);
      else             await SecureStore.setItemAsync(DASHBOARD_KEY, String(id));
    } catch (_) {}
  },

  setSelectedHostel: async (id) => {
    set({ selectedHostelId: id });
    try {
      if (id === null) await SecureStore.deleteItemAsync(OPS_KEY);
      else             await SecureStore.setItemAsync(OPS_KEY, String(id));
    } catch (_) {}
  },

  loadPersistedHostel: async () => {
    try {
      const [dash, ops] = await Promise.all([
        SecureStore.getItemAsync(DASHBOARD_KEY),
        SecureStore.getItemAsync(OPS_KEY),
      ]);
      set({
        dashboardHostelId: dash ? Number(dash) : null,
        selectedHostelId:  ops  ? Number(ops)  : null,
        isLoaded: true,
      });
    } catch (_) {
      set({ isLoaded: true });
    }
  },
}));
