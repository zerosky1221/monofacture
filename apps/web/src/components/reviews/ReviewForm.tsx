import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, ChevronUp } from '../icons';
import { Button } from '../ui/Button';
import { StarRating } from './StarRating';
import { ReviewTags, getTagsForRole } from './ReviewTags';
import type { CreateReviewData } from '../../api/reviews';
import type { CreateChannelReviewData } from '../../api/channelReviews';
import { useTranslation } from '../../i18n';
import { useBottomSheetDrag } from '../../hooks/useBottomSheetDrag';

interface ReviewFormProps {
  isOpen: boolean;
  dealId: string;
  recipientRole: 'advertiser' | 'channelOwner';
  onSubmit: (data: CreateReviewData) => void;
  onClose: () => void;
  isLoading?: boolean;
  channelInfo?: {
    channelId: string;
    channelTitle: string;
    channelUsername?: string;
  };
  ownerInfo?: {
    name: string;
    username?: string;
  };
  onSubmitChannelReview?: (data: CreateChannelReviewData) => void;
}

export function ReviewForm({
  isOpen,
  dealId,
  recipientRole,
  onSubmit,
  onClose,
  isLoading,
  channelInfo,
  ownerInfo,
  onSubmitChannelReview,
}: ReviewFormProps) {
  const { t } = useTranslation();
  const isDualReview = !!channelInfo && !!onSubmitChannelReview;
  const { dragY, backdropOpacity, reset, scrollRef, handleProps, contentProps } =
    useBottomSheetDrag({ onClose });

  useEffect(() => {
    if (isOpen) reset();
  }, [isOpen, reset]);

  const [channelRating, setChannelRating] = useState(0);
  const [audienceQuality, setAudienceQuality] = useState(0);
  const [reachAccuracy, setReachAccuracy] = useState(0);
  const [channelComment, setChannelComment] = useState('');
  const [channelTags, setChannelTags] = useState<string[]>([]);
  const [channelExpanded, setChannelExpanded] = useState(true);

  const [rating, setRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [timelinessRating, setTimelinessRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [ownerExpanded, setOwnerExpanded] = useState(!isDualReview);

  const availableTags = getTagsForRole(recipientRole);
  const channelAvailableTags = getTagsForRole('channel');

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleToggleChannelTag = (tag: string) => {
    setChannelTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSubmit = () => {
    if (rating === 0) return;

    const data: CreateReviewData = {
      dealId,
      rating,
      comment: comment.trim() || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      communicationRating: communicationRating || undefined,
      qualityRating: qualityRating || undefined,
      timelinessRating: timelinessRating || undefined,
    };
    onSubmit(data);

    if (isDualReview && channelRating > 0 && channelInfo) {
      const channelData: CreateChannelReviewData = {
        dealId,
        channelId: channelInfo.channelId,
        overallRating: channelRating,
        audienceQuality: audienceQuality || undefined,
        reachAccuracy: reachAccuracy || undefined,
        comment: channelComment.trim() || undefined,
        tags: channelTags.length > 0 ? channelTags : undefined,
      };
      onSubmitChannelReview(channelData);
    }
  };

  const canSubmit = isDualReview ? (rating > 0 && channelRating > 0) : rating > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            <motion.div
              style={{ opacity: backdropOpacity }}
              className="w-full h-full bg-black/70"
              onClick={onClose}
            />
          </motion.div>

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0"
          >
            <motion.div
              style={{ y: dragY }}
              className="bg-[#0A0A0A] rounded-t-3xl border-t border-[#1A1A1A]"
            >
              <div {...handleProps}>
                <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
                  <div className="w-10 h-1 bg-[#333] rounded-full" />
                </div>

                <div className="flex items-center justify-between px-5 pb-4">
                  <h2 className="text-xl font-bold text-white">{t('reviewForm.rateExperience')}</h2>
                  <button
                    onClick={onClose}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="p-2 rounded-xl bg-[#1A1A1A] active:bg-[#333]"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              <div
                ref={scrollRef}
                {...contentProps}
                className="overflow-y-auto overscroll-contain"
                style={{ maxHeight: 'calc(90vh - 140px)' }}
              >
                <div className="px-5 space-y-4">
                  {isDualReview && channelInfo && (
                    <div className="border border-[#1A1A1A] rounded-2xl overflow-hidden">
                      <button
                        onClick={() => setChannelExpanded(!channelExpanded)}
                        className="w-full flex items-center justify-between p-4 text-left"
                      >
                        <div>
                          <p className="text-[13px] text-[#666] uppercase tracking-wide font-semibold">{t('reviewForm.channelSection')}</p>
                          <p className="text-white font-medium text-[15px]">
                            {channelInfo.channelUsername ? `@${channelInfo.channelUsername}` : channelInfo.channelTitle}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {channelRating > 0 && (
                            <span className="text-[13px] text-[#999]">{channelRating}/5</span>
                          )}
                          {channelExpanded ? (
                            <ChevronUp className="w-5 h-5 text-[#666]" strokeWidth={1.5} />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-[#666]" strokeWidth={1.5} />
                          )}
                        </div>
                      </button>

                      {channelExpanded && (
                        <div className="px-4 pb-4 space-y-4">
                          <div className="h-px bg-[#1A1A1A]" />

                          <div>
                            <label className="text-sm text-[#666] mb-2 block">{t('reviewForm.overall')}</label>
                            <div className="flex items-center justify-center py-1">
                              <StarRating value={channelRating} onChange={setChannelRating} size="lg" />
                            </div>
                          </div>

                          <div className="grid gap-2">
                            <div className="flex items-center justify-between bg-[#111] rounded-xl px-4 py-3">
                              <span className="text-[14px] text-[#999]">{t('reviewForm.audience')}</span>
                              <StarRating value={audienceQuality} onChange={setAudienceQuality} size="sm" />
                            </div>
                            <div className="flex items-center justify-between bg-[#111] rounded-xl px-4 py-3">
                              <span className="text-[14px] text-[#999]">{t('reviewForm.reach')}</span>
                              <StarRating value={reachAccuracy} onChange={setReachAccuracy} size="sm" />
                            </div>
                          </div>

                          <ReviewTags
                            tags={channelAvailableTags}
                            selectedTags={channelTags}
                            onToggle={handleToggleChannelTag}
                          />

                          <textarea
                            value={channelComment}
                            onChange={(e) => setChannelComment(e.target.value)}
                            placeholder={t('reviewForm.commentChannel')}
                            maxLength={500}
                            rows={2}
                            className="w-full bg-[#111] border border-[#1A1A1A] rounded-xl px-4 py-3 text-[14px] text-white placeholder:text-[#333] focus:outline-none focus:border-white/20 resize-none"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className={isDualReview ? 'border border-[#1A1A1A] rounded-2xl overflow-hidden' : ''}>
                    {isDualReview && (
                      <button
                        onClick={() => setOwnerExpanded(!ownerExpanded)}
                        className="w-full flex items-center justify-between p-4 text-left"
                      >
                        <div>
                          <p className="text-[13px] text-[#666] uppercase tracking-wide font-semibold">{t('reviewForm.ownerSection')}</p>
                          <p className="text-white font-medium text-[15px]">
                            {ownerInfo?.username ? `@${ownerInfo.username}` : ownerInfo?.name || 'Owner'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {rating > 0 && (
                            <span className="text-[13px] text-[#999]">{rating}/5</span>
                          )}
                          {ownerExpanded ? (
                            <ChevronUp className="w-5 h-5 text-[#666]" strokeWidth={1.5} />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-[#666]" strokeWidth={1.5} />
                          )}
                        </div>
                      </button>
                    )}

                    {ownerExpanded && (
                      <div className={isDualReview ? 'px-4 pb-4 space-y-4' : 'space-y-5'}>
                        {isDualReview && <div className="h-px bg-[#1A1A1A]" />}

                        <div>
                          <label className="text-sm text-[#666] mb-2 block">
                            {isDualReview ? t('reviewForm.overall') : t('reviewForm.overallRating')}
                          </label>
                          <div className="flex items-center justify-center py-1">
                            <StarRating value={rating} onChange={setRating} size="lg" />
                          </div>
                          {rating > 0 && !isDualReview && (
                            <p className="text-center text-white text-sm mt-1 font-medium">
                              {rating > 0 ? t(`reviewForm.ratingLabels.${rating}`) : ''}
                            </p>
                          )}
                        </div>

                        <div className="grid gap-2">
                          <div className="flex items-center justify-between bg-[#111] rounded-xl px-4 py-3">
                            <span className="text-[14px] text-[#999]">{t('reviewForm.communication')}</span>
                            <StarRating value={communicationRating} onChange={setCommunicationRating} size="sm" />
                          </div>
                          <div className="flex items-center justify-between bg-[#111] rounded-xl px-4 py-3">
                            <span className="text-[14px] text-[#999]">{t('reviewForm.quality')}</span>
                            <StarRating value={qualityRating} onChange={setQualityRating} size="sm" />
                          </div>
                          <div className="flex items-center justify-between bg-[#111] rounded-xl px-4 py-3">
                            <span className="text-[14px] text-[#999]">{t('reviewForm.speed')}</span>
                            <StarRating value={timelinessRating} onChange={setTimelinessRating} size="sm" />
                          </div>
                        </div>

                        <ReviewTags
                          tags={availableTags}
                          selectedTags={selectedTags}
                          onToggle={handleToggleTag}
                        />

                        <div>
                          <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder={isDualReview ? t('reviewForm.commentOwner') : t('reviewForm.commentGeneral')}
                            maxLength={500}
                            rows={isDualReview ? 2 : 3}
                            className="w-full bg-[#111] border border-[#1A1A1A] rounded-xl px-4 py-3 text-[14px] text-white placeholder:text-[#333] focus:outline-none focus:border-white/20 resize-none"
                          />
                          <p className="text-[#333] text-xs text-right mt-1">{comment.length}/500</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-5 py-6">
                <Button className="w-full" size="lg" onClick={handleSubmit} disabled={!canSubmit || isLoading} loading={isLoading}>
                  {isLoading ? t('common.loading') : isDualReview ? t('reviewForm.submitReviews') : t('reviewForm.submitReview')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
