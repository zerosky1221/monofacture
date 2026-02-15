import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bell,
  MessageSquare,
  Package,
  Star,
  Wallet,
  Users,
  Moon,
  Loader2,
} from '../components/icons';
import { api } from '../lib/api';
import { useTelegram } from '../providers/TelegramProvider';
import { Toggle } from '../components/ui/Toggle';
import { useTranslation } from '../i18n';

interface NotificationSettings {
  inApp: boolean;
  telegram: boolean;
  deals: boolean;
  reviews: boolean;
  wallet: boolean;
  referrals: boolean;
  quietHours: boolean;
  quietStart: string;
  quietEnd: string;
}

export function NotificationSettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hapticFeedback } = useTelegram();
  const { t } = useTranslation();

  const { data: settings, isLoading } = useQuery<NotificationSettings>({
    queryKey: ['notification-settings'],
    queryFn: async () => {
      const response = await api.get('/notifications/settings');
      return response.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (update: Partial<NotificationSettings>) => {
      const response = await api.patch('/notifications/settings', update);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['notification-settings'], data);
    },
  });

  const handleToggle = (key: keyof NotificationSettings, value: boolean) => {
    hapticFeedback('selection');
    updateMutation.mutate({ [key]: value });
  };

  const handleTimeChange = (key: 'quietStart' | 'quietEnd', value: string) => {
    updateMutation.mutate({ [key]: value });
  };

  if (isLoading) {
    return (
      <div className="min-h-full pt-4 pb-4 page-enter">
        <div className="px-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="skeleton w-9 h-9 rounded-xl" />
            <div className="skeleton h-7 w-48 rounded-xl" />
          </div>
        </div>
        <div className="px-4 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full pb-4 page-enter">
      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#1A1A1A] active:scale-95 transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-[22px] font-bold text-white">
            {t('notifSettings.title')}
          </h1>
        </div>
      </div>

      <div className="pb-24">

      <div className="px-4 mb-6">
        <p className="text-[11px] text-[#555] uppercase tracking-wider font-semibold mb-3 ml-1">
          {t('notifSettings.deliveryChannels')}
        </p>
        <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 p-3.5 border-b border-[#1A1A1A]">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-[#999]" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] text-white font-medium">{t('notifSettings.inApp')}</p>
              <p className="text-[13px] text-[#666]">{t('notifSettings.inAppDesc')}</p>
            </div>
            <Toggle
              isEnabled={settings?.inApp ?? true}
              onChange={(v) => handleToggle('inApp', v)}
            />
          </div>
          <div className="flex items-center gap-3 p-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5 text-[#999]" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] text-white font-medium">{t('notifSettings.telegram')}</p>
              <p className="text-[13px] text-[#666]">{t('notifSettings.telegramDesc')}</p>
            </div>
            <Toggle
              isEnabled={settings?.telegram ?? true}
              onChange={(v) => handleToggle('telegram', v)}
            />
          </div>
        </div>
      </div>

      <div className="px-4 mb-6">
        <p className="text-[11px] text-[#555] uppercase tracking-wider font-semibold mb-3 ml-1">
          {t('notifSettings.notifTypes')}
        </p>
        <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 p-3.5 border-b border-[#1A1A1A]">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-[#999]" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] text-white font-medium">{t('notifSettings.deals')}</p>
              <p className="text-[13px] text-[#666]">{t('notifSettings.dealsDesc')}</p>
            </div>
            <Toggle
              isEnabled={settings?.deals ?? true}
              onChange={(v) => handleToggle('deals', v)}
            />
          </div>
          <div className="flex items-center gap-3 p-3.5 border-b border-[#1A1A1A]">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
              <Star className="w-5 h-5 text-[#999]" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] text-white font-medium">{t('notifSettings.reviewsLabel')}</p>
              <p className="text-[13px] text-[#666]">{t('notifSettings.reviewsDesc')}</p>
            </div>
            <Toggle
              isEnabled={settings?.reviews ?? true}
              onChange={(v) => handleToggle('reviews', v)}
            />
          </div>
          <div className="flex items-center gap-3 p-3.5 border-b border-[#1A1A1A]">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
              <Wallet className="w-5 h-5 text-[#999]" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] text-white font-medium">{t('notifSettings.walletLabel')}</p>
              <p className="text-[13px] text-[#666]">{t('notifSettings.walletDesc')}</p>
            </div>
            <Toggle
              isEnabled={settings?.wallet ?? true}
              onChange={(v) => handleToggle('wallet', v)}
            />
          </div>
          <div className="flex items-center gap-3 p-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-[#999]" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] text-white font-medium">{t('notifSettings.referralsLabel')}</p>
              <p className="text-[13px] text-[#666]">{t('notifSettings.referralsDesc')}</p>
            </div>
            <Toggle
              isEnabled={settings?.referrals ?? true}
              onChange={(v) => handleToggle('referrals', v)}
            />
          </div>
        </div>
      </div>

      <div className="px-4 mb-6">
        <p className="text-[11px] text-[#555] uppercase tracking-wider font-semibold mb-3 ml-1">
          {t('notifSettings.quietHours')}
        </p>
        <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 p-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
              <Moon className="w-5 h-5 text-[#999]" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] text-white font-medium">{t('notifSettings.doNotDisturb')}</p>
              <p className="text-[13px] text-[#666]">{t('notifSettings.doNotDisturbDesc')}</p>
            </div>
            <Toggle
              isEnabled={settings?.quietHours ?? false}
              onChange={(v) => handleToggle('quietHours', v)}
            />
          </div>
        </div>
        {settings?.quietHours && (
          <div className="mt-3">
            <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-[#666] text-[11px] uppercase tracking-wider block mb-1.5">
                    {t('notifSettings.start')}
                  </label>
                  <input
                    type="time"
                    value={settings.quietStart || '22:00'}
                    onChange={(e) =>
                      handleTimeChange('quietStart', e.target.value)
                    }
                    className="w-full bg-[#1A1A1A] border border-[#333] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#666] transition-colors"
                  />
                </div>
                <div className="text-[#666] text-sm font-medium pt-5">to</div>
                <div className="flex-1">
                  <label className="text-[#666] text-[11px] uppercase tracking-wider block mb-1.5">
                    {t('notifSettings.end')}
                  </label>
                  <input
                    type="time"
                    value={settings.quietEnd || '08:00'}
                    onChange={(e) =>
                      handleTimeChange('quietEnd', e.target.value)
                    }
                    className="w-full bg-[#1A1A1A] border border-[#333] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#666] transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {updateMutation.isPending && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#1A1A1A] border border-[#333] rounded-full px-4 py-2.5 shadow-lg">
          <Loader2
            className="w-4 h-4 text-white animate-spin"
            strokeWidth={1.5}
          />
          <span className="text-white text-sm">{t('notifSettings.saving')}</span>
        </div>
      )}
      </div>
    </div>
  );
}

export default NotificationSettingsPage;
