import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Copy, Share2, Users, TrendingUp, Check, User, Calendar } from '../components/icons';
import { referralApi } from '../api/referral';
import { formatTonAmount } from '../lib/ton';
import { formatRelative } from '../lib/date';
import { useTelegram } from '../providers/TelegramProvider';
import { useTranslation } from '../i18n';
import { Button } from '../components/ui/Button';

function formatNanoTon(nanoStr: string): string {
  const val = Number(nanoStr) / 1e9;
  return formatTonAmount(val);
}

export function ReferralsPage() {
  const navigate = useNavigate();
  const { hapticFeedback } = useTelegram();
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'referrals' | 'earnings'>('referrals');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['referral-stats'],
    queryFn: () => referralApi.getStats(),
  });

  const copyLink = async () => {
    if (!stats) return;
    await navigator.clipboard.writeText(stats.referralLink);
    hapticFeedback('notification');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = () => {
    if (!stats) return;
    const tg = window.Telegram?.WebApp;
    if (tg && typeof (tg as any).openTelegramLink === 'function') {
      (tg as any).openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(stats.referralLink)}&text=${encodeURIComponent(t('referrals.shareText'))}`
      );
    } else if (navigator.share) {
      navigator.share({ text: t('referrals.shareText'), url: stats.referralLink });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-full pt-4 pb-4 page-enter">
        <div className="px-5 pt-6 pb-4">
          <div className="skeleton h-8 w-40 rounded-xl mb-4" />
          <div className="skeleton h-6 w-60 rounded-xl" />
        </div>
        <div className="px-5 grid grid-cols-3 gap-3 mb-6">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
        <div className="px-5"><div className="skeleton h-40 rounded-2xl" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-full pb-24 page-enter">
      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#1A1A1A] active:scale-95 transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-[22px] font-bold text-white">{t('referrals.title')}</h1>
        </div>
      </div>

      <div>

      <div className="px-5 mb-6 grid grid-cols-3 gap-3">
        <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 text-center">
          <Users className="w-5 h-5 text-[#666] mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-2xl font-bold text-white">{stats?.totalReferred || 0}</p>
          <p className="text-[#666] text-xs uppercase tracking-wide">{t('referrals.stats.referred')}</p>
        </div>
        <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 text-center">
          <TrendingUp className="w-5 h-5 text-[#666] mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-2xl font-bold text-white">{stats?.totalDeals || 0}</p>
          <p className="text-[#666] text-xs uppercase tracking-wide">{t('referrals.stats.deals')}</p>
        </div>
        <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 text-center">
          <img src="/logob.png" alt="" className="w-5 h-5 mx-auto mb-2 opacity-50" />
          <p className="text-2xl font-bold text-white">{formatNanoTon(stats?.totalEarned || '0')}</p>
          <p className="text-[#666] text-xs uppercase tracking-wide">{t('referrals.stats.earned')}</p>
        </div>
      </div>

      <div className="px-5 mb-6">
        <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4">
          <p className="text-xs font-bold text-[#666] uppercase tracking-wider mb-2">{t('referrals.yourLink')}</p>
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl px-4 py-3 text-white text-sm truncate mb-4">
            {stats?.referralLink}
          </div>
          <div className="flex gap-3">
            <Button className="flex-1" size="lg" icon={copied ? Check : Copy} onClick={copyLink}>
              {copied ? t('referrals.copied') : t('referrals.copy')}
            </Button>
            <Button className="flex-1" size="lg" variant="secondary" icon={Share2} onClick={shareLink}>
              {t('referrals.share')}
            </Button>
          </div>
        </div>
      </div>

      <div className="px-5 mb-6">
        <h3 className="text-xs font-bold text-[#666] uppercase tracking-wider mb-3">{t('referrals.howItWorks')}</h3>
        <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
            <p className="text-[#999] text-sm">{t('referrals.step1')}</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
            <p className="text-[#999] text-sm">{t('referrals.step2')}</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
            <p className="text-[#999] text-sm">{t('referrals.step3')}</p>
          </div>
        </div>
      </div>

      <div className="px-5 mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => { hapticFeedback('selection'); setActiveTab('referrals'); }}
            className={`flex-1 h-10 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'referrals'
                ? 'bg-white text-black'
                : 'bg-[#111] text-[#999] border border-[#1A1A1A]'
            }`}
          >
            {t('referrals.myReferrals')} ({stats?.totalReferred || 0})
          </button>
          <button
            onClick={() => { hapticFeedback('selection'); setActiveTab('earnings'); }}
            className={`flex-1 h-10 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'earnings'
                ? 'bg-white text-black'
                : 'bg-[#111] text-[#999] border border-[#1A1A1A]'
            }`}
          >
            {t('referrals.earnings')}
          </button>
        </div>
      </div>

      <div className="px-5">
        {activeTab === 'referrals' ? (
          <div className="space-y-3">
            {!stats?.referrals?.length ? (
              <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-8 text-center">
                <div className="w-16 h-16 mb-4 mx-auto opacity-30">
                  <img src="/logob.png" alt="" className="w-full h-full" />
                </div>
                <p className="text-white font-medium mb-1">{t('referrals.noReferrals')}</p>
                <p className="text-[#666] text-sm">{t('referrals.noReferralsDesc')}</p>
              </div>
            ) : (
              stats.referrals.map((ref) => (
                <div key={ref.id} className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-[#666]" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {ref.userName}
                        {ref.username && <span className="text-[#666]"> @{ref.username}</span>}
                      </p>
                      <p className="text-[#666] text-xs flex items-center gap-1">
                        <Calendar className="w-3 h-3" strokeWidth={1.5} />
                        {t('referrals.joined')} {formatRelative(ref.joinedAt)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-white font-medium">{formatNanoTon(ref.totalEarned)} TON</p>
                      <p className="text-[#666] text-xs">{ref.dealCount} {t('referrals.deals')}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {!stats?.recentEarnings?.length ? (
              <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-8 text-center">
                <div className="w-16 h-16 mb-4 mx-auto opacity-30">
                  <img src="/logob.png" alt="" className="w-full h-full" />
                </div>
                <p className="text-white font-medium mb-1">{t('referrals.noEarnings')}</p>
                <p className="text-[#666] text-sm">{t('referrals.noEarningsDesc')}</p>
              </div>
            ) : (
              stats.recentEarnings.map((earning) => (
                <div key={earning.id} className="bg-[#111] border border-[#1A1A1A] rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#22C55E] font-medium">+{formatNanoTon(earning.earning)} TON</p>
                      <p className="text-[#666] text-xs">
                        {t('referrals.fromDeal', { ref: earning.dealReference })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#999] text-xs">{formatRelative(earning.createdAt)}</p>
                      <p className="text-[#666] text-xs">
                        Deal: {formatNanoTon(earning.dealAmount)} TON
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

export default ReferralsPage;
