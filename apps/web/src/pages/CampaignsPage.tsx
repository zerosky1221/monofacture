import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Megaphone, Users, DollarSign, FileText } from '../components/icons';
import { Card } from '../components/ui/Card';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { ListItemSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { apiClient } from '../api/client';
import { formatTon, formatRelativeTime, getCategoryIcon, cn } from '../lib/utils';
import { useTranslation } from '../i18n';

interface Campaign {
  id: string;
  title: string;
  description: string;
  status: string;
  targetCategories: string[];
  totalBudget: string;
  minPricePerPost?: string;
  maxPricePerPost?: string;
  adFormats: string[];
  applicationCount: number;
  advertiser: {
    id: string;
    telegramUsername?: string;
    firstName?: string;
    rating: number;
  };
  createdAt: string;
}

interface CampaignsResponse {
  items: Campaign[];
  total: number;
}

export function CampaignsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', page],
    queryFn: () =>
      apiClient.get<CampaignsResponse>(`/campaigns?page=${page}&limit=20&status=ACTIVE`),
  });

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
          <h1 className="text-[22px] font-bold text-white">{t('campaigns.title')}</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <ListItemSkeleton key={i} />
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="w-8 h-8" />}
          title={t('campaigns.noActive')}
          description={t('campaigns.checkBackLater')}
        />
      ) : (
        <div className="space-y-3">
          {data?.items.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onClick={() => navigate(`/campaigns/${campaign.id}`)}
            />
          ))}
        </div>
      )}

      {data && data.total > 20 && (
        <div className="flex justify-center gap-3 mt-6">
          <Button
            variant="secondary"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {t('campaigns.previous')}
          </Button>
          <span className="flex items-center text-sm text-text-secondary">
            {page} / {Math.ceil(data.total / 20)}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page * 20 >= data.total}
            onClick={() => setPage((p) => p + 1)}
          >
            {t('campaigns.next')}
          </Button>
        </div>
      )}
      </div>
    </div>
  );
}

interface CampaignCardProps {
  campaign: Campaign;
  onClick: () => void;
}

function CampaignCard({ campaign, onClick }: CampaignCardProps) {
  const { t } = useTranslation();
  return (
    <Card onClick={onClick} className="card-press">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-white">{campaign.title}</h3>
        <StatusBadge status={campaign.status} />
      </div>

      <p className="text-sm text-text-secondary line-clamp-2 mb-3">
        {campaign.description}
      </p>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-accent-green font-semibold">
            {formatTon(campaign.totalBudget)} TON
          </span>
          <span className="text-text-tertiary text-sm">{t('campaigns.budget')}</span>
        </div>
        <div className="flex items-center gap-1 text-text-secondary text-sm">
          <FileText className="w-4 h-4" />
          <span>{campaign.applicationCount} {t('campaigns.applications')}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {campaign.targetCategories?.slice(0, 3).map((cat) => (
          <Badge key={cat} variant="default">
            {getCategoryIcon(cat)} {cat}
          </Badge>
        ))}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-dark-separator">
        <div className="flex gap-2">
          {campaign.adFormats?.map((format) => (
            <span key={format} className="text-xs text-text-tertiary bg-dark-elevated px-2 py-1 rounded">
              {format}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Avatar
            name={campaign.advertiser.firstName || campaign.advertiser.telegramUsername}
            size="sm"
          />
          <span>{formatRelativeTime(campaign.createdAt)}</span>
        </div>
      </div>
    </Card>
  );
}
