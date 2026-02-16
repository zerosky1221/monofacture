export const DEAL_COLORS = {
  background: '#000',
  card: {
    bg: 'bg-[#0A0A0A]',
    border: 'border-[#1A1A1A]',
  },
  accent: {
    primary: '#FFFFFF',
    green: '#22C55E',
    orange: '#F59E0B',
    red: '#EF4444',
    blue: '#3390ec',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #FFFFFF 0%, #E5E5E5 100%)',
    greenTeal: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
    orangeRed: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
  },
} as const;

export const STEP_STAGES = [
  { key: 'CREATED', label: 'Created', status: ['PENDING', 'PENDING_ACCEPTANCE'] },
  { key: 'ACCEPTED', label: 'Accepted', status: ['PENDING_PAYMENT', 'PAYMENT_RECEIVED'] },
  { key: 'CREATIVE', label: 'Creative', status: ['PENDING_CREATIVE', 'CREATIVE_SUBMITTED', 'REVISION_REQUESTED'] },
  { key: 'POSTED', label: 'Posted', status: ['PENDING_POSTING', 'AD_POSTED', 'PENDING_VERIFICATION'] },
  { key: 'COMPLETED', label: 'Done', status: ['COMPLETED', 'FUNDS_RELEASED'] },
] as const;

export function getStepIndex(status: string): number {
  for (let i = 0; i < STEP_STAGES.length; i++) {
    if (STEP_STAGES[i].status.includes(status as never)) {
      return i;
    }
  }
  return 0;
}

export function getStepProgress(status: string): number {
  const index = getStepIndex(status);
  return index / (STEP_STAGES.length - 1);
}

export const STATUS_DESCRIPTIONS: Record<string, string> = {
  PENDING: 'Awaiting publisher review',
  PENDING_ACCEPTANCE: 'Publisher reviewing offer',
  PENDING_PAYMENT: 'Escrow payment required',
  PAYMENT_RECEIVED: 'Payment confirmed',
  PENDING_CREATIVE: 'Preparing ad content',
  CREATIVE_SUBMITTED: 'Creative ready for review',
  REVISION_REQUESTED: 'Revisions requested',
  PENDING_POSTING: 'Scheduling post',
  AD_POSTED: 'Verifying placement',
  PENDING_VERIFICATION: 'Verifying placement',
  COMPLETED: 'Deal completed',
  FUNDS_RELEASED: 'Funds released',
  CANCELLED: 'Deal cancelled',
  DISPUTED: 'Under dispute',
  REFUNDED: 'Funds refunded',
};

export const ESCROW_CONFIG = {
  gasBuffer: BigInt(50_000_000),
  minStorageRent: BigInt(10_000_000),
} as const;

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-white/10', text: 'text-white/60' },
  PENDING_ACCEPTANCE: { bg: 'bg-[#F59E0B]/20', text: 'text-[#F59E0B]' },
  PENDING_PAYMENT: { bg: 'bg-[#3390ec]/20', text: 'text-[#3390ec]' },
  PAYMENT_RECEIVED: { bg: 'bg-[#22C55E]/20', text: 'text-[#22C55E]' },
  PENDING_CREATIVE: { bg: 'bg-[#3390ec]/20', text: 'text-[#3390ec]' },
  CREATIVE_SUBMITTED: { bg: 'bg-[#3390ec]/20', text: 'text-[#3390ec]' },
  REVISION_REQUESTED: { bg: 'bg-[#F59E0B]/20', text: 'text-[#F59E0B]' },
  PENDING_POSTING: { bg: 'bg-[#3390ec]/20', text: 'text-[#3390ec]' },
  AD_POSTED: { bg: 'bg-[#22C55E]/20', text: 'text-[#22C55E]' },
  PENDING_VERIFICATION: { bg: 'bg-[#3390ec]/20', text: 'text-[#3390ec]' },
  COMPLETED: { bg: 'bg-[#22C55E]/20', text: 'text-[#22C55E]' },
  FUNDS_RELEASED: { bg: 'bg-[#22C55E]/20', text: 'text-[#22C55E]' },
  CANCELLED: { bg: 'bg-[#EF4444]/20', text: 'text-[#EF4444]' },
  DISPUTED: { bg: 'bg-[#EF4444]/20', text: 'text-[#EF4444]' },
  REFUNDED: { bg: 'bg-[#F59E0B]/20', text: 'text-[#F59E0B]' },
};

export const ESCROW_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-white/10', text: 'text-white/60' },
  FUNDED: { bg: 'bg-[#3390ec]/20', text: 'text-[#3390ec]' },
  RELEASED: { bg: 'bg-[#22C55E]/20', text: 'text-[#22C55E]' },
  REFUNDED: { bg: 'bg-[#F59E0B]/20', text: 'text-[#F59E0B]' },
  DISPUTED: { bg: 'bg-[#EF4444]/20', text: 'text-[#EF4444]' },
};
