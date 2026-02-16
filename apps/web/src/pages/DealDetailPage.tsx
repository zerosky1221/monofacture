import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from '../i18n';
import {
  ArrowLeft, Check, Clock, FileText, CreditCard, Image, CheckCircle,
  Wallet, Shield, RefreshCw, ExternalLink, Send, X, ChevronDown,
  RotateCcw, Bot, Pen, XCircle, Star, ChevronUp,
} from '../components/icons';
import { useTelegram } from '../providers/TelegramProvider';
import { useAuth } from '../hooks/useAuth';
import { dealsApi, Deal, escrowApi } from '../api/deals';
import { reviewsApi } from '../api/reviews';
import type { CreateReviewData } from '../api/reviews';
import { channelReviewsApi } from '../api/channelReviews';
import type { CreateChannelReviewData } from '../api/channelReviews';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';
import { ReviewForm } from '../components/reviews/ReviewForm';
import { ReviewCard } from '../components/reviews/ReviewCard';
import { DealTimeline } from '../components/deals/DealTimeline';
import { PostTimer } from '../components/deals/PostTimer';
import { PublishCountdown } from '../components/deals/PublishCountdown';
import { formatDateTime, formatDealTimestamp } from '../lib/date';

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  CREATED: { color: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/20' },
  PENDING_PAYMENT: { color: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/20' },
  PAYMENT_RECEIVED: { color: 'text-white', bg: 'bg-white/20' },
  IN_PROGRESS: { color: 'text-white', bg: 'bg-white/20' },
  CREATIVE_PENDING: { color: 'text-[#3390ec]', bg: 'bg-[#3390ec]/20' },
  CREATIVE_SUBMITTED: { color: 'text-[#3390ec]', bg: 'bg-[#3390ec]/20' },
  CREATIVE_APPROVED: { color: 'text-[#22C55E]', bg: 'bg-[#22C55E]/20' },
  CREATIVE_REVISION_REQUESTED: { color: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/20' },
  SCHEDULED: { color: 'text-white', bg: 'bg-white/20' },
  POSTED: { color: 'text-[#22C55E]', bg: 'bg-[#22C55E]/20' },
  VERIFYING: { color: 'text-white', bg: 'bg-white/20' },
  VERIFIED: { color: 'text-[#22C55E]', bg: 'bg-[#22C55E]/20' },
  COMPLETED: { color: 'text-[#22C55E]', bg: 'bg-[#22C55E]/20' },
  CANCELLED: { color: 'text-[#EF4444]', bg: 'bg-[#EF4444]/20' },
  DISPUTED: { color: 'text-[#EF4444]', bg: 'bg-[#EF4444]/20' },
  REFUNDED: { color: 'text-[#999999]', bg: 'bg-[#0A0A0A]' },
  EXPIRED: { color: 'text-[#999999]', bg: 'bg-[#0A0A0A]' },
};

function formatTon(nanoTon: string | number): string {
  const value = typeof nanoTon === 'string' ? parseInt(nanoTon) : nanoTon;
  if (isNaN(value) || value === 0) return '0';
  return (value / 1_000_000_000).toFixed(2);
}

const formatDate = formatDateTime;

function Section({ title, icon: Icon, badge, defaultOpen = false, children }: {
  title: string; icon?: any; badge?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-[#111] border border-[#1A1A1A] rounded-2xl animate-fade-slide-up">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="w-8 h-8 flex items-center justify-center text-[#999] flex-shrink-0">
              <Icon className="w-5 h-5" strokeWidth={1.5} />
            </div>
          )}
          <span className="text-[15px] font-medium text-white">{title}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {badge}
          <div className={`transform transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
            <ChevronDown className="w-5 h-5 text-[#999]" strokeWidth={1.5} />
          </div>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4">
          <div className="pl-11">{children}</div>
        </div>
      )}
    </div>
  );
}

export function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hapticFeedback } = useTelegram();
  const { user } = useAuth();
  const { t } = useTranslation();
  const userId = user?.id || null;

  const [creativeText, setCreativeText] = useState('');
  const [showCreativeForm, setShowCreativeForm] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [tonConnectUI] = useTonConnectUI();
  const [payingEscrow, setPayingEscrow] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [dialogAction, setDialogAction] = useState<{
    title: string; description: string; confirmText: string; onConfirm: () => void;
  } | null>(null);

  const { data: deal, isLoading, error } = useQuery({
    queryKey: ['deal', id],
    queryFn: () => dealsApi.getById(id!),
    enabled: !!id,
    refetchInterval: 15000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['deal', id] });

  const { data: paymentInfo, isLoading: paymentInfoLoading, error: paymentInfoError } = useQuery({
    queryKey: ['payment-info', id],
    queryFn: () => escrowApi.getPaymentInfo(id!),
    enabled: !!id && !!deal && deal.status === 'PENDING_PAYMENT' && userId === deal.advertiserId,
    retry: 1,
  });

  const { data: dealReviews } = useQuery({
    queryKey: ['deal-reviews', id],
    queryFn: () => reviewsApi.getDealReviews(id!),
    enabled: !!id && !!deal && deal.status === 'COMPLETED',
  });

  const myReview = dealReviews?.find((r) => r.authorId === userId);
  const hasReviewed = !!myReview;

  const createReviewMutation = useMutation({
    mutationFn: (data: CreateReviewData) => reviewsApi.create(data),
    onSuccess: () => {
      toast.success(t('dealDetail.toast.reviewSubmitted'));
      setShowReviewForm(false);
      queryClient.invalidateQueries({ queryKey: ['deal-reviews', id] });
    },
    onError: (e: any) => toast.error(e.message || t('dealDetail.toast.failedReview')),
  });

  const replyReviewMutation = useMutation({
    mutationFn: ({ reviewId, reply }: { reviewId: string; reply: string }) =>
      reviewsApi.reply(reviewId, reply),
    onSuccess: () => {
      toast.success(t('dealDetail.toast.replySent'));
      queryClient.invalidateQueries({ queryKey: ['deal-reviews', id] });
    },
    onError: (e: any) => toast.error(e.message || t('common.failed')),
  });

  const createChannelReviewMutation = useMutation({
    mutationFn: (data: CreateChannelReviewData) => channelReviewsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-reviews'] });
    },
    onError: (e: any) => toast.error(e.message || t('dealDetail.toast.failedReview')),
  });

  const acceptMutation = useMutation({
    mutationFn: () => dealsApi.accept(id!),
    onSuccess: () => { toast.success(t('dealDetail.toast.dealAccepted')); invalidate(); },
    onError: (e: any) => toast.error(e.message || t('common.failed')),
  });
  const rejectMutation = useMutation({
    mutationFn: (reason?: string) => dealsApi.reject(id!, reason),
    onSuccess: () => { toast.success(t('dealDetail.toast.dealRejected')); invalidate(); },
    onError: (e: any) => toast.error(e.message || t('common.failed')),
  });
  const cancelMutation = useMutation({
    mutationFn: (reason?: string) => dealsApi.cancel(id!, reason),
    onSuccess: () => { toast.success(t('dealDetail.toast.dealCancelled')); invalidate(); },
    onError: (e: any) => toast.error(e.message || t('common.failed')),
  });
  const submitCreativeMutation = useMutation({
    mutationFn: () => dealsApi.submitCreative(id!, { text: creativeText }),
    onSuccess: () => { toast.success(t('dealDetail.toast.creativeSubmitted')); setShowCreativeForm(false); setCreativeText(''); invalidate(); },
    onError: (e: any) => toast.error(e.message || t('common.failed')),
  });
  const approveCreativeMutation = useMutation({
    mutationFn: () => dealsApi.approveCreative(id!),
    onSuccess: () => { toast.success(t('dealDetail.toast.creativeApproved')); invalidate(); },
    onError: (e: any) => toast.error(e.message || t('common.failed')),
  });
  const confirmPostMutation = useMutation({
    mutationFn: () => dealsApi.confirmPost(id!),
    onSuccess: () => { toast.success(t('dealDetail.toast.postConfirmed')); invalidate(); },
    onError: (e: any) => toast.error(e.message || t('common.failed')),
  });
  const confirmCompletionMutation = useMutation({
    mutationFn: () => dealsApi.confirmCompletion(id!),
    onSuccess: () => { toast.success(t('dealDetail.toast.dealCompletedPayment')); invalidate(); },
    onError: (e: any) => toast.error(e.message || t('common.failed')),
  });
  const requestRevisionMutation = useMutation({
    mutationFn: () => dealsApi.requestRevision(id!, revisionFeedback),
    onSuccess: () => { toast.success(t('dealDetail.toast.revisionRequested')); setShowRevisionForm(false); setRevisionFeedback(''); invalidate(); },
    onError: (e: any) => toast.error(e.message || t('common.failed')),
  });

  const handlePayEscrow = async () => {
    if (!paymentInfo || !tonConnectUI.connected) {
      if (!tonConnectUI.connected) { toast.error(t('dealDetail.toast.connectWallet')); tonConnectUI.openModal(); }
      return;
    }
    setPayingEscrow(true);
    try {
      const escrowAmount = BigInt(paymentInfo.amount);
      const gasBuffer = BigInt(50_000_000);
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [{ address: paymentInfo.address, amount: (escrowAmount + gasBuffer).toString() }],
      });
      toast.success(t('dealDetail.toast.paymentSent'));
      setTimeout(invalidate, 5000); setTimeout(invalidate, 15000); setTimeout(invalidate, 30000);
    } catch (err: any) {
      toast.error(err?.message?.includes('User rejected') ? t('dealDetail.toast.paymentCancelled') : err?.message || t('dealDetail.toast.paymentFailed'));
    } finally { setPayingEscrow(false); }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-black p-4">
      <div className="animate-pulse space-y-3">
        {[1,2,3,4].map(i => <div key={i} className="h-16 bg-[#0A0A0A] rounded-2xl" />)}
      </div>
    </div>
  );
  if (error || !deal) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <p className="text-[#999999] mb-4">{t('dealDetail.notFound')}</p>
        <Button className="w-full" size="lg" onClick={() => navigate('/deals')}>{t('dealDetail.goToDeals')}</Button>
      </div>
    </div>
  );

  const isAdvertiser = userId === deal.advertiserId;
  const isPublisher = userId === deal.channelOwnerId;
  const sc = STATUS_STYLE[deal.status] || { color: 'text-[#999999]', bg: 'bg-[#0A0A0A]' };
  const statusLabel = t(`dealDetail.status.${deal.status}`);
  const escrow = deal.escrow;

  const getStage = (): number => {
    if (['COMPLETED', 'VERIFIED'].includes(deal.status)) return 4;
    if (['POSTED', 'VERIFYING'].includes(deal.status)) return 3;
    if (['CREATIVE_PENDING', 'CREATIVE_SUBMITTED', 'CREATIVE_APPROVED', 'CREATIVE_REVISION_REQUESTED', 'SCHEDULED'].includes(deal.status)) return 2;
    if (['PENDING_PAYMENT', 'PAYMENT_RECEIVED', 'IN_PROGRESS'].includes(deal.status)) return 1;
    return 0;
  };
  const stageIdx = getStage();
  const stages = [
    { label: t('dealDetail.stages.created'), icon: FileText },
    { label: t('dealDetail.stages.accepted'), icon: Check },
    { label: t('dealDetail.stages.creative'), icon: Image },
    { label: t('dealDetail.stages.posted'), icon: Send },
    { label: t('dealDetail.stages.done'), icon: CheckCircle },
  ];
  const isFailed = ['CANCELLED', 'EXPIRED', 'REFUNDED', 'DISPUTED'].includes(deal.status);

  return (
    <div className="min-h-screen bg-black">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#1A1A1A] active:scale-95 transition-all">
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div>
              <h1 className="text-[22px] font-bold text-white">{t('dealDetail.title')}</h1>
              <p className="text-xs text-[#666] font-mono">#{deal.referenceNumber}</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${sc.color} ${sc.bg}`}>{statusLabel}</span>
        </div>
      </div>

      <div className="p-4 pb-24 space-y-3">
        <div className="glass-card p-4 animate-fade-slide-up overflow-hidden">
          <div className="flex items-start justify-between relative px-1">
            <div className="absolute top-[14px] left-[28px] right-[28px] h-[2px] bg-white/[0.08]" />
            <div
              className="absolute top-[14px] left-[28px] h-[2px] transition-all duration-500"
              style={{
                width: `calc(${(stageIdx / 4) * 100}% - ${stageIdx === 0 ? 0 : stageIdx === 4 ? 56 : 28}px)`,
                background: isFailed ? '#EF4444' : 'linear-gradient(to right, #22C55E, #FFFFFF)'
              }}
            />
            {stages.map((s, i) => {
              const done = i < stageIdx;
              const curr = i === stageIdx && !isFailed;
              const failed = i === stageIdx && isFailed;
              return (
                <div key={i} className="flex flex-col items-center z-10 w-[48px]">
                  <div className={`w-[28px] h-[28px] rounded-full flex items-center justify-center transition-all duration-200 ${
                    failed
                      ? 'bg-[#EF4444]'
                      : done
                        ? 'bg-[#22C55E]'
                        : curr
                          ? 'bg-white animate-pulse-glow'
                          : 'bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.06)]'
                  }`}>
                    {failed ? (
                      <X className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                    ) : done ? (
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                    ) : (
                      <span className={`text-xs font-semibold ${curr ? 'text-black' : 'text-[#666666]'}`}>{i + 1}</span>
                    )}
                  </div>
                  <span className={`text-[10px] mt-1.5 uppercase tracking-[0.05em] ${
                    done || curr ? 'text-white font-semibold' : 'text-[#666666]'
                  }`}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
            isAdvertiser ? 'bg-white/15 text-white' : 'bg-[#3390ec]/15 text-[#3390ec]'
          }`}>
            {isAdvertiser ? t('dealDetail.advertiser') : t('dealDetail.publisher')}
          </span>
          <button onClick={() => navigate(`/channel/${deal.channelId}`)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0A0A0A] hover:bg-[#1A1A1A] transition-colors">
            <span className="text-[11px] text-white/70">{deal.channel?.title}</span>
            <ExternalLink className="w-3 h-3 text-[#666666]" />
          </button>
        </div>

        <ActionArea
          deal={deal} isAdvertiser={isAdvertiser} isPublisher={isPublisher}
          paymentInfo={paymentInfo} paymentInfoLoading={paymentInfoLoading} paymentInfoError={paymentInfoError}
          payingEscrow={payingEscrow}
          handlePayEscrow={handlePayEscrow}
          acceptMutation={acceptMutation} rejectMutation={rejectMutation}
          cancelMutation={cancelMutation} approveCreativeMutation={approveCreativeMutation}
          confirmPostMutation={confirmPostMutation} confirmCompletionMutation={confirmCompletionMutation}
          submitCreativeMutation={submitCreativeMutation} requestRevisionMutation={requestRevisionMutation}
          showCreativeForm={showCreativeForm} setShowCreativeForm={setShowCreativeForm}
          creativeText={creativeText} setCreativeText={setCreativeText}
          showRevisionForm={showRevisionForm} setShowRevisionForm={setShowRevisionForm}
          revisionFeedback={revisionFeedback} setRevisionFeedback={setRevisionFeedback}
          hapticFeedback={hapticFeedback}
          tonConnectUI={tonConnectUI}
          setDialogAction={setDialogAction}
        />

        {deal.scheduledPostTime && !(deal.publishedPosts?.[0]?.publishedAt) && (
          <PublishCountdown scheduledPostTime={deal.scheduledPostTime} />
        )}

        {deal.publishedPosts && deal.publishedPosts.length > 0 && deal.publishedPosts[0].publishedAt && (
          <PostTimer
            publishedAt={deal.publishedPosts[0].publishedAt}
            scheduledDeleteAt={deal.publishedPosts[0].scheduledDeleteAt}
            postDuration={deal.postDuration || undefined}
            status={deal.publishedPosts[0].deletedAt ? 'DELETED' : 'POSTED'}
          />
        )}

        {deal.status === 'COMPLETED' && (
          <div className="space-y-3">
            {!hasReviewed && (
              <Button className="w-full" size="lg" icon={Star} onClick={() => { hapticFeedback('impact'); setShowReviewForm(true); }}>
                {t('dealDetail.leaveReview')}
              </Button>
            )}
            {dealReviews && dealReviews.length > 0 && (
              <div className="space-y-3">
                {dealReviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    currentUserId={userId || undefined}
                    onReply={(reviewId, reply) => replyReviewMutation.mutate({ reviewId, reply })}
                    isReplyLoading={replyReviewMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <Section title={t('dealDetail.dealInfo')} icon={FileText} defaultOpen={false}>
          <div className="space-y-2.5 text-sm">
            <Row label={t('dealDetail.format')} value={t(`deals.formats.${deal.adFormat}`) || deal.adFormat} />
            <Row label={t('dealDetail.price')} value={`${formatTon(deal.price)} TON`} />
            <Row label={t('dealDetail.platformFee')} value={`${formatTon(deal.platformFee)} TON`} />
            <div className="flex justify-between font-semibold pt-2 border-t border-[#1A1A1A]">
              <span className="text-white">{t('dealDetail.total')}</span>
              <span className="text-[#22C55E]">{formatTon(deal.totalAmount)} TON</span>
            </div>
            {deal.postDuration && <Row label={t('dealDetail.duration')} value={`${deal.postDuration}h`} />}
            <Row label={t('dealDetail.created')} value={formatDate(deal.createdAt)} />
          </div>
        </Section>

        {(deal.brief || deal.requirements) && (
          <Section title={t('dealDetail.briefAndReqs')} icon={FileText} defaultOpen={false}>
            {deal.brief && <div className="mb-2"><p className="text-[11px] text-[#666666] mb-0.5">{t('dealDetail.brief')}</p><p className="text-sm text-white/80">{deal.brief}</p></div>}
            {deal.requirements && <div><p className="text-[11px] text-[#666666] mb-0.5">{t('dealDetail.requirements')}</p><p className="text-sm text-white/80">{deal.requirements}</p></div>}
          </Section>
        )}

        {deal.creative && (
          <Section title={t('dealDetail.creative')} icon={Image} defaultOpen={stageIdx === 2}
            badge={<span className={`px-2 py-0.5 rounded-full text-[10px] ${
              deal.creative.status === 'APPROVED' ? 'bg-[#22C55E]/20 text-[#22C55E]' :
              deal.creative.status === 'REJECTED' ? 'bg-[#EF4444]/20 text-[#EF4444]' :
              'bg-[#3390ec]/20 text-[#3390ec]'
            }`}>{deal.creative.status} v{deal.creative.version}</span>}>
            {deal.creative.text && <div className="p-3 bg-[#0A0A0A] rounded-xl text-sm text-white/90 whitespace-pre-wrap">{deal.creative.text}</div>}
            {deal.creative.mediaUrls?.length > 0 && (
              <div className="flex items-center gap-2 mt-2 text-[#666666] text-xs"><Image className="w-3.5 h-3.5" /><span>{t('dealDetail.mediaCount', { count: deal.creative.mediaUrls.length })}</span></div>
            )}
            {deal.creative.revisionRequests?.length > 0 && (
              <div className="mt-2 space-y-1">
                {deal.creative.revisionRequests.map((r, i) => (
                  <div key={i} className="p-2 bg-[#F59E0B]/10 rounded-lg text-xs text-[#F59E0B]">{r}</div>
                ))}
              </div>
            )}
            {deal.creative.sourceChatId && (
              <p className="mt-2 text-[11px] text-[#666666]">{t('dealDetail.submittedViaBot')}</p>
            )}
          </Section>
        )}

        {escrow && (
          <Section title={t('dealDetail.escrow')} icon={Shield} defaultOpen={false}
            badge={<span className={`px-2 py-0.5 rounded-full text-[10px] ${
              escrow.status === 'FUNDED' ? 'bg-white/20 text-white' :
              escrow.status === 'RELEASED' ? 'bg-[#22C55E]/20 text-[#22C55E]' :
              'bg-[#0A0A0A] text-[#999999]'
            }`}>{escrow.status}</span>}>
            <div className="space-y-2.5 text-sm">
              <Row label={t('dealDetail.locked')} value={`${formatTon(escrow.totalAmount || escrow.amount)} TON`} />
              <Row label={t('dealDetail.publisherShare')} value={`${formatTon(escrow.amount)} TON`} highlight />
              <Row label={t('dealDetail.platformFee')} value={`${formatTon(escrow.platformFee || 0)} TON`} />
              {escrow.expiresAt && <Row label={t('dealDetail.deadline')} value={formatDate(escrow.expiresAt)} />}
            </div>
            {escrow.escrowWalletAddress && (
              <a href={`https://tonviewer.com/${escrow.escrowWalletAddress}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 mt-3 p-2.5 bg-[#0A0A0A] rounded-xl text-white text-sm hover:bg-[#1A1A1A] transition-colors">
                <ExternalLink className="w-3.5 h-3.5" /> {t('dealDetail.viewOnBlockchain')}
              </a>
            )}
          </Section>
        )}

        <Section title={t('dealDetail.parties')} defaultOpen={false}>
          <div className="space-y-2">
            <PartyRow name={deal.advertiser?.firstName || t('dealDetail.advertiser')} role={t('dealDetail.advertiser')} photoUrl={deal.advertiser?.photoUrl}
              isYou={isAdvertiser} youLabel={t('dealDetail.you')} onClick={() => navigate(`/user/${deal.advertiserId}`)} />
            <PartyRow name={deal.channelOwner?.firstName || t('dealDetail.publisher')} role={t('dealDetail.channelOwner')} photoUrl={deal.channelOwner?.photoUrl}
              isYou={isPublisher} youLabel={t('dealDetail.you')} onClick={() => navigate(`/user/${deal.channelOwnerId}`)} />
          </div>
        </Section>

        <Section title={t('dealDetail.progress')} icon={Clock} defaultOpen>
          <DealTimeline deal={deal} />
        </Section>

        {deal.timeline && deal.timeline.length > 0 && (
          <Section title={t('dealDetail.activityLog')} icon={Clock} defaultOpen={false}>
            <div className="relative">
              {deal.timeline.map((entry, idx) => {
                const isLast = idx === deal.timeline!.length - 1;
                return (
                  <div key={entry.id} className="flex gap-3 pb-4 last:pb-0">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1 ${
                        idx === 0 ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]' : 'bg-[#666]'
                      }`} />
                      {!isLast && <div className="w-px flex-1 bg-[#222] mt-1" />}
                    </div>
                    <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[13px] text-white/80 leading-tight">{entry.event.replace(/_/g, ' ')}</p>
                        {entry.actor && <p className="text-[11px] text-[#666]">{entry.actor.firstName}</p>}
                      </div>
                      <p className="text-[11px] text-[#666] flex-shrink-0 tabular-nums">{formatDealTimestamp(entry.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}
      </div>

      <ConfirmDialog
        active={!!dialogAction}
        title={dialogAction?.title || ''}
        description={dialogAction?.description || ''}
        confirmText={dialogAction?.confirmText || t('common.confirm')}
        cancelText={t('common.cancel')}
        onConfirm={() => { dialogAction?.onConfirm(); setDialogAction(null); }}
        onCancel={() => setDialogAction(null)}
      />

      {showReviewForm && deal && (
        <ReviewForm
          dealId={deal.id}
          recipientRole={isAdvertiser ? 'channelOwner' : 'advertiser'}
          onSubmit={(data) => createReviewMutation.mutate(data)}
          onClose={() => setShowReviewForm(false)}
          isLoading={createReviewMutation.isPending}
          channelInfo={isAdvertiser && deal.channel ? {
            channelId: deal.channelId,
            channelTitle: deal.channel.title,
            channelUsername: deal.channel.username,
          } : undefined}
          ownerInfo={isAdvertiser && deal.channelOwner ? {
            name: deal.channelOwner.firstName || t('dealDetail.channelOwner'),
            username: deal.channelOwner.telegramUsername,
          } : undefined}
          onSubmitChannelReview={isAdvertiser ? (data) => createChannelReviewMutation.mutate(data) : undefined}
        />
      )}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-[#666666]">{label}</span>
      <span className={highlight ? 'text-[#22C55E] font-medium' : 'text-white/80'}>{value}</span>
    </div>
  );
}

function PartyRow({ name, role, photoUrl, isYou, youLabel, onClick }: {
  name: string; role: string; photoUrl?: string; isYou: boolean; youLabel?: string; onClick: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[#0A0A0A] transition-colors">
      <div className="w-8 h-8 rounded-full bg-[#0A0A0A] flex items-center justify-center text-xs font-bold text-white/60 flex-shrink-0 overflow-hidden">
        {photoUrl && !imgError ? <img src={photoUrl} alt={name} className="w-full h-full object-cover" onError={() => setImgError(true)} /> : name.charAt(0)}
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm text-white">{name}{isYou && <span className="text-[#666666]"> {youLabel || '(You)'}</span>}</p>
        <p className="text-[11px] text-[#666666]">{role}</p>
      </div>
    </button>
  );
}

function ActionArea({ deal, isAdvertiser, isPublisher, paymentInfo, paymentInfoLoading, paymentInfoError,
  payingEscrow, handlePayEscrow,
  acceptMutation, rejectMutation, cancelMutation, approveCreativeMutation,
  confirmPostMutation, confirmCompletionMutation, submitCreativeMutation, requestRevisionMutation,
  showCreativeForm, setShowCreativeForm, creativeText, setCreativeText,
  showRevisionForm, setShowRevisionForm, revisionFeedback, setRevisionFeedback,
  hapticFeedback, tonConnectUI, setDialogAction,
}: any) {
  const { t } = useTranslation();
  const { status } = deal;

  if (status === 'COMPLETED') return (
    <div className="glass-card p-5 text-center animate-fade-slide-up border-[#22C55E]/20 shadow-glow-green">
      <CheckCircle className="w-10 h-10 text-[#22C55E] mx-auto mb-2" />
      <h3 className="text-base font-bold text-white">{t('dealDetail.dealCompleted')}</h3>
      <p className="text-[#666666] text-sm mt-1">{t('dealDetail.paymentReleased')}</p>
    </div>
  );

  if (['CANCELLED', 'EXPIRED', 'REFUNDED'].includes(status)) return (
    <div className="glass-card p-5 text-center animate-fade-slide-up">
      <X className="w-10 h-10 text-white/20 mx-auto mb-2" />
      <h3 className="text-base font-bold text-white">{status === 'EXPIRED' ? t('dealDetail.dealExpired') : status === 'REFUNDED' ? t('dealDetail.refunded') : t('dealDetail.cancelled')}</h3>
    </div>
  );

  if (status === 'CREATED' && isPublisher) return (
    <div className="action-card p-4 space-y-2 animate-fade-slide-up">
      <ActionButton label={t('dealDetail.acceptDeal')} gradient="green" loading={acceptMutation.isPending}
        icon={<Check className="w-4 h-4" strokeWidth={2.5} />}
        onClick={() => { hapticFeedback?.('notification'); acceptMutation.mutate(); }} />
      <ActionButton label={t('dealDetail.rejectDeal')} variant="danger" loading={rejectMutation.isPending}
        icon={<X className="w-4 h-4" strokeWidth={2.5} />}
        onClick={() => setDialogAction({ title: t('dealDetail.rejectDeal'), description: t('dealDetail.rejectConfirm'), confirmText: t('dealDetail.rejectDeal'), onConfirm: () => rejectMutation.mutate('Not interested') })} />
    </div>
  );

  if (status === 'CREATED' && isAdvertiser) return (
    <div className="action-card p-4 animate-fade-slide-up">
      <ActionButton label={t('dealDetail.cancelDeal')} variant="danger" loading={cancelMutation.isPending}
        icon={<X className="w-4 h-4" strokeWidth={2.5} />}
        onClick={() => setDialogAction({ title: t('dealDetail.cancelDeal'), description: t('dealDetail.cancelConfirm'), confirmText: t('dealDetail.cancelDeal'), onConfirm: () => cancelMutation.mutate('Changed my mind') })} />
    </div>
  );

  if (status === 'PENDING_PAYMENT' && isAdvertiser) {
    const isWalletConnected = tonConnectUI?.connected;
    const walletAddress = tonConnectUI?.account?.address;

    const isMissingWalletError = paymentInfoError &&
      ((paymentInfoError as any)?.message?.includes('no connected TON wallet') ||
       (paymentInfoError as any)?.message?.includes('Advertiser has no'));

    let buttonLabel = `${t('common.pay')} ${formatTon(deal.totalAmount)} TON`;
    let buttonLoading = false;

    if (!isWalletConnected) {
      buttonLabel = t('dealDetail.connectWallet');
    } else if (isMissingWalletError && walletAddress) {
      buttonLabel = t('dealDetail.saveWalletRetry');
    } else if (payingEscrow) {
      buttonLabel = t('dealDetail.sending');
      buttonLoading = true;
    } else if (paymentInfoLoading) {
      buttonLabel = t('dealDetail.preparing');
      buttonLoading = true;
    } else if (paymentInfoError) {
      buttonLabel = t('common.retry');
    }

    const handlePayClick = async () => {
      if (!isWalletConnected) {
        tonConnectUI?.openModal();
        return;
      }

      if (isMissingWalletError && walletAddress) {
        try {
          const { apiClient } = await import('../api/client');
          await apiClient.patch('/users/me/wallet', {
            address: walletAddress,
            publicKey: tonConnectUI?.account?.publicKey,
            setAsMain: true,
          });
          toast.success(t('dealDetail.toast.walletSaved'));
          window.location.reload();
        } catch (err: any) {
          toast.error(t('dealDetail.toast.failedSaveWallet') + ': ' + (err.message || ''));
        }
        return;
      }

      handlePayEscrow();
    };

    return (
      <div className="payment-card p-4 space-y-3 animate-fade-slide-up">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-white" />
          <span className="text-sm font-semibold text-white">{t('dealDetail.payForAd')}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#666666]">{t('dealDetail.amount')}</span>
          <span className="text-white font-bold text-number">{formatTon(deal.totalAmount)} TON</span>
        </div>
        {paymentInfo && (
          <div className="p-2.5 bg-[#0A0A0A] rounded-xl">
            <p className="text-[10px] text-[#666666] mb-0.5">{t('dealDetail.escrowContract')}</p>
            <p className="text-[11px] font-mono text-[#999999] break-all">{paymentInfo.address}</p>
          </div>
        )}
        {paymentInfoError && (
          <div className="p-2.5 bg-[#EF4444]/10 rounded-xl border border-[#EF4444]/20">
            <p className="text-[11px] text-[#EF4444]">{t('dealDetail.failedLoadPayment')}: {(paymentInfoError as any)?.message || ''}</p>
          </div>
        )}
        <div className="flex items-start gap-2 p-2.5 bg-white/5 rounded-xl">
          <Shield className="w-3.5 h-3.5 text-white mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-white/70">{t('dealDetail.fundsLocked')}</p>
        </div>
        <ActionButton
          label={buttonLabel}
          gradient="primary"
          loading={buttonLoading}
          onClick={handlePayClick}
          icon={payingEscrow ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
        />
        <ActionButton label={t('dealDetail.cancelDeal')} variant="ghost" loading={cancelMutation.isPending}
          icon={<X className="w-4 h-4" strokeWidth={2} />}
          onClick={() => setDialogAction({ title: t('dealDetail.cancelDeal'), description: t('dealDetail.cancelConfirm'), confirmText: t('dealDetail.cancelDeal'), onConfirm: () => cancelMutation.mutate('Changed my mind') })} />
      </div>
    );
  }

  if (['CREATIVE_PENDING', 'CREATIVE_REVISION_REQUESTED', 'IN_PROGRESS', 'PAYMENT_RECEIVED'].includes(status) && isAdvertiser) return (
    <div className="action-card action-card-warning p-4 space-y-3 animate-fade-slide-up">
      <div className="flex items-center gap-2">
        <Pen className="w-4 h-4 text-[#3390ec]" />
        <span className="text-sm font-semibold text-white">{t('dealDetail.createAdPost')}</span>
      </div>
      <p className="text-xs text-[#999999]">
        {t('dealDetail.writeAdInBot')}
      </p>
      {status === 'CREATIVE_REVISION_REQUESTED' && deal.creative?.revisionFeedback && (
        <div className="p-3 bg-[#F59E0B]/10 rounded-xl border border-[#F59E0B]/20">
          <p className="text-xs text-[#F59E0B]/80 font-medium mb-1">{t('dealDetail.revisionRequested')}</p>
          <p className="text-[11px] text-[#F59E0B]/60">{deal.creative.revisionFeedback}</p>
        </div>
      )}
      <a href={`https://t.me/monofacturebot?start=creative_${deal.id}`} target="_blank" rel="noopener noreferrer" className="block">
        <ActionButton label={t('dealDetail.openBot')} gradient="blue"
          icon={<Bot className="w-4 h-4" strokeWidth={2} />} />
      </a>
    </div>
  );

  if (['CREATIVE_PENDING', 'IN_PROGRESS', 'PAYMENT_RECEIVED'].includes(status) && isPublisher) return (
    <div className="glass-card p-4 text-center animate-fade-slide-up">
      <Clock className="w-8 h-8 text-[#3390ec] mx-auto mb-2 animate-pulse" />
      <p className="text-sm font-medium text-white">{t('dealDetail.waitingForPost')}</p>
      <p className="text-xs text-[#666666] mt-1">{t('dealDetail.advertiserPreparing')}</p>
    </div>
  );

  if (status === 'CREATIVE_SUBMITTED' && isPublisher) return (
    <div className="action-card p-4 space-y-3 animate-fade-slide-up">
      <div className="flex items-center gap-2">
        <Image className="w-4 h-4 text-white" />
        <span className="text-sm font-semibold text-white">{t('dealDetail.reviewAdPost')}</span>
      </div>
      <p className="text-xs text-[#999999]">
        {t('dealDetail.adSubmitted')}
      </p>
      <a href={`https://t.me/monofacturebot?start=review_${deal.id}`} target="_blank" rel="noopener noreferrer" className="block">
        <ActionButton label={t('dealDetail.reviewInBot')} gradient="primary"
          icon={<Bot className="w-4 h-4" strokeWidth={2} />} />
      </a>
    </div>
  );

  if (status === 'CREATIVE_SUBMITTED' && isAdvertiser) return (
    <div className="glass-card p-4 text-center animate-fade-slide-up">
      <Clock className="w-8 h-8 text-white mx-auto mb-2 animate-pulse" />
      <p className="text-sm font-medium text-white">{t('dealDetail.waitingForReview')}</p>
      <p className="text-xs text-[#666666] mt-1">{t('dealDetail.publisherReviewing')}</p>
    </div>
  );

  if (status === 'CREATIVE_REVISION_REQUESTED' && isPublisher) return (
    <div className="glass-card p-4 text-center animate-fade-slide-up">
      <RotateCcw className="w-8 h-8 text-[#F59E0B] mx-auto mb-2" />
      <p className="text-sm font-medium text-white">{t('dealDetail.revisionRequestedTitle')}</p>
      <p className="text-xs text-[#666666] mt-1">{t('dealDetail.awaitingRevision')}</p>
    </div>
  );

  if (status === 'SCHEDULED' && isPublisher) return (
    <div className="action-card action-card-success p-4 space-y-3 animate-fade-slide-up">
      <p className="text-xs text-[#666666]">{t('dealDetail.confirmManual')}</p>
      <ActionButton label={t('dealDetail.confirmPostPublished')} gradient="green" loading={confirmPostMutation.isPending}
        icon={<Send className="w-4 h-4" strokeWidth={2} />}
        onClick={() => setDialogAction({ title: t('dealDetail.confirmPublication'), description: t('dealDetail.haveYouPublished'), confirmText: t('dealDetail.yesPublished'), onConfirm: () => { hapticFeedback?.('notification'); confirmPostMutation.mutate(); } })} />
    </div>
  );

  if (status === 'POSTED' && isAdvertiser) return (
    <div className="action-card action-card-success p-4 space-y-3 animate-fade-slide-up">
      <div className="flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-[#22C55E]" />
        <span className="text-sm font-semibold text-white">{t('dealDetail.adPublished')}</span>
      </div>
      <p className="text-xs text-[#666666]">{t('dealDetail.verifyAndRelease')}</p>
      <ActionButton label={t('dealDetail.confirmRelease')} gradient="green" loading={confirmCompletionMutation.isPending}
        icon={<CheckCircle className="w-4 h-4" strokeWidth={2} />}
        onClick={() => setDialogAction({ title: t('dealDetail.releasePayment'), description: t('dealDetail.releaseConfirm'), confirmText: t('dealDetail.releasePayment'), onConfirm: () => { hapticFeedback?.('notification'); confirmCompletionMutation.mutate(); } })} />
    </div>
  );

  if (status === 'CREATIVE_APPROVED' || status === 'SCHEDULED') return (
    <div className="glass-card p-4 text-center animate-fade-slide-up">
      <Clock className="w-8 h-8 text-white mx-auto mb-2 animate-pulse" />
      <p className="text-sm text-white/60">{t('dealDetail.waitingForPublish')}</p>
    </div>
  );

  if (['PAYMENT_RECEIVED', 'IN_PROGRESS'].includes(status)) return (
    <div className="glass-card p-4 text-center animate-fade-slide-up">
      <Clock className="w-8 h-8 text-white mx-auto mb-2 animate-pulse" />
      <p className="text-sm text-white/60">{t('dealDetail.processingPayment')}</p>
    </div>
  );

  return null;
}

function ActionButton({ label, onClick, loading, gradient, variant, icon }: {
  label: string; onClick?: () => void; loading?: boolean; gradient?: string; variant?: string; icon?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const base = "w-full py-[14px] px-6 rounded-2xl font-semibold text-[15px] active:scale-[0.97] transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2";
  const styles: Record<string, string> = {
    green: `${base} bg-white text-black`,
    primary: `${base} bg-white text-black`,
    blue: `${base} bg-white text-black`,
    danger: `${base} bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/15`,
    'danger-ghost': `${base} bg-transparent text-[#EF4444]/60 text-[13px] font-normal`,
    warning: `${base} bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/15`,
    outline: `${base} bg-transparent border border-white/20 text-white`,
    ghost: `${base} bg-[#1A1A1A] text-[#999]`,
  };
  const className = gradient ? styles[gradient] : variant ? styles[variant] : styles.primary;
  return (
    <button onClick={onClick} disabled={loading} className={className}>
      {loading ? (
        <>
          <span className="w-5 h-5 border-2 border-current/20 border-t-current rounded-full animate-spin" />
          {t('common.loading')}
        </>
      ) : (
        <>
          {icon}
          {label}
        </>
      )}
    </button>
  );
}
