import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authApi, UserInfo } from '../api/auth';

// Key where we persist the user profile locally alongside the tokens.
const USER_KEY = 'user_profile';

interface AuthState {
  user: UserInfo | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (username: string, password: string) => Promise<void>;
  register: (credentials: any) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  setUser: (user: UserInfo) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (username, password) => {
    const data = await authApi.login({ username, password });
    // Persist user profile so we can restore it without a network call on restart.
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
    set({
      user: data.user,
      accessToken: data.access,
      refreshToken: data.refresh,
      isAuthenticated: true,
    });
  },

  register: async (credentials) => {
    const data = await authApi.register(credentials);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
    set({
      user: data.user,
      accessToken: data.access,
      refreshToken: data.refresh,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    const { refreshToken } = get();
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch (_) {
        // Best effort
      }
    }
    await SecureStore.deleteItemAsync(USER_KEY);
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  loadStoredAuth: async () => {
    try {
      const [accessToken, refreshToken, userJson] = await Promise.all([
        SecureStore.getItemAsync('access_token'),
        SecureStore.getItemAsync('refresh_token'),
        SecureStore.getItemAsync(USER_KEY),
      ]);

      if (accessToken && userJson) {
        // Restore session immediately from local storage — no network call needed.
        // The JWT interceptor in client.ts will auto-refresh the access token
        // via the refresh token if it has expired when the first real API call fires.
        const user: UserInfo = JSON.parse(userJson);
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (_) {
      // Something is corrupt — clear everything and go to login.
      await Promise.allSettled([
        SecureStore.deleteItemAsync('access_token'),
        SecureStore.deleteItemAsync('refresh_token'),
        SecureStore.deleteItemAsync(USER_KEY),
      ]);
      set({ isLoading: false });
    }
  },

  setUser: (user) => set({ user }),
}));
