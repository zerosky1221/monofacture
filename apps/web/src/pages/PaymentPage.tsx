import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { ArrowLeft, Clock, Copy, ExternalLink, Wallet, CheckCircle, Shield, Diamond } from '../components/icons';
import { useTelegram } from '../providers/TelegramProvider';
import { useTranslation } from '../i18n';
import { useTonPayment } from '../hooks/useTonPayment';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ChannelAvatar } from '../components/ui/Avatar';
import { Skeleton } from '../components/ui/Skeleton';
import { dealsApi, Deal } from '../api/deals';
import { apiClient } from '../api/client';
import { formatTon, truncateAddress, cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface PaymentInfo {
  address: string;
  amount: string;
  amountFormatted: string;
  paymentLink: string;
  qrData: string;
  expiresAt: string;
}

export function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hapticFeedback, setMainButton, hideMainButton } = useTelegram();
  const { t } = useTranslation();
  const [tonConnectUI] = useTonConnectUI();
  const userAddress = useTonAddress();
  const { deposit, isLoading: isTonLoading, isConnected, connectWallet } = useTonPayment();
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    return () => {
      hideMainButton();
    };
  }, []);

  const { data: deal, isLoading: dealLoading } = useQuery({
    queryKey: ['deal', id],
    queryFn: () => dealsApi.getById(id!),
    enabled: !!id,
    refetchInterval: 10000,
  });

  const { data: paymentInfo, isLoading: paymentLoading } = useQuery({
    queryKey: ['payment-info', id],
    queryFn: () => apiClient.get<PaymentInfo>(`/escrow/deals/${id}/payment-info`),
    enabled: !!id && deal?.status === 'PENDING_PAYMENT',
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (deal?.status === 'PAYMENT_RECEIVED' || deal?.status === 'IN_PROGRESS') {
      hapticFeedback('notification');
      toast.success(t('payment.paymentReceivedToast'));
      navigate(`/deals/${id}`);
    }
  }, [deal?.status]);

  const handlePayWithTonConnect = async () => {
    if (!paymentInfo || !deal) {
      toast.error(t('payment.paymentNotAvailable'));
      return;
    }

    if (!isConnected) {
      await connectWallet();
      return;
    }

    setIsPaying(true);
    hapticFeedback('selection');

    try {
      const success = await deposit({
        escrowAddress: paymentInfo.address,
        amount: formatTon(deal.totalAmount),
        dealId: deal.id,
      });

      if (success) {
        const checkPayment = setInterval(async () => {
          const response = await dealsApi.getById(id!);
          if (response.status !== 'PENDING_PAYMENT') {
            clearInterval(checkPayment);
            queryClient.invalidateQueries({ queryKey: ['deal', id] });
          }
        }, 5000);

        setTimeout(() => clearInterval(checkPayment), 300000);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || t('payment.paymentFailedToast'));
    } finally {
      setIsPaying(false);
    }
  };

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    hapticFeedback('selection');
    toast.success(message);
  };

  if (dealLoading || paymentLoading) {
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
            <h1 className="text-[22px] font-bold text-white">{t('payment.title')}</h1>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <Skeleton className="h-24 rounded-card" />
          <Skeleton className="h-48 rounded-card" />
          <Skeleton className="h-40 rounded-card" />
        </div>
      </div>
    );
  }

  if (!deal || deal.status !== 'PENDING_PAYMENT') {
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
            <h1 className="text-[22px] font-bold text-white">{t('payment.title')}</h1>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-accent-green/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-accent-green" />
            </div>
            <p className="text-text-secondary mb-4">
              {deal?.status === 'PAYMENT_RECEIVED'
                ? t('payment.paymentReceived')
                : t('payment.notAvailable')}
            </p>
            <Button onClick={() => navigate(`/deals/${id}`)}>{t('payment.viewDeal')}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full pb-24 page-enter">
      <div className="bg-black border-b border-[#1A1A1A] px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#1A1A1A] active:scale-95 transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl font-semibold text-white">{t('payment.title')}</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChannelAvatar
              src={deal.channel?.photoUrl}
              name={deal.channel?.title || 'Channel'}
              size="md"
            />
            <div>
              <p className="font-semibold text-white">{deal.adFormat} Ad</p>
              <p className="text-sm text-text-secondary">{deal.channel?.title}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-accent-green">
              {formatTon(deal.totalAmount)} TON
            </p>
            <p className="text-xs text-text-tertiary">{t('payment.totalAmount')}</p>
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <CardHeader title={t('payment.payWithTonConnect')} />

        {isConnected ? (
          <div className="space-y-4">
            <div className="p-3 bg-dark-elevated rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                    <Diamond className="w-4 h-4 text-white" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">{t('payment.connectedWallet')}</p>
                    <p className="font-mono text-sm text-white">
                      {truncateAddress(userAddress || '', 8)}
                    </p>
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-accent-green" />
              </div>
            </div>

            <div className="p-3 bg-accent-blue/10 rounded-xl border border-accent-blue/20">
              <div className="flex items-start gap-2">
                <Shield className="w-5 h-5 text-accent-blue flex-shrink-0 mt-0.5" />
                <p className="text-sm text-white/70">
                  {t('payment.escrowSecure')}
                </p>
              </div>
            </div>

            <Button
              fullWidth
              onClick={handlePayWithTonConnect}
              isLoading={isPaying || isTonLoading}
              leftIcon={<Wallet className="w-5 h-5" />}
              className="!bg-white !text-black"
            >
              {t('common.pay')} {formatTon(deal.totalAmount)} TON
            </Button>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-[#1A1A1A] flex items-center justify-center mx-auto mb-4">
              <Diamond className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
            <p className="text-text-secondary mb-4">{t('payment.connectDesc')}</p>
            <Button onClick={connectWallet}>
              {t('common.connect')} {t('nav.wallet')}
            </Button>
          </div>
        )}
      </Card>

      {paymentInfo && (
        <Card className="mb-4">
          <CardHeader title={t('payment.orPayManually')} />
          <div className="space-y-4">
            <div>
              <p className="text-sm text-text-secondary mb-1">{t('payment.sendExactly')}</p>
              <div className="flex items-center justify-between p-3 bg-dark-elevated rounded-lg">
                <p className="font-bold text-lg text-accent-green">
                  {paymentInfo.amountFormatted} TON
                </p>
                <button
                  onClick={() => copyToClipboard(paymentInfo.amountFormatted, t('payment.amountCopied'))}
                  className="p-2 hover:bg-dark-border rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4 text-text-secondary" />
                </button>
              </div>
            </div>

            <div>
              <p className="text-sm text-text-secondary mb-1">{t('payment.toAddress')}</p>
              <div className="p-3 bg-dark-elevated rounded-lg">
                <p className="font-mono text-xs text-white break-all mb-2">
                  {paymentInfo.address}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  leftIcon={<Copy className="w-4 h-4" />}
                  onClick={() => copyToClipboard(paymentInfo.address, t('payment.addressCopied'))}
                >
                  {t('payment.copyAddress')}
                </Button>
              </div>
            </div>

            <a
              href={paymentInfo.paymentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 p-3 bg-dark-elevated rounded-lg text-accent-blue hover:bg-dark-border transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{t('payment.openTonWallet')}</span>
            </a>
          </div>
        </Card>
      )}

      {paymentInfo && (
        <Card className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent-blue" />
              <span className="font-medium text-white">{t('payment.smartContractEscrow')}</span>
            </div>
            <span className="px-2 py-1 bg-accent-orange/20 text-accent-orange text-xs font-medium rounded-full">
              {t('payment.awaitingPayment')}
            </span>
          </div>
          <p className="text-sm text-text-secondary mb-3">
            {t('payment.escrowDesc')}
          </p>
          <a
            href={`https://testnet.tonviewer.com/${paymentInfo.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-3 bg-dark-elevated rounded-lg text-white/70 hover:text-white hover:bg-dark-border transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>{t('payment.viewContract')}</span>
          </a>
        </Card>
      )}

      {paymentInfo?.expiresAt && (
        <Card>
          <div className="flex items-center justify-center gap-3">
            <Clock className="w-5 h-5 text-accent-orange" />
            <div className="text-center">
              <p className="text-sm text-text-secondary">{t('payment.paymentExpires')}</p>
              <p className="font-medium text-white">
                {new Date(paymentInfo.expiresAt).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      )}
      </div>
    </div>
  );
}
