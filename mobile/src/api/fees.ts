import apiClient from './client';

export interface Payment {
  id: number;
  resident: number;
  resident_name: string;
  room_number: string | null;
  amount: string;
  date_paid: string;
  payment_method: 'cash' | 'upi' | 'bank_transfer' | 'cheque';
  period_month: string;
  period_label: string;
  notes: string;
  recorded_by: number | null;
  recorded_by_name: string | null;
  created_at: string;
}

export interface DueMonth {
  period_month: string;
  period_label: string;
  amount_due: string;
  amount_paid: string;
  balance: string;
  is_overdue: boolean;
  is_current_month: boolean;
}

export interface ResidentDueSummary {
  resident_id: number;
  resident_name: string;
  resident_phone: string;
  room_number: string | null;
  total_balance: string;
  overdue_months_count: number;
  months: DueMonth[];
}

export const feesApi = {
  // Payments
  listPayments: async (params?: {
    resident?: number;
    period_month?: string;
    payment_method?: string;
    page?: number;
  }) => {
    const response = await apiClient.get('/fees/', { params });
    return response.data;
  },

  getPayment: async (id: number): Promise<Payment> => {
    const response = await apiClient.get<Payment>(`/fees/${id}/`);
    return response.data;
  },

  createPayment: async (data: {
    resident: number;
    amount: string;
    date_paid: string;
    payment_method: string;
    period_month: string;
    notes?: string;
  }): Promise<Payment> => {
    const response = await apiClient.post<Payment>('/fees/', data);
    return response.data;
  },

  deletePayment: async (id: number): Promise<void> => {
    await apiClient.delete(`/fees/${id}/`);
  },

  // Dues
  getAllDues: async () => {
    const response = await apiClient.get('/fees/dues/');
    return response.data;
  },

  getResidentDues: async (residentId: number) => {
    const response = await apiClient.get(`/fees/resident/${residentId}/dues/`);
    return response.data;
  },
};
