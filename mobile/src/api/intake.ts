import apiClient from './client';

export interface PendingPayment {
  id: number;
  resident_id: number;
  resident_name: string;
  resident_phone: string;
  hostel_name: string;
  amount: string;
  date_paid: string;
  transaction_id: string;
  screenshot_url: string | null;
  created_at: string;
}

export const intakeApi = {
  getPendingVerification: async (): Promise<{ count: number; results: PendingPayment[] }> => {
    const response = await apiClient.get('/fees/pending-verification/');
    return response.data;
  },

  verifyPayment: async (id: number): Promise<void> => {
    await apiClient.post(`/fees/${id}/verify/`);
  },

  /** Returns the full URL for a hostel's QR code PNG image */
  getQrCodeUrl: (hostelId: number): string => {
    // The QR endpoint returns a PNG — we display it directly as an Image source
    const base = (apiClient.defaults.baseURL || '').replace(/\/api$/, '');
    return `${base}/api/hostels/${hostelId}/qr/`;
  },
};
