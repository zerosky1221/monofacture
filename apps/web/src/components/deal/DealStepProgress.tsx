import { motion } from 'framer-motion';
import {
  FileText,
  CheckCircle,
  Image,
  Send,
  Trophy,
} from '../icons';
import { STEP_STAGES, getStepIndex } from './constants';
import { cardVariants, progressLineVariants, pulseAnimation } from './animations';
import { useTranslation } from '../../i18n';

const STEP_LABEL_KEYS = ['dealStep.created', 'dealStep.accepted', 'dealStep.creative', 'dealStep.posted', 'dealStep.done'];

const STATUS_DESC_KEYS: Record<string, string> = {
  PENDING: 'dealStep.statusCreated',
  PENDING_ACCEPTANCE: 'dealStep.statusPendingAcceptance',
  PENDING_PAYMENT: 'dealStep.statusPendingPayment',
  PAYMENT_RECEIVED: 'dealStep.statusPaymentReceived',
  PENDING_CREATIVE: 'dealStep.statusPendingCreative',
  CREATIVE_SUBMITTED: 'dealStep.statusCreativeSubmitted',
  REVISION_REQUESTED: 'dealStep.statusRevisionRequested',
  PENDING_POSTING: 'dealStep.statusPendingPosting',
  AD_POSTED: 'dealStep.statusAdPosted',
  PENDING_VERIFICATION: 'dealStep.statusAdPosted',
  COMPLETED: 'dealStep.statusCompleted',
  FUNDS_RELEASED: 'dealStep.statusFundsReleased',
  CANCELLED: 'dealStep.statusCancelled',
  DISPUTED: 'dealStep.statusDisputed',
  REFUNDED: 'dealStep.statusRefunded',
};

interface DealStepProgressProps {
  status: string;
}

const STEP_ICONS = [FileText, CheckCircle, Image, Send, Trophy];

export function DealStepProgress({ status }: DealStepProgressProps) {
  const { t } = useTranslation();
  const currentIndex = getStepIndex(status);
  const progressPercent = currentIndex / (STEP_STAGES.length - 1);

  return (
    <motion.div
      variants={cardVariants}
      className="bg-white/5 border border-white/10 rounded-2xl p-5"
    >
      <div className="relative flex justify-between mb-4">
        <div className="absolute top-4 left-4 right-4 h-1 bg-white/10 rounded-full" />

        <motion.div
          className="absolute top-4 left-4 h-1 rounded-full origin-left"
          style={{
            background: 'linear-gradient(90deg, #22C55E 0%, #3390ec 50%, #3390ec 100%)',
            width: 'calc(100% - 32px)',
          }}
          variants={progressLineVariants}
          initial="hidden"
          animate="visible"
          custom={progressPercent}
        />

        {STEP_STAGES.map((stage, index) => {
          const Icon = STEP_ICONS[index];
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <motion.div
              key={stage.key}
              className="relative z-10 flex flex-col items-center"
              animate={isCurrent ? pulseAnimation : {}}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isCompleted
                    ? 'bg-[#22C55E]'
                    : isCurrent
                      ? 'bg-[#3390ec]'
                      : 'bg-[#1A1A1A] border border-white/20'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isCompleted || isCurrent ? 'text-white' : 'text-white/40'
                  }`}
                />
              </div>
              <span
                className={`mt-2 text-[10px] font-medium ${
                  isCompleted || isCurrent ? 'text-white' : 'text-white/40'
                }`}
              >
                {t(STEP_LABEL_KEYS[index])}
              </span>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        key={status}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="p-3 bg-white/5 rounded-xl border border-white/10"
      >
        <p className="text-sm text-white/80">
          {STATUS_DESC_KEYS[status] ? t(STATUS_DESC_KEYS[status]) : t('dealStep.processing')}
        </p>
      </motion.div>
    </motion.div>
  );
}

export default DealStepProgress;
