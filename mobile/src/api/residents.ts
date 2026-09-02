import apiClient from './client';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface CurrentCycle {
  cycle_start: string | null;      // ISO date e.g. "2025-08-12"
  cycle_due_date: string | null;   // ISO date e.g. "2025-09-12"
  amount_due: string | null;       // Decimal string
  amount_paid: string | null;
  balance: string | null;
  is_paid: boolean | null;
  is_overdue: boolean | null;
}

/** Returned by the resident list endpoint */
export interface ResidentListItem {
  id: number;
  name: string;
  phone: string;
  hostel: number | null;
  hostel_name: string | null;
  room_number: string | null;
  sharing_type_name: string | null;
  monthly_fee: string | null;
  check_in_date: string;
  check_out_date: string | null;
  status: 'active' | 'checked_out';
  current_cycle: CurrentCycle;
  created_at: string;
}

/** Returned by the resident detail / create / edit endpoint */
export interface Resident {
  id: number;
  name: string;
  phone: string;
  parent_name: string;
  parent_phone: string;
  id_proof: string | null;
  hostel: number | null;
  hostel_name: string | null;
  bed: number | null;
  bed_label: string | null;
  room_number: string | null;
  sharing_type_name: string | null;
  monthly_fee: string | null;
  check_in_date: string;
  check_out_date: string | null;
  status: 'active' | 'checked_out';
  current_cycle: CurrentCycle;
  notes: string;
  created_at: string;
  updated_at: string;
}

// ─── API client ───────────────────────────────────────────────────────────────

export const residentsApi = {
  list: async (params?: {
    search?: string;
    room?: string;
    status?: string;
    hostel?: number;
    page?: number;
  }) => {
    const response = await apiClient.get('/residents/', { params });
    return response.data;
  },

  get: async (id: number): Promise<Resident> => {
    const response = await apiClient.get<Resident>(`/residents/${id}/`);
    return response.data;
  },

  create: async (data: FormData) => {
    const response = await apiClient.post('/residents/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  update: async (id: number, data: FormData) => {
    const response = await apiClient.patch(`/residents/${id}/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/residents/${id}/`);
  },

  checkout: async (id: number, data: { check_out_date: string; notes?: string }) => {
    const response = await apiClient.post(`/residents/${id}/checkout/`, data);
    return response.data;
  },
};
