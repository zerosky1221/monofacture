import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, Eye, TrendingUp, Star, CheckCircle, ArrowLeft, ShoppingCart, ExternalLink, ChevronRight, ChevronDown, ChevronUp, UserX, Pause, EyeOff, Tag, Globe, MessageSquare, Clock } from '../components/icons';
import { ChannelAvatar } from '../components/ui/ChannelAvatar';
import { FavoriteButton } from '../components/FavoriteButton';
import { useTelegram } from '../providers/TelegramProvider';
import { useTranslation } from '../i18n';
import { api } from '../lib/api';
import { channelReviewsApi } from '../api/channelReviews';
import type { ChannelReview } from '../api/channelReviews';
import { formatDealTimestamp } from '../lib/date';
import { StarRating } from '../components/reviews/StarRating';
import { Button } from '../components/ui/Button';

interface ChannelPricing {
  id: string;
  adFormat: string;
  pricePerHour: string;
  pricePermanent: string | null;
  minHours: number;
  maxHours: number;
  currency: string;
  isActive: boolean;
}

interface ChannelData {
  id: string;
  title: string;
  username?: string;
  description?: string;
  photoUrl?: string;
  subscriberCount: number;
  averageViews: number;
  averageReach: number;
  engagementRate: number;
  rating: number;
  reviewCount: number;
  channelRating: number;
  channelReviewCount: number;
  totalDeals: number;
  successfulDeals: number;
  language?: string;
  categories?: string[];
  status: string;
  isActive?: boolean;
  adRequirements?: string;
  isAcceptingOrders?: boolean;
  pricing: ChannelPricing[];
  owner?: {
    id: string;
    firstName?: string;
    lastName?: string;
    telegramUsername?: string;
    photoUrl?: string;
    rating: number;
    reviewCount: number;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  CRYPTO: 'Crypto',
  FINANCE: 'Finance',
  TECH: 'Tech',
  BUSINESS: 'Business',
  ENTERTAINMENT: 'Entertainment',
  NEWS: 'News',
  EDUCATION: 'Education',
  LIFESTYLE: 'Lifestyle',
  GAMING: 'Gaming',
  SPORTS: 'Sports',
  HEALTH: 'Health',
  TRAVEL: 'Travel',
  FOOD: 'Food',
  FASHION: 'Fashion',
  MUSIC: 'Music',
  ART: 'Art',
  SCIENCE: 'Science',
  POLITICS: 'Politics',
  OTHER: 'Other',
};

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  ru: 'Русский',
  uz: "O'zbek",
  es: 'Español',
  de: 'Deutsch',
  fr: 'Français',
  zh: '中文',
  ar: 'العربية',
  pt: 'Português',
  hi: 'हिन्दी',
  ja: '日本語',
  ko: '한국어',
};

function formatTon(nanoTon: string | number): string {
  const value = typeof nanoTon === 'string' ? parseInt(nanoTon) : nanoTon;
  return (value / 1_000_000_000).toFixed(0);
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}

export function ChannelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hapticFeedback } = useTelegram();
  const { t } = useTranslation();

  const { data: channel, isLoading, error } = useQuery({
    queryKey: ['channel', id],
    queryFn: async () => {
      const response = await api.get<ChannelData>(`/channels/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  const { data: channelReviewsData } = useQuery({
    queryKey: ['channel-reviews', id],
    queryFn: () => channelReviewsApi.getChannelReviews(id!, 1, 5),
    enabled: !!id && !!channel,
  });

  const channelReviews = channelReviewsData?.items || [];

  const handleBookNow = (pricing: ChannelPricing) => {
    hapticFeedback?.('selection');
    navigate(`/deals/create?channelId=${id}&adFormat=${pricing.adFormat}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black p-4">
        <div className="animate-pulse space-y-4">
          <div className="flex justify-center">
            <div className="h-20 w-20 bg-[#1A1A1A] rounded-full" />
          </div>
          <div className="h-6 bg-[#1A1A1A] rounded w-1/2 mx-auto" />
          <div className="h-4 bg-[#1A1A1A] rounded w-1/3 mx-auto" />
          <div className="h-32 bg-[#1A1A1A] rounded-2xl" />
          <div className="h-48 bg-[#1A1A1A] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !channel) {
    return (
      <div className="min-h-screen bg-black p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#999999] mb-4">{t('createDeal.channelNotFound')}</p>
          <Button className="w-full" size="lg" onClick={() => navigate('/')}>{t('channel.goBack')}</Button>
        </div>
      </div>
    );
  }

  const activePricing = channel.pricing?.filter(p => p.isActive) || [];
  const isChannelActive = channel.isActive !== false && (channel.status === 'ACTIVE' || channel.status === 'VERIFIED');
  const canOrder = isChannelActive && channel.isAcceptingOrders !== false;
  const [showAllReviews, setShowAllReviews] = useState(false);
  const REVIEWS_PREVIEW_COUNT = 2;

  return (
    <div className="min-h-screen bg-black">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#1A1A1A] active:scale-95 transition-all"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-[22px] font-bold text-white">{t('channel.details')}</h1>
          </div>
          {channel && <FavoriteButton channelId={channel.id} size="md" />}
        </div>
      </div>

      <div className="p-4 pb-24 space-y-4">
        <div className="text-center py-4">
          <div className="flex justify-center mb-3">
            <ChannelAvatar
              photoUrl={channel.photoUrl}
              title={channel.title}
              size="xl"
            />
          </div>
          <h2 className="text-xl font-bold text-white">{channel.title}</h2>
          {channel.username && (
            <a
              href={`https://t.me/${channel.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-white hover:underline"
            >
              @{channel.username}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {channel.description && (
            <p className="text-[#999999] text-sm mt-2 max-w-xs mx-auto">{channel.description}</p>
          )}
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            {channel.status === 'VERIFIED' && (
              <span className="flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                <CheckCircle className="w-3 h-3" /> {t('channel.verified')}
              </span>
            )}
            {channel.categories && channel.categories.length > 0 && (
              <span className="flex items-center gap-1 px-3 py-1 bg-[#3390ec]/20 text-[#3390ec] rounded-full text-xs">
                <Tag className="w-3 h-3" />
                {CATEGORY_LABELS[channel.categories[0]] || channel.categories[0]}
              </span>
            )}
            {channel.language && (
              <span className="flex items-center gap-1 px-3 py-1 bg-[#0A0A0A] text-white/70 rounded-full text-xs">
                <Globe className="w-3 h-3" />
                {LANGUAGE_LABELS[channel.language] || channel.language.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {!isChannelActive && (
          <div className="flex items-center gap-3 p-4 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-2xl">
            <Pause className="w-5 h-5 text-[#EF4444] shrink-0" />
            <div>
              <p className="text-[13px] font-medium text-[#EF4444]">{t('channel.deactivated')}</p>
              <p className="text-[11px] text-[#999] mt-0.5">{t('channel.deactivatedDesc')}</p>
            </div>
          </div>
        )}

        <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl overflow-hidden">
          <div className="grid grid-cols-3 gap-px bg-[#1A1A1A]">
            <div className="bg-[#0A0A0A] p-3 text-center overflow-hidden">
              <p className="text-xl font-bold text-white text-number">{formatNumber(channel.subscriberCount)}</p>
              <p className="text-[10px] text-[#666] truncate">{t('channel.subscribers')}</p>
            </div>
            <div className="bg-[#0A0A0A] p-3 text-center overflow-hidden">
              <p className="text-xl font-bold text-white text-number">{formatNumber(channel.averageViews)}</p>
              <p className="text-[10px] text-[#666] truncate">{t('channel.avgViews')}</p>
            </div>
            <div className="bg-[#0A0A0A] p-3 text-center overflow-hidden">
              <p className="text-xl font-bold text-white text-number">{(channel.engagementRate * 100).toFixed(1)}%</p>
              <p className="text-[10px] text-[#666] truncate">{t('channels.engagement')}</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 border-t border-[#1A1A1A]">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-[#F59E0B]" strokeWidth={1.5} />
              <span className="text-xl font-bold text-white text-number">
                {(channel.channelRating || channel.rating || 0).toFixed(1)}
              </span>
              <span className="text-[13px] text-[#666]">
                ({channel.channelReviewCount || channel.reviewCount || 0} {t('channels.reviews')})
              </span>
            </div>
            <div className="text-right">
              <span className="text-white font-bold text-number">{channel.successfulDeals}</span>
              <span className="text-[13px] text-[#666] ml-1.5">{t('channel.deals')}</span>
            </div>
          </div>
        </div>

        {channel.adRequirements && (
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-4">
            <p className="text-[11px] font-semibold text-[#555] uppercase tracking-wider mb-2">{t('channel.adRequirements')}</p>
            <p className="text-white/70 text-[14px] leading-relaxed whitespace-pre-wrap">{channel.adRequirements}</p>
          </div>
        )}

        {channel.isAcceptingOrders === false && (
          <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-2xl p-4 text-center">
            <p className="text-[#F59E0B] font-medium flex items-center justify-center gap-2"><Pause className="w-4 h-4" strokeWidth={1.5} /> {t('channel.notAccepting')}</p>
          </div>
        )}

        {(() => {
          const postPricing = activePricing.find(p => p.adFormat === 'POST');

          if (!postPricing) {
            return (
              <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[#1A1A1A] flex items-center justify-center">
                  <Tag className="w-6 h-6 text-[#555]" strokeWidth={1.5} />
                </div>
                <p className="text-[#666] text-[14px]">{t('channel.noPrice')}</p>
              </div>
            );
          }

          const hourlyPrice = formatTon(postPricing.pricePerHour);
          const hasPermanent = postPricing.pricePermanent && parseInt(String(postPricing.pricePermanent)) > 0;
          const permanentPrice = hasPermanent ? formatTon(postPricing.pricePermanent!) : null;

          return (
            <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl overflow-hidden">
              <div className="p-4 pb-3">
                <p className="text-[11px] font-semibold text-[#555] uppercase tracking-wider">{t('channel.adOptions')}</p>
              </div>

              <div className="px-4 pb-4">
                <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#3390ec]/10 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-[#3390ec]" strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-white">{t('deals.formats.POST')}</p>
                      <p className="text-[12px] text-[#666]">{t('channel.adOptions')}</p>
                    </div>
                  </div>

                  <div className={`grid ${hasPermanent ? 'grid-cols-2' : 'grid-cols-1'} gap-3 mb-4`}>
                    <div className="bg-[#0A0A0A] rounded-xl p-3.5 text-center">
                      <p className="text-2xl font-bold text-white text-number">{hourlyPrice} <span className="text-[14px] font-medium text-[#999]">TON</span></p>
                      <p className="text-[12px] text-[#666] mt-0.5">{t('channel.perHour')}</p>
                    </div>
                    {hasPermanent && (
                      <div className="bg-[#0A0A0A] rounded-xl p-3.5 text-center">
                        <p className="text-2xl font-bold text-white text-number">{permanentPrice} <span className="text-[14px] font-medium text-[#999]">TON</span></p>
                        <p className="text-[12px] text-[#666] mt-0.5">{t('channel.permanentPost')}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[13px] text-[#999]">
                    <Clock className="w-4 h-4 text-[#555]" strokeWidth={1.5} />
                    <span>{t('channel.duration')}: {postPricing.minHours}–{postPricing.maxHours} {t('channel.hoursUnit')}</span>
                  </div>
                </div>
              </div>

              {canOrder && (
                <div className="px-4 pb-4">
                  <button
                    onClick={() => handleBookNow(postPricing)}
                    className="w-full h-[52px] flex items-center justify-center gap-2.5 bg-white rounded-2xl text-black font-semibold text-[15px] active:scale-[0.98] transition-all duration-200"
                  >
                    <ShoppingCart className="w-5 h-5" strokeWidth={1.5} />
                    {t('channel.bookAd')}
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {channelReviews.length > 0 && (
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-4">
            <p className="text-[11px] font-semibold text-[#555] uppercase tracking-wider mb-4">{t('channel.reviews')}</p>
            <div className="space-y-3">
              {(showAllReviews ? channelReviews : channelReviews.slice(0, REVIEWS_PREVIEW_COUNT)).map((review: ChannelReview) => {
                const authorName = review.fromUser
                  ? [review.fromUser.firstName, review.fromUser.lastName].filter(Boolean).join(' ') || t('dashboard.anonymous')
                  : t('dashboard.anonymous');
                return (
                  <div key={review.id} className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center text-white text-xs font-semibold">
                          {authorName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white text-[13px] font-medium">{authorName}</p>
                          <p className="text-[#666] text-[11px]">{formatDealTimestamp(review.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <StarRating value={review.overallRating} readonly size="sm" />
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-[#CCC] text-[13px] leading-relaxed">{review.comment}</p>
                    )}
                    {review.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {review.tags.map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-[#1A1A1A] rounded-lg text-[11px] text-[#999]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {channelReviews.length > REVIEWS_PREVIEW_COUNT && (
              <button
                onClick={() => setShowAllReviews(!showAllReviews)}
                className="w-full flex items-center justify-center gap-1.5 mt-3 py-2 text-[13px] text-[#999] hover:text-white transition-colors"
              >
                {showAllReviews ? (
                  <>
                    <ChevronUp className="w-4 h-4" strokeWidth={1.5} />
                    {t('common.showLess')}
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
                    {t('common.showAll', { count: channelReviews.length })}
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {channel.owner && (() => {
          const isAnonymous = channel.owner.firstName === 'Anonymous' && !channel.owner.telegramUsername;
          return (
            <button
              onClick={() => !isAnonymous && navigate(`/user/${channel.owner!.id}`)}
              className={`w-full bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-4 text-left ${!isAnonymous ? 'active:bg-[#111] cursor-pointer' : 'cursor-default'} transition-all`}
            >
              <p className="text-[11px] font-semibold text-[#555] uppercase tracking-wider mb-3">{t('channel.owner')}</p>
              <div className="flex items-center gap-3">
                {isAnonymous ? (
                  <div className="w-12 h-12 rounded-full bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
                    <UserX className="w-6 h-6 text-white/70" />
                  </div>
                ) : (
                  <ChannelAvatar
                    photoUrl={channel.owner.photoUrl}
                    title={channel.owner.firstName || 'O'}
                    size="md"
                    rounded="full"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium text-white flex items-center gap-2">
                    {isAnonymous ? (
                      <>
                        <span className="text-white/70">{t('dashboard.anonymous')}</span>
                        <span className="text-xs px-2 py-0.5 bg-[#0A0A0A] rounded-full text-[#999999] flex items-center gap-1"><EyeOff className="w-3 h-3" strokeWidth={1.5} /> Hidden</span>
                      </>
                    ) : (
                      [channel.owner.firstName, channel.owner.lastName].filter(Boolean).join(' ') || 'Owner'
                    )}
                  </p>
                  {!isAnonymous && channel.owner.telegramUsername && (
                    <p className="text-xs text-white">@{channel.owner.telegramUsername}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-[#999999] mt-1">
                    <Star className="w-4 h-4 text-[#F59E0B]" />
                    <span>{channel.owner.rating?.toFixed(1) || '0.0'}</span>
                    <span>•</span>
                    <span>{channel.owner.reviewCount || 0} {t('channels.reviews')}</span>
                  </div>
                </div>
                {!isAnonymous && <ChevronRight className="w-5 h-5 text-[#666666] flex-shrink-0" />}
              </div>
            </button>
          );
        })()}
      </div>
    </div>
  );
}
