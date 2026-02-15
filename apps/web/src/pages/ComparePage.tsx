import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plus, X, Star, Users, Eye, TrendingUp } from '../components/icons';
import { api } from '../lib/api';
import { useTranslation } from '../i18n';

export function ComparePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const initialIds = searchParams.get('ids')?.split(',').filter(Boolean) || [];
  const [channelIds, setChannelIds] = useState<string[]>(initialIds);

  const { data: channels } = useQuery({
    queryKey: ['compare-channels', channelIds],
    queryFn: async () => {
      if (!channelIds.length) return [];
      const results = await Promise.all(
        channelIds.map(id => api.get(`/channels/${id}`).then(r => r.data).catch(() => null))
      );
      return results.filter(Boolean);
    },
    enabled: channelIds.length > 0,
  });

  const removeChannel = (id: string) => {
    setChannelIds(prev => prev.filter(cId => cId !== id));
  };

  const formatNumber = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  const metrics = [
    { label: t('compare.subscribers'), key: 'subscriberCount', icon: Users, format: formatNumber },
    { label: t('compare.avgViews'), key: 'averageViews', icon: Eye, format: formatNumber },
    { label: t('compare.rating'), key: 'rating', icon: Star, format: (v: number) => v.toFixed(1) },
    { label: t('compare.engagement'), key: 'engagementRate', icon: TrendingUp, format: (v: number) => v.toFixed(1) + '%' },
    { label: t('compare.totalDeals'), key: 'totalDeals', icon: TrendingUp, format: (v: number) => v.toString() },
  ];

  return (
    <div className="min-h-full pb-24 page-enter">
      <div className="bg-black border-b border-[#1A1A1A] px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#1A1A1A] active:scale-95 transition-all">
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl font-semibold text-white">{t('compare.title')}</h1>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {(channels || []).map((ch: any) => (
            <div key={ch.id} className="flex-shrink-0 w-32 bg-[#111] border border-[#1A1A1A] rounded-2xl p-3 text-center relative">
              <button
                onClick={() => removeChannel(ch.id)}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#1A1A1A] flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5 text-[#999]" />
              </button>
              <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] mx-auto mb-2 overflow-hidden">
                {ch.photoUrl && <img src={ch.photoUrl} alt="" className="w-full h-full object-cover" />}
              </div>
              <p className="text-white text-xs font-medium truncate">{ch.title}</p>
            </div>
          ))}
          {channelIds.length < 3 && (
            <button
              onClick={() => navigate('/')}
              className="flex-shrink-0 w-32 bg-[#111] border border-dashed border-[#333] rounded-2xl p-3 flex flex-col items-center justify-center"
            >
              <Plus className="w-6 h-6 text-[#666] mb-1" strokeWidth={1.5} />
              <span className="text-[#666] text-xs">{t('compare.addChannel')}</span>
            </button>
          )}
        </div>

        {channels && channels.length >= 2 && (
          <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl overflow-hidden">
            {metrics.map((metric, i) => {
              const Icon = metric.icon;
              const values = channels.map((ch: any) => ch[metric.key] || 0);
              const maxVal = Math.max(...values);

              return (
                <div key={metric.key} className={`p-4 ${i < metrics.length - 1 ? 'border-b border-[#1A1A1A]' : ''}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-4 h-4 text-[#999]" strokeWidth={1.5} />
                    <span className="text-xs text-[#999] uppercase tracking-wider">{metric.label}</span>
                  </div>
                  <div className="flex gap-3">
                    {channels.map((ch: any) => {
                      const val = ch[metric.key] || 0;
                      const isBest = val === maxVal && channels.length > 1;
                      return (
                        <div key={ch.id} className="flex-1 text-center">
                          <p className={`text-lg font-bold ${isBest ? 'text-[#22C55E]' : 'text-white'}`}>
                            {metric.format(val)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {(!channels || channels.length < 2) && (
          <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-8 text-center">
            <p className="text-white font-medium mb-1">{t('compare.minChannels')}</p>
            <p className="text-[#666] text-sm">{t('compare.selectChannels')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ComparePage;
