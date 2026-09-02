import apiClient from './client';

export interface Hostel {
  id: number;
  name: string;
  gender: 'boys' | 'girls';
  monthly_rate: string;
  resident_count: number;
}

export const hostelsApi = {
  list: async (): Promise<Hostel[]> => {
    const response = await apiClient.get<Hostel[] | { results: Hostel[] }>('/hostels/');
    const data = response.data;
    // Handle both paginated and plain list responses
    return Array.isArray(data) ? data : (data as any).results ?? [];
  },

  get: async (id: number): Promise<Hostel> => {
    const response = await apiClient.get<Hostel>(`/hostels/${id}/`);
    return response.data;
  },
};
