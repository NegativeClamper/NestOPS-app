import apiClient from './client';
import * as SecureStore from 'expo-secure-store';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface UserInfo {
  id: number;
  username: string;
  full_name: string;
  role: 'owner' | 'staff';
  phone: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: UserInfo;
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login/', credentials);
    const { access, refresh } = response.data;
    await SecureStore.setItemAsync('access_token', access);
    await SecureStore.setItemAsync('refresh_token', refresh);
    return response.data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    try {
      await apiClient.post('/auth/logout/', { refresh: refreshToken });
    } finally {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
    }
  },

  me: async (): Promise<UserInfo> => {
    const response = await apiClient.get<UserInfo>('/auth/me/');
    return response.data;
  },

  changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    await apiClient.post('/auth/change-password/', {
      old_password: oldPassword,
      new_password: newPassword,
    });
  },

  // Staff management (Owner only)
  getStaff: async () => {
    const response = await apiClient.get('/auth/staff/');
    return response.data;
  },

  createStaff: async (data: {
    username: string;
    first_name: string;
    last_name: string;
    phone: string;
    password: string;
  }) => {
    const response = await apiClient.post('/auth/staff/', data);
    return response.data;
  },

  deleteStaff: async (id: number): Promise<void> => {
    await apiClient.delete(`/auth/staff/${id}/`);
  },
};
