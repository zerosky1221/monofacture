import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, DollarSign, Users, FileText, Star, Calendar, Target } from '../components/icons';
import { useAuth } from '../hooks/useAuth';
import { useTelegram } from '../providers/TelegramProvider';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/EmptyState';
import { apiClient } from '../api/client';
import { formatTon, formatDate, getCategoryIcon, cn } from '../lib/utils';
import toast from 'react-hot-toast';
import { useTranslation } from '../i18n';

interface Campaign {
  id: string;
  title: string;
  description: string;
  brief?: string;
  status: string;
  targetCategories: string[];
  targetLanguages: string[];
  minSubscribers?: number;
  maxSubscribers?: number;
  totalBudget: string;
  minPricePerPost?: string;
  maxPricePerPost?: string;
  adFormats: string[];
  creativeGuidelines?: string;
  applicationCount: number;
  advertiser: {
    id: string;
    telegramUsername?: string;
    firstName?: string;
    rating: number;
    totalDeals: number;
  };
  createdAt: string;
  startDate?: string;
  endDate?: string;
}

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const { hapticFeedback, showAlert } = useTelegram();
  const { t } = useTranslation();

  const { data: campaign, isLoading, error } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => apiClient.get<Campaign>(`/campaigns/${id}`),
    enabled: !!id,
  });

  const handleApply = () => {
    hapticFeedback('selection');
    showAlert(
      'To apply:\n\n' +
      '1. Make sure you have a verified channel\n' +
      '2. Open @TelegramAdsBot\n' +
      '3. Send /campaigns command\n' +
      '4. Select this campaign and submit your application'
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-full pb-24 page-enter">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#1A1A1A] active:scale-95 transition-all"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-[22px] font-bold text-white">{t('campaigns.detail')}</h1>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-32 rounded-card" />
          <Skeleton className="h-24 rounded-card" />
          <Skeleton className="h-40 rounded-card" />
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-full pb-24 page-enter">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#1A1A1A] active:scale-95 transition-all"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-[22px] font-bold text-white">{t('campaigns.detail')}</h1>
          </div>
        </div>
        <div className="p-4">
          <ErrorState
            title={t('campaigns.notFound')}
            message={t('campaigns.notFoundDesc')}
            onRetry={() => navigate('/campaigns')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full pb-24 page-enter">
      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#1A1A1A] active:scale-95 transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-[22px] font-bold text-white">{t('campaigns.detail')}</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
      <div>
        <div className="flex justify-between items-start gap-3">
          <h2 className="text-xl font-bold text-white">{campaign.title}</h2>
          <StatusBadge status={campaign.status} />
        </div>
        <p className="text-sm text-text-secondary mt-1">
          by @{campaign.advertiser.telegramUsername || 'Unknown'}
        </p>
      </div>

      <Card className="mb-4">
        <CardHeader title={t('campaigns.description')} />
        <p className="text-text-secondary">{campaign.description}</p>
        {campaign.brief && (
          <div className="mt-4 p-3 bg-dark-elevated rounded-lg">
            <p className="text-sm font-medium text-white mb-1">{t('campaigns.briefLabel')}</p>
            <p className="text-sm text-text-secondary">{campaign.brief}</p>
          </div>
        )}
      </Card>

      <Card className="mb-4">
        <CardHeader title={t('campaigns.budgetSection')} />
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-dark-elevated rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-accent-green" />
              <span className="text-xs text-text-secondary">{t('campaigns.totalBudget')}</span>
            </div>
            <p className="text-lg font-bold text-accent-green">
              {formatTon(campaign.totalBudget)} TON
            </p>
          </div>
          {(campaign.minPricePerPost || campaign.maxPricePerPost) && (
            <div className="p-3 bg-dark-elevated rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-accent-blue" />
                <span className="text-xs text-text-secondary">{t('campaigns.priceRange')}</span>
              </div>
              <p className="font-medium text-white">
                {campaign.minPricePerPost ? formatTon(campaign.minPricePerPost) : '0'} -{' '}
                {campaign.maxPricePerPost ? formatTon(campaign.maxPricePerPost) : '∞'} TON
              </p>
            </div>
          )}
        </div>
      </Card>

      <Card className="mb-4">
        <CardHeader title={t('campaigns.requirementsSection')} />
        <div className="space-y-4">
          <div>
            <p className="text-sm text-text-secondary mb-2">{t('campaigns.targetCategories')}</p>
            <div className="flex flex-wrap gap-1.5">
              {campaign.targetCategories?.map((cat) => (
                <Badge key={cat}>
                  {getCategoryIcon(cat)} {cat}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm text-text-secondary mb-2">{t('campaigns.adFormats')}</p>
            <div className="flex flex-wrap gap-1.5">
              {campaign.adFormats?.map((format) => (
                <Badge key={format} variant="info">
                  {format}
                </Badge>
              ))}
            </div>
          </div>

          {(campaign.minSubscribers || campaign.maxSubscribers) && (
            <div>
              <p className="text-sm text-text-secondary mb-1">{t('campaigns.subscriberRange')}</p>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-text-tertiary" />
                <span className="text-white">
                  {campaign.minSubscribers?.toLocaleString() || t('filter.any')} -{' '}
                  {campaign.maxSubscribers?.toLocaleString() || t('filter.any')}
                </span>
              </div>
            </div>
          )}

          {campaign.targetLanguages?.length > 0 && (
            <div>
              <p className="text-sm text-text-secondary mb-2">{t('campaigns.languages')}</p>
              <div className="flex flex-wrap gap-1.5">
                {campaign.targetLanguages.map((lang) => (
                  <Badge key={lang} variant="default">
                    {lang}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {(campaign.startDate || campaign.endDate) && (
        <Card className="mb-4">
          <CardHeader title={t('campaigns.scheduleSection')} />
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-text-tertiary" />
            <div>
              {campaign.startDate && (
                <p className="text-white">{t('campaigns.starts')} {formatDate(campaign.startDate)}</p>
              )}
              {campaign.endDate && (
                <p className="text-text-secondary">{t('campaigns.ends')} {formatDate(campaign.endDate)}</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {campaign.creativeGuidelines && (
        <Card className="mb-4">
          <CardHeader title={t('campaigns.creativeGuidelines')} />
          <p className="text-text-secondary whitespace-pre-wrap">
            {campaign.creativeGuidelines}
          </p>
        </Card>
      )}

      <Card className="mb-4">
        <CardHeader title={t('campaigns.advertiserLabel')} />
        <div className="flex items-center gap-3">
          <Avatar
            name={campaign.advertiser.firstName || campaign.advertiser.telegramUsername}
            size="lg"
          />
          <div className="flex-1">
            <p className="font-medium text-white">
              @{campaign.advertiser.telegramUsername || 'Unknown'}
            </p>
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 text-accent-yellow" />
                {campaign.advertiser.rating.toFixed(1)}
              </span>
              <span>{campaign.advertiser.totalDeals} deals</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-text-tertiary" />
            <span className="text-text-secondary">{t('campaigns.applicationsSection')}</span>
          </div>
          <span className="font-semibold text-white">{campaign.applicationCount}</span>
        </div>
      </Card>

      {isAuthenticated && user?.id !== campaign.advertiser.id && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-dark-bg border-t border-dark-separator">
          <Button fullWidth onClick={handleApply}>
            {t('campaigns.apply')}
          </Button>
        </div>
      )}
      </div>
    </div>
  );
}
