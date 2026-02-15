import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTonConnectUI, useTonAddress, useTonWallet } from '@tonconnect/ui-react';
import { formatDealTimestamp } from '../lib/date';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeft,
  Copy,
  CheckCircle,
  RefreshCw,
  Gift,
  X,
  AlertCircle,
  Gem,
  LogOut,
} from '../components/icons';
import { useTelegram } from '../providers/TelegramProvider';
import { useTranslation } from '../i18n';
import { truncateAddress, formatTonAmount } from '../lib/ton';
import { balanceApi, referralApi } from '../api';
import type { BalanceTransaction } from '../api/balance';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';

type TransactionFilterType = 'all' | 'earnings' | 'withdrawals' | 'referral';

export function WalletPage() {
  const navigate = useNavigate();
  const { hapticFeedback } = useTelegram();
  const { t } = useTranslation();
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const address = useTonAddress();
  const queryClient = useQueryClient();

  const [copied, setCopied] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [activeFilter, setActiveFilter] = useState<TransactionFilterType>('all');

  const {
    data: balanceData,
    isLoading: balanceLoading,
    refetch: refetchBalance,
  } = useQuery({
    queryKey: ['user-balance'],
    queryFn: () => balanceApi.getBalance(),
  });

  const { data: referralStats, isLoading: referralLoading } = useQuery({
    queryKey: ['referral-stats'],
    queryFn: () => referralApi.getStats(),
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ['balance-transactions', activeFilter],
    queryFn: () => balanceApi.getTransactions(1, 20, activeFilter === 'all' ? undefined : activeFilter),
  });

  const withdrawMutation = useMutation({
    mutationFn: (data: { amount: string; toAddress: string }) =>
      balanceApi.requestWithdrawal(data.amount, data.toAddress),
    onSuccess: () => {
      toast.success(t('wallet.withdrawalSuccess'));
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      queryClient.invalidateQueries({ queryKey: ['user-balance'] });
    },
    onError: (error: any) => {
      toast.error(error.message || t('wallet.withdrawalFailed'));
    },
  });

  const formatNano = (nanoStr: string | undefined): number => {
    if (!nanoStr) return 0;
    return Number(nanoStr) / 1e9;
  };

  const handleConnect = async () => {
    hapticFeedback('impact');
    try {
      await tonConnectUI.openModal();
    } catch (error) {
      console.error('Failed to open TON Connect modal:', error);
    }
  };

  const handleDisconnect = async () => {
    hapticFeedback('impact');
    try {
      await tonConnectUI.disconnect();
      toast.success(t('wallet.walletDisconnected'));
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      hapticFeedback('notification');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyReferralLink = () => {
    if (referralStats?.referralLink) {
      navigator.clipboard.writeText(referralStats.referralLink);
      hapticFeedback('notification');
      setReferralCopied(true);
      setTimeout(() => setReferralCopied(false), 2000);
    }
  };

  const handleRefresh = () => {
    hapticFeedback('selection');
    refetchBalance();
  };

  const handleWithdraw = () => {
    if (!address) {
      toast.error(t('wallet.connectFirst'));
      return;
    }

    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum < 1) {
      toast.error(t('wallet.minWithdrawalError'));
      return;
    }

    const available = formatNano(balanceData?.available);
    if (amountNum > available) {
      toast.error(t('wallet.insufficientBalance'));
      return;
    }

    const amountNano = Math.round(amountNum * 1e9).toString();
    withdrawMutation.mutate({ amount: amountNano, toAddress: address });
  };

  const handleMaxWithdraw = () => {
    const available = formatNano(balanceData?.available);
    const maxWithdraw = Math.max(0, available - 0.05);
    setWithdrawAmount(maxWithdraw.toFixed(2));
  };

  const NETWORK_FEE = 0.05;
  const netWithdraw = Math.max(0, parseFloat(withdrawAmount || '0') - NETWORK_FEE);

  const filterTabs: { key: TransactionFilterType; label: string }[] = [
    { key: 'all', label: t('common.all') },
    { key: 'earnings', label: t('wallet.deposits') },
    { key: 'withdrawals', label: t('wallet.withdrawals') },
    { key: 'referral', label: t('wallet.referral') },
  ];

  return (
    <div className="min-h-full pb-4 page-enter">
      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#1A1A1A] active:scale-95 transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-[22px] font-bold text-white">{t('wallet.title')}</h1>
        </div>
      </div>

      <div className="mx-5 mb-6 relative">
        <div className="absolute inset-0 bg-white/5 blur-3xl rounded-3xl" />
        <div className="relative bg-[#111] border border-white/10 rounded-3xl overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[#999] text-sm font-medium">{t('wallet.balance')}</p>
              <button onClick={handleRefresh} className="p-1.5 rounded-full bg-[#1A1A1A] active:bg-[#333]">
                <RefreshCw className={`w-4 h-4 text-[#999] ${balanceLoading ? 'animate-spin' : ''}`} strokeWidth={1.5} />
              </button>
            </div>
            <p className="text-white text-5xl font-bold tracking-tight leading-none mb-1">
              {balanceLoading ? '...' : formatTonAmount(formatNano(balanceData?.available))}
            </p>
            <p className="text-[#666] text-lg mb-6">TON</p>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#1A1A1A]">
              <div>
                <p className="text-[#999] text-xs uppercase mb-1">{t('wallet.pending')}</p>
                <p className="text-white font-semibold">{formatTonAmount(formatNano(balanceData?.pending))} TON</p>
              </div>
              <div>
                <p className="text-[#999] text-xs uppercase mb-1">{t('wallet.earned')}</p>
                <p className="text-white font-semibold">{formatTonAmount(formatNano(balanceData?.totalEarned))} TON</p>
              </div>
              <div>
                <p className="text-[#999] text-xs uppercase mb-1">{t('wallet.withdrawn')}</p>
                <p className="text-white font-semibold">{formatTonAmount(formatNano(balanceData?.totalWithdrawn))} TON</p>
              </div>
            </div>
          </div>

          {wallet && address && (
            <div className="px-6 pb-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 flex items-center gap-3 bg-[#1A1A1A] rounded-xl px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-[#222] flex items-center justify-center flex-shrink-0">
                    <Wallet className="w-4 h-4 text-white" strokeWidth={1.5} />
                  </div>
                  <p className="font-mono text-xs text-[#999] truncate">{truncateAddress(address, 10)}</p>
                </div>
                <button
                  onClick={handleCopyAddress}
                  className="w-10 h-10 flex items-center justify-center bg-[#1A1A1A] rounded-xl active:bg-[#333] transition-all"
                >
                  {copied ? (
                    <CheckCircle className="w-5 h-5 text-[#22C55E]" strokeWidth={1.5} />
                  ) : (
                    <Copy className="w-5 h-5 text-[#999]" strokeWidth={1.5} />
                  )}
                </button>
                <button
                  onClick={handleDisconnect}
                  className="w-10 h-10 flex items-center justify-center bg-[#EF4444]/15 rounded-xl active:bg-[#EF4444]/25 transition-all"
                >
                  <LogOut className="w-5 h-5 text-[#EF4444]" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          )}

          <div className="px-6 pb-6 flex gap-3">
            {!wallet ? (
              <Button className="w-full" size="lg" onClick={handleConnect}>
                {t('wallet.connect')}
              </Button>
            ) : (
              <Button className="w-full" size="lg" icon={ArrowUpRight} onClick={() => setShowWithdrawModal(true)}>
                {t('wallet.withdraw')}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 mb-6">
        <div className="bg-[#111] border border-[#1A1A1A] rounded-3xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
              <Gift className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[15px] text-white">{t('wallet.referralProgram')}</h3>
              <p className="text-[#999] text-[13px]">{t('wallet.referralDesc')}</p>
            </div>
            <button
              onClick={() => navigate('/referrals')}
              className="text-[#999] text-sm font-medium flex-shrink-0"
            >
              {t('wallet.viewAll')}
            </button>
          </div>

          {referralLoading ? (
            <div className="skeleton h-20 rounded-xl" />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-[#1A1A1A] rounded-xl p-3 text-center">
                  <p className="text-white text-xl font-bold">{referralStats?.totalReferred || 0}</p>
                  <p className="text-[#999] text-xs">{t('wallet.referred')}</p>
                </div>
                <div className="bg-[#1A1A1A] rounded-xl p-3 text-center">
                  <p className="text-[#22C55E] text-xl font-bold">{referralStats?.totalDeals || 0}</p>
                  <p className="text-[#999] text-xs">{t('wallet.referralDeals')}</p>
                </div>
                <div className="bg-[#1A1A1A] rounded-xl p-3 text-center">
                  <p className="text-white text-xl font-bold">{formatTonAmount(formatNano(referralStats?.totalEarned))}</p>
                  <p className="text-[#999] text-xs">{t('wallet.referralEarned')}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 bg-[#1A1A1A] rounded-xl px-4 py-3 overflow-hidden">
                  <p className="text-[#666] text-xs mb-0.5">{t('wallet.yourReferralLink')}</p>
                  <p className="font-mono text-xs truncate text-[#999]">{referralStats?.referralLink || 'Loading...'}</p>
                </div>
                <button
                  onClick={handleCopyReferralLink}
                  className="w-12 h-12 flex items-center justify-center bg-[#1A1A1A] rounded-xl active:bg-[#333] transition-all"
                >
                  {referralCopied ? (
                    <CheckCircle className="w-5 h-5 text-[#22C55E]" strokeWidth={1.5} />
                  ) : (
                    <Copy className="w-5 h-5 text-[#999]" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="px-5 pb-4">
        <h2 className="text-xs font-bold text-[#666] uppercase tracking-wider mb-3">{t('wallet.transactions')}</h2>

        <div className="mb-4">
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 pb-1">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    hapticFeedback('selection');
                    setActiveFilter(tab.key);
                  }}
                  className={`flex-shrink-0 h-9 px-4 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all ${
                    activeFilter === tab.key
                      ? 'bg-white text-black'
                      : 'bg-[#111] text-[#999] border border-[#1A1A1A]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {txLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton h-20 rounded-2xl" />
            ))}
          </div>
        ) : transactions?.items && transactions.items.length > 0 ? (
          <div className="bg-[#111] border border-[#1A1A1A] rounded-3xl overflow-hidden">
            {transactions.items.map((tx, index) => (
              <InAppTransactionItem
                key={tx.id}
                transaction={tx}
                isLast={index === transactions.items.length - 1}
              />
            ))}
          </div>
        ) : (
          <div className="bg-[#111] border border-[#1A1A1A] rounded-3xl p-8 text-center">
            <div className="w-16 h-16 mb-4 mx-auto opacity-30">
              <img src="/logob.png" alt="" className="w-full h-full" />
            </div>
            <p className="text-white font-medium mb-1">{t('wallet.noTransactions')}</p>
            <p className="text-[#666] text-sm">{t('wallet.noTransactionsDesc')}</p>
          </div>
        )}
      </div>

      {showWithdrawModal && (
        <div className="fixed inset-0 z-[200]" onClick={() => setShowWithdrawModal(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute bottom-0 left-0 right-0" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#111] rounded-t-3xl border-t border-[#1A1A1A]">
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-[#333] rounded-full" />
              </div>

              <div className="flex items-center justify-between px-5 pb-4">
                <h2 className="text-xl font-bold text-white">{t('wallet.withdrawTon')}</h2>
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="p-2 rounded-xl bg-[#1A1A1A] active:bg-[#333]"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="px-5 space-y-4">
                <div>
                  <label className="text-sm text-[#666] mb-2 block">{t('wallet.amountToWithdraw')}</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.00"
                      min="1"
                      step="0.01"
                      className="w-full bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl px-4 py-4 text-2xl font-bold text-white focus:outline-none focus:border-white/30 placeholder:text-[#333]"
                    />
                    <button
                      onClick={handleMaxWithdraw}
                      className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#333] text-white rounded-lg text-sm font-semibold active:bg-[#444]"
                    >
                      {t('wallet.max')}
                    </button>
                  </div>
                  <p className="text-xs text-[#666] mt-2">
                    {t('wallet.available', { amount: formatTonAmount(formatNano(balanceData?.available)) })}
                  </p>
                </div>

                <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#666]">{t('wallet.networkFee')}</span>
                    <span className="text-white font-medium">~{NETWORK_FEE} TON</span>
                  </div>
                  <div className="flex justify-between text-sm pt-3 border-t border-[#1A1A1A]">
                    <span className="text-[#666]">{t('wallet.youWillReceive')}</span>
                    <span className="font-bold text-[#22C55E] text-base">
                      {netWithdraw > 0 ? formatTonAmount(netWithdraw) : '0.00'} TON
                    </span>
                  </div>
                </div>

                <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center">
                      <Gem className="w-5 h-5 text-white" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">To: {wallet?.device.appName}</p>
                      <p className="font-mono text-xs text-[#666] truncate">{truncateAddress(address || '', 12)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-xl p-3">
                  <AlertCircle className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <p className="text-xs text-[#999]">
                    {t('wallet.minWithdrawal')}
                  </p>
                </div>
              </div>

              <div className="px-5 py-6">
                <Button className="w-full" size="lg" onClick={handleWithdraw} disabled={withdrawMutation.isPending || !withdrawAmount || parseFloat(withdrawAmount) < 1} loading={withdrawMutation.isPending}>
                  {withdrawMutation.isPending ? t('wallet.processing') : `${t('wallet.withdraw')} ${withdrawAmount || '0'} TON`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface InAppTransactionItemProps {
  transaction: BalanceTransaction;
  isLast: boolean;
}

function InAppTransactionItem({ transaction, isLast }: InAppTransactionItemProps) {
  const { t } = useTranslation();
  const amount = Number(transaction.amount) / 1e9;
  const isPositive = amount > 0;

  const timestamp = formatDealTimestamp(transaction.createdAt);

  const typeConfig: Record<string, { icon: typeof ArrowDownLeft; color: string; label: string }> = {
    DEAL_EARNING: { icon: ArrowDownLeft, color: '#22C55E', label: t('wallet.dealEarning') },
    WITHDRAWAL: { icon: ArrowUpRight, color: '#EF4444', label: t('wallet.withdrawal') },
    REFERRAL_EARNING: { icon: Gift, color: '#3390ec', label: t('wallet.referralBonus') },
    REFUND_CREDIT: { icon: ArrowDownLeft, color: '#F59E0B', label: t('wallet.refund') },
  };

  const config = typeConfig[transaction.type] || typeConfig.DEAL_EARNING;
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-3 p-4 transition-all duration-200 active:bg-[#151515] ${!isLast ? 'border-b border-[#1A1A1A]' : ''}`}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${config.color}15` }}>
        <Icon className="w-5 h-5" style={{ color: config.color }} strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className="font-medium text-[15px] text-white">{config.label}</p>
          <p className="font-semibold text-[15px]" style={{ color: isPositive ? '#22C55E' : 'white' }}>
            {isPositive ? '+' : ''}{formatTonAmount(Math.abs(amount))} TON
          </p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-[#666] truncate pr-2">{transaction.description}</p>
          <p className="text-[13px] text-[#666] flex-shrink-0">{timestamp}</p>
        </div>
      </div>
    </div>
  );
}

export default WalletPage;
