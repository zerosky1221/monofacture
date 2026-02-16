import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, CheckCircle, Clock, XCircle, ChevronRight, Users, Eye, MessageCircle, LayoutGrid, RefreshCw } from '../components/icons';
import { ChannelAvatar } from '../components/ui/ChannelAvatar';
import { useTelegram } from '../providers/TelegramProvider';
import { useTranslation } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../api/client';
import { Skeleton } from '../components/ui/Skeleton';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';

type ChannelStatus = 'VERIFIED' | 'PENDING_VERIFICATION' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';

interface MyChannel {
  id: string;
  title: string;
  username?: string;
  subscriberCount: number;
  averageViews?: number;
  status: ChannelStatus;
  photoUrl?: string;
  pricing?: Array<{ adFormat: string; price: string | number; isActive: boolean }>;
}

function useStatusConfig() {
  const { t } = useTranslation();
  return {
    VERIFIED: { label: t('channels.statusVerified'), color: 'text-[#22C55E]', bg: 'bg-[#22C55E]/20', icon: CheckCircle },
    ACTIVE: { label: t('channels.statusActive'), color: 'text-[#22C55E]', bg: 'bg-[#22C55E]/20', icon: CheckCircle },
    PENDING_VERIFICATION: { label: t('channels.statusPending'), color: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/20', icon: Clock },
    REJECTED: { label: t('channels.statusRejected'), color: 'text-[#EF4444]', bg: 'bg-[#EF4444]/20', icon: XCircle },
    SUSPENDED: { label: t('channels.statusSuspended'), color: 'text-[#EF4444]', bg: 'bg-[#EF4444]/20', icon: XCircle },
  } as Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle }>;
}

export function ChannelsPage() {
  const navigate = useNavigate();
  const { hapticFeedback } = useTelegram();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  const { data: myChannelsData, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['my-channels'],
    queryFn: () => apiClient.get<MyChannel[]>('/channels/my/channels'),
    enabled: isAuthenticated,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const myChannels = Array.isArray(myChannelsData) ? myChannelsData : [];

  const handleAddChannel = () => {
    hapticFeedback('impact');
    const tg = window.Telegram?.WebApp as any;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink('https://t.me/MonofactureBot?start=addchannel');
    } else {
      window.open('https://t.me/MonofactureBot?start=addchannel', '_blank');
    }
  };

  return (
    <div className="min-h-full pt-4 pb-4 page-enter">
      <div className="flex items-center justify-between px-4 mb-6">
        <div>
          <h1 className="text-[22px] font-bold">{t('channels.title')}</h1>
          <p className="text-[#999999] text-[15px] mt-1">{t('channels.channelCount', { count: myChannels.length })}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              hapticFeedback('selection');
              refetch();
            }}
            disabled={isRefetching}
            className={cn(
              "p-3 rounded-2xl bg-[#0A0A0A] border border-[#1A1A1A] transition-all duration-200",
              isRefetching && "animate-spin"
            )}
          >
            <RefreshCw className="w-5 h-5 text-[#999999]" strokeWidth={1.5} />
          </button>
          <button
            onClick={handleAddChannel}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-2xl font-medium text-[15px] transition-all duration-200 hover:shadow-lg hover:shadow-white/10 active:scale-[0.95]"
          >
            <Plus className="w-5 h-5" strokeWidth={1.5} />
            {t('channels.add')}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="px-4 space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-3xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="px-4">
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-3xl p-8 text-center">
            <p className="text-[#999] text-[15px] mb-4">{t('channels.failedToLoad')}</p>
            <Button className="w-full" size="lg" icon={RefreshCw} onClick={() => refetch()}>
              {t('common.retry')}
            </Button>
          </div>
        </div>
      ) : myChannels.length > 0 ? (
        <div className="px-4 space-y-3">
          {myChannels.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              onClick={() => {
                hapticFeedback('selection');
                navigate(`/channels/${channel.id}/manage`);
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState onAddChannel={handleAddChannel} t={t} />
      )}
    </div>
  );
}

interface ChannelCardProps {
  channel: MyChannel;
  onClick: () => void;
}

function ChannelCard({ channel, onClick }: ChannelCardProps) {
  const STATUS_CONFIG = useStatusConfig();
  const { t } = useTranslation();
  const statusConfig = STATUS_CONFIG[channel.status] || STATUS_CONFIG.PENDING_VERIFICATION;
  const StatusIcon = statusConfig.icon;

  return (
    <button
      onClick={onClick}
      className="w-full bg-[#0A0A0A] border border-[#1A1A1A] rounded-3xl p-4 text-left transition-all duration-200 hover:bg-[#111111] hover:border-[#2A2A2A] active:scale-[0.98]"
    >
      <div className="flex items-start gap-3">
        <ChannelAvatar
          photoUrl={channel.photoUrl}
          title={channel.title}
          size="lg"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-[15px] truncate">{channel.title}</h3>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${statusConfig.bg} ${statusConfig.color}`}>
              <StatusIcon className="w-3 h-3" strokeWidth={1.5} />
              {statusConfig.label}
            </span>
          </div>
          {channel.username && (
            <p className="text-[13px] text-[#666666] mb-2">@{channel.username}</p>
          )}
          <div className="flex items-center gap-4 text-[13px] text-[#999999]">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" strokeWidth={1.5} />
              {channel.subscriberCount?.toLocaleString() || 0}
            </span>
            {channel.averageViews !== undefined && (
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4" strokeWidth={1.5} />
                {channel.averageViews.toLocaleString()} {t('channels.avg')}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-[#666666] flex-shrink-0 mt-1" strokeWidth={1.5} />
      </div>
    </button>
  );
}

interface EmptyStateProps {
  onAddChannel: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function EmptyState({ onAddChannel, t }: EmptyStateProps) {
  const steps = [
    { number: 1, text: t('channels.step1') },
    { number: 2, text: t('channels.step2') },
    { number: 3, text: t('channels.step3') },
    { number: 4, text: t('channels.step4') },
  ];

  return (
    <div className="px-4">
      <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-3xl p-8 text-center">
        <div className="w-20 h-20 rounded-3xl bg-[#1A1A1A] flex items-center justify-center mx-auto mb-5">
          <LayoutGrid className="w-10 h-10 text-white" strokeWidth={1.5} />
        </div>
        <h2 className="text-xl font-semibold mb-2">{t('channels.empty')}</h2>
        <p className="text-[#999999] text-[15px] mb-6 max-w-[280px] mx-auto">
          {t('channels.emptyDesc')}
        </p>

        <div className="text-left bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-4 mb-6">
          <p className="text-[13px] text-[#666666] uppercase tracking-wide font-medium mb-4">{t('channels.howToAdd')}</p>
          <div className="space-y-4">
            {steps.map((step) => (
              <div key={step.number} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-white flex items-center justify-center flex-shrink-0 text-[13px] font-semibold text-black">
                  {step.number}
                </div>
                <p className="text-[15px] text-[#999999] pt-0.5">{step.text}</p>
              </div>
            ))}
          </div>
        </div>

        <Button className="w-full" size="lg" icon={MessageCircle} onClick={onAddChannel}>
          {t('channels.openBot')}
        </Button>
      </div>
    </div>
  );
}

export default ChannelsPage;
