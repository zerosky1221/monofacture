import { api } from '../lib/api';

export interface SavedFilter {
  id: string;
  name: string;
  filters: any;
  isDefault: boolean;
  createdAt: string;
}

export const filtersApi = {
  getAll: () => api.get<SavedFilter[]>('/filters').then(r => r.data),
  create: (name: string, filters: any) => api.post<SavedFilter>('/filters', { name, filters }).then(r => r.data),
  update: (id: string, data: { name?: string; filters?: any }) => api.patch<SavedFilter>(`/filters/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/filters/${id}`),
};
