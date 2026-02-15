import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Send,
  CheckCircle,
  RotateCcw,
  Loader2,
  Clock,
  AlertCircle,
} from '../components/icons';
import { api } from '../lib/api';
import { formatRelative, formatDateTime } from '../lib/date';
import { useAuth } from '../hooks/useAuth';
import { useTelegram } from '../providers/TelegramProvider';
import { Input } from '@telegram-tools/ui-kit';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';
import { useTranslation } from '../i18n';

interface Message {
  id: string;
  content: string;
  senderType: 'USER' | 'SUPPORT' | 'SYSTEM';
  senderName?: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-[#3390ec]',
  IN_PROGRESS: 'bg-[#F59E0B]',
  WAITING_USER: 'bg-[#F97316]',
  RESOLVED: 'bg-[#22C55E]',
  CLOSED: 'bg-[#666]',
};

const STATUS_KEYS: Record<string, string> = {
  OPEN: 'deals.status.ACTIVE',
  IN_PROGRESS: 'deals.status.IN_PROGRESS',
  WAITING_USER: 'deals.status.PENDING',
  RESOLVED: 'deals.status.COMPLETED',
  CLOSED: 'deals.status.CANCELLED',
};

const CATEGORY_KEYS: Record<string, string> = {
  PAYMENT_ISSUE: 'ticket.categoryPayment',
  DEAL_PROBLEM: 'ticket.categoryDeal',
  DISPUTE: 'ticket.categoryDispute',
  USER_REPORT: 'ticket.categoryReportUser',
  CHANNEL_REPORT: 'ticket.categoryReportChannel',
  CHANNEL_VERIFICATION: 'ticket.categoryVerification',
  FEATURE_REQUEST: 'ticket.categoryFeature',
  BUG_REPORT: 'ticket.categoryBug',
  QUESTION: 'ticket.categoryQuestion',
  OTHER: 'ticket.categoryOther',
};

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { hapticFeedback } = useTelegram();
  const { t } = useTranslation();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['support', 'ticket', id],
    queryFn: async () => {
      const response = await api.get<Ticket>(`/support/tickets/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await api.post(`/support/tickets/${id}/messages`, { content });
      return response.data;
    },
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['support', 'ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || t('common.failed'));
    },
  });

  const closeTicketMutation = useMutation({
    mutationFn: async () => {
      const response = await api.patch(`/support/tickets/${id}/close`);
      return response.data;
    },
    onSuccess: () => {
      hapticFeedback('notification');
      toast.success(t('ticket.closed'));
      queryClient.invalidateQueries({ queryKey: ['support', 'ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || t('ticket.closeFailed'));
    },
  });

  const reopenTicketMutation = useMutation({
    mutationFn: async () => {
      const response = await api.patch(`/support/tickets/${id}/reopen`);
      return response.data;
    },
    onSuccess: () => {
      hapticFeedback('notification');
      toast.success(t('ticket.reopened'));
      queryClient.invalidateQueries({ queryKey: ['support', 'ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || t('ticket.reopenFailed'));
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages]);

  const handleSend = () => {
    const trimmed = newMessage.trim();
    if (!trimmed || sendMessageMutation.isPending) return;
    hapticFeedback('impact');
    sendMessageMutation.mutate(trimmed);
  };

  const isOpen =
    ticket?.status === 'OPEN' ||
    ticket?.status === 'IN_PROGRESS' ||
    ticket?.status === 'WAITING_USER';

  const isClosed = ticket?.status === 'CLOSED' || ticket?.status === 'RESOLVED';

  if (isLoading) {
    return (
      <div className="min-h-full pb-4 page-enter">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/support')}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#1A1A1A] active:scale-95 transition-all"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div className="skeleton h-7 w-40 rounded-xl" />
          </div>
        </div>
        <div className="px-4 space-y-3">
          <div className="skeleton h-20 rounded-2xl" />
          <div className="skeleton h-32 rounded-2xl" />
          <div className="skeleton h-32 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-full pb-4 page-enter">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/support')}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#1A1A1A] active:scale-95 transition-all"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-[22px] font-bold text-white">{t('ticketDetail.title')}</h1>
          </div>
        </div>
        <div className="px-4">
          <div className="bg-[#111] border border-[#1A1A1A] rounded-3xl p-8 text-center">
            <AlertCircle className="w-10 h-10 text-[#666] mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-white font-medium mb-1">{t('ticketDetail.notFound')}</p>
            <p className="text-[#666] text-sm">{t('ticketDetail.mayBeDeleted')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col pb-4 page-enter">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/support')}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#1A1A1A] active:scale-95 transition-all"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div>
              <h1 className="text-[22px] font-bold text-white">{t('ticketDetail.title')}</h1>
              <p className="text-xs text-[#666] font-mono">#{ticket.ticketNumber} · {CATEGORY_KEYS[ticket.category] ? t(CATEGORY_KEYS[ticket.category]) : ticket.category}</p>
            </div>
          </div>
          <span
            className={`px-2.5 py-1 text-[10px] font-medium rounded-full text-white flex-shrink-0 ${
              STATUS_COLORS[ticket.status] || 'bg-[#666]'
            }`}
          >
            {STATUS_KEYS[ticket.status] ? t(STATUS_KEYS[ticket.status]) : ticket.status}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[#666] text-xs mt-1.5">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" strokeWidth={1.5} />
            <span>{t('ticketDetail.created')} {formatRelative(ticket.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 overflow-y-auto">
        <div className="space-y-3 mb-4">
          {ticket.messages.map((msg) => {
            if (msg.senderType === 'SYSTEM') {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className="px-3 py-1.5 bg-[#111] border border-[#1A1A1A] rounded-full">
                    <p className="text-[#666] text-xs text-center">{msg.content}</p>
                  </div>
                </div>
              );
            }

            const isUser = msg.senderType === 'USER';

            return (
              <div
                key={msg.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    isUser
                      ? 'bg-white text-black rounded-br-md'
                      : 'bg-[#3390ec]/20 border border-[#3390ec]/30 text-white rounded-bl-md'
                  }`}
                >
                  {!isUser && msg.senderName && (
                    <p className="text-[#3390ec] text-xs font-medium mb-1">
                      {msg.senderName}
                    </p>
                  )}
                  <p
                    className={`text-sm leading-relaxed ${
                      isUser ? 'text-black' : 'text-white'
                    }`}
                  >
                    {msg.content}
                  </p>
                  <p
                    className={`text-[10px] mt-1.5 ${
                      isUser ? 'text-black/40 text-right' : 'text-white/40'
                    }`}
                  >
                    {formatDateTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="px-4 pt-3">
        {isOpen && (
          <>
            <div className="flex gap-2 mb-3">
              <div className="flex-1">
                <Input
                  value={newMessage}
                  onChange={(v) => setNewMessage(v)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={t('ticketDetail.typeMessage')}
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!newMessage.trim() || sendMessageMutation.isPending}
                className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${
                  newMessage.trim()
                    ? 'bg-white text-black active:scale-[0.95]'
                    : 'bg-[#1A1A1A] text-[#666]'
                }`}
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                ) : (
                  <Send className="w-4 h-4" strokeWidth={1.5} />
                )}
              </button>
            </div>

            <button
              onClick={() => {
                hapticFeedback('impact');
                closeTicketMutation.mutate();
              }}
              disabled={closeTicketMutation.isPending}
              className="w-full h-10 flex items-center justify-center gap-2 bg-[#111] border border-[#1A1A1A] rounded-xl text-[#22C55E] text-sm font-medium active:bg-[#1A1A1A] transition-all"
            >
              {closeTicketMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
              ) : (
                <CheckCircle className="w-4 h-4" strokeWidth={1.5} />
              )}
              {t('ticketDetail.closeTicket')}
            </button>
          </>
        )}

        {isClosed && (
          <Button className="w-full" size="lg" icon={RotateCcw} onClick={() => {
              hapticFeedback('impact');
              reopenTicketMutation.mutate();
            }} disabled={reopenTicketMutation.isPending} loading={reopenTicketMutation.isPending}>
            {t('ticketDetail.reopenTicket')}
          </Button>
        )}
      </div>
    </div>
  );
}

export default TicketDetailPage;
