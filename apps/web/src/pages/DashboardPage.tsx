import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '../i18n';
import {
  ArrowLeft,
  TrendingUp,
  Package,
  Star,
  Users,
  ChevronRight,
} from '../components/icons';
import { analyticsApi } from '../api/analytics';

type Period = '7d' | '30d' | '90d';

function formatTon(nano: string) {
  return (Number(nano) / 1e9).toFixed(2);
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function EarningsBarChart({
  data,
  noDataLabel,
}: {
  data: { date: string; amount: string }[];
  noDataLabel: string;
}) {
  if (!data.length) {
    return (
      <p className="text-[#555] text-sm text-center py-10">{noDataLabel}</p>
    );
  }

  const values = data.map(d => Number(d.amount) / 1e9);
  const max = Math.max(...values, 0.01);

  return (
    <div className="flex items-end gap-1.5 h-36">
      {data.map((item, i) => {
        const val = Number(item.amount) / 1e9;
        const pct = Math.max((val / max) * 100, 4);
        const label = item.date.slice(5);
        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center justify-end h-full"
          >
            <span className="text-[9px] text-[#999] mb-1">
              {val > 0 ? val.toFixed(1) : ''}
            </span>
            <div
              className="w-full rounded-t-md bg-[#22C55E] transition-all duration-500 min-w-[6px]"
              style={{ height: `${pct}%` }}
            />
            <span className="text-[9px] text-[#555] mt-1.5">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function FormatBarChart({
  data,
  noDataLabel,
}: {
  data: { format: string; count: number; earnings: string }[];
  noDataLabel: string;
}) {
  if (!data.length) {
    return (
      <p className="text-[#555] text-sm text-center py-8">{noDataLabel}</p>
    );
  }

  const max = Math.max(...data.map(d => d.count), 1);
  const colors = ['#22C55E', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4'];

  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#A0A0A0] font-medium">
              {item.format}
            </span>
            <span className="text-xs text-white font-medium">{item.count}</span>
          </div>
          <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(item.count / max) * 100}%`,
                backgroundColor: colors[i % colors.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>('30d');

  const { data, isLoading } = useQuery({
    queryKey: ['analytics-dashboard', period],
    queryFn: () => analyticsApi.getDashboard(period),
  });

  const periodLabels: Record<Period, string> = {
    '7d': t('dashboard.period7d'),
    '30d': t('dashboard.period30d'),
    '90d': t('dashboard.period90d'),
  };

  return (
    <div className="min-h-full pb-24 page-enter">
      <div className="bg-black border-b border-[#1A1A1A] px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#111] active:scale-95 transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl font-semibold text-white">
            {t('dashboard.title')}
          </h1>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <div className="bg-[#111] rounded-full p-1 flex">
          {(['7d', '30d', '90d'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                period === p
                  ? 'bg-white text-black'
                  : 'text-[#666] hover:text-[#999]'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-[#22C55E]/20 via-[#111] to-[#111] border border-[#22C55E]/20">
              <div className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-[#22C55E]/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[#22C55E]" strokeWidth={1.5} />
              </div>
              <p className="text-2xl font-bold text-white mt-1">
                {formatTon(data?.totalEarnings || '0')}
              </p>
              <p className="text-xs text-[#22C55E]/70 mt-0.5">
                {t('dashboard.tonEarned')}
              </p>
            </div>

            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4">
              <div className="absolute-icon-placeholder" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-2xl font-bold text-white">
                    {data?.totalDeals || 0}
                  </p>
                  <p className="text-xs text-[#666] mt-0.5">
                    {t('dashboard.completedDeals')}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
                  <Package className="w-4 h-4 text-[#3B82F6]" strokeWidth={1.5} />
                </div>
              </div>
            </div>

            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-2xl font-bold text-white">
                    {data?.totalChannels || 0}
                  </p>
                  <p className="text-xs text-[#666] mt-0.5">
                    {t('dashboard.yourChannels')}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
                  <Users className="w-4 h-4 text-[#F59E0B]" strokeWidth={1.5} />
                </div>
              </div>
            </div>

            <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-2xl font-bold text-white">
                    {data?.rating?.toFixed(1) || '0.0'}
                  </p>
                  <p className="text-xs text-[#666] mt-0.5">
                    {t('dashboard.avgRating')}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
                  <Star className="w-4 h-4 text-[#ECC679]" strokeWidth={1.5} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-white mb-4">
            {t('dashboard.earningsChart')}
          </h3>
          <EarningsBarChart
            data={(data?.earningsChart || []).slice(-14)}
            noDataLabel={t('dashboard.noData')}
          />
        </div>

        <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-white mb-4">
            {t('dashboard.byFormat')}
          </h3>
          <FormatBarChart
            data={data?.formatBreakdown || []}
            noDataLabel={t('dashboard.noData')}
          />
        </div>

        <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-white mb-4">
            {t('dashboard.topAdvertisers')}
          </h3>
          {data?.topAdvertisers?.length ? (
            <div className="space-y-3">
              {data.topAdvertisers.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#1A1A1A] flex items-center justify-center overflow-hidden shrink-0">
                    {item.user?.photoUrl ? (
                      <img
                        src={item.user.photoUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="w-4 h-4 text-[#555]" strokeWidth={1.5} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {item.user?.firstName || t('dashboard.anonymous')}
                    </p>
                    <p className="text-xs text-[#555]">
                      {t('dashboard.dealsCount', { count: item.dealsCount })}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[#22C55E] shrink-0">
                    {formatTon(item.totalSpent)} TON
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#555] text-sm text-center py-6">
              {t('dashboard.noData')}
            </p>
          )}
        </div>

        <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-white mb-4">
            {t('dashboard.channelPerformance')}
          </h3>
          {data?.channelStats?.length ? (
            <div className="space-y-3">
              {data.channelStats.map((ch: any) => (
                <div
                  key={ch.id}
                  className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-3"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-[#1A1A1A] flex items-center justify-center overflow-hidden shrink-0">
                      {ch.photoUrl ? (
                        <img
                          src={ch.photoUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs text-[#555] font-bold">
                          {ch.title?.charAt(0) || '#'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {ch.title}
                      </p>
                      {ch.username && (
                        <p className="text-xs text-[#555]">@{ch.username}</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#333]" strokeWidth={1.5} />
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center">
                      <p className="text-xs font-semibold text-white">
                        {formatCompact(ch.subscriberCount)}
                      </p>
                      <p className="text-[10px] text-[#555]">
                        {t('dashboard.subscribers')}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-white">
                        {formatCompact(ch.averageViews)}
                      </p>
                      <p className="text-[10px] text-[#555]">
                        {t('dashboard.avgViews')}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-white">
                        {ch.dealsInPeriod}
                      </p>
                      <p className="text-[10px] text-[#555]">
                        {t('dashboard.deals')}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-[#22C55E]">
                        {formatTon(ch.earningsInPeriod)}
                      </p>
                      <p className="text-[10px] text-[#555]">
                        {t('dashboard.totalEarned')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#555] text-sm text-center py-6">
              {t('dashboard.noData')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
