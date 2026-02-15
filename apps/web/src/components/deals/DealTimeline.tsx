import { formatDealTimestamp } from '../../lib/date';
import { Check, Circle } from '../icons';
import type { Deal } from '../../api/deals';

interface TimelineStage {
  label: string;
  time: string | null | undefined;
  status: 'completed' | 'current' | 'pending';
}

interface DealTimelineProps {
  deal: Deal;
}

export function DealTimeline({ deal }: DealTimelineProps) {
  const stages: TimelineStage[] = [
    {
      label: 'Created',
      time: deal.createdAt,
      status: 'completed',
    },
    {
      label: 'Payment',
      time: deal.paidAt || null,
      status: deal.paidAt ? 'completed' : deal.status === 'PENDING_PAYMENT' ? 'current' : 'pending',
    },
    {
      label: 'Content Sent',
      time: deal.contentSubmittedAt || null,
      status: deal.contentSubmittedAt
        ? 'completed'
        : ['CREATIVE_PENDING', 'IN_PROGRESS'].includes(deal.status)
          ? 'current'
          : deal.paidAt
            ? 'pending'
            : 'pending',
    },
    {
      label: 'Published',
      time: deal.publishedAt || null,
      status: deal.publishedAt
        ? 'completed'
        : ['SCHEDULED', 'CREATIVE_APPROVED'].includes(deal.status)
          ? 'current'
          : deal.contentSubmittedAt
            ? 'pending'
            : 'pending',
    },
    {
      label: 'Completed',
      time: deal.completedAt || null,
      status: deal.completedAt
        ? 'completed'
        : ['POSTED', 'VERIFYING', 'VERIFIED'].includes(deal.status)
          ? 'current'
          : deal.publishedAt
            ? 'pending'
            : 'pending',
    },
  ];

  const terminalStatuses = ['CANCELLED', 'DISPUTED', 'REFUNDED', 'EXPIRED'];
  const isTerminal = terminalStatuses.includes(deal.status);

  return (
    <div className="space-y-0">
      {stages.map((stage, index) => {
        if (isTerminal && stage.status === 'pending') return null;

        const isLast = index === stages.length - 1 ||
          (isTerminal && stages.slice(index + 1).every(s => s.status === 'pending'));

        return (
          <div key={stage.label} className="flex items-start">
            <div className="flex flex-col items-center mr-4">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  stage.status === 'completed'
                    ? 'bg-white'
                    : stage.status === 'current'
                    ? 'bg-[#333] ring-2 ring-white ring-offset-2 ring-offset-[#0A0A0A]'
                    : 'bg-[#222] border border-[#333]'
                }`}
              >
                {stage.status === 'completed' ? (
                  <Check className="w-4 h-4 text-black" strokeWidth={2.5} />
                ) : stage.status === 'current' ? (
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                ) : (
                  <Circle className="w-3 h-3 text-[#444]" strokeWidth={1.5} />
                )}
              </div>

              {!isLast && (
                <div
                  className={`w-0.5 h-10 ${
                    stage.status === 'completed' ? 'bg-white' : 'bg-[#333]'
                  }`}
                />
              )}
            </div>

            <div className="flex-1 pb-8">
              <div className="flex items-center justify-between">
                <span
                  className={`font-medium ${
                    stage.status === 'completed'
                      ? 'text-white'
                      : stage.status === 'current'
                      ? 'text-white'
                      : 'text-[#666]'
                  }`}
                >
                  {stage.label}
                </span>
                <span
                  className={`text-sm ${
                    stage.status === 'completed' ? 'text-[#999]' : 'text-[#555]'
                  }`}
                >
                  {stage.time ? formatDealTimestamp(stage.time) : 'Pending'}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
