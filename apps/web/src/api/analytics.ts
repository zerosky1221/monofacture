import { api } from '../lib/api';

export const analyticsApi = {
  getPublisherOverview: () => api.get('/analytics/publisher/overview').then(r => r.data),
  getEarnings: (period: '7d' | '30d' | '90d' = '30d') => api.get(`/analytics/publisher/earnings?period=${period}`).then(r => r.data),
  getDealsByFormat: () => api.get('/analytics/publisher/deals-by-format').then(r => r.data),
  getTopAdvertisers: (limit = 5) => api.get(`/analytics/publisher/top-advertisers?limit=${limit}`).then(r => r.data),
  getAdvertiserOverview: () => api.get('/analytics/advertiser/overview').then(r => r.data),
  getDashboard: (period: '7d' | '30d' | '90d' = '30d') => api.get(`/analytics/publisher/dashboard?period=${period}`).then(r => r.data),
};
