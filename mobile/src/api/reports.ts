import apiClient from './client';

export interface DashboardData {
  occupancy: {
    total_beds: number;
    occupied_beds: number;
    vacant_beds: number;
    occupancy_pct: number;
  };
  vacant_bed_list: Array<{
    bed_id: number;
    bed_label: string;
    room_number: string;
    sharing_type: string;
  }>;
  monthly_revenue: number;
  monthly_expenses: {
    total: number;
    by_category: Record<string, number>;
  };
  net_pl: number;
  pl_trend: Array<{
    month: string;
    month_label: string;
    revenue: number;
    expenses: number;
    net: number;
  }>;
  pending_dues: {
    total_outstanding: number;
    residents_count: number;
    residents: Array<{
      resident_id: number;
      resident_name: string;
      room_number: string | null;
      total_balance: number;
      overdue_months_count: number;
    }>;
  };
}

export const reportsApi = {
  getDashboard: async (): Promise<DashboardData> => {
    const response = await apiClient.get<DashboardData>('/reports/dashboard/');
    return response.data;
  },
};
