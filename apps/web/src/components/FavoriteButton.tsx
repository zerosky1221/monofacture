import { Heart } from './icons';
import { useFavorites } from '../hooks/useFavorites';
import { useTelegram } from '../providers/TelegramProvider';

interface Props {
  channelId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function FavoriteButton({ channelId, size = 'md', className = '' }: Props) {
  const { isFavorite, toggle, isLoading } = useFavorites();
  const { hapticFeedback } = useTelegram();
  const favorited = isFavorite(channelId);

  const sizes = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12' };
  const iconSizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };

  return (
    <button
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); hapticFeedback('impact'); toggle(channelId); }}
      disabled={isLoading}
      className={`${sizes[size]} flex items-center justify-center rounded-xl transition-all active:scale-90 ${
        favorited ? 'bg-[#EF4444]/20' : 'bg-[#1A1A1A]'
      } ${className}`}
    >
      <Heart
        className={`${iconSizes[size]} transition-all ${
          favorited ? 'text-[#EF4444]' : 'text-[#666]'
        }`}
        strokeWidth={1.5}
        style={favorited ? { fill: '#EF4444' } : undefined}
      />
    </button>
  );
}
