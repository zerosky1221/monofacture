import { useState, useRef, useEffect } from 'react';
import { Search, X, SlidersHorizontal } from '../icons';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../i18n';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFilterClick?: () => void;
  showFilter?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder,
  onFilterClick,
  showFilter = false,
  autoFocus = false,
  className,
}: SearchBarProps) {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'flex items-center gap-2 flex-1 h-12 px-4 bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl transition-all duration-200',
          isFocused && 'border-white/30 bg-[#111111]'
        )}
      >
        <Search className="w-5 h-5 text-[#666] flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || t('explore.searchPlaceholder')}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="flex-1 bg-transparent text-white placeholder:text-[#666] outline-none text-[15px]"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            aria-label="Clear search"
            className="p-2 -mr-2 transition-all duration-200"
          >
            <X className="w-4 h-4 text-[#666]" />
          </button>
        )}
      </div>

      {showFilter && onFilterClick && (
        <button
          onClick={onFilterClick}
          aria-label="Open filters"
          className="p-2.5 bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl transition-all duration-200 hover:bg-[#111111] hover:border-[#2A2A2A]"
        >
          <SlidersHorizontal className="w-5 h-5 text-[#999]" />
        </button>
      )}
    </div>
  );
}
