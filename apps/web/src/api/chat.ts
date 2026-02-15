import { api } from '../lib/api';

export interface ChatMessage {
  id: string;
  dealId: string;
  senderId: string;
  content: string;
  isSystem: boolean;
  isRead: boolean;
  createdAt: string;
  sender: { id: string; firstName: string; photoUrl?: string };
}

export const chatApi = {
  getMessages: (dealId: string, page = 1) =>
    api.get<{ items: ChatMessage[]; total: number }>(`/chat/deals/${dealId}/messages`, { params: { page } }).then(r => r.data),
  sendMessage: (dealId: string, content: string) =>
    api.post<ChatMessage>(`/chat/deals/${dealId}/messages`, { content }).then(r => r.data),
  getUnreadCount: () =>
    api.get<{ unread: number }>('/chat/unread').then(r => r.data),
};
