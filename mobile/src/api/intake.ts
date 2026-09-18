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

  /**
   * Fetches the QR code PNG for a hostel via axios (so auth headers are sent)
   * and returns it as a base64 data URI that React Native's <Image> can display.
   */
  getQrCodeDataUri: async (hostelId: number): Promise<string> => {
    const response = await apiClient.get(`/hostels/${hostelId}/qr/`, {
      responseType: 'arraybuffer',
    });
    // Convert ArrayBuffer → base64 string
    const bytes = new Uint8Array(response.data as ArrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return `data:image/png;base64,${base64}`;
  },
};
