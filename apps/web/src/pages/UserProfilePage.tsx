import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Star, CheckCircle, Users, Handshake, ShieldCheck, Calendar, ExternalLink, ChevronDown, ChevronUp } from '../components/icons';
import { Avatar } from '../components/ui/Avatar';
import { ChannelAvatar } from '../components/ui/ChannelAvatar';
import { api } from '../lib/api';
import { reviewsApi } from '../api/reviews';
import { RatingStats } from '../components/reviews/RatingStats';
import { ReviewCard } from '../components/reviews/ReviewCard';
import { useTranslation } from '../i18n';

interface UserProfile {
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
  createdAt: string;
  ownedChannels: {
    id: string;
    title: string;
    username?: string;
    subscriberCount: number;
    photoUrl?: string;
    rating: number;
  }[];
  _count: {
    dealsAsAdvertiser: number;
    dealsAsChannelOwner: number;
    reviewsReceived: number;
  };
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}

function formatDate(dateStr: string | null | undefined, unknownLabel: string): string {
  if (!dateStr) return unknownLabel;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return unknownLabel;
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

export function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user-profile', id],
    queryFn: async () => {
      const response = await api.get<UserProfile>(`/users/${id}/public`);
      return response.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-20 w-20 bg-[#1A1A1A] rounded-full mx-auto" />
          <div className="h-6 bg-[#1A1A1A] rounded w-1/2 mx-auto" />
          <div className="h-32 bg-[#1A1A1A] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-black p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#999999] mb-4">{t('userProfile.notFound')}</p>
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-white rounded-xl text-black">
            {t('userProfile.goBack')}
          </button>
        </div>
      </div>
    );
  }

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || t('userProfile.user');
  const successRate = user.totalDeals > 0 ? Math.round((user.successfulDeals / user.totalDeals) * 100) : 0;

  return (
    <div className="min-h-screen bg-black">
      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#1A1A1A] active:scale-95 transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-[22px] font-bold text-white">{t('userProfile.title')}</h1>
        </div>
      </div>

      <div className="p-4 pb-24 space-y-4">
        <div className="text-center py-4">
          <div className="mx-auto mb-3">
            <Avatar src={user.photoUrl} name={displayName} size="2xl" className="rounded-full mx-auto" />
          </div>
          <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
            {displayName}
            {user.isVerified && <CheckCircle className="w-5 h-5 text-white" />}
          </h2>
          {user.telegramUsername && (
            <a
              href={`https://t.me/${user.telegramUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white text-sm flex items-center justify-center gap-1 mt-1 hover:underline"
            >
              @{user.telegramUsername}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          <div className="flex items-center justify-center gap-1 mt-2 text-[#666666] text-sm">
            <Calendar className="w-4 h-4" />
            <span>{t('userProfile.memberSince')} {formatDate(user.createdAt, t('userProfile.unknown'))}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-4 text-center">
            <Star className="w-5 h-5 text-[#F59E0B] mx-auto mb-2" />
            <p className="text-xl font-bold text-white">{user.rating.toFixed(1)}</p>
            <p className="text-xs text-[#999999]">{user.reviewCount} {t('userProfile.reviews')}</p>
          </div>
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-4 text-center">
            <Handshake className="w-5 h-5 text-[#22C55E] mx-auto mb-2" />
            <p className="text-xl font-bold text-white">{user.totalDeals}</p>
            <p className="text-xs text-[#999999]">{t('userProfile.totalDeals')}</p>
          </div>
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-4 text-center">
            <ShieldCheck className="w-5 h-5 text-white mx-auto mb-2" />
            <p className="text-xl font-bold text-white">{successRate}%</p>
            <p className="text-xs text-[#999999]">{t('userProfile.successRate')}</p>
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-white mb-3">{t('userProfile.activity')}</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[#999999]">{t('userProfile.asAdvertiser')}</span>
              <span className="text-white font-medium">{user._count.dealsAsAdvertiser} {t('userProfile.deals')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#999999]">{t('userProfile.asPublisher')}</span>
              <span className="text-white font-medium">{user._count.dealsAsChannelOwner} {t('userProfile.deals')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#999999]">{t('userProfile.successful')}</span>
              <span className="text-[#22C55E] font-medium">{user.successfulDeals} {t('userProfile.deals')}</span>
            </div>
          </div>
        </div>

        {user.reviewCount > 0 && (
          <UserReviewsSection userId={user.id} />
        )}

        {user.ownedChannels.length > 0 && (
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-4">
            <h3 className="text-lg font-semibold text-white mb-3">{t('userProfile.channels')}</h3>
            <div className="space-y-3">
              {user.ownedChannels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => navigate(`/channel/${channel.id}`)}
                  className="w-full flex items-center gap-3 p-3 bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl hover:bg-[#111111] transition-all active:scale-[0.98]"
                >
                  <ChannelAvatar photoUrl={channel.photoUrl} title={channel.title} size="sm" />
                  <div className="flex-1 text-left">
                    <p className="font-medium text-white">{channel.title}</p>
                    <div className="flex items-center gap-2 text-xs text-[#999999]">
                      {channel.username && <span>@{channel.username}</span>}
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {formatNumber(channel.subscriberCount)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 text-[#F59E0B]" />
                    <span className="text-[#999999]">{channel.rating?.toFixed(1) || '0.0'}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UserReviewsSection({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);
  const PREVIEW_COUNT = 2;

  const { data: stats } = useQuery({
    queryKey: ['review-stats', userId],
    queryFn: () => reviewsApi.getStats(userId),
  });

  const { data: reviews } = useQuery({
    queryKey: ['user-reviews', userId],
    queryFn: () => reviewsApi.getUserReviews(userId, 1, 5),
  });

  const items = reviews?.items || [];
  const visibleItems = showAll ? items : items.slice(0, PREVIEW_COUNT);

  return (
    <div className="space-y-3">
      {stats && <RatingStats stats={stats} />}
      {visibleItems.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
      {items.length > PREVIEW_COUNT && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-[13px] text-[#999] hover:text-white transition-colors"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-4 h-4" strokeWidth={1.5} />
              {t('common.showLess')}
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
              {t('common.showAll', { count: items.length })}
            </>
          )}
        </button>
      )}
    </div>
  );
}
