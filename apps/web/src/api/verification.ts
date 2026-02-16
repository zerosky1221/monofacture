import { api } from '../lib/api';

export interface VerificationRequest {
  id: string;
  channelId: string;
  tier: string;
  status: string;
  documents: string[];
  notes?: string;
  reviewNotes?: string;
  createdAt: string;
  channel?: { id: string; title: string; username?: string };
}

export const verificationApi = {
  request: (channelId: string, tier: string, documents: string[], notes?: string) =>
    api.post('/verification/request', { channelId, tier, documents, notes }).then(r => r.data),
  getChannelVerification: (channelId: string) =>
    api.get(`/verification/channel/${channelId}`).then(r => r.data),
  getMyRequests: () =>
    api.get<VerificationRequest[]>('/verification/my-requests').then(r => r.data),
};
