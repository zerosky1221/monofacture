import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { Search, SlidersHorizontal, ChevronRight, Star, Users, TrendingUp, Monitor, Gem, Sparkles, Newspaper, Gamepad2, BookOpen, Briefcase, Film, Trophy } from '../../components/icons';
import type { IconProps } from '../../components/icons/types';
import { useTelegram } from '../../providers/TelegramProvider';
import { channelsApi, Channel } from '../../api/channels';
import { formatNumber, formatTon } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../i18n';
import { useScrollMemory } from '../../hooks/useScrollMemory';

const CATEGORIES: { id: string; labelKey: string; icon: React.FC<IconProps> | null }[] = [
  { id: 'all', labelKey: 'explore.category.all', icon: null },
  { id: 'tech', labelKey: 'explore.category.tech', icon: Monitor },
  { id: 'crypto', labelKey: 'explore.category.crypto', icon: Gem },
  { id: 'lifestyle', labelKey: 'explore.category.lifestyle', icon: Sparkles },
  { id: 'news', labelKey: 'explore.category.news', icon: Newspaper },
  { id: 'gaming', labelKey: 'explore.category.gaming', icon: Gamepad2 },
  { id: 'education', labelKey: 'explore.category.education', icon: BookOpen },
  { id: 'business', labelKey: 'explore.category.business', icon: Briefcase },
  { id: 'entertainment', labelKey: 'explore.category.entertainment', icon: Film },
  { id: 'sports', labelKey: 'explore.category.sports', icon: Trophy },
];

export function ExplorePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, hapticFeedback } = useTelegram();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  useScrollMemory('/explore');

  const { data: featuredChannels, isLoading: featuredLoading } = useQuery({
    queryKey: ['channels', 'featured'],
    queryFn: () => channelsApi.getAll({ featured: true, limit: 6 }),
  });

  const { data: popularChannels, isLoading: popularLoading } = useQuery({
    queryKey: ['channels', 'popular', selectedCategory],
    queryFn: () => channelsApi.getAll({
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      sortBy: 'popular',
      limit: 10,
    }),
  });

  const { data: newChannels, isLoading: newLoading } = useQuery({
    queryKey: ['channels', 'new'],
    queryFn: () => channelsApi.getAll({ sortBy: 'newest', limit: 5 }),
  });

  const handleCategorySelect = (categoryId: string) => {
    hapticFeedback('selection');
    setSelectedCategory(categoryId);
  };

  const handleChannelClick = (channelId: string) => {
    hapticFeedback('selection');
    navigate(`/channels/${channelId}`);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleFilters = () => {
    hapticFeedback('selection');
  };

  return (
    <div className="min-h-full">
      <div className="px-lg pt-lg pb-sm">
        <h1 className="text-title-1 text-text-primary">
          {t('explore.welcome')}{user?.first_name ? `, ${user.first_name}` : ''}!
        </h1>
        <p className="text-subhead text-text-secondary mt-xs">
          {t('explore.findPerfectChannel')}
        </p>
      </div>

      <div className="px-lg mb-lg">
        <div className="flex gap-sm">
          <div className="flex-1 search-bar">
            <Search className="w-5 h-5 text-text-tertiary flex-shrink-0" />
            <input
              type="text"
              placeholder={t('explore.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 min-w-0"
            />
          </div>
          <button
            onClick={handleFilters}
            className="w-[44px] h-[44px] flex items-center justify-center bg-bg-tertiary rounded-input"
          >
            <SlidersHorizontal className="w-5 h-5 text-text-secondary" />
          </button>
        </div>
      </div>

      <div className="mb-xl">
        <div className="flex gap-sm px-lg overflow-x-auto scrollbar-hide pb-sm">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              className={cn(
                'chip flex-shrink-0',
                selectedCategory === cat.id && 'active'
              )}
            >
              {cat.icon && <cat.icon className="w-4 h-4" strokeWidth={1.5} />}
              <span>{t(cat.labelKey)}</span>
            </button>
          ))}
        </div>
      </div>

      <section className="mb-xl">
        <div className="flex items-center justify-between px-lg mb-md">
          <h2 className="text-title-3 text-text-primary">{t('explore.featuredChannels')}</h2>
          <button
            onClick={() => navigate('/channels?filter=featured')}
            className="text-[#3390ec] text-subhead flex items-center gap-xs"
          >
            {t('common.seeAll')} <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-md px-lg overflow-x-auto scrollbar-hide pb-sm">
          {featuredLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="w-[280px] h-[160px] rounded-card skeleton flex-shrink-0" />
            ))
          ) : (
            (featuredChannels?.items || []).map((channel) => (
              <FeaturedChannelCard
                key={channel.id}
                channel={channel}
                onClick={() => handleChannelClick(channel.id)}
              />
            ))
          )}
        </div>
      </section>

      <section className="mb-xl">
        <div className="flex items-center justify-between px-lg mb-md">
          <h2 className="text-title-3 text-text-primary">{t('explore.popularThisWeek')}</h2>
          <button
            onClick={() => navigate('/channels?sort=popular')}
            className="text-[#3390ec] text-subhead flex items-center gap-xs"
          >
            {t('common.seeAll')} <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="px-lg space-y-sm">
          {popularLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="h-[80px] rounded-card skeleton" />
            ))
          ) : (
            (popularChannels?.items || []).map((channel) => (
              <ChannelListCard
                key={channel.id}
                channel={channel}
                onClick={() => handleChannelClick(channel.id)}
              />
            ))
          )}
        </div>
      </section>

      <section className="mb-3xl">
        <div className="flex items-center justify-between px-lg mb-md">
          <h2 className="text-title-3 text-text-primary">{t('explore.newChannels')}</h2>
          <button
            onClick={() => navigate('/channels?sort=newest')}
            className="text-[#3390ec] text-subhead flex items-center gap-xs"
          >
            {t('common.seeAll')} <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="px-lg space-y-sm">
          {newLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="h-[80px] rounded-card skeleton" />
            ))
          ) : (
            (newChannels?.items || []).map((channel) => (
              <ChannelListCard
                key={channel.id}
                channel={channel}
                onClick={() => handleChannelClick(channel.id)}
                isNew
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

interface FeaturedChannelCardProps {
  channel: Channel;
  onClick: () => void;
}

function FeaturedChannelCard({ channel, onClick }: FeaturedChannelCardProps) {
  const { t } = useTranslation();
  const activePricing = channel.pricing?.filter(p => p.isActive !== false) || [];
  const minPrice = activePricing.length > 0
    ? Math.min(...activePricing.map(p => Number(p.pricePerHour)))
    : 0;
  const displayPrice = (minPrice / 1_000_000_000).toFixed(0);

  return (
    <button
      onClick={onClick}
      className="w-[280px] flex-shrink-0 rounded-card overflow-hidden relative card-press"
    >
      <div className="absolute inset-0 bg-[#0A0A0A] border border-[#1F1F1F] rounded-card" />

      <div className="relative p-lg h-[160px] flex flex-col justify-between">
        <div className="flex items-start gap-md">
          <img
            src={channel.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.title)}&background=random`}
            alt={channel.title}
            className="w-14 h-14 rounded-full object-cover border-2 border-[#1F1F1F]"
          />
          <div className="flex-1 min-w-0 text-left">
            <h3 className="text-headline text-white truncate">{channel.title}</h3>
            {channel.username && (
              <p className="text-footnote text-white/70">@{channel.username}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-lg">
            <div className="flex items-center gap-xs text-white/90">
              <Users className="w-4 h-4" />
              <span className="text-footnote">{formatNumber(channel.subscriberCount)}</span>
            </div>
            <div className="flex items-center gap-xs text-white/90">
              <Star className="w-4 h-4" />
              <span className="text-footnote">{channel.rating?.toFixed(1) || '0.0'}</span>
            </div>
          </div>
          <div className="text-[white] font-semibold text-subhead">
            {t('explore.fromPrice', { price: displayPrice })}
          </div>
        </div>
      </div>
    </button>
  );
}

interface ChannelListCardProps {
  channel: Channel;
  onClick: () => void;
  isNew?: boolean;
}

function ChannelListCard({ channel, onClick, isNew }: ChannelListCardProps) {
  const { t } = useTranslation();
  const activePricing = channel.pricing?.filter(p => p.isActive !== false) || [];
  const minPrice = activePricing.length > 0
    ? Math.min(...activePricing.map(p => Number(p.pricePerHour)))
    : 0;
  const displayPrice = (minPrice / 1_000_000_000).toFixed(0);

  return (
    <button
      onClick={onClick}
      className="w-full card p-lg flex items-center gap-md card-press text-left"
    >
      <img
        src={channel.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.title)}&background=random`}
        alt={channel.title}
        className="avatar-lg flex-shrink-0"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-sm mb-xs">
          <h3 className="text-headline text-text-primary truncate">{channel.title}</h3>
          {isNew && (
            <span className="badge bg-accent-green/20 text-accent-green">{t('explore.new')}</span>
          )}
          {channel.isVerified && (
            <span className="text-[white]">&#10003;</span>
          )}
        </div>

        <div className="flex items-center gap-md text-footnote text-text-secondary">
          <span className="flex items-center gap-xs">
            <Users className="w-3.5 h-3.5" />
            {formatNumber(channel.subscriberCount)}
          </span>
          <span className="flex items-center gap-xs">
            <TrendingUp className="w-3.5 h-3.5" />
            {((channel.stats?.engagementRate || 0) * 100).toFixed(1)}%
          </span>
          <span className="flex items-center gap-xs">
            <Star className="w-3.5 h-3.5 text-accent-orange" />
            {channel.rating?.toFixed(1) || '0.0'}
          </span>
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="text-headline text-[white]">
          {displayPrice}
        </p>
        <p className="text-caption-1 text-text-tertiary">TON</p>
      </div>
    </button>
  );
}
