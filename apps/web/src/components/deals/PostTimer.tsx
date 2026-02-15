import { useState, useEffect } from 'react';
import { Clock, Trash2, CheckCircle } from '../icons';
import { useTranslation } from '../../i18n';

interface PostTimerProps {
  publishedAt: string;
  scheduledDeleteAt?: string | null;
  postDuration?: number;
  status?: 'POSTED' | 'VERIFIED' | 'COMPLETED' | 'DELETED';
}

function formatTimeRemaining(ms: number, expiredLabel: string): string {
  if (ms <= 0) return expiredLabel;

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

export function PostTimer({ publishedAt, scheduledDeleteAt, postDuration, status }: PostTimerProps) {
  const { t } = useTranslation();
  const [now, setNow] = useState(Date.now());
  const isCompleted = status === 'COMPLETED' || status === 'DELETED';

  const publishedTime = new Date(publishedAt).getTime();
  const deleteTime = scheduledDeleteAt
    ? new Date(scheduledDeleteAt).getTime()
    : postDuration
      ? publishedTime + postDuration * 3600000
      : 0;
  const isPermanent = deleteTime === 0;

  useEffect(() => {
    if (isPermanent || isCompleted) return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [isPermanent, isCompleted]);

  const totalDuration = deleteTime ? deleteTime - publishedTime : 0;
  const remaining = deleteTime ? deleteTime - now : 0;
  const elapsed = now - publishedTime;
  const progress = totalDuration > 0 ? Math.min(100, Math.max(0, (elapsed / totalDuration) * 100)) : 0;
  const isExpired = !isPermanent && remaining <= 0;

  const isWarning = !isPermanent && remaining > 0 && remaining < 60 * 60 * 1000;
  const isCritical = !isPermanent && remaining > 0 && remaining < 10 * 60 * 1000;

  return (
    <div className={`rounded-2xl p-4 border transition-all ${
      isCompleted
        ? 'bg-[#22C55E]/10 border-[#22C55E]/20'
        : isExpired
          ? 'bg-[#666]/10 border-[#666]/20'
          : isCritical
            ? 'bg-[#EF4444]/10 border-[#EF4444]/30 animate-pulse'
            : isWarning
              ? 'bg-[#F59E0B]/10 border-[#F59E0B]/20'
              : 'bg-[#111] border-[#1A1A1A]'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <CheckCircle className="w-4 h-4 text-[#22C55E]" />
          ) : isExpired ? (
            <Trash2 className="w-4 h-4 text-[#666]" />
          ) : (
            <Clock className={`w-4 h-4 ${isCritical ? 'text-[#EF4444]' : isWarning ? 'text-[#F59E0B]' : 'text-white'}`} />
          )}
          <span className="text-sm font-medium text-white">
            {isCompleted ? t('postTimer.postCompleted') : isExpired ? t('postTimer.postRemoved') : t('postTimer.postActive')}
          </span>
        </div>
        {isPermanent ? (
          <span className="text-[11px] text-[#666] bg-[#0A0A0A] px-2 py-0.5 rounded-full">
            ∞ {t('postTimer.permanent')}
          </span>
        ) : postDuration ? (
          <span className="text-[11px] text-[#666] bg-[#0A0A0A] px-2 py-0.5 rounded-full">
            {t('postTimer.duration', { hours: postDuration })}
          </span>
        ) : null}
      </div>

      {!isPermanent && (
        <div className="relative h-2 bg-[#1A1A1A] rounded-full overflow-hidden mb-2">
          <div
            className={`absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ${
              isCompleted
                ? 'bg-[#22C55E]'
                : isExpired
                  ? 'bg-[#666]'
                  : isCritical
                    ? 'bg-[#EF4444]'
                    : isWarning
                      ? 'bg-[#F59E0B]'
                      : 'bg-gradient-to-r from-[#22C55E] to-white'
            }`}
            style={{ width: `${isCompleted || isExpired ? 100 : progress}%` }}
          />
        </div>
      )}

      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[#666]">
          {t('postTimer.published')} {new Date(publishedAt).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
        {!isPermanent && !isCompleted && !isExpired && (
          <span className={`font-mono font-medium ${
            isCritical ? 'text-[#EF4444]' : isWarning ? 'text-[#F59E0B]' : 'text-white'
          }`}>
            {formatTimeRemaining(remaining, t('postTimer.expired'))} {t('postTimer.left')}
          </span>
        )}
        {isPermanent && !isCompleted && (
          <span className="text-[#22C55E] text-[11px]">{t('postTimer.permanent')}</span>
        )}
        {isExpired && !isCompleted && (
          <span className="text-[#666]">{t('postTimer.autoDeleted')}</span>
        )}
        {isCompleted && (
          <span className="text-[#22C55E]">{t('postTimer.dealCompleted')}</span>
        )}
      </div>
    </div>
  );
}
