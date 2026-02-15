import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plus, Tv, Users, Handshake, TrendingUp, CheckCircle } from '../components/icons';
import { useTelegram } from '../providers/TelegramProvider';
import { Card, CardHeader, StatCard } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ChannelAvatar } from '../components/ui/Avatar';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { ChannelCardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { channelsApi, Channel } from '../api/channels';
import { formatNumber, formatTon, cn } from '../lib/utils';
import { useTranslation } from '../i18n';
import { useScrollMemory } from '../hooks/useScrollMemory';

export function MyChannelsPage() {
  const navigate = useNavigate();
  const { hapticFeedback } = useTelegram();
  const { t } = useTranslation();
  useScrollMemory('/my-channels');

  const { data: channels, isLoading } = useQuery({
    queryKey: ['my-channels'],
    queryFn: () => channelsApi.getMyChannels(),
  });

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
    <div className="min-h-full pb-24 page-enter">
      <div className="bg-black border-b border-[#1A1A1A] px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#1A1A1A] active:scale-95 transition-all">
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-xl font-semibold text-white">{t('channels.title')}</h1>
          </div>
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={handleAddChannel}>{t('channels.add')}</Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <ChannelCardSkeleton key={i} />
          ))}
        </div>
      ) : channels?.length === 0 ? (
        <EmptyState
          icon={<Tv className="w-8 h-8" />}
          title={t('channels.empty')}
          description={t('channels.emptyDesc')}
          action={{
            label: t('channels.addChannel'),
            onClick: handleAddChannel,
          }}
        />
      ) : (
        <div className="space-y-3 stagger-children">
          {channels?.map((channel) => (
            <MyChannelCard key={channel.id} channel={channel} />
          ))}
        </div>
      )}

      <Card className="mt-6">
        <CardHeader title={t('channels.howToAdd')} />
        <div className="space-y-3">
          {[
            t('myChannels.step1'),
            t('myChannels.step2'),
            t('myChannels.step3'),
            t('myChannels.step4'),
            t('myChannels.step5'),
          ].map((step, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-semibold text-white">{index + 1}</span>
              </div>
              <p className="text-sm text-text-secondary">{step}</p>
            </div>
          ))}
        </div>
      </Card>
      </div>
    </div>
  );
}

interface MyChannelCardProps {
  channel: Channel;
}

function MyChannelCard({ channel }: MyChannelCardProps) {
  const { t } = useTranslation();
  return (
    <Card className="card-press glass-card animate-fade-slide-up !bg-transparent">
      <div className="flex gap-3 mb-4">
        <ChannelAvatar
          src={channel.photoUrl}
          name={channel.title}
          size="lg"
          verified={channel.isVerified}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-white truncate">{channel.title}</h3>
              {channel.username && (
                <p className="text-sm text-white">@{channel.username}</p>
              )}
            </div>
            <StatusBadge status={channel.status} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 bg-dark-elevated rounded-lg text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Users className="w-3.5 h-3.5 text-text-tertiary" />
          </div>
          <p className="text-sm font-semibold text-white">
            {formatNumber(channel.subscriberCount)}
          </p>
          <p className="text-xs text-text-secondary">{t('channels.subscribers')}</p>
        </div>
        <div className="p-2 bg-dark-elevated rounded-lg text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Handshake className="w-3.5 h-3.5 text-text-tertiary" />
          </div>
          <p className="text-sm font-semibold text-white">
            {channel.stats?.completedDeals || 0}
          </p>
          <p className="text-xs text-text-secondary">{t('channels.deals')}</p>
        </div>
        <div className="p-2 bg-dark-elevated rounded-lg text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-text-tertiary" />
          </div>
          <p className="text-sm font-semibold text-accent-green">
            {formatTon(channel.stats?.totalEarned || '0')}
          </p>
          <p className="text-xs text-text-secondary">{t('channels.earned')}</p>
        </div>
      </div>
    </Card>
  );
}
