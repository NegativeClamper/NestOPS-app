import apiClient from './client';

export interface ExpenseCategory {
  id: number;
  name: string;
  icon: string;
  is_default: boolean;
}

export interface Expense {
  id: number;
  category: number;
  category_name: string;
  category_icon: string;
  amount: string;
  date: string;
  description: string;
  receipt: string | null;
  recorded_by: number | null;
  recorded_by_name: string | null;
  created_at: string;
}

export const expensesApi = {
  getCategories: async (): Promise<ExpenseCategory[]> => {
    const response = await apiClient.get<ExpenseCategory[]>('/expenses/categories/');
    return response.data;
  },

  createCategory: async (data: Pick<ExpenseCategory, 'name' | 'icon'>): Promise<ExpenseCategory> => {
    const response = await apiClient.post<ExpenseCategory>('/expenses/categories/', data);
    return response.data;
  },

  deleteCategory: async (id: number): Promise<void> => {
    await apiClient.delete(`/expenses/categories/${id}/`);
  },

  list: async (params?: {
    category?: number;
    date_from?: string;
    date_to?: string;
    month?: number;
    year?: number;
    page?: number;
  }) => {
    const response = await apiClient.get('/expenses/', { params });
    return response.data;
  },

  get: async (id: number): Promise<Expense> => {
    const response = await apiClient.get<Expense>(`/expenses/${id}/`);
    return response.data;
  },

  create: async (data: FormData): Promise<Expense> => {
    const response = await apiClient.post<Expense>('/expenses/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/expenses/${id}/`);
  },

  getSummary: async (year?: number, month?: number) => {
    const response = await apiClient.get('/expenses/summary/', {
      params: { year, month },
    });
    return response.data;
  },
};
