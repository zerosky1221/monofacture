import { Star } from '../icons';
import { useTelegram } from '../../providers/TelegramProvider';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StarRating({ value, onChange, readonly = false, size = 'md' }: StarRatingProps) {
  const { hapticFeedback } = useTelegram();
  const sizeMap = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  const gapMap = { sm: 'gap-0.5', md: 'gap-1', lg: 'gap-1.5' };
  const iconSize = sizeMap[size];
  const gap = gapMap[size];

  return (
    <div className={`flex items-center ${gap}`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.round(value);
        const halfFilled = !filled && star <= value + 0.5 && star > value;

        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => { if (!readonly) hapticFeedback('impact'); onChange?.(star); }}
            className={`transition-all duration-200 ${
              readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 active:scale-95'
            }`}
          >
            <Star
              className={`${iconSize} ${
                filled
                  ? 'text-white fill-white'
                  : halfFilled
                    ? 'text-white fill-white/50'
                    : 'text-[#333] fill-transparent'
              }`}
              strokeWidth={1.5}
            />
          </button>
        );
      })}
    </div>
  );
}
