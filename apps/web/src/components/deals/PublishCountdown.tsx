import { useState, useEffect } from 'react';
import { Clock, Send, CheckCircle } from '../icons';
import { useTranslation } from '../../i18n';

interface PublishCountdownProps {
  scheduledPostTime: string;
  isPublished?: boolean;
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '0s';

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

export function PublishCountdown({ scheduledPostTime, isPublished }: PublishCountdownProps) {
  const { t } = useTranslation();
  const [now, setNow] = useState(Date.now());

  const targetTime = new Date(scheduledPostTime).getTime();
  const remaining = targetTime - now;
  const isReady = remaining <= 0;

  const isApproaching = !isReady && remaining < 30 * 60 * 1000;
  const isImminent = !isReady && remaining < 5 * 60 * 1000;

  useEffect(() => {
    if (isPublished || isReady) return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [isPublished, isReady]);

  return (
    <div className={`rounded-2xl p-4 border transition-all ${
      isPublished
        ? 'bg-[#22C55E]/10 border-[#22C55E]/20'
        : isReady
          ? 'bg-[#F59E0B]/10 border-[#F59E0B]/20'
          : isImminent
            ? 'bg-[#ECC679]/10 border-[#ECC679]/30'
            : isApproaching
              ? 'bg-[#ECC679]/5 border-[#ECC679]/15'
              : 'bg-[#111] border-[#1A1A1A]'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isPublished ? (
            <CheckCircle className="w-4 h-4 text-[#22C55E]" />
          ) : isReady ? (
            <Send className="w-4 h-4 text-[#F59E0B]" />
          ) : (
            <Clock className={`w-4 h-4 ${isImminent ? 'text-[#ECC679]' : 'text-white'}`} />
          )}
          <span className="text-sm font-medium text-white">
            {isPublished
              ? t('publishCountdown.published')
              : isReady
                ? t('publishCountdown.publishing')
                : t('publishCountdown.scheduled')}
          </span>
        </div>
      </div>

      {!isPublished && !isReady && (
        <div className="relative h-2 bg-[#1A1A1A] rounded-full overflow-hidden mb-2">
          <div
            className={`absolute right-0 top-0 h-full rounded-full transition-all duration-1000 ${
              isImminent
                ? 'bg-[#ECC679]'
                : 'bg-gradient-to-l from-white to-[#ECC679]'
            }`}
            style={{ width: `${Math.min(100, Math.max(5, 100 - (remaining / (24 * 3600000)) * 100))}%` }}
          />
        </div>
      )}

      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[#666]">
          {t('publishCountdown.scheduledFor')} {new Date(scheduledPostTime).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
        {!isPublished && !isReady && (
          <span className={`font-mono font-medium ${
            isImminent ? 'text-[#ECC679]' : isApproaching ? 'text-[#ECC679]/80' : 'text-white'
          }`}>
            {formatTimeRemaining(remaining)} {t('publishCountdown.until')}
          </span>
        )}
        {isReady && !isPublished && (
          <span className="text-[#F59E0B]">{t('publishCountdown.postingSoon')}</span>
        )}
        {isPublished && (
          <span className="text-[#22C55E]">{t('publishCountdown.postLive')}</span>
        )}
      </div>
    </div>
  );
}
