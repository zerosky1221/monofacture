import { motion } from 'framer-motion';
import { pageVariants, timelineItemVariants, cardVariants } from './animations';
import { useTranslation } from '../../i18n';

interface TimelineEntry {
  id: string;
  event: string;
  createdAt: string;
  actor?: {
    firstName?: string;
    lastName?: string;
  };
}

interface DealTimelineProps {
  timeline: TimelineEntry[];
}

const EVENT_COLORS: Record<string, string> = {
  DEAL_CREATED: 'bg-[#3390ec]',
  DEAL_ACCEPTED: 'bg-[#22C55E]',
  DEAL_REJECTED: 'bg-[#EF4444]',
  PAYMENT_RECEIVED: 'bg-[#22C55E]',
  PAYMENT_CONFIRMED: 'bg-[#22C55E]',
  CREATIVE_SUBMITTED: 'bg-[#3390ec]',
  CREATIVE_APPROVED: 'bg-[#22C55E]',
  REVISION_REQUESTED: 'bg-[#F59E0B]',
  AD_POSTED: 'bg-[#22C55E]',
  POST_VERIFIED: 'bg-[#22C55E]',
  DEAL_COMPLETED: 'bg-[#22C55E]',
  FUNDS_RELEASED: 'bg-[#22C55E]',
  DEAL_CANCELLED: 'bg-[#EF4444]',
  DISPUTED: 'bg-[#EF4444]',
  DISPUTE_RESOLVED: 'bg-[#F59E0B]',
  REFUNDED: 'bg-[#F59E0B]',
};

const EVENT_NAMES: Record<string, string> = {
  DEAL_CREATED: 'Deal Created',
  DEAL_ACCEPTED: 'Deal Accepted',
  DEAL_REJECTED: 'Deal Rejected',
  PAYMENT_RECEIVED: 'Payment Received',
  PAYMENT_CONFIRMED: 'Payment Confirmed',
  CREATIVE_SUBMITTED: 'Creative Submitted',
  CREATIVE_APPROVED: 'Creative Approved',
  REVISION_REQUESTED: 'Revision Requested',
  AD_POSTED: 'Ad Posted',
  POST_VERIFIED: 'Post Verified',
  DEAL_COMPLETED: 'Deal Completed',
  FUNDS_RELEASED: 'Funds Released',
  DEAL_CANCELLED: 'Deal Cancelled',
  DISPUTED: 'Dispute Opened',
  DISPUTE_RESOLVED: 'Dispute Resolved',
  REFUNDED: 'Funds Refunded',
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DealTimeline({ timeline }: DealTimelineProps) {
  const { t } = useTranslation();

  if (!timeline || timeline.length === 0) {
    return null;
  }

  return (
    <motion.div
      variants={cardVariants}
      className="bg-white/5 border border-white/10 rounded-2xl p-4"
    >
      <h3 className="text-sm font-medium text-white/50 mb-4">{t('dealDetail.timeline.title').toUpperCase()}</h3>

      <motion.div
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        className="relative"
      >
        <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-white/10" />

        <div className="space-y-4">
          {timeline.map((entry, index) => (
            <motion.div
              key={entry.id}
              variants={timelineItemVariants}
              custom={index}
              className="flex items-start gap-4"
            >
              <div
                className={`relative z-10 w-4 h-4 rounded-full flex-shrink-0 mt-0.5 ${
                  EVENT_COLORS[entry.event] || 'bg-white/30'
                }`}
              />

              <div className="flex-1 pb-4">
                <p className="text-sm text-white font-medium">
                  {t(`dealDetail.timeline.${entry.event}`) !== `dealDetail.timeline.${entry.event}`
                    ? t(`dealDetail.timeline.${entry.event}`)
                    : EVENT_NAMES[entry.event] || entry.event.replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-white/40 mt-0.5">
                  {formatDate(entry.createdAt)}
                  {entry.actor?.firstName && ` - ${entry.actor.firstName}`}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default DealTimeline;
