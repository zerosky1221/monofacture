import { useState } from 'react';
import { MessageCircle, CheckCircle, Send } from '../icons';
import { Input } from '@telegram-tools/ui-kit';
import { formatDateTime } from '../../lib/date';
import { StarRating } from './StarRating';
import { ReviewTags } from './ReviewTags';
import type { Review } from '../../api/reviews';
import { useTranslation } from '../../i18n';

interface ReviewCardProps {
  review: Review;
  currentUserId?: string;
  onReply?: (reviewId: string, reply: string) => void;
  isReplyLoading?: boolean;
}

export function ReviewCard({ review, currentUserId, onReply, isReplyLoading }: ReviewCardProps) {
  const { t } = useTranslation();
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');

  const author = review.author;
  const authorName = author
    ? [author.firstName, author.lastName].filter(Boolean).join(' ') || author.telegramUsername || 'Anonymous'
    : 'Anonymous';

  const formattedDate = formatDateTime(review.createdAt);

  const canReply = currentUserId === review.recipientId && !review.response;

  const handleSubmitReply = () => {
    if (replyText.trim() && onReply) {
      onReply(review.id, replyText.trim());
      setShowReplyInput(false);
      setReplyText('');
    }
  };

  const ratingColor = review.rating >= 4 ? '#22C55E' : review.rating === 3 ? '#F59E0B' : '#EF4444';

  return (
    <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-white font-semibold text-sm">
            {authorName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-white font-medium text-[15px]">{authorName}</p>
              {review.isVerified && (
                <CheckCircle className="w-4 h-4 text-[#22C55E]" strokeWidth={1.5} />
              )}
            </div>
            <p className="text-[#666] text-[12px]">{formattedDate}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[15px] font-bold" style={{ color: ratingColor }}>
            {review.rating}
          </span>
          <StarRating value={review.rating} readonly size="sm" />
        </div>
      </div>

      {(review.communicationRating || review.qualityRating || review.timelinessRating) && (
        <div className="flex gap-4 mb-3">
          {review.communicationRating && (
            <div className="text-xs">
              <span className="text-[#666]">{t('reviewCard.communication')}: </span>
              <span className="text-white font-medium">{review.communicationRating}{t('reviewCard.outOf5')}</span>
            </div>
          )}
          {review.qualityRating && (
            <div className="text-xs">
              <span className="text-[#666]">{t('reviewCard.quality')}: </span>
              <span className="text-white font-medium">{review.qualityRating}{t('reviewCard.outOf5')}</span>
            </div>
          )}
          {review.timelinessRating && (
            <div className="text-xs">
              <span className="text-[#666]">{t('reviewCard.speed')}: </span>
              <span className="text-white font-medium">{review.timelinessRating}{t('reviewCard.outOf5')}</span>
            </div>
          )}
        </div>
      )}

      {review.tags.length > 0 && (
        <div className="mb-3">
          <ReviewTags tags={review.tags} readonly />
        </div>
      )}

      {review.comment && (
        <p className="text-[#CCC] text-[14px] leading-relaxed mb-3">{review.comment}</p>
      )}

      {review.deal && (
        <p className="text-[#666] text-[12px] mb-3">
          Deal #{review.deal.referenceNumber} · {review.deal.adFormat}
        </p>
      )}

      {review.response && (
        <div className="bg-[#111] border border-[#1A1A1A] rounded-xl p-3 mt-3">
          <p className="text-[#666] text-[12px] mb-1 font-medium">{t('reviewCard.response')}</p>
          <p className="text-[#CCC] text-[14px] leading-relaxed">{review.response}</p>
        </div>
      )}

      {canReply && !showReplyInput && (
        <button
          onClick={() => setShowReplyInput(true)}
          className="flex items-center gap-1.5 mt-3 text-[#999] text-[13px] hover:text-white transition-colors"
        >
          <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
          {t('reviewCard.reply')}
        </button>
      )}

      {showReplyInput && (
        <div className="mt-3 flex gap-2">
          <div className="flex-1">
            <Input
              value={replyText}
              onChange={(v) => setReplyText(v)}
              placeholder={t('reviewCard.replyPlaceholder')}
              maxLength={500}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitReply()}
            />
          </div>
          <button
            onClick={handleSubmitReply}
            disabled={!replyText.trim() || isReplyLoading}
            className="p-2.5 bg-white rounded-xl disabled:opacity-40 active:scale-95 transition-all"
          >
            <Send className="w-4 h-4 text-black" strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}
