import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTonWallet } from '@tonconnect/ui-react';
import {
  ChevronRight,
  Wallet,
  LayoutGrid,
  Handshake,
  Bell,
  HelpCircle,
  LogOut,
  Star,
  ShieldCheck,
  Gem,
  CheckCircle,
  Calendar,
  Users,
  TrendingUp,
  Trophy,
  Globe,
} from '../components/icons';
import { useTelegram } from '../providers/TelegramProvider';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { formatMonthYear } from '../lib/date';
import { useTranslation } from '../i18n';
import { achievementsApi } from '../api/achievements';

interface UserStats {
  id: string;
  firstName?: string;
  lastName?: string;
  telegramUsername?: string;
  photoUrl?: string;
  rating: number;
  reviewCount: number;
  totalDeals: number;
  successfulDeals: number;
  isVerified: boolean;
  totalSpent?: string;
  totalEarned?: string;
  createdAt?: string;
  _count?: {
    dealsAsAdvertiser: number;
    dealsAsChannelOwner: number;
  };
}

function formatTon(nanoTon: string | number | undefined): string {
  if (!nanoTon) return '0.00';
  const value = typeof nanoTon === 'string' ? parseInt(nanoTon) : nanoTon;
  if (isNaN(value) || value === 0) return '0.00';
  return (value / 1_000_000_000).toFixed(2);
}

function formatMemberSince(date: string | undefined): string {
  if (!date) return '';
  return formatMonthYear(date);
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user: telegramUser, hapticFeedback } = useTelegram();
  const { user: authUser, logout } = useAuth();
  const wallet = useTonWallet();

  const { data: userStats, isLoading } = useQuery({
    queryKey: ['user-profile-stats'],
    queryFn: async () => {
      const response = await api.get<UserStats>('/users/me');
      return response.data;
    },
    enabled: !!authUser?.id,
    staleTime: 1000 * 60 * 2,
  });

  const { data: achievementsData } = useQuery({
    queryKey: ['achievements-preview'],
    queryFn: achievementsApi.getAll,
    staleTime: 1000 * 60 * 5,
  });

  const displayName = telegramUser?.first_name || authUser?.firstName || 'User';
  const displayLastName = telegramUser?.last_name || authUser?.lastName || '';
  const displayUsername = telegramUser?.username || authUser?.telegramUsername;
  const displayPhoto = telegramUser?.photo_url || authUser?.photoUrl || `https://ui-avatars.com/api/?name=${displayName}&background=ffffff&color=000`;

  const totalDeals = userStats?.totalDeals || 0;
  const successfulDeals = userStats?.successfulDeals || 0;
  const rating = userStats?.rating || 0;

  const featuresMenuItems = [
    { icon: LayoutGrid, label: t('profile.myChannels'), path: '/channels', iconColor: 'text-[#3390ec]', iconBg: 'bg-[#3390ec]/15' },
    { icon: Handshake, label: t('profile.myDeals'), path: '/deals', iconColor: 'text-[#22C55E]', iconBg: 'bg-[#22C55E]/15' },
    { icon: Star, label: t('profile.reviews'), path: '/reviews', iconColor: 'text-[#F59E0B]', iconBg: 'bg-[#F59E0B]/15', badge: userStats?.reviewCount },
    { icon: Users, label: t('profile.referrals'), path: '/referrals', iconColor: 'text-[#8B5CF6]', iconBg: 'bg-[#8B5CF6]/15' },
    { icon: Wallet, label: t('profile.wallet'), path: '/wallet', iconColor: 'text-[#06B6D4]', iconBg: 'bg-[#06B6D4]/15' },
  ];

  const settingsMenuItems = [
    { icon: Bell, label: t('profile.notifications'), path: '/notifications', iconColor: 'text-[#EF4444]', iconBg: 'bg-[#EF4444]/15' },
    { icon: Globe, label: t('profile.language'), path: '/settings/language', iconColor: 'text-[#3390ec]', iconBg: 'bg-[#3390ec]/15' },
    { icon: HelpCircle, label: t('profile.support'), path: '/support', iconColor: 'text-[#F97316]', iconBg: 'bg-[#F97316]/15' },
  ];

  const handleLogout = () => {
    hapticFeedback('impact');
    logout();
  };

  const memberSince = formatMemberSince(userStats?.createdAt);

  const achievementLevel = achievementsData?.level;
  const achievementStats = achievementsData?.stats;

  return (
    <div className="min-h-full pb-4 page-enter">
      <div className="px-5 pt-6 pb-2">
        <div className="flex items-center gap-2">
          <img src="/logob.png" alt="" className="w-5 h-5 opacity-40" />
          <span className="text-[#555] text-xs uppercase tracking-wider font-medium">{t('profile.title')}</span>
        </div>
      </div>

      <div className="px-5 mb-6 flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <img
            src={displayPhoto}
            alt={displayName}
            className="w-16 h-16 rounded-2xl object-cover border border-[#1A1A1A]"
          />
          {wallet && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#22C55E] flex items-center justify-center border-2 border-black">
              <CheckCircle className="w-3.5 h-3.5 text-white" strokeWidth={2} />
            </div>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {displayName} {displayLastName}
          </h1>
          {displayUsername && (
            <p className="text-[#666] text-[15px]">@{displayUsername}</p>
          )}
          {memberSince && (
            <p className="text-[#666] text-[13px] mt-0.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />
              {t('profile.memberSince', { date: memberSince })}
            </p>
          )}
        </div>
      </div>

      <div className="px-5 mb-6">
        <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Handshake className="w-4 h-4 text-[#22C55E]" strokeWidth={1.5} />
              <p className="text-2xl font-bold text-white">{isLoading ? '...' : totalDeals}</p>
            </div>
            <p className="text-[#666] text-xs uppercase tracking-wide">{t('profile.deals')}</p>
          </div>
          <div className="text-center border-x border-[#1A1A1A]">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <ShieldCheck className="w-4 h-4 text-white" strokeWidth={1.5} />
              <p className="text-2xl font-bold text-white">{isLoading ? '...' : successfulDeals}</p>
            </div>
            <p className="text-[#666] text-xs uppercase tracking-wide">{t('profile.successful')}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Star className="w-4 h-4 text-white" strokeWidth={1.5} />
              <p className="text-2xl font-bold text-white">{isLoading ? '...' : rating.toFixed(1)}</p>
            </div>
            <p className="text-[#666] text-xs uppercase tracking-wide">{t('profile.rating')}</p>
          </div>
        </div>
      </div>

      {!wallet && (
        <div className="px-5 mb-6">
          <button
            onClick={() => {
              hapticFeedback('selection');
              navigate('/wallet');
            }}
            className="w-full bg-[#111] border border-white/10 rounded-2xl p-4 text-left transition-all duration-200 hover:bg-[#151515] active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <Gem className="w-6 h-6 text-white" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[15px] text-white">{t('profile.connectWallet')}</p>
                <p className="text-[13px] text-[#999]">{t('profile.connectWalletDesc')}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-[#666]" strokeWidth={1.5} />
            </div>
          </button>
        </div>
      )}

      <div className="px-5 mb-6">
        <button
          onClick={() => {
            hapticFeedback('selection');
            navigate('/dashboard');
          }}
          className="w-full bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 text-left transition-all duration-200 hover:bg-[#151515] active:scale-[0.98]"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#999]" strokeWidth={1.5} />
              <h3 className="font-semibold text-[15px] text-white">{t('profile.analytics')}</h3>
            </div>
            <ChevronRight className="w-5 h-5 text-[#666]" strokeWidth={1.5} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[13px] text-[#999] mb-0.5">{t('profile.tonEarned')}</p>
              <p className="text-lg font-bold text-[#22C55E]">{isLoading ? '...' : formatTon(userStats?.totalEarned)} TON</p>
            </div>
            <div>
              <p className="text-[13px] text-[#999] mb-0.5">{t('profile.totalDeals')}</p>
              <p className="text-lg font-bold text-white">{isLoading ? '...' : totalDeals}</p>
            </div>
            <div>
              <p className="text-[13px] text-[#999] mb-0.5">{t('profile.rating')}</p>
              <p className="text-lg font-bold text-white">{isLoading ? '...' : rating.toFixed(1)}</p>
            </div>
          </div>
        </button>
      </div>

      <div className="px-5 mb-6">
        <button
          onClick={() => {
            hapticFeedback('selection');
            navigate('/achievements');
          }}
          className="w-full bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 text-left transition-all duration-200 hover:bg-[#151515] active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#1A1A1A] flex items-center justify-center">
              <Trophy className="w-6 h-6 text-[#ECC679]" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-semibold text-[15px] text-white">
                  {t('profile.achievementsLevel', { level: achievementLevel?.level ?? 1 })}
                </p>
                {achievementLevel?.levelName && (
                  <span className="text-[12px] text-[#ECC679] bg-[#ECC679]/10 px-2 py-0.5 rounded-full">
                    {achievementLevel.levelName}
                  </span>
                )}
              </div>
              <p className="text-[13px] text-[#999] mb-2">
                {t('profile.achievementsUnlocked', {
                  unlocked: achievementStats?.unlocked ?? 0,
                  total: achievementStats?.total ?? 0,
                })}
              </p>
              <div className="w-full h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#ECC679] rounded-full transition-all duration-500"
                  style={{ width: `${achievementLevel?.progress ?? 0}%` }}
                />
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#666] flex-shrink-0" strokeWidth={1.5} />
          </div>
        </button>
      </div>

      <div className="px-5 mb-6">
        <p className="text-[11px] text-[#555] uppercase tracking-wider font-semibold mb-3 ml-1">
          {t('profile.features')}
        </p>
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl overflow-hidden divide-y divide-[#1A1A1A]">
          {featuresMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => {
                  hapticFeedback('selection');
                  navigate(item.path);
                }}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-colors active:bg-white/[0.03]"
              >
                <div className={`w-9 h-9 rounded-[10px] ${item.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-[18px] h-[18px] ${item.iconColor}`} strokeWidth={1.5} />
                </div>
                <span className="flex-1 text-[15px] text-white">{item.label}</span>
                {'badge' in item && item.badge ? (
                  <span className="text-[12px] text-[#999] bg-[#1A1A1A] min-w-[24px] text-center px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                ) : null}
                <ChevronRight className="w-4.5 h-4.5 text-[#444]" strokeWidth={1.5} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 mb-6">
        <p className="text-[11px] text-[#555] uppercase tracking-wider font-semibold mb-3 ml-1">
          {t('profile.settings')}
        </p>
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl overflow-hidden divide-y divide-[#1A1A1A]">
          {settingsMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => {
                  hapticFeedback('selection');
                  navigate(item.path);
                }}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-colors active:bg-white/[0.03]"
              >
                <div className={`w-9 h-9 rounded-[10px] ${item.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-[18px] h-[18px] ${item.iconColor}`} strokeWidth={1.5} />
                </div>
                <span className="flex-1 text-[15px] text-white">{item.label}</span>
                <ChevronRight className="w-4.5 h-4.5 text-[#444]" strokeWidth={1.5} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#111] border border-[#1A1A1A] rounded-2xl text-[#EF4444] font-medium text-[15px] transition-all duration-200 hover:bg-[#EF4444]/10 active:scale-[0.98]"
        >
          <LogOut className="w-5 h-5" strokeWidth={1.5} />
          {t('profile.logout')}
        </button>
      </div>

      <div className="px-5 mt-6 text-center">
        <p className="text-[13px] text-[#666]">{t('profile.version')}</p>
      </div>
    </div>
  );
}

export default ProfilePage;
