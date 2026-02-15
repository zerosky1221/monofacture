import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star } from '../icons';
import { Input } from '@telegram-tools/ui-kit';
import { Button } from '../ui/Button';
import { Toggle } from '../ui/Toggle';
import { useTranslation } from '../../i18n';
import { useBottomSheetDrag } from '../../hooks/useBottomSheetDrag';

export interface FilterState {
  minSubscribers?: number;
  maxSubscribers?: number;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  verifiedOnly?: boolean;
  language?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
}

const subscriberPresets = [
  { label: '1K+', value: 1000 },
  { label: '5K+', value: 5000 },
  { label: '10K+', value: 10000 },
  { label: '50K+', value: 50000 },
  { label: '100K+', value: 100000 },
];

const pricePresets = [
  { label: '<10', min: 0, max: 10 },
  { label: '10-50', min: 10, max: 50 },
  { label: '50-100', min: 50, max: 100 },
  { label: '100+', min: 100, max: undefined as number | undefined },
];

const ratingOptions = [
  { label: 'Any', value: undefined as number | undefined },
  { label: '4+', value: 4 },
  { label: '4.5+', value: 4.5 },
  { label: '5', value: 5 },
];

const languageOptions = [
  { id: 'en', label: 'English' },
  { id: 'ru', label: 'Русский' },
  { id: 'es', label: 'Español' },
  { id: 'de', label: 'Deutsch' },
  { id: 'fr', label: 'Français' },
  { id: 'zh', label: '中文' },
  { id: 'ar', label: 'العربية' },
  { id: 'pt', label: 'Português' },
  { id: 'hi', label: 'हिन्दी' },
  { id: 'ja', label: '日本語' },
  { id: 'ko', label: '한국어' },
];

function toNano(ton: number): number {
  return ton * 1_000_000_000;
}

function fromNano(nano: number | undefined): number | undefined {
  if (!nano) return undefined;
  return nano / 1_000_000_000;
}

function initFromParent(f: FilterState): FilterState {
  return {
    ...f,
    minPrice: fromNano(f.minPrice),
    maxPrice: fromNano(f.maxPrice),
  };
}

export function FilterBottomSheet({ isOpen, onClose, filters: parentFilters, onApply }: Props) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<FilterState>(() => initFromParent(parentFilters));
  const { dragY, backdropOpacity, reset, scrollRef, handleProps, contentProps } =
    useBottomSheetDrag({ onClose });

  useEffect(() => {
    if (isOpen) reset();
  }, [isOpen, reset]);

  const handleReset = () => {
    setFilters({});
  };

  const handleApply = () => {
    const result: FilterState = { ...filters };
    if (result.minPrice) result.minPrice = toNano(result.minPrice);
    if (result.maxPrice) result.maxPrice = toNano(result.maxPrice);
    onApply(result);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            <motion.div
              style={{ opacity: backdropOpacity }}
              className="w-full h-full bg-black/60"
              onClick={onClose}
            />
          </motion.div>

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0"
          >
            <motion.div
              style={{ y: dragY }}
              className="bg-[#111] rounded-t-3xl flex flex-col"
            >
              <div {...handleProps}>
                <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
                  <div className="w-9 h-1 bg-[#333] rounded-full" />
                </div>

                <div className="flex items-center justify-between px-5 pb-4">
                  <h2 className="text-xl font-bold text-white">{t('filter.title')}</h2>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleReset}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="text-[#999] text-sm"
                    >
                      {t('filter.reset')}
                    </button>
                    <button
                      onClick={onClose}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="w-8 h-8 bg-[#333] rounded-full flex items-center justify-center"
                    >
                      <X size={16} className="text-white" />
                    </button>
                  </div>
                </div>
              </div>

              <div
                ref={scrollRef}
                {...contentProps}
                className="flex-1 overflow-y-auto px-5 pb-4 space-y-6"
                style={{ maxHeight: 'calc(85vh - 120px)' }}
              >

                <div className="space-y-3">
                  <label className="text-[#999] text-xs font-medium uppercase tracking-wider">
                    {t('filter.subscribers')}
                  </label>

                  <div className="flex items-center gap-2">
                    <div className="w-[42%]">
                      <Input
                        value={String(filters.minSubscribers || '')}
                        onChange={(v) => setFilters(f => ({ ...f, minSubscribers: Number(v) || undefined }))}
                        placeholder={t('common.min')}
                        numeric
                      />
                    </div>
                    <span className="text-[#636366]">--</span>
                    <div className="w-[42%]">
                      <Input
                        value={String(filters.maxSubscribers || '')}
                        onChange={(v) => setFilters(f => ({ ...f, maxSubscribers: Number(v) || undefined }))}
                        placeholder={t('common.max')}
                        numeric
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {subscriberPresets.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => setFilters(f => ({
                          ...f,
                          minSubscribers: f.minSubscribers === preset.value ? undefined : preset.value,
                          maxSubscribers: undefined,
                        }))}
                        className={`h-9 px-4 rounded-xl text-sm font-medium transition-all ${
                          filters.minSubscribers === preset.value && !filters.maxSubscribers
                            ? 'bg-white text-black'
                            : 'bg-[#1A1A1A] text-[#999]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[#999] text-xs font-medium uppercase tracking-wider">
                    {t('filter.price')}
                  </label>

                  <div className="flex items-center gap-2">
                    <div className="w-[42%]">
                      <Input
                        value={String(filters.minPrice || '')}
                        onChange={(v) => setFilters(f => ({ ...f, minPrice: Number(v) || undefined }))}
                        placeholder={t('common.min')}
                        numeric
                      />
                    </div>
                    <span className="text-[#636366]">--</span>
                    <div className="w-[42%]">
                      <Input
                        value={String(filters.maxPrice || '')}
                        onChange={(v) => setFilters(f => ({ ...f, maxPrice: Number(v) || undefined }))}
                        placeholder={t('common.max')}
                        numeric
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {pricePresets.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => setFilters(f => ({
                          ...f,
                          minPrice: preset.min,
                          maxPrice: preset.max,
                        }))}
                        className={`h-9 px-4 rounded-xl text-sm font-medium transition-all ${
                          filters.minPrice === preset.min && filters.maxPrice === preset.max
                            ? 'bg-white text-black'
                            : 'bg-[#1A1A1A] text-[#999]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[#999] text-xs font-medium uppercase tracking-wider">
                    {t('filter.rating')}
                  </label>

                  <div className="flex gap-2">
                    {ratingOptions.map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => setFilters(f => ({ ...f, minRating: opt.value }))}
                        className={`flex-1 h-11 flex items-center justify-center gap-1.5 rounded-xl text-sm font-medium transition-all ${
                          filters.minRating === opt.value
                            ? 'bg-white text-black'
                            : 'bg-[#1A1A1A] text-[#999]'
                        }`}
                      >
                        {opt.label === 'Any' ? t('filter.any') : opt.label}
                        {opt.value && <Star size={14} className="fill-current" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[#999] text-xs font-medium uppercase tracking-wider">
                    {t('filter.language')}
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFilters(f => ({ ...f, language: undefined }))}
                      className={`h-9 px-4 rounded-xl text-sm font-medium transition-all ${
                        !filters.language
                          ? 'bg-white text-black'
                          : 'bg-[#1A1A1A] text-[#999]'
                      }`}
                    >
                      {t('filter.any')}
                    </button>
                    {languageOptions.map((lang) => (
                      <button
                        key={lang.id}
                        onClick={() => setFilters(f => ({
                          ...f,
                          language: f.language === lang.id ? undefined : lang.id,
                        }))}
                        className={`h-9 px-4 rounded-xl text-sm font-medium transition-all ${
                          filters.language === lang.id
                            ? 'bg-white text-black'
                            : 'bg-[#1A1A1A] text-[#999]'
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-white font-medium">{t('filter.verifiedOnly')}</span>
                  <Toggle
                    isEnabled={!!filters.verifiedOnly}
                    onChange={(v) => setFilters(f => ({ ...f, verifiedOnly: v || undefined }))}
                  />
                </div>

              </div>

              <div
                className="px-5 pt-3"
                style={{ paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))' }}
              >
                <Button className="w-full" size="lg" onClick={handleApply}>
                  {t('filter.apply')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function getActiveFilterCount(filters: FilterState): number {
  return [
    filters.minSubscribers,
    filters.maxSubscribers,
    filters.minPrice,
    filters.maxPrice,
    filters.minRating,
    filters.verifiedOnly,
    filters.language,
  ].filter(Boolean).length;
}
