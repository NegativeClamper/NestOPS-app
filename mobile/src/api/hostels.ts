import apiClient from './client';

export interface Hostel {
  id: number;
  name: string;
  gender: 'boys' | 'girls';
  monthly_rate: string;
  resident_count: number;
}

export interface HostelPayload {
  name: string;
  gender: 'boys' | 'girls';
  monthly_rate: string;
}

export const hostelsApi = {
  list: async (): Promise<Hostel[]> => {
    const response = await apiClient.get<Hostel[] | { results: Hostel[] }>('/hostels/');
    const data = response.data;
    return Array.isArray(data) ? data : (data as any).results ?? [];
  },

  get: async (id: number): Promise<Hostel> => {
    const response = await apiClient.get<Hostel>(`/hostels/${id}/`);
    return response.data;
  },

  create: async (payload: HostelPayload): Promise<Hostel> => {
    const response = await apiClient.post<Hostel>('/hostels/', payload);
    return response.data;
  },

  update: async (id: number, payload: Partial<HostelPayload>): Promise<Hostel> => {
    const response = await apiClient.patch<Hostel>(`/hostels/${id}/`, payload);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/hostels/${id}/`);
  },
};
