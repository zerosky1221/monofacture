import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Handshake, ChevronRight, Compass, ArrowUpRight, ArrowDownLeft, RefreshCw, FileText, Pin, Clock, Calendar } from '../components/icons';
import { useTelegram } from '../providers/TelegramProvider';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../i18n';
import { dealsApi, Deal, DealStatus } from '../api/deals';
import { ChannelAvatar } from '../components/ui/Avatar';
import { Skeleton } from '../components/ui/Skeleton';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { formatRelative } from '../lib/date';
import { DealTutorial } from '../components/deals/DealTutorial';
import { useScrollMemory } from '../hooks/useScrollMemory';

const STATUS_STYLES: Record<DealStatus, { color: string; bg: string; dot: string }> = {
  CREATED: { color: 'text-[#999]', bg: 'bg-[#999]/15', dot: 'bg-[#999]' },
  PENDING_PAYMENT: { color: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/15', dot: 'bg-[#F59E0B]' },
  PAYMENT_RECEIVED: { color: 'text-[#22C55E]', bg: 'bg-[#22C55E]/15', dot: 'bg-[#22C55E]' },
  IN_PROGRESS: { color: 'text-white', bg: 'bg-white/10', dot: 'bg-white' },
  CREATIVE_PENDING: { color: 'text-[#3390ec]', bg: 'bg-[#3390ec]/15', dot: 'bg-[#3390ec]' },
  CREATIVE_SUBMITTED: { color: 'text-[#3390ec]', bg: 'bg-[#3390ec]/15', dot: 'bg-[#3390ec]' },
  CREATIVE_APPROVED: { color: 'text-[#22C55E]', bg: 'bg-[#22C55E]/15', dot: 'bg-[#22C55E]' },
  CREATIVE_REVISION_REQUESTED: { color: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/15', dot: 'bg-[#F59E0B]' },
  SCHEDULED: { color: 'text-white', bg: 'bg-white/10', dot: 'bg-white' },
  POSTED: { color: 'text-[#22C55E]', bg: 'bg-[#22C55E]/15', dot: 'bg-[#22C55E]' },
  VERIFYING: { color: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/15', dot: 'bg-[#F59E0B]' },
  VERIFIED: { color: 'text-[#22C55E]', bg: 'bg-[#22C55E]/15', dot: 'bg-[#22C55E]' },
  COMPLETED: { color: 'text-[#22C55E]', bg: 'bg-[#22C55E]/15', dot: 'bg-[#22C55E]' },
  CANCELLED: { color: 'text-[#999]', bg: 'bg-[#999]/10', dot: 'bg-[#999]' },
  DISPUTED: { color: 'text-[#EF4444]', bg: 'bg-[#EF4444]/15', dot: 'bg-[#EF4444]' },
  REFUNDED: { color: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/15', dot: 'bg-[#F59E0B]' },
  EXPIRED: { color: 'text-[#999]', bg: 'bg-[#999]/10', dot: 'bg-[#999]' },
};

type FilterTab = 'active' | 'completed' | 'all';

const ACTIVE_STATUSES: DealStatus[] = [
  'CREATED', 'PENDING_PAYMENT', 'PAYMENT_RECEIVED', 'IN_PROGRESS',
  'CREATIVE_PENDING', 'CREATIVE_SUBMITTED', 'CREATIVE_APPROVED',
  'CREATIVE_REVISION_REQUESTED', 'SCHEDULED', 'POSTED', 'VERIFYING', 'VERIFIED'
];

const COMPLETED_STATUSES: DealStatus[] = ['COMPLETED', 'CANCELLED', 'REFUNDED', 'EXPIRED', 'DISPUTED'];

const formatDate = formatRelative;

function formatTon(nanoTon: bigint | string | number | undefined | null): string {
  if (!nanoTon) return '0.00';
  const value = typeof nanoTon === 'bigint' ? Number(nanoTon) : Number(nanoTon);
  if (isNaN(value) || value === 0) return '0.00';
  return (value / 1_000_000_000).toFixed(2);
}

function getFormatIcon(format: string | undefined) {
  switch (format) {
    case 'PIN':
      return Pin;
    case 'REPOST':
      return RefreshCw;
    default:
      return FileText;
  }
}

export function DealsPage() {
  const navigate = useNavigate();
  const { hapticFeedback } = useTelegram();
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<FilterTab>('active');
  useScrollMemory(`/deals:${activeTab}`);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['deals', activeTab],
    queryFn: async () => {
      return dealsApi.getAll();
    },
    enabled: isAuthenticated,
  });

  const deals = data?.data || data?.items || [];

  const filterDeals = (dealsList: Deal[], tab: FilterTab): Deal[] => {
    switch (tab) {
      case 'active':
        return dealsList.filter(d => ACTIVE_STATUSES.includes(d.status));
      case 'completed':
        return dealsList.filter(d => COMPLETED_STATUSES.includes(d.status));
      case 'all':
      default:
        return dealsList;
    }
  };

  const filteredDeals = filterDeals(deals, activeTab);

  const tabs: { key: FilterTab; labelKey: string }[] = [
    { key: 'active', labelKey: 'deals.active' },
    { key: 'completed', labelKey: 'deals.completed' },
    { key: 'all', labelKey: 'deals.all' },
  ];

  return (
    <div className="min-h-full pt-4 pb-4 page-enter">
      <div className="px-4 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-white">{t('deals.title')}</h1>
          <p className="text-[#999] text-[15px] mt-1">{t('deals.totalDeals', { count: deals.length })}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              hapticFeedback('selection');
              navigate('/calendar');
            }}
            className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center"
          >
            <Calendar className="w-5 h-5 text-[#999]" strokeWidth={1.5} />
          </button>
          <button
            onClick={() => {
              hapticFeedback('selection');
              refetch();
            }}
            disabled={isRefetching}
            className={cn(
              "p-3 rounded-2xl bg-[#0A0A0A] border border-[#1A1A1A] transition-all duration-300",
              isRefetching && "animate-spin"
            )}
          >
            <RefreshCw className="w-5 h-5 text-[#999]" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="px-4 mb-6">
        <div className="flex gap-1 p-1.5 bg-[#1A1A1A] rounded-2xl">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                hapticFeedback('selection');
                setActiveTab(tab.key);
              }}
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 truncate px-2 ${
                activeTab === tab.key
                  ? 'bg-[#333333] text-white'
                  : 'text-[#666] hover:text-[#999]'
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <DealTutorial />

      {isLoading ? (
        <div className="px-4 space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-3xl" />
          ))}
        </div>
      ) : filteredDeals.length > 0 ? (
        <div className="px-4 space-y-3 stagger-children">
          {filteredDeals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              isAdvertiser={deal.advertiserId === user?.id}
              onClick={() => {
                hapticFeedback('selection');
                navigate(`/deals/${deal.id}`);
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState tab={activeTab} onBrowse={() => {
          hapticFeedback('selection');
          navigate('/');
        }} />
      )}
    </div>
  );
}

interface DealCardProps {
  deal: Deal;
  isAdvertiser: boolean;
  onClick: () => void;
}

function DealCard({ deal, isAdvertiser, onClick }: DealCardProps) {
  const { t } = useTranslation();
  const statusStyles = STATUS_STYLES[deal.status] || STATUS_STYLES.CREATED;
  const FormatIcon = getFormatIcon(deal.adFormat);

  return (
    <button
      onClick={onClick}
      className="w-full bg-[#0A0A0A] border border-[#1A1A1A] rounded-3xl text-left transition-all duration-300 hover:border-[#333] active:scale-[0.98] animate-fade-slide-up overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <ChannelAvatar
            src={deal.channel?.photoUrl}
            name={deal.channel?.title || 'Channel'}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <FormatIcon className="w-4 h-4 text-[#666]" strokeWidth={1.5} />
                <p className="text-[13px] text-[#666]">{deal.adFormat}</p>
              </div>
              <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${statusStyles.bg} ${statusStyles.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusStyles.dot}`} />
                {t(`deals.status.${deal.status}`)}
              </span>
            </div>
            <h3 className="font-semibold text-[15px] truncate mb-1 text-white">{deal.channel?.title}</h3>
            <div className="flex items-center gap-1.5 text-[13px] text-[#666]">
              <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
              {formatDate(deal.createdAt)}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[#666] flex-shrink-0 mt-1" strokeWidth={1.5} />
        </div>
      </div>
      <div className="px-4 py-3 border-t border-[#1A1A1A] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {isAdvertiser ? (
            <ArrowUpRight className="w-4 h-4 text-[#666]" strokeWidth={1.5} />
          ) : (
            <ArrowDownLeft className="w-4 h-4 text-[#22C55E]" strokeWidth={1.5} />
          )}
          <span className="text-[13px] text-[#666]">{isAdvertiser ? t('deals.outgoing') : t('deals.incoming')}</span>
        </div>
        <p className={`font-bold text-[20px] ${isAdvertiser ? 'text-white' : 'text-[#22C55E]'}`}>
          {isAdvertiser ? '' : '+'}{formatTon(deal.totalAmount)} TON
        </p>
      </div>
    </button>
  );
}

interface EmptyStateProps {
  tab: FilterTab;
  onBrowse: () => void;
}

function EmptyState({ tab, onBrowse }: EmptyStateProps) {
  const { t } = useTranslation();
  const messages = {
    active: { title: t('deals.noActiveDeals'), desc: t('deals.noActiveDealsDesc') },
    completed: { title: t('deals.noCompletedDeals'), desc: t('deals.noCompletedDealsDesc') },
    all: { title: t('deals.noDealsYet'), desc: t('deals.noDealsYetDesc') },
  };

  const { title, desc } = messages[tab];

  return (
    <div className="px-4">
      <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-3xl p-8 text-center animate-fade-slide-up">
        <div className="w-20 h-20 rounded-3xl bg-[#1A1A1A] flex items-center justify-center mx-auto mb-5">
          <Handshake className="w-10 h-10 text-white" strokeWidth={1.5} />
        </div>
        <h2 className="text-xl font-semibold mb-2 text-white">{title}</h2>
        <p className="text-[#999] text-[15px] mb-6 max-w-[280px] mx-auto">{desc}</p>
        <Button className="w-full" size="lg" icon={Compass} onClick={onBrowse}>
          {t('deals.browseChannels')}
        </Button>
      </div>
    </div>
  );
}

export default DealsPage;
