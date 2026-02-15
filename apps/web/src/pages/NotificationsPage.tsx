import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bell,
  Settings,
  Package,
  Star,
  Wallet,
  Users,
  MessageSquare,
  CheckCheck,
} from '../components/icons';
import { api } from '../lib/api';
import { formatRelative } from '../lib/date';
import { useTelegram } from '../providers/TelegramProvider';
import { useTranslation } from '../i18n';

type FilterType = 'all' | 'unread';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  entityType?: string;
  entityId?: string;
  createdAt: string;
}

interface NotificationsResponse {
  items: Notification[];
  total: number;
  unread: number;
}

function getNotificationIcon(type: string) {
  if (type.startsWith('DEAL_')) return Package;
  if (type.startsWith('REVIEW_')) return Star;
  if (type.startsWith('WALLET_')) return Wallet;
  if (type.startsWith('REFERRAL_')) return Users;
  if (type.startsWith('TICKET_')) return MessageSquare;
  return Bell;
}

function getNotificationColor(type: string): string {
  if (
    type.includes('COMPLETED') ||
    type.includes('ACCEPTED') ||
    type.includes('APPROVED')
  ) {
    return 'text-[#22C55E]';
  }
  if (
    type.includes('REJECTED') ||
    type.includes('CANCELLED') ||
    type.includes('DISPUTE')
  ) {
    return 'text-[#EF4444]';
  }
  if (type.includes('WARNING') || type.includes('TIMEOUT')) {
    return 'text-[#F59E0B]';
  }
  return 'text-white';
}

function getNotificationRoute(
  entityType?: string,
  entityId?: string,
): string | null {
  if (!entityType || !entityId) return null;
  switch (entityType) {
    case 'deal':
      return `/deals/${entityId}`;
    case 'channel':
      return `/channel/${entityId}`;
    case 'ticket':
      return `/support/${entityId}`;
    case 'review':
      return `/reviews`;
    default:
      return null;
  }
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hapticFeedback } = useTelegram();
  const { t } = useTranslation();
  const [filter, setFilter] = useState<FilterType>('all');

  const { data, isLoading } = useQuery<NotificationsResponse>({
    queryKey: ['notifications', filter],
    queryFn: async () => {
      const params = filter === 'unread' ? { unreadOnly: true } : {};
      const response = await api.get('/notifications', { params });
      return response.data;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.post('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    hapticFeedback('impact');

    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }

    const route = getNotificationRoute(
      notification.entityType,
      notification.entityId,
    );
    if (route) {
      navigate(route);
    }
  };

  const unreadCount = data?.unread ?? 0;
  const notifications = data?.items ?? [];

  return (
    <div className="min-h-full pb-4 page-enter">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#1A1A1A] active:scale-95 transition-all"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-bold text-white">
                {t('notifications.title')}
              </h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-white text-black text-xs font-bold rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              hapticFeedback('impact');
              navigate('/notifications/settings');
            }}
            className="p-2 rounded-full hover:bg-[#1A1A1A] active:scale-95 transition-transform"
          >
            <Settings className="w-5 h-5 text-[#999]" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div>

      <div className="px-4 mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              hapticFeedback('selection');
              setFilter('all');
            }}
            className={`h-9 px-4 rounded-full text-sm font-medium transition-all ${
              filter === 'all'
                ? 'bg-white text-black'
                : 'bg-[#1A1A1A] text-[#999]'
            }`}
          >
            {t('notifications.all')}
          </button>
          <button
            onClick={() => {
              hapticFeedback('selection');
              setFilter('unread');
            }}
            className={`h-9 px-4 rounded-full text-sm font-medium transition-all ${
              filter === 'unread'
                ? 'bg-white text-black'
                : 'bg-[#1A1A1A] text-[#999]'
            }`}
          >
            {t('notifications.unread')}
          </button>

          {unreadCount > 0 && (
            <button
              onClick={() => {
                hapticFeedback('impact');
                markAllReadMutation.mutate();
              }}
              disabled={markAllReadMutation.isPending}
              className="ml-auto flex items-center gap-1.5 h-9 px-3 rounded-full text-sm text-[#999] bg-[#1A1A1A] active:bg-[#333] transition-all"
            >
              <CheckCheck className="w-4 h-4" strokeWidth={1.5} />
              <span>{t('notifications.markAllRead')}</span>
            </button>
          )}
        </div>
      </div>

      <div className="px-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-20 rounded-2xl" />
            ))}
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-2">
            {notifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const iconColor = getNotificationColor(notification.type);

              return (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className="w-full bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 flex items-start gap-3 text-left active:bg-[#1A1A1A] transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
                    <Icon
                      className={`w-5 h-5 ${iconColor}`}
                      strokeWidth={1.5}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-[15px] font-medium truncate ${
                          notification.isRead ? 'text-[#999]' : 'text-white'
                        }`}
                      >
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <div className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p
                      className={`text-[13px] line-clamp-2 mt-0.5 ${
                        notification.isRead ? 'text-[#666]' : 'text-[#999]'
                      }`}
                    >
                      {notification.message}
                    </p>
                    <p className="text-[#666] text-[11px] mt-1">
                      {formatRelative(notification.createdAt)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#111] border border-[#1A1A1A] rounded-3xl p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#1A1A1A] flex items-center justify-center mx-auto mb-3">
              <Bell className="w-7 h-7 text-[#666]" strokeWidth={1.5} />
            </div>
            <p className="text-white font-medium text-[15px] mb-1">
              {t('notifications.noNotifications')}
            </p>
            <p className="text-[#666] text-[13px]">
              {filter === 'unread'
                ? t('notifications.noNotificationsUnread')
                : t('notifications.noNotificationsAll')}
            </p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

export default NotificationsPage;
