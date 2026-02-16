import { api } from '../lib/api';

export const favoritesApi = {
  getAll: (page = 1, limit = 20) =>
    api.get<{ items: any[]; total: number }>('/favorites', { params: { page, limit } }).then(r => r.data),
  getIds: () =>
    api.get<string[]>('/favorites/ids').then(r => r.data),
  check: (channelId: string) =>
    api.get<{ isFavorite: boolean }>(`/favorites/check/${channelId}`).then(r => r.data.isFavorite),
  add: (channelId: string) =>
    api.post(`/favorites/${channelId}`),
  remove: (channelId: string) =>
    api.delete(`/favorites/${channelId}`),
};
