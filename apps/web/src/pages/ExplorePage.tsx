import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search, Users, Star, Compass, Plus, Monitor, Gem, Sparkles,
  Newspaper, Gamepad2, Briefcase, ChevronRight, ChevronDown,
  GraduationCap, Heart, Plane, UtensilsCrossed, TrendingUp,
  CircleDot, SlidersHorizontal,
} from '../components/icons';
import type { IconProps } from '../components/icons';
import { useTelegram } from '../providers/TelegramProvider';
import { useTranslation } from '../i18n';
import { channelsApi, Channel, ChannelFilters } from '../api/channels';
import { FilterBottomSheet, FilterState, getActiveFilterCount } from '../components/explore/FilterBottomSheet';
import { ChannelAvatar } from '../components/ui/ChannelAvatar';
import { SelectSheet } from '../components/ui/SelectSheet';
import { Button } from '../components/ui/Button';

const CATEGORIES: { id: string; labelKey: string; icon: React.FC<IconProps> }[] = [
  { id: 'all', labelKey: 'explore.category.all', icon: Compass },
  { id: 'CRYPTO', labelKey: 'explore.category.crypto', icon: Gem },
  { id: 'FINANCE', labelKey: 'explore.category.finance', icon: TrendingUp },
  { id: 'TECH', labelKey: 'explore.category.tech', icon: Monitor },
  { id: 'LIFESTYLE', labelKey: 'explore.category.lifestyle', icon: Sparkles },
  { id: 'GAMING', labelKey: 'explore.category.gaming', icon: Gamepad2 },
  { id: 'NEWS', labelKey: 'explore.category.news', icon: Newspaper },
  { id: 'BUSINESS', labelKey: 'explore.category.business', icon: Briefcase },
  { id: 'EDUCATION', labelKey: 'explore.category.education', icon: GraduationCap },
  { id: 'ENTERTAINMENT', labelKey: 'explore.category.entertainment', icon: CircleDot },
  { id: 'HEALTH', labelKey: 'explore.category.health', icon: Heart },
  { id: 'TRAVEL', labelKey: 'explore.category.travel', icon: Plane },
  { id: 'FOOD', labelKey: 'explore.category.food', icon: UtensilsCrossed },
];

const SORT_OPTIONS: { value: string; labelKey: string }[] = [
  { value: 'subscriberCount', labelKey: 'explore.popular' },
  { value: 'createdAt', labelKey: 'explore.newest' },
  { value: 'channelRating', labelKey: 'explore.topRated' },
];

function getGreeting(t: (key: string) => string): string {
  const hour = new Date().getHours();
  if (hour < 12) return t('explore.greetingMorning');
  if (hour < 18) return t('explore.greetingAfternoon');
  return t('explore.greetingEvening');
}

function formatSubscribers(count: number | undefined): string {
  if (!count) return '0';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
  return count.toString();
}

export default function ExplorePage() {
  const navigate = useNavigate();
  const { user, hapticFeedback } = useTelegram();
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('subscriberCount');
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>({});

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const buildFilters = useCallback((): ChannelFilters => {
    const filters: ChannelFilters = {
      sortBy: sortBy as any,
      sortOrder: 'desc',
    };
    if (selectedCategory !== 'all') {
      filters.category = selectedCategory;
    }
    if (debouncedSearch) {
      filters.search = debouncedSearch;
    }
    if (advancedFilters.minSubscribers) filters.minSubscribers = advancedFilters.minSubscribers;
    if (advancedFilters.maxSubscribers) filters.maxSubscribers = advancedFilters.maxSubscribers;
    if (advancedFilters.minPrice) filters.minPrice = advancedFilters.minPrice;
    if (advancedFilters.maxPrice) filters.maxPrice = advancedFilters.maxPrice;
    if (advancedFilters.minRating) filters.minRating = advancedFilters.minRating;
    if (advancedFilters.verifiedOnly) filters.verified = true;
    if (advancedFilters.language) filters.language = advancedFilters.language;
    return filters;
  }, [selectedCategory, debouncedSearch, sortBy, advancedFilters]);

  const { data, isLoading } = useQuery({
    queryKey: ['channels', buildFilters()],
    queryFn: () => channelsApi.getAll(buildFilters()),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const channels = data?.items || [];
  const totalCount = data?.total || 0;
  const filterCount = getActiveFilterCount(advancedFilters);

  return (
    <div className="min-h-full pb-4 page-enter">

      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <img src="/logob.png" alt="Monofacture" className="w-7 h-7" />
          <span className="text-[#666] text-sm">{getGreeting(t)}</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {user?.first_name || t('nav.explore')}
          </h1>
          <button
            onClick={() => { hapticFeedback('selection'); navigate('/favorites'); }}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#111] border border-[#222] active:scale-95 transition-all"
          >
            <Heart className="w-5 h-5 text-[#888]" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="px-5 mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" strokeWidth={1.5} />
          <input
            type="text"
            placeholder={t('explore.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-4 bg-[#111] border border-[#222] rounded-2xl text-white text-[14px] placeholder-[#555] outline-none focus:border-[#444] transition-colors"
          />
        </div>
      </div>

      <div className="px-5 mb-4 flex gap-3">
        <button
          onClick={() => { hapticFeedback('selection'); setShowFilters(true); }}
          className={`flex-1 h-11 flex items-center justify-center gap-2 rounded-2xl text-sm font-medium transition-all ${
            filterCount > 0
              ? 'bg-[#3390ec] text-white'
              : 'bg-[#111] text-[#999] border border-[#222]'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" strokeWidth={1.5} />
          <span>{t('explore.filters')}</span>
          {filterCount > 0 && (
            <span className="px-2 py-0.5 bg-white/20 text-white text-xs rounded-full font-semibold">
              {filterCount}
            </span>
          )}
        </button>

        <button
          onClick={() => { hapticFeedback('selection'); setShowSortSheet(true); }}
          className="flex-1 h-11 flex items-center justify-center gap-2 bg-[#111] border border-[#222] rounded-2xl text-sm text-[#999] font-medium"
        >
          <span>{t('explore.sort')}: {t(SORT_OPTIONS.find((s) => s.value === sortBy)?.labelKey || '')}</span>
          <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      <div className="px-5 mb-6">
        <div className="overflow-x-auto scrollbar-hide -mx-5 px-5">
          <div className="flex gap-2 pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => { hapticFeedback('selection'); setSelectedCategory(cat.id); }}
                className={`flex-shrink-0 h-10 px-4 rounded-2xl text-sm font-medium flex items-center gap-2 whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-[#3390ec] text-white'
                    : 'bg-[#111] text-[#888] border border-[#222]'
                }`}
              >
                <cat.icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                {t(cat.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 mb-4">
        <h2 className="text-xs font-bold text-[#666] uppercase tracking-wider">
          {isLoading ? t('common.loading') : totalCount === 1 ? t('explore.foundChannel') : t('explore.foundChannels', { count: totalCount })}
        </h2>
      </div>

      {isLoading ? (
        <div className="px-5 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      ) : channels.length > 0 ? (
        <div className="px-5 space-y-3">
          {channels.map((channel: Channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              onClick={() => { hapticFeedback('selection'); navigate(`/channel/${channel.id}`); }}
            />
          ))}
        </div>
      ) : (
        <EmptyState t={t} onAddChannel={() => { hapticFeedback('selection'); navigate('/channels'); }} />
      )}

      <FilterBottomSheet
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={advancedFilters}
        onApply={setAdvancedFilters}
      />

      <SelectSheet
        isOpen={showSortSheet}
        onClose={() => setShowSortSheet(false)}
        title={t('explore.sort')}
        options={SORT_OPTIONS.map((opt) => ({ value: opt.value, label: t(opt.labelKey) }))}
        value={sortBy}
        onChange={(v) => { setSortBy(v); hapticFeedback('selection'); }}
      />
    </div>
  );
}

function ChannelCard({ channel, onClick }: { channel: Channel; onClick: () => void }) {
  const { t } = useTranslation();
  const activePricing = channel.pricing?.filter(p => p.isActive !== false) || [];
  const minPrice = activePricing.length > 0
    ? Math.min(...activePricing.map(p => Number(p.pricePerHour)))
    : 0;
  const price = (minPrice / 1_000_000_000).toFixed(0);

  const displayRating = channel.channelRating && channel.channelRating > 0
    ? channel.channelRating
    : channel.rating || 0;
  const displayReviewCount = channel.channelReviewCount || 0;

  return (
    <button
      onClick={onClick}
      className="w-full bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 flex items-center gap-4 text-left transition-all duration-200 hover:border-[#333] active:scale-[0.98]"
    >
      <ChannelAvatar
        photoUrl={channel.photoUrl}
        title={channel.title}
        size="lg"
      />

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-[15px] truncate text-white">{channel.title}</h3>
        <div className="flex items-center gap-3 mt-1 text-[12px] text-[#999]">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" strokeWidth={1.5} />
            {formatSubscribers(channel.subscriberCount)}
          </span>
          {displayRating > 0 && (
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-white fill-white" strokeWidth={1.5} />
              {displayRating.toFixed(1)}
              {displayReviewCount > 0 && (
                <span className="text-[#666]">({displayReviewCount})</span>
              )}
            </span>
          )}
        </div>
      </div>

      <div className="text-right flex-shrink-0 flex items-center gap-1.5">
        <div>
          <p className="text-white font-bold text-[14px]">{price} TON</p>
          <p className="text-[#666] text-[11px]">{t('explore.perPost')}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-[#444]" strokeWidth={1.5} />
      </div>
    </button>
  );
}

function EmptyState({ onAddChannel, t }: { onAddChannel: () => void; t: (key: string) => string }) {
  return (
    <div className="px-5 pt-8">
      <div className="bg-[#111] border border-[#1A1A1A] rounded-3xl p-8 text-center">
        <div className="w-16 h-16 mb-4 mx-auto opacity-30">
          <img src="/logob.png" alt="" className="w-full h-full" />
        </div>
        <h2 className="text-lg font-semibold mb-1 text-white">{t('explore.noResults')}</h2>
        <p className="text-[#999] text-[14px] mb-5 max-w-[260px] mx-auto">
          {t('explore.noResultsDesc')}
        </p>
        <Button className="w-full" size="lg" icon={Plus} onClick={onAddChannel}>
          {t('explore.addChannel')}
        </Button>
      </div>
    </div>
  );
}
