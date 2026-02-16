import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  Send,
  Loader2,
  ChevronRight,
} from '../components/icons';
import { api } from '../lib/api';
import { Input } from '@telegram-tools/ui-kit';
import { Button } from '../components/ui/Button';
import { SelectSheet } from '../components/ui/SelectSheet';
import { useTelegram } from '../providers/TelegramProvider';
import toast from 'react-hot-toast';
import { useTranslation } from '../i18n';

const CATEGORY_KEYS: Record<string, string> = {
  PAYMENT_ISSUE: 'ticket.categoryPayment',
  DEAL_PROBLEM: 'ticket.categoryDeal',
  DISPUTE: 'ticket.categoryDispute',
  USER_REPORT: 'ticket.categoryReportUser',
  CHANNEL_REPORT: 'ticket.categoryReportChannel',
  CHANNEL_VERIFICATION: 'ticket.categoryVerification',
  FEATURE_REQUEST: 'ticket.categoryFeature',
  BUG_REPORT: 'ticket.categoryBug',
  QUESTION: 'ticket.categoryQuestion',
  OTHER: 'ticket.categoryOther',
};

const CATEGORY_VALUES = [
  'PAYMENT_ISSUE', 'DEAL_PROBLEM', 'DISPUTE', 'USER_REPORT', 'CHANNEL_REPORT',
  'CHANNEL_VERIFICATION', 'FEATURE_REQUEST', 'BUG_REPORT', 'QUESTION', 'OTHER',
] as const;

const PRIORITY_KEYS: Record<string, string> = {
  LOW: 'newTicket.priorityLow',
  MEDIUM: 'newTicket.priorityMedium',
  HIGH: 'newTicket.priorityHigh',
  URGENT: 'newTicket.priorityUrgent',
};

const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
] as const;

const PRIORITY_COLORS: Record<string, { active: string; inactive: string }> = {
  LOW: { active: 'bg-[#22C55E] text-white', inactive: 'bg-[#111] text-[#999] border border-[#1A1A1A]' },
  MEDIUM: { active: 'bg-[#3390ec] text-white', inactive: 'bg-[#111] text-[#999] border border-[#1A1A1A]' },
  HIGH: { active: 'bg-[#F97316] text-white', inactive: 'bg-[#111] text-[#999] border border-[#1A1A1A]' },
  URGENT: { active: 'bg-[#EF4444] text-white', inactive: 'bg-[#111] text-[#999] border border-[#1A1A1A]' },
};

export function NewTicketPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hapticFeedback } = useTelegram();
  const { t } = useTranslation();

  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [priority, setPriority] = useState('MEDIUM');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [showCategorySheet, setShowCategorySheet] = useState(false);

  const createTicketMutation = useMutation({
    mutationFn: async (payload: {
      category: string;
      priority: string;
      subject: string;
      message: string;
    }) => {
      const response = await api.post('/support/tickets', payload);
      return response.data;
    },
    onSuccess: (data) => {
      hapticFeedback('notification');
      toast.success(t('ticket.createdSuccess'));
      navigate('/support/tickets/' + data.data.id);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || t('ticket.createFailed'));
    },
  });

  const canSubmit = category && subject.trim() && message.trim() && !createTicketMutation.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    hapticFeedback('impact');
    createTicketMutation.mutate({
      category,
      priority,
      subject: subject.trim(),
      message: message.trim(),
    });
  };

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
          <h1 className="text-[22px] font-bold text-white">{t('newTicket.title')}</h1>
        </div>
      </div>

      <div className="px-4 space-y-5">
        <div>
          <label className="text-xs font-bold text-[#666] uppercase tracking-wider mb-2 block">
            {t('newTicket.category')}
          </label>
          <button
            onClick={() => setShowCategorySheet(true)}
            className="w-full flex items-center justify-between px-4 py-3 bg-[#111] border border-[#1A1A1A] rounded-xl text-sm transition-colors hover:border-[#333]"
          >
            <span className={category ? 'text-white' : 'text-[#666]'}>
              {category ? t(CATEGORY_KEYS[category]) : t('newTicket.selectCategory')}
            </span>
            <ChevronRight className="w-4 h-4 text-[#666]" />
          </button>
        </div>

        <div>
          <label className="text-xs font-bold text-[#666] uppercase tracking-wider mb-2 block">
            {t('newTicket.priority')}
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                onClick={() => {
                  hapticFeedback('selection');
                  setPriority(p.value);
                }}
                className={`h-10 rounded-xl text-[12px] font-medium transition-all truncate px-1 ${
                  priority === p.value
                    ? PRIORITY_COLORS[p.value].active
                    : PRIORITY_COLORS[p.value].inactive
                }`}
              >
                {t(PRIORITY_KEYS[p.value])}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-[#666] uppercase tracking-wider mb-2 block">
            {t('newTicket.subject')}
          </label>
          <Input
            value={subject}
            onChange={(v) => setSubject(v)}
            placeholder={t('newTicket.subjectPlaceholder')}
          />
        </div>

        <div>
          <label className="text-xs font-bold text-[#666] uppercase tracking-wider mb-2 block">
            {t('newTicket.message')}
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('newTicket.messagePlaceholder')}
            rows={6}
            className="w-full px-4 py-3 bg-[#111] border border-[#1A1A1A] rounded-xl text-white text-sm placeholder-[#666] outline-none focus:border-[#333] transition-colors resize-none"
          />
        </div>

        <Button className="w-full" size="lg" icon={Send} onClick={handleSubmit} disabled={!canSubmit} loading={createTicketMutation.isPending}>
          {createTicketMutation.isPending ? t('common.loading') : t('newTicket.submit')}
        </Button>
      </div>

      <SelectSheet
        isOpen={showCategorySheet}
        onClose={() => setShowCategorySheet(false)}
        title={t('newTicket.category')}
        options={CATEGORY_VALUES.map((val) => ({ value: val, label: t(CATEGORY_KEYS[val]) }))}
        value={category}
        onChange={(v) => { setCategory(v); hapticFeedback('selection'); }}
      />
    </div>
  );
}

export default NewTicketPage;
