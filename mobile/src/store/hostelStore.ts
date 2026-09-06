/**
 * useHostelStore
 *
 * Single source of truth for the currently selected hostel across the app.
 * Persisted to AsyncStorage so the selection survives app restarts.
 *
 * Usage:
 *   const { selectedHostelId, setSelectedHostel } = useHostelStore();
 *
 * For screens that need "All Hostels" (Dashboard only), selectedHostelId
 * will be null when "All Hostels" is chosen.
 * For screens that always require a specific hostel (Residents, Payments,
 * Expenses), just read selectedHostelId and pass it to the API.
 */
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'selected_hostel_id';

interface HostelState {
  selectedHostelId: number | null;
  isLoaded: boolean;
  setSelectedHostel: (id: number | null) => Promise<void>;
  loadPersistedHostel: () => Promise<void>;
}

export const useHostelStore = create<HostelState>((set) => ({
  selectedHostelId: null,
  isLoaded: false,

  setSelectedHostel: async (id: number | null) => {
    set({ selectedHostelId: id });
    try {
      if (id === null) {
        await SecureStore.deleteItemAsync(STORAGE_KEY);
      } else {
        await SecureStore.setItemAsync(STORAGE_KEY, String(id));
      }
    } catch (_) {
      // SecureStore failure is non-fatal — selection still works in-memory
    }
  },

  loadPersistedHostel: async () => {
    try {
      const stored = await SecureStore.getItemAsync(STORAGE_KEY);
      set({
        selectedHostelId: stored ? Number(stored) : null,
        isLoaded: true,
      });
    } catch (_) {
      set({ isLoaded: true });
    }
  },
}));
