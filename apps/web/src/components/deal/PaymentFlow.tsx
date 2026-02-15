import { useState, useEffect, useReducer } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, RefreshCw, CheckCircle, AlertCircle, ChevronRight } from '../icons';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { toNano, fromNano } from '@ton/core';
import { toast } from 'react-hot-toast';
import { fadeVariants, spinAnimation, cardVariants } from './animations';
import { ESCROW_CONFIG } from './constants';
import { useTranslation } from '../../i18n';

interface PaymentInfo {
  address: string;
  amount: string;
  deadline?: string;
}

interface PaymentFlowProps {
  paymentInfo: PaymentInfo;
  onPaymentConfirmed?: () => void;
  onPollStatus?: () => Promise<boolean>;
}

type PaymentStep = 'connect' | 'review' | 'pay' | 'confirming' | 'success' | 'error';

interface PaymentState {
  step: PaymentStep;
  isProcessing: boolean;
  error: string | null;
  pollCount: number;
}

type PaymentAction =
  | { type: 'WALLET_CONNECTED' }
  | { type: 'PROCEED_TO_PAY' }
  | { type: 'START_PAYMENT' }
  | { type: 'PAYMENT_SENT' }
  | { type: 'POLL_TICK' }
  | { type: 'PAYMENT_CONFIRMED' }
  | { type: 'PAYMENT_FAILED'; error: string }
  | { type: 'RESET' };

function paymentReducer(state: PaymentState, action: PaymentAction): PaymentState {
  switch (action.type) {
    case 'WALLET_CONNECTED':
      return { ...state, step: 'review' };
    case 'PROCEED_TO_PAY':
      return { ...state, step: 'pay' };
    case 'START_PAYMENT':
      return { ...state, isProcessing: true, step: 'confirming' };
    case 'PAYMENT_SENT':
      return { ...state, pollCount: 0 };
    case 'POLL_TICK':
      return { ...state, pollCount: state.pollCount + 1 };
    case 'PAYMENT_CONFIRMED':
      return { ...state, step: 'success', isProcessing: false };
    case 'PAYMENT_FAILED':
      return { ...state, step: 'error', error: action.error, isProcessing: false };
    case 'RESET':
      return { step: 'connect', isProcessing: false, error: null, pollCount: 0 };
    default:
      return state;
  }
}

export function PaymentFlow({ paymentInfo, onPaymentConfirmed, onPollStatus }: PaymentFlowProps) {
  const { t } = useTranslation();
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();

  const [state, dispatch] = useReducer(paymentReducer, {
    step: wallet ? 'review' : 'connect',
    isProcessing: false,
    error: null,
    pollCount: 0,
  });

  useEffect(() => {
    if (wallet && state.step === 'connect') {
      dispatch({ type: 'WALLET_CONNECTED' });
    }
  }, [wallet, state.step]);

  const escrowAmount = BigInt(paymentInfo.amount);
  const gasBuffer = ESCROW_CONFIG.gasBuffer;
  const totalWithGas = escrowAmount + gasBuffer;

  const formatAmount = (nanoTon: bigint) => fromNano(nanoTon);

  const handlePayEscrow = async () => {
    if (!paymentInfo || !tonConnectUI.connected) {
      if (!tonConnectUI.connected) {
        toast.error(t('dealDetail.toast.connectWallet'));
        tonConnectUI.openModal();
      }
      return;
    }

    dispatch({ type: 'START_PAYMENT' });

    try {
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
          {
            address: paymentInfo.address,
            amount: totalWithGas.toString(),
          },
        ],
      });

      dispatch({ type: 'PAYMENT_SENT' });
      toast.success(t('dealDetail.toast.paymentSent'));

      if (onPollStatus) {
        const pollInterval = setInterval(async () => {
          dispatch({ type: 'POLL_TICK' });
          try {
            const confirmed = await onPollStatus();
            if (confirmed) {
              clearInterval(pollInterval);
              dispatch({ type: 'PAYMENT_CONFIRMED' });
              toast.success(t('payment.paymentReceivedToast'));
              onPaymentConfirmed?.();
            }
          } catch (err) {
          }
        }, 5000);

        setTimeout(() => {
          clearInterval(pollInterval);
          if (state.step === 'confirming') {
            dispatch({ type: 'PAYMENT_FAILED', error: 'Confirmation timeout' });
          }
        }, 120000);
      }
    } catch (err: unknown) {
      const error = err as Error;
      if (error?.message?.includes('User rejected')) {
        dispatch({ type: 'PAYMENT_FAILED', error: t('dealDetail.toast.paymentCancelled') });
        toast.error(t('dealDetail.toast.paymentCancelled'));
      } else {
        dispatch({ type: 'PAYMENT_FAILED', error: error?.message || t('dealDetail.toast.paymentFailed') });
        toast.error(t('dealDetail.toast.paymentFailed'));
      }
    }
  };

  return (
    <motion.div variants={cardVariants} className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <h3 className="text-sm font-medium text-white/50 mb-4">{t('payment.title').toUpperCase()}</h3>

      <AnimatePresence mode="wait">
        {state.step === 'connect' && (
          <motion.div
            key="connect"
            variants={fadeVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="text-center py-4"
          >
            <button
              onClick={() => tonConnectUI.openModal()}
              className="w-full py-3 px-4 rounded-xl font-medium bg-white text-black flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <Wallet className="w-5 h-5" />
              {t('dealDetail.connectWallet')}
            </button>
            <p className="text-white/50 text-sm mt-3">{t('payment.connectDesc')}</p>
          </motion.div>
        )}

        {state.step === 'review' && (
          <motion.div
            key="review"
            variants={fadeVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-4"
          >
            <div className="bg-white/5 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">{t('payment.escrowAmount')}</span>
                <span className="text-white">{formatAmount(escrowAmount)} TON</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">{t('payment.networkFeeEst')}</span>
                <span className="text-white">~{formatAmount(gasBuffer)} TON</span>
              </div>
              <div className="border-t border-white/10 pt-2 mt-2">
                <div className="flex justify-between font-bold">
                  <span className="text-white">{t('payment.total')}</span>
                  <span className="text-[#22C55E]">{formatAmount(totalWithGas)} TON</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => dispatch({ type: 'PROCEED_TO_PAY' })}
              className="w-full py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 transition-all active:scale-[0.98]"
            >
              {t('payment.continueToPayment')}
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {state.step === 'pay' && (
          <motion.div
            key="pay"
            variants={fadeVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <button
              onClick={handlePayEscrow}
              disabled={state.isProcessing}
              className="w-full py-4 rounded-2xl font-semibold text-lg bg-white text-black disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] transition-all"
            >
              <Wallet className="w-5 h-5 inline mr-2" />
              {t('payment.payAmount', { amount: formatAmount(totalWithGas) })}
            </button>
          </motion.div>
        )}

        {state.step === 'confirming' && (
          <motion.div
            key="confirming"
            variants={fadeVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="text-center py-6"
          >
            <motion.div
              animate={spinAnimation}
              className="w-12 h-12 mx-auto mb-4"
            >
              <RefreshCw className="w-12 h-12 text-[#3390ec]" />
            </motion.div>
            <p className="text-white font-medium">{t('payment.confirmingOnBlockchain')}</p>
            <p className="text-white/50 text-sm mt-1">{t('payment.mayTakeSeconds')}</p>
            {state.pollCount > 0 && (
              <p className="text-white/30 text-xs mt-2">{t('payment.checking', { count: state.pollCount })}</p>
            )}
          </motion.div>
        )}

        {state.step === 'success' && (
          <motion.div
            key="success"
            variants={fadeVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="text-center py-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#22C55E]/20 flex items-center justify-center"
            >
              <CheckCircle className="w-8 h-8 text-[#22C55E]" />
            </motion.div>
            <p className="text-white font-medium">{t('payment.paymentConfirmedTitle')}</p>
            <p className="text-white/50 text-sm mt-1">{t('payment.fundsLockedInEscrow')}</p>
          </motion.div>
        )}

        {state.step === 'error' && (
          <motion.div
            key="error"
            variants={fadeVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="text-center py-6"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#EF4444]/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-[#EF4444]" />
            </div>
            <p className="text-white font-medium">{t('payment.paymentFailedTitle')}</p>
            <p className="text-white/50 text-sm mt-1">{state.error}</p>
            <button
              onClick={() => dispatch({ type: 'RESET' })}
              className="mt-4 px-4 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/15 transition-all"
            >
              {t('common.retry')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default PaymentFlow;
