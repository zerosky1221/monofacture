import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Star, MessageSquare, Clock, ArrowLeft, Hash } from '../components/icons';
import { reviewsApi } from '../api';
import type { CreateReviewData } from '../api/reviews';
import { channelReviewsApi } from '../api/channelReviews';
import type { ChannelReview } from '../api/channelReviews';
import { ReviewCard } from '../components/reviews/ReviewCard';
import { ReviewForm } from '../components/reviews/ReviewForm';
import { RatingStats } from '../components/reviews/RatingStats';
import { StarRating } from '../components/reviews/StarRating';
import { useAuth } from '../hooks/useAuth';
import { useTelegram } from '../providers/TelegramProvider';
import { formatDealTimestamp } from '../lib/date';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';
import { useTranslation } from '../i18n';
import { useScrollMemory } from '../hooks/useScrollMemory';

type TabType = 'received' | 'given' | 'channels' | 'pending';

export function ReviewsPage() {
  const { hapticFeedback } = useTelegram();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('received');
  useScrollMemory(`/reviews:${activeTab}`);
  const [reviewFormDeal, setReviewFormDeal] = useState<{
    dealId: string;
    recipientRole: 'advertiser' | 'channelOwner';
  } | null>(null);

  const { data: receivedData, isLoading: receivedLoading } = useQuery({
    queryKey: ['reviews', 'received'],
    queryFn: () => reviewsApi.getMyReceived(),
    enabled: activeTab === 'received',
  });

  const { data: givenData, isLoading: givenLoading } = useQuery({
    queryKey: ['reviews', 'given'],
    queryFn: () => reviewsApi.getMyGiven(),
    enabled: activeTab === 'given',
  });

  const { data: channelReviewsData, isLoading: channelReviewsLoading } = useQuery({
    queryKey: ['channel-reviews', 'my'],
    queryFn: () => channelReviewsApi.getMy(),
    enabled: activeTab === 'channels',
  });

  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['reviews', 'pending'],
    queryFn: () => reviewsApi.getPending(),
    enabled: activeTab === 'pending',
  });

  const { data: myStats } = useQuery({
    queryKey: ['reviews', 'stats', user?.id],
    queryFn: () => reviewsApi.getStats(user!.id),
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateReviewData) => reviewsApi.create(data),
    onSuccess: () => {
      toast.success('Review submitted');
      setReviewFormDeal(null);
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit review');
    },
  });

  const replyMutation = useMutation({
    mutationFn: ({ reviewId, reply }: { reviewId: string; reply: string }) =>
      reviewsApi.reply(reviewId, reply),
    onSuccess: () => {
      toast.success('Reply sent');
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send reply');
    },
  });

  const tabs: { key: TabType; label: string; icon: typeof Star; count?: number }[] = [
    { key: 'received', label: t('reviews.received'), icon: Star, count: receivedData?.total },
    { key: 'given', label: t('reviews.given'), icon: MessageSquare, count: givenData?.total },
    { key: 'channels', label: t('userProfile.channels'), icon: Hash, count: channelReviewsData?.total },
    { key: 'pending', label: t('reviews.pending'), icon: Clock, count: pendingData?.length },
  ];

  const isLoading =
    (activeTab === 'received' && receivedLoading) ||
    (activeTab === 'given' && givenLoading) ||
    (activeTab === 'channels' && channelReviewsLoading) ||
    (activeTab === 'pending' && pendingLoading);

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
          <h1 className="text-[22px] font-bold text-white">{t('reviews.title')}</h1>
        </div>
      </div>

      <div className="pb-24">

      {myStats && myStats.totalReviews > 0 && (
        <div className="px-4 mb-6">
          <RatingStats stats={myStats} />
        </div>
      )}

      <div className="px-4 mb-4">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 pb-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    hapticFeedback('selection');
                    setActiveTab(tab.key);
                  }}
                  className={`flex-shrink-0 h-10 px-4 rounded-xl text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'bg-white text-black'
                      : 'bg-[#1A1A1A] text-[#999]'
                  }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.5} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                      activeTab === tab.key
                        ? 'bg-black/20 text-black'
                        : 'bg-[#333] text-[#999]'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton h-32 rounded-2xl" />
            ))}
          </div>
        ) : activeTab === 'received' ? (
          receivedData?.items && receivedData.items.length > 0 ? (
            <div className="space-y-3">
              {receivedData.items.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  currentUserId={user?.id}
                  onReply={(reviewId, reply) => replyMutation.mutate({ reviewId, reply })}
                  isReplyLoading={replyMutation.isPending}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Star}
              title={t('reviews.empty')}
              description={t('reviews.emptyDesc')}
            />
          )
        ) : activeTab === 'given' ? (
          givenData?.items && givenData.items.length > 0 ? (
            <div className="space-y-3">
              {givenData.items.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={MessageSquare}
              title={t('reviews.empty')}
              description={t('reviews.emptyDesc')}
            />
          )
        ) : activeTab === 'channels' ? (
          channelReviewsData?.items && channelReviewsData.items.length > 0 ? (
            <div className="space-y-3">
              {channelReviewsData.items.map((review: ChannelReview) => (
                <div key={review.id} className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-white font-medium text-[15px]">
                        {review.channel?.title || 'Channel'}
                      </p>
                      {review.channel?.username && (
                        <p className="text-[#666] text-[13px]">@{review.channel.username}</p>
                      )}
                    </div>
                    <StarRating value={review.overallRating} readonly size="sm" />
                  </div>
                  {(review.audienceQuality || review.reachAccuracy) && (
                    <div className="flex gap-4 mb-2 text-xs">
                      {review.audienceQuality && (
                        <span><span className="text-[#666]">Audience: </span><span className="text-white">{review.audienceQuality}/5</span></span>
                      )}
                      {review.reachAccuracy && (
                        <span><span className="text-[#666]">Reach: </span><span className="text-white">{review.reachAccuracy}/5</span></span>
                      )}
                    </div>
                  )}
                  {review.comment && (
                    <p className="text-[#CCC] text-[13px] leading-relaxed mb-2">{review.comment}</p>
                  )}
                  {review.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {review.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 bg-[#1A1A1A] rounded-lg text-[11px] text-[#999]">{tag}</span>
                      ))}
                    </div>
                  )}
                  <p className="text-[#666] text-[11px]">
                    {review.deal && `Deal #${review.deal.referenceNumber} · `}
                    {formatDealTimestamp(review.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Hash}
              title={t('reviews.empty')}
              description={t('reviews.emptyDesc')}
            />
          )
        ) : pendingData && pendingData.length > 0 ? (
          <div className="space-y-3">
            {pendingData.map((deal) => (
              <div
                key={deal.id}
                className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-white font-medium text-[15px]">
                      Deal #{deal.referenceNumber}
                    </p>
                    <p className="text-[#666] text-[13px]">
                      {deal.channel.title} · {deal.adFormat}
                    </p>
                  </div>
                </div>
                <Button className="w-full" size="lg" onClick={() => {
                    hapticFeedback('impact');
                    setReviewFormDeal({
                      dealId: deal.id,
                      recipientRole: deal.recipientId === user?.id ? 'advertiser' : 'channelOwner',
                    });
                  }}>
                  {t('reviews.writeReview')}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Clock}
            title={t('reviews.empty')}
            description={t('reviews.emptyDesc')}
          />
        )}
      </div>
      </div>

      {reviewFormDeal && (
        <ReviewForm
          dealId={reviewFormDeal.dealId}
          recipientRole={reviewFormDeal.recipientRole}
          onSubmit={(data) => createMutation.mutate(data)}
          onClose={() => setReviewFormDeal(null)}
          isLoading={createMutation.isPending}
        />
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Star;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-3xl p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#1A1A1A] flex items-center justify-center mx-auto mb-3">
        <Icon className="w-7 h-7 text-[#666]" strokeWidth={1.5} />
      </div>
      <p className="text-white font-medium text-[15px] mb-1">{title}</p>
      <p className="text-[#666] text-[13px]">{description}</p>
    </div>
  );
}

export default ReviewsPage;
