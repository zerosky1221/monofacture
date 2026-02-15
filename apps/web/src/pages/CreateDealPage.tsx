import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Info, Calendar, MessageSquare, Star, ChevronDown, Loader2 } from '../components/icons';
import { ChannelAvatar } from '../components/ui/ChannelAvatar';
import { useTelegram } from '../providers/TelegramProvider';
import { useTranslation } from '../i18n';
import { api } from '../lib/api';
import { dealsApi, AdFormat } from '../api/deals';
import { Input } from '@telegram-tools/ui-kit';
import { Button } from '../components/ui/Button';
import { Toggle } from '../components/ui/Toggle';
import toast from 'react-hot-toast';

interface ChannelPricing {
  id: string;
  adFormat: string;
  pricePerHour: string;
  pricePermanent: string | null;
  minHours: number;
  maxHours: number;
  publishTimeStart: string | null;
  publishTimeEnd: string | null;
  timezone: string;
  isActive: boolean;
}

interface ChannelData {
  id: string;
  title: string;
  username?: string;
  photoUrl?: string;
  subscriberCount: number;
  rating: number;
  reviewCount: number;
  status: string;
  isActive?: boolean;
  adRequirements?: string;
  isAcceptingOrders?: boolean;
  pricing: ChannelPricing[];
  owner?: {
    id: string;
    firstName?: string;
    telegramUsername?: string;
  };
}

const AD_FORMAT_ICONS: Record<string, React.ReactNode> = {
  POST: <MessageSquare className="w-5 h-5" strokeWidth={1.5} />,
};

function formatTon(nanoTon: string | number): string {
  const value = typeof nanoTon === 'string' ? parseInt(nanoTon) : nanoTon;
  if (isNaN(value) || value === 0) return '0';
  return (value / 1_000_000_000).toFixed(2);
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}

export function CreateDealPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hapticFeedback } = useTelegram();
  const { t } = useTranslation();

  const channelId = searchParams.get('channelId');
  const preselectedFormat = searchParams.get('adFormat') as AdFormat | null;

  const [selectedFormat, setSelectedFormat] = useState<AdFormat | null>(preselectedFormat);
  const [pricingMode, setPricingMode] = useState<'hourly' | 'permanent'>('hourly');
  const [postDuration, setPostDuration] = useState<number>(24);
  const [brief, setBrief] = useState('');
  const [requirements, setRequirements] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('12:00');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);

  const { data: channel, isLoading, error } = useQuery({
    queryKey: ['channel-for-deal', channelId],
    queryFn: async () => {
      const response = await api.get<ChannelData>(`/channels/${channelId}`);
      return response.data;
    },
    enabled: !!channelId,
  });

  const createDealMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFormat || !channelId) throw new Error('Please select an ad format');

      let scheduledPostTime: string | undefined;
      if (scheduledDate) {
        scheduledPostTime = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
      }

      const isPermanent = pricingMode === 'permanent';
      return dealsApi.create({
        channelId,
        adFormat: selectedFormat,
        brief: brief || undefined,
        requirements: requirements || undefined,
        scheduledPostTime,
        postDuration: isPermanent ? undefined : postDuration,
        isPermanent,
        isAnonymous,
      });
    },
    onSuccess: (deal) => {
      hapticFeedback?.('notification');
      toast.success(t('common.success'));
      navigate(`/deals/${deal.id}`);
    },
    onError: (error: any) => {
      const msg = error?.message || error?.data?.message || t('common.failed');
      toast.error(msg);
    },
  });

  const activePricing = channel?.pricing?.filter(p => p.isActive) || [];

  const selectedPricing = activePricing.find(p => p.adFormat === selectedFormat);
  const hasPermanent = selectedPricing?.pricePermanent && parseInt(String(selectedPricing.pricePermanent)) > 0;
  let price = 0;
  if (selectedPricing) {
    if (pricingMode === 'permanent' && hasPermanent) {
      price = parseInt(String(selectedPricing.pricePermanent));
    } else {
      price = parseInt(String(selectedPricing.pricePerHour)) * postDuration;
    }
  }
  const platformFee = Math.floor(price * 0.05);
  const total = price + platformFee;

  const today = new Date();
  const minDate = today.toISOString().split('T')[0];
  const todayStr = minDate;

  const currentHour = today.getHours();
  const currentMinutes = today.getMinutes();
  const minTimeToday = `${String(currentHour + 1).padStart(2, '0')}:00`;

  const isToday = scheduledDate === todayStr;

  const isTimeInPast = isToday && scheduledTime < minTimeToday;

  if (!channelId) {
    return (
      <div className="min-h-screen bg-black p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#999999] mb-4">{t('createDeal.noChannel')}</p>
          <Button className="w-full" size="lg" onClick={() => navigate('/')}>{t('createDeal.browseChannels')}</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#0A0A0A] rounded w-48" />
          <div className="h-20 bg-[#0A0A0A] rounded-2xl" />
          <div className="h-48 bg-[#0A0A0A] rounded-2xl" />
          <div className="h-32 bg-[#0A0A0A] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !channel) {
    return (
      <div className="min-h-screen bg-black p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#999999] mb-4">{t('createDeal.channelNotFound')}</p>
          <Button className="w-full" size="lg" onClick={() => navigate(-1)}>{t('common.back')}</Button>
        </div>
      </div>
    );
  }

  if (channel.isActive === false || (channel.status !== 'ACTIVE' && channel.status !== 'VERIFIED')) {
    return (
      <div className="min-h-screen bg-black p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#999999] mb-4">{t('channel.deactivatedDesc')}</p>
          <Button className="w-full" size="lg" onClick={() => navigate(-1)}>{t('common.back')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#1A1A1A] active:scale-95 transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-[22px] font-bold text-white">{t('createDeal.title')}</h1>
        </div>
      </div>

      <div className="p-4 pb-24 space-y-4">

        <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl overflow-hidden">
          <div className="p-4 flex items-center gap-3">
            <ChannelAvatar photoUrl={channel.photoUrl} title={channel.title} size="lg" />
            <div className="flex-1">
              <h3 className="font-semibold text-white">{channel.title}</h3>
              <div className="flex items-center gap-2 mt-0.5 text-[13px] text-[#999]">
                {channel.username && <span>@{channel.username}</span>}
                <span className="text-[#333]">·</span>
                <span>{formatNumber(channel.subscriberCount)} {t('createDeal.subs')}</span>
                {channel.rating > 0 && (
                  <>
                    <span className="text-[#333]">·</span>
                    <span className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-[#F59E0B]" />
                      {channel.rating?.toFixed(1)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {channel.adRequirements && (
            <div className="mx-4 mb-3 p-3 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-xl">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-[#F59E0B] flex-shrink-0 mt-0.5" />
                <p className="text-[13px] text-white/70 whitespace-pre-wrap">{channel.adRequirements}</p>
              </div>
            </div>
          )}

          <div className="border-t border-[#1A1A1A] p-4">
            <p className="text-[11px] font-semibold text-[#555] uppercase tracking-wider mb-3">{t('createDeal.selectFormat')}</p>
            {activePricing.length > 0 ? (
              <div className="flex gap-2">
                {activePricing.map((pricing) => {
                  const icon = AD_FORMAT_ICONS[pricing.adFormat] || <MessageSquare className="w-5 h-5" strokeWidth={1.5} />;
                  const formatLabel = t(`deals.formats.${pricing.adFormat}`) || pricing.adFormat;
                  const isSelected = selectedFormat === pricing.adFormat;

                  return (
                    <button
                      key={pricing.adFormat}
                      onClick={() => {
                        hapticFeedback?.('selection');
                        setSelectedFormat(pricing.adFormat as AdFormat);
                      }}
                      className={`flex-1 py-3 px-2 rounded-xl text-center transition-all border ${
                        isSelected
                          ? 'border-white bg-white/5'
                          : 'border-[#1A1A1A] bg-[#111] active:bg-[#1A1A1A]'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1.5 ${
                        isSelected ? 'bg-white text-black' : 'bg-[#1A1A1A] text-[#999]'
                      }`}>
                        {icon}
                      </div>
                      <p className={`text-[13px] font-medium ${isSelected ? 'text-white' : 'text-[#999]'}`}>{formatLabel}</p>
                      <p className={`text-[12px] mt-0.5 ${isSelected ? 'text-white/70' : 'text-[#555]'}`}>{formatTon(pricing.pricePerHour)} TON</p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[#999] text-sm text-center py-4">{t('channel.noPrice')}</p>
            )}
          </div>
        </div>

        {selectedFormat && selectedPricing && (
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-4">
            <p className="text-[11px] font-semibold text-[#555] uppercase tracking-wider mb-3">{t('createDeal.duration')}</p>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { setPricingMode('hourly'); hapticFeedback?.('selection'); }}
                className={`flex-1 py-2.5 rounded-xl text-[14px] font-medium transition-all ${
                  pricingMode === 'hourly' ? 'bg-white text-black' : 'bg-[#111] border border-[#1A1A1A] text-[#999]'
                }`}
              >
                {t('createDeal.hourly')}
              </button>
              {hasPermanent && (
                <button
                  onClick={() => { setPricingMode('permanent'); hapticFeedback?.('selection'); }}
                  className={`flex-1 py-2.5 rounded-xl text-[14px] font-medium transition-all ${
                    pricingMode === 'permanent' ? 'bg-white text-black' : 'bg-[#111] border border-[#1A1A1A] text-[#999]'
                  }`}
                >
                  {t('createDeal.permanent')}
                </button>
              )}
            </div>

            {pricingMode === 'hourly' && (
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Input
                      value={String(postDuration)}
                      onChange={(v) => setPostDuration(Math.max(selectedPricing.minHours || 1, Math.min(selectedPricing.maxHours || 168, parseInt(v) || 1)))}
                      numeric
                      placeholder="24"
                    />
                  </div>
                  <span className="text-[13px] text-[#666] flex-shrink-0">{t('common.hours')}</span>
                </div>
                <p className="text-[12px] text-[#555] mt-2">
                  {t('createDeal.hoursRange', { min: String(selectedPricing.minHours || 1), max: String(selectedPricing.maxHours || 168) })}
                </p>
              </div>
            )}

            {pricingMode === 'permanent' && (
              <p className="text-[13px] text-[#999]">{t('createDeal.permanentDesc')}</p>
            )}

            <div className="mt-4 pt-3 border-t border-[#1A1A1A] flex justify-between items-center">
              <span className="text-[13px] text-[#999]">{t('createDeal.subtotal')}</span>
              <span className="text-white font-bold text-[16px]">{formatTon(price)} TON</span>
            </div>

            {selectedPricing.publishTimeStart && selectedPricing.publishTimeEnd && (
              <div className="mt-3 p-2.5 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-xl">
                <p className="text-[12px] text-[#F59E0B]">
                  {t('createDeal.postsAccepted')} {selectedPricing.publishTimeStart}–{selectedPricing.publishTimeEnd} ({selectedPricing.timezone})
                </p>
              </div>
            )}
          </div>
        )}

        <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-4">
          <p className="text-[11px] font-semibold text-[#555] uppercase tracking-wider mb-3">{t('createDeal.whenToPublish')}</p>

          <div className="flex gap-2 mb-3">
            <button
              onClick={() => {
                setScheduledDate('');
                setScheduledTime('12:00');
                hapticFeedback?.('selection');
              }}
              className={`flex-1 py-2.5 rounded-xl text-[14px] font-medium transition-all flex items-center justify-center gap-2 ${
                !scheduledDate
                  ? 'bg-white text-black'
                  : 'bg-[#111] border border-[#1A1A1A] text-[#999]'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {t('createDeal.asap')}
            </button>
            <button
              onClick={() => {
                if (!scheduledDate) setScheduledDate(minDate);
                hapticFeedback?.('selection');
              }}
              className={`flex-1 py-2.5 rounded-xl text-[14px] font-medium transition-all flex items-center justify-center gap-2 ${
                scheduledDate
                  ? 'bg-white text-black'
                  : 'bg-[#111] border border-[#1A1A1A] text-[#999]'
              }`}
            >
              <Calendar className="w-4 h-4" />
              {t('createDeal.schedule')}
            </button>
          </div>

          {!scheduledDate ? (
            <p className="text-[13px] text-[#666] text-center py-2">
              {t('createDeal.asapDesc')}
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[12px] text-[#666] mb-1.5">{t('createDeal.date')}</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setScheduledDate(newDate);
                      if (newDate === todayStr && scheduledTime < minTimeToday) {
                        setScheduledTime(minTimeToday);
                      }
                    }}
                    min={minDate}
                    className="w-full bg-[#111] border border-[#1A1A1A] rounded-xl py-2.5 px-3 text-[14px] text-white focus:outline-none focus:border-[#444] transition-colors"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[12px] text-[#666] mb-1.5">
                    {t('createDeal.time')} {isToday && <span className="text-[#F59E0B]">({t('common.min')} {minTimeToday})</span>}
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    min={isToday ? minTimeToday : undefined}
                    onChange={(e) => {
                      const newTime = e.target.value;
                      if (isToday && newTime < minTimeToday) {
                        setScheduledTime(minTimeToday);
                      } else {
                        setScheduledTime(newTime);
                      }
                    }}
                    className={`w-full bg-[#111] border rounded-xl py-2.5 px-3 text-[14px] focus:outline-none transition-colors ${
                      isTimeInPast
                        ? 'border-[#EF4444]/50 text-[#EF4444]'
                        : 'border-[#1A1A1A] text-white focus:border-[#444]'
                    }`}
                  />
                </div>
              </div>

              {isTimeInPast && (
                <p className="text-[12px] text-[#EF4444]">
                  {t('createDeal.scheduleInPast')}. {t('common.min')} {minTimeToday}
                </p>
              )}

              {selectedPricing?.publishTimeStart && selectedPricing?.publishTimeEnd && !isTimeInPast && (
                <p className={`text-[12px] ${
                  scheduledTime >= selectedPricing.publishTimeStart && scheduledTime <= selectedPricing.publishTimeEnd
                    ? 'text-[#22C55E]'
                    : 'text-[#EF4444]'
                }`}>
                  {scheduledTime >= selectedPricing.publishTimeStart && scheduledTime <= selectedPricing.publishTimeEnd
                    ? `${t('createDeal.withinWorkingHours')} (${selectedPricing.publishTimeStart}–${selectedPricing.publishTimeEnd})`
                    : `${t('createDeal.outsideWorkingHours')} (${selectedPricing.publishTimeStart}–${selectedPricing.publishTimeEnd})`
                  }
                </p>
              )}
            </div>
          )}
        </div>

        <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-4">
          <p className="text-[11px] font-semibold text-[#555] uppercase tracking-wider mb-3">{t('createDeal.adBrief')}</p>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder={t('createDeal.briefPlaceholder')}
            rows={3}
            className="w-full bg-[#111] border border-[#1A1A1A] rounded-xl p-3 text-[14px] text-white placeholder:text-[#555] focus:outline-none focus:border-[#444] transition-colors resize-none"
          />

          {!showRequirements ? (
            <button
              onClick={() => { setShowRequirements(true); hapticFeedback?.('selection'); }}
              className="mt-3 text-[13px] text-[#666] hover:text-[#999] transition-colors flex items-center gap-1"
            >
              <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
              {t('createDeal.addRequirements')}
            </button>
          ) : (
            <div className="mt-3">
              <label className="block text-[12px] text-[#666] mb-1.5">{t('createDeal.additionalRequirements')}</label>
              <textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder={t('createDeal.requirementsPlaceholder')}
                rows={2}
                className="w-full bg-[#111] border border-[#1A1A1A] rounded-xl p-3 text-[14px] text-white placeholder:text-[#555] focus:outline-none focus:border-[#444] transition-colors resize-none"
              />
            </div>
          )}
        </div>

        <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl overflow-hidden">
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[15px] text-white">{t('createDeal.anonymousMode')}</p>
              <p className="text-[13px] text-[#666]">{t('createDeal.hideYourIdentity')}</p>
            </div>
            <Toggle
              isEnabled={isAnonymous}
              onChange={(v) => {
                hapticFeedback?.('selection');
                setIsAnonymous(v);
              }}
            />
          </div>

          {selectedFormat && (
            <div className="border-t border-[#1A1A1A] p-4">
              <p className="text-[11px] font-semibold text-[#555] uppercase tracking-wider mb-3">{t('createDeal.summary')}</p>

              <p className="text-[13px] text-[#999] mb-3">
                {t(`deals.formats.${selectedFormat}`)} in @{channel.username || channel.title}
                {pricingMode === 'permanent' ? ` · ${t('createDeal.permanent')}` : ` · ${postDuration}h`}
                {scheduledDate && ` · ${new Date(`${scheduledDate}T${scheduledTime}`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
              </p>

              <div className="space-y-2 text-[14px]">
                <div className="flex justify-between">
                  <span className="text-[#999]">{t('createDeal.adPrice')}</span>
                  <span className="text-white">{formatTon(price)} TON</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#999]">{t('createDeal.platformFee')}</span>
                  <span className="text-white">{formatTon(platformFee)} TON</span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t border-[#1A1A1A]">
                  <span className="text-white">{t('createDeal.total')}</span>
                  <span className="text-white text-[16px]">{formatTon(total)} TON</span>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 pt-0">
            <p className="text-[12px] text-[#555] mb-3 text-center">
              {t('createDeal.fundsInEscrow')}
            </p>
            <button
              onClick={() => createDealMutation.mutate()}
              disabled={!selectedFormat || createDealMutation.isPending || isTimeInPast}
              className="w-full h-[52px] flex items-center justify-center gap-2 bg-white rounded-2xl text-black font-semibold text-[15px] active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none"
            >
              {createDealMutation.isPending && (
                <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />
              )}
              {createDealMutation.isPending
                ? t('createDeal.creating')
                : isTimeInPast
                  ? t('createDeal.fixScheduleTime')
                  : selectedFormat
                    ? `${t('createDeal.createDeal')} — ${formatTon(total)} TON`
                    : t('createDeal.selectFormat')
              }
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
