import { cn } from '../../lib/utils';
import { useTelegram } from '../../providers/TelegramProvider';

interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  const { hapticFeedback } = useTelegram();
  return (
    <div
      className={cn(
        'bg-[#1A1A1A] rounded-2xl p-1.5 flex gap-1',
        className
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            onClick={() => { hapticFeedback('selection'); onChange(option.value); }}
            className={cn(
              'flex-1 py-2.5 px-4 text-[14px] font-semibold transition-all duration-200 rounded-xl',
              isActive
                ? 'bg-[#333333] text-white'
                : 'text-[#666] hover:text-[#999]'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
