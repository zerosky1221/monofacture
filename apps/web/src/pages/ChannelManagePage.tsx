import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Trash2, Users, Eye, Star, AlertTriangle, EyeOff, ChevronRight } from '../components/icons';
import { ChannelAvatar } from '../components/ui/ChannelAvatar';
import { useTelegram } from '../providers/TelegramProvider';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../i18n';
import { apiClient } from '../api/client';
import { Skeleton } from '../components/ui/Skeleton';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Button } from '../components/ui/Button';
import { Toggle } from '../components/ui/Toggle';
import { SelectSheet } from '../components/ui/SelectSheet';
import toast from 'react-hot-toast';

interface ChannelPricing {
  id?: string;
  adFormat: string;
  pricePerHour: string | number;
  pricePermanent?: string | number | null;
  minHours?: number;
  maxHours?: number;
  publishTimeStart?: string | null;
  publishTimeEnd?: string | null;
  timezone?: string;
  isActive: boolean;
}

interface Channel {
  id: string;
  title: string;
  username?: string;
  description?: string;
  photoUrl?: string;
  categories?: string[];
  language?: string;
  status: string;
  subscriberCount: number;
  averageViews?: number;
  rating?: number;
  reviewCount?: number;
  ownerId: string;
  isAcceptingOrders: boolean;
  isOwnerAnonymous: boolean;
  adRequirements?: string;
  pricing?: ChannelPricing[];
}

const CATEGORY_VALUES = [
  'CRYPTO', 'FINANCE', 'TECH', 'LIFESTYLE', 'GAMING', 'NEWS',
  'BUSINESS', 'EDUCATION', 'ENTERTAINMENT', 'SPORTS', 'HEALTH',
  'TRAVEL', 'FOOD', 'OTHER',
] as const;

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
  { value: 'uz', label: "O'zbek" },
  { value: 'es', label: 'Español' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'zh', label: '中文' },
  { value: 'ar', label: 'العربية' },
  { value: 'pt', label: 'Português' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
];

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/Moscow', label: 'Moscow (UTC+3)' },
  { value: 'Asia/Tashkent', label: 'Tashkent (UTC+5)' },
  { value: 'Asia/Dubai', label: 'Dubai (UTC+4)' },
  { value: 'Europe/London', label: 'London (UTC+0)' },
  { value: 'America/New_York', label: 'New York (UTC-5)' },
];

const cardClass = 'bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl';
const sectionTitle = 'text-[11px] text-[#555] uppercase tracking-wider font-semibold px-4 pt-4 pb-2';
const inputClass = 'w-full bg-[#1A1A1A] border border-[#333] rounded-xl px-4 py-3 text-[15px] text-white placeholder:text-[#555] focus:outline-none focus:border-[#555]';

function SelectRow({ label, displayValue, onClick }: {
  label: string;
  displayValue: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between py-3 active:bg-white/[0.02] transition-colors">
      <span className="text-[15px] text-white">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-[14px] text-[#999]">{displayValue}</span>
        <ChevronRight className="w-4 h-4 text-[#555]" strokeWidth={1.5} />
      </div>
    </button>
  );
}

export function ChannelManagePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hapticFeedback } = useTelegram();
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();

  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('en');
  const [adRequirements, setAdRequirements] = useState('');
  const [isAcceptingOrders, setIsAcceptingOrders] = useState(true);
  const [isOwnerAnonymous, setIsOwnerAnonymous] = useState(false);

  const [isPricingEnabled, setIsPricingEnabled] = useState(false);
  const [pricePerHour, setPricePerHour] = useState('');
  const [pricePermanent, setPricePermanent] = useState('');
  const [showPermanent, setShowPermanent] = useState(false);
  const [minHours, setMinHours] = useState('1');
  const [maxHours, setMaxHours] = useState('168');
  const [workingHoursMode, setWorkingHoursMode] = useState<'any' | 'specific'>('any');
  const [workingStart, setWorkingStart] = useState('09:00');
  const [workingEnd, setWorkingEnd] = useState('21:00');
  const [timezone, setTimezone] = useState('UTC');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [showLanguageSheet, setShowLanguageSheet] = useState(false);
  const [showTimezoneSheet, setShowTimezoneSheet] = useState(false);

  const { data: channel, isLoading, error } = useQuery({
    queryKey: ['channel', id],
    queryFn: () => apiClient.get<Channel>(`/channels/${id}`),
    enabled: !!id && isAuthenticated,
  });

  useEffect(() => {
    if (channel && user && channel.ownerId !== user.id) {
      toast.error(t('common.error'));
      navigate('/channels');
    }
  }, [channel, user, navigate]);

  useEffect(() => {
    if (channel) {
      setCategory(channel.categories?.[0] || '');
      setLanguage(channel.language || 'en');
      setAdRequirements(channel.adRequirements || '');
      setIsAcceptingOrders(channel.isAcceptingOrders ?? true);
      setIsOwnerAnonymous(channel.isOwnerAnonymous ?? false);

      const postPricing = channel.pricing?.find(p => p.adFormat === 'POST');
      if (postPricing) {
        setIsPricingEnabled(postPricing.isActive);
        const hourlyTon = Number(postPricing.pricePerHour) / 1_000_000_000;
        const permTon = postPricing.pricePermanent ? Number(postPricing.pricePermanent) / 1_000_000_000 : 0;
        setPricePerHour(hourlyTon > 0 ? hourlyTon.toString() : '');
        setPricePermanent(permTon > 0 ? permTon.toString() : '');
        setShowPermanent(permTon > 0);
        setMinHours(String(postPricing.minHours || 1));
        setMaxHours(String(postPricing.maxHours || 168));
        if (postPricing.publishTimeStart) {
          setWorkingHoursMode('specific');
          setWorkingStart(postPricing.publishTimeStart);
          setWorkingEnd(postPricing.publishTimeEnd || '21:00');
          setTimezone(postPricing.timezone || 'UTC');
        }
      }
    }
  }, [channel]);

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, any>) =>
      apiClient.patch(`/channels/${id}`, data),
    onSuccess: () => {
      toast.success(t('channelManage.saved'));
      queryClient.invalidateQueries({ queryKey: ['channel', id] });
      queryClient.invalidateQueries({ queryKey: ['my-channels'] });
    },
    onError: () => {
      toast.error(t('common.failed'));
    },
  });

  const pricingMutation = useMutation({
    mutationFn: (pricingData: ChannelPricing[]) =>
      apiClient.patch(`/channels/${id}/pricing`, pricingData),
    onSuccess: () => {
      toast.success(t('channelManage.saved'));
      queryClient.invalidateQueries({ queryKey: ['channel', id] });
    },
    onError: () => {
      toast.error(t('common.failed'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/channels/${id}`),
    onSuccess: () => {
      toast.success(t('common.success'));
      queryClient.invalidateQueries({ queryKey: ['my-channels'] });
      navigate('/channels');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to remove channel';
      toast.error(message);
    },
  });

  const handleSaveSettings = () => {
    hapticFeedback('impact');
    const data: Record<string, any> = {
      isAcceptingOrders,
      isOwnerAnonymous,
    };
    if (category) data.category = category;
    if (language) data.language = language;
    if (adRequirements) data.adRequirements = adRequirements;
    updateMutation.mutate(data);
  };

  const handleSavePricing = () => {
    hapticFeedback('impact');

    const hourlyTon = parseFloat(pricePerHour) || 0;
    const permTon = parseFloat(pricePermanent) || 0;

    const pricingToSave: ChannelPricing[] = [{
      adFormat: 'POST',
      pricePerHour: String(Math.round(hourlyTon * 1_000_000_000)),
      pricePermanent: permTon > 0 ? String(Math.round(permTon * 1_000_000_000)) : null,
      minHours: parseInt(minHours) || 1,
      maxHours: parseInt(maxHours) || 168,
      publishTimeStart: workingHoursMode === 'specific' ? workingStart : null,
      publishTimeEnd: workingHoursMode === 'specific' ? workingEnd : null,
      timezone: workingHoursMode === 'specific' ? timezone : 'UTC',
      isActive: isPricingEnabled && hourlyTon > 0,
    }];

    pricingMutation.mutate(pricingToSave);
  };

  const handleDeleteChannel = () => {
    hapticFeedback('impact');
    deleteMutation.mutate();
  };

  const handleDecimalInput = (value: string, setter: (v: string) => void) => {
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setter(value);
    }
  };

  const handleIntInput = (value: string, setter: (v: string) => void) => {
    if (value === '' || /^\d+$/.test(value)) {
      setter(value);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-full pt-4 pb-4">
        <div className="px-4 mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="px-4 space-y-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !channel) {
    return (
      <div className="min-h-full pt-4 pb-4 px-4">
        <div className={cardClass + ' p-8 text-center'}>
          <p className="text-[#999]">{t('createDeal.channelNotFound')}</p>
          <button onClick={() => navigate('/channels')} className="mt-4 px-4 py-2 bg-[#1A1A1A] rounded-xl text-[#999]">
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full pb-8 page-enter">
      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { hapticFeedback('selection'); navigate('/channels'); }}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#1A1A1A] active:scale-95 transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">{t('channelManage.title')}</h1>
        </div>
      </div>

      <div className="px-4 pb-24 space-y-4">

        <div className={cardClass + ' p-4'}>
          <div className="flex items-center gap-4">
            <ChannelAvatar photoUrl={channel.photoUrl} title={channel.title} size="xl" rounded="default" />
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-lg truncate text-white">{channel.title}</h2>
              {channel.username && (
                <p className="text-[#999] text-sm">@{channel.username}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-[#999]">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {channel.subscriberCount?.toLocaleString() || 0}
                </span>
                {channel.averageViews !== undefined && (
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {channel.averageViews.toLocaleString()}
                  </span>
                )}
                {channel.rating !== undefined && channel.rating > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-[#F59E0B]" />
                    {channel.rating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <p className={sectionTitle}>{t('channelManage.channelDetails')}</p>
          <div className="px-4 pb-4">
            <SelectRow
              label={t('channelManage.category')}
              displayValue={category ? t(`explore.category.${category.toLowerCase()}`) : t('channelManage.select')}
              onClick={() => setShowCategorySheet(true)}
            />
            <div className="border-t border-[#1A1A1A] my-1" />
            <SelectRow
              label={t('channelManage.language')}
              displayValue={LANGUAGES.find(l => l.value === language)?.label || t('channelManage.select')}
              onClick={() => setShowLanguageSheet(true)}
            />
          </div>
        </div>

        <div className={cardClass}>
          <p className={sectionTitle}>{t('channelManage.pricing')}</p>

          <div className="px-4 py-3 flex items-center justify-between border-t border-[#1A1A1A]">
            <div>
              <p className="text-[15px] text-white">{t('channelManage.enableAdvertising')}</p>
              <p className="text-[13px] text-[#666]">{t('channelManage.allowAdvertisers')}</p>
            </div>
            <Toggle isEnabled={isPricingEnabled} onChange={setIsPricingEnabled} />
          </div>

          {isPricingEnabled && (
            <div className="px-4 pb-4 space-y-4 border-t border-[#1A1A1A] pt-4">
              <div>
                <label className="text-[13px] text-[#666] mb-2 block">{t('channelManage.pricePerHour')}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={pricePerHour}
                    onChange={(e) => handleDecimalInput(e.target.value, setPricePerHour)}
                    placeholder="0.00"
                    className={inputClass + ' flex-1'}
                  />
                  <span className="text-[#666] text-[14px] w-12">TON</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[13px] text-[#666]">{t('channelManage.permanentPrice')}</label>
                  <Toggle isEnabled={showPermanent} onChange={(v) => { setShowPermanent(v); if (!v) setPricePermanent(''); }} />
                </div>
                {showPermanent && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={pricePermanent}
                      onChange={(e) => handleDecimalInput(e.target.value, setPricePermanent)}
                      placeholder="0.00"
                      className={inputClass + ' flex-1'}
                    />
                    <span className="text-[#666] text-[14px] w-12">TON</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[13px] text-[#666] mb-2 block">{t('channelManage.durationLimits')}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={minHours}
                    onChange={(e) => handleIntInput(e.target.value, setMinHours)}
                    placeholder="1"
                    className={inputClass + ' w-20 text-center'}
                  />
                  <span className="text-[#555]">—</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={maxHours}
                    onChange={(e) => handleIntInput(e.target.value, setMaxHours)}
                    placeholder="168"
                    className={inputClass + ' w-20 text-center'}
                  />
                </div>
              </div>

              <div>
                <label className="text-[13px] text-[#666] mb-2 block">{t('channelManage.workingHours')}</label>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setWorkingHoursMode('any')}
                    className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                      workingHoursMode === 'any' ? 'bg-white text-black' : 'bg-[#1A1A1A] text-[#999]'
                    }`}
                  >
                    {t('channelManage.anyTime')}
                  </button>
                  <button
                    onClick={() => setWorkingHoursMode('specific')}
                    className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                      workingHoursMode === 'specific' ? 'bg-white text-black' : 'bg-[#1A1A1A] text-[#999]'
                    }`}
                  >
                    {t('channelManage.specificHours')}
                  </button>
                </div>
                {workingHoursMode === 'specific' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={workingStart}
                        onChange={(e) => setWorkingStart(e.target.value)}
                        className={inputClass + ' flex-1'}
                      />
                      <span className="text-[#555] text-[13px]">{t('common.to')}</span>
                      <input
                        type="time"
                        value={workingEnd}
                        onChange={(e) => setWorkingEnd(e.target.value)}
                        className={inputClass + ' flex-1'}
                      />
                    </div>
                    <SelectRow
                      label={t('channelManage.timezone')}
                      displayValue={TIMEZONES.find(tz => tz.value === timezone)?.label || 'UTC'}
                      onClick={() => setShowTimezoneSheet(true)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="px-4 pb-4 pt-1">
            <button
              onClick={handleSavePricing}
              disabled={pricingMutation.isPending}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#22C55E] rounded-xl font-semibold text-[14px] text-white transition-all hover:bg-[#1ea34b] disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {pricingMutation.isPending ? t('channelManage.saving') : t('common.save')}
            </button>
          </div>
        </div>

        <div className={cardClass + ' p-4'}>
          <p className="text-[11px] text-[#555] uppercase tracking-wider font-semibold mb-3">{t('channelManage.adRequirements')}</p>
          <textarea
            value={adRequirements}
            onChange={(e) => setAdRequirements(e.target.value)}
            placeholder={t('channelManage.requirementsPlaceholder')}
            className={inputClass + ' min-h-[100px] resize-none'}
            maxLength={2000}
          />
          <p className="text-[11px] text-[#555] mt-2 text-right">{adRequirements.length}/2000</p>
        </div>

        <div className={cardClass}>
          <p className={sectionTitle}>{t('channelManage.settings')}</p>

          <div className="px-4 py-3 flex items-center justify-between border-t border-[#1A1A1A]">
            <div>
              <p className="text-[15px] text-white">{t('channelManage.acceptingOrders')}</p>
              <p className="text-[13px] text-[#666]">{t('channelManage.pauseOrders')}</p>
            </div>
            <Toggle isEnabled={isAcceptingOrders} onChange={setIsAcceptingOrders} />
          </div>

          <div className="px-4 py-3 border-t border-[#1A1A1A]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[15px] text-white">{t('channelManage.anonymousListing')}</p>
                <p className="text-[13px] text-[#666]">{t('channelManage.hideIdentity')}</p>
              </div>
              <Toggle isEnabled={isOwnerAnonymous} onChange={setIsOwnerAnonymous} />
            </div>
            {isOwnerAnonymous && (
              <div className="mt-2 p-2 bg-[#1A1A1A] rounded-lg flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-[#666]" strokeWidth={1.5} />
                <span className="text-[12px] text-[#666]">{t('channelManage.advertisersAnonymous')}</span>
              </div>
            )}
          </div>

          <div className="px-4 py-4 border-t border-[#1A1A1A]">
            <Button className="w-full" size="lg" icon={Save} onClick={handleSaveSettings} disabled={updateMutation.isPending} loading={updateMutation.isPending}>
              {updateMutation.isPending ? t('channelManage.saving') : t('common.save')}
            </Button>
          </div>
        </div>

        <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
            <span className="font-semibold text-[#EF4444]">{t('channelManage.dangerZone')}</span>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#EF4444]/20 border border-[#EF4444]/30 rounded-xl text-[#EF4444] font-medium text-[14px] transition-all hover:bg-[#EF4444]/30"
          >
            <Trash2 className="w-4 h-4" />
            {t('channelManage.removeFromMarketplace')}
          </button>
          <ConfirmDialog
            active={showDeleteConfirm}
            title={t('channelManage.removeChannelTitle')}
            description={t('channelManage.removeChannelDesc')}
            confirmText={t('channelManage.yesRemove')}
            cancelText={t('common.cancel')}
            variant="danger"
            onConfirm={handleDeleteChannel}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        </div>

      </div>

      <SelectSheet
        isOpen={showCategorySheet}
        onClose={() => setShowCategorySheet(false)}
        title={t('channelManage.category')}
        options={CATEGORY_VALUES.map(c => ({ value: c, label: t(`explore.category.${c.toLowerCase()}`) }))}
        value={category}
        onChange={(v) => { setCategory(v); hapticFeedback('selection'); }}
      />

      <SelectSheet
        isOpen={showLanguageSheet}
        onClose={() => setShowLanguageSheet(false)}
        title={t('channelManage.language')}
        options={LANGUAGES.map(l => ({ value: l.value, label: l.label }))}
        value={language}
        onChange={(v) => { setLanguage(v); hapticFeedback('selection'); }}
      />

      <SelectSheet
        isOpen={showTimezoneSheet}
        onClose={() => setShowTimezoneSheet(false)}
        title={t('channelManage.timezone')}
        options={TIMEZONES.map(tz => ({ value: tz.value, label: tz.label }))}
        value={timezone}
        onChange={(v) => { setTimezone(v); hapticFeedback('selection'); }}
      />
    </div>
  );
}

export default ChannelManagePage;
