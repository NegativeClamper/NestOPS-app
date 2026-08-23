import apiClient from './client';

export interface SharingType {
  id: number;
  name: string;
  monthly_rate: string;
  max_occupants: number;
}

export interface Bed {
  id: number;
  room: number;
  room_number: string;
  sharing_type: string;
  bed_label: string;
  status: 'vacant' | 'occupied';
  resident_id: number | null;
  resident_name: string | null;
}

export interface Room {
  id: number;
  room_number: string;
  sharing_type: number;
  sharing_type_name: string;
  monthly_rate: string;
  floor: string;
  notes: string;
  total_beds: number;
  vacant_beds: number;
  beds?: Bed[];
}

export const roomsApi = {
  // Sharing types
  getSharingTypes: async (): Promise<SharingType[]> => {
    const response = await apiClient.get<SharingType[]>('/rooms/sharing-types/');
    return response.data;
  },

  createSharingType: async (data: Omit<SharingType, 'id'>): Promise<SharingType> => {
    const response = await apiClient.post<SharingType>('/rooms/sharing-types/', data);
    return response.data;
  },

  updateSharingType: async (id: number, data: Partial<SharingType>): Promise<SharingType> => {
    const response = await apiClient.patch<SharingType>(`/rooms/sharing-types/${id}/`, data);
    return response.data;
  },

  deleteSharingType: async (id: number): Promise<void> => {
    await apiClient.delete(`/rooms/sharing-types/${id}/`);
  },

  // Rooms
  list: async (params?: { search?: string; page?: number }): Promise<{ results: Room[]; count: number }> => {
    const response = await apiClient.get('/rooms/', { params });
    return response.data;
  },

  get: async (id: number): Promise<Room> => {
    const response = await apiClient.get<Room>(`/rooms/${id}/`);
    return response.data;
  },

  create: async (data: Partial<Room>): Promise<Room> => {
    const response = await apiClient.post<Room>('/rooms/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Room>): Promise<Room> => {
    const response = await apiClient.patch<Room>(`/rooms/${id}/`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/rooms/${id}/`);
  },

  getBeds: async (roomId: number): Promise<Bed[]> => {
    const response = await apiClient.get<Bed[]>(`/rooms/${roomId}/beds/`);
    return response.data;
  },

  getOccupancySummary: async () => {
    const response = await apiClient.get('/rooms/occupancy-summary/');
    return response.data;
  },

  getVacantBeds: async (): Promise<Bed[]> => {
    const response = await apiClient.get<Bed[]>('/rooms/beds/', { params: { status: 'vacant' } });
    return response.data;
  },

  createBedForRoom: async (roomId: number, bedLabel: string): Promise<Bed> => {
    const response = await apiClient.post<Bed>('/rooms/beds/create-bed/', {
      room: roomId,
      bed_label: bedLabel,
    });
    return response.data;
  },
};

