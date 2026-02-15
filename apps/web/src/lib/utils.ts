import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

export function formatTon(nanoTon: bigint | string | number): string {
  const value = typeof nanoTon === 'bigint' ? nanoTon : BigInt(nanoTon || 0);
  const ton = Number(value) / 1_000_000_000;
  return ton.toFixed(2);
}

export function parseTon(ton: string): bigint {
  const value = parseFloat(ton) || 0;
  return BigInt(Math.floor(value * 1_000_000_000));
}

export function formatDate(date: string | Date): string {
  if (!date) return '\u2014';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '\u2014';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  if (!date) return '\u2014';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '\u2014';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return formatDate(date);
}

export function truncateAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    CREATED: 'bg-[#3390ec]/15 text-[#3390ec]',
    PENDING_PAYMENT: 'bg-[#F59E0B]/15 text-[#F59E0B]',
    PAYMENT_RECEIVED: 'bg-[#22C55E]/15 text-[#22C55E]',
    IN_PROGRESS: 'bg-[#3390ec]/15 text-[#3390ec]',
    CREATIVE_PENDING: 'bg-[#F59E0B]/15 text-[#F59E0B]',
    CREATIVE_SUBMITTED: 'bg-[#3390ec]/15 text-[#3390ec]',
    CREATIVE_APPROVED: 'bg-[#22C55E]/15 text-[#22C55E]',
    SCHEDULED: 'bg-[#3390ec]/15 text-[#3390ec]',
    POSTED: 'bg-[#22C55E]/15 text-[#22C55E]',
    VERIFYING: 'bg-[#3390ec]/15 text-[#3390ec]',
    VERIFIED: 'bg-[#22C55E]/15 text-[#22C55E]',
    COMPLETED: 'bg-[#22C55E]/15 text-[#22C55E]',
    CANCELLED: 'bg-[#666666]/15 text-[#999999]',
    DISPUTED: 'bg-[#EF4444]/15 text-[#EF4444]',
    REFUNDED: 'bg-[#F59E0B]/15 text-[#F59E0B]',
    EXPIRED: 'bg-[#666666]/15 text-[#999999]',
    ACTIVE: 'bg-[#22C55E]/15 text-[#22C55E]',
    PENDING_VERIFICATION: 'bg-[#F59E0B]/15 text-[#F59E0B]',
    SUSPENDED: 'bg-[#EF4444]/15 text-[#EF4444]',
    DRAFT: 'bg-[#666666]/15 text-[#999999]',
    PUBLISHED: 'bg-[#22C55E]/15 text-[#22C55E]',
    PAUSED: 'bg-[#F59E0B]/15 text-[#F59E0B]',
    default: 'bg-[#1A1A1A] text-[#999999]',
  };
  return colors[status] || colors.default;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    CREATED: 'Created',
    PENDING_PAYMENT: 'Awaiting Payment',
    PAYMENT_RECEIVED: 'Paid',
    IN_PROGRESS: 'In Progress',
    CREATIVE_PENDING: 'Creative Pending',
    CREATIVE_SUBMITTED: 'Creative Submitted',
    CREATIVE_APPROVED: 'Approved',
    CREATIVE_REVISION_REQUESTED: 'Revision Requested',
    SCHEDULED: 'Scheduled',
    POSTED: 'Posted',
    VERIFYING: 'Verifying',
    VERIFIED: 'Verified',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    DISPUTED: 'Disputed',
    REFUNDED: 'Refunded',
    EXPIRED: 'Expired',
    ACTIVE: 'Active',
    PENDING_VERIFICATION: 'Pending',
    SUSPENDED: 'Suspended',
    DRAFT: 'Draft',
    PUBLISHED: 'Published',
    PAUSED: 'Paused',
  };
  return labels[status] || status;
}

export function getCategoryIcon(category: string): string {
  const labels: Record<string, string> = {
    CRYPTO: 'Crypto',
    TECH: 'Tech',
    BUSINESS: 'Business',
    ENTERTAINMENT: 'Entertainment',
    NEWS: 'News',
    EDUCATION: 'Education',
    LIFESTYLE: 'Lifestyle',
    GAMING: 'Gaming',
    SPORTS: 'Sports',
    FINANCE: 'Finance',
    HEALTH: 'Health',
    TRAVEL: 'Travel',
    FOOD: 'Food',
    FASHION: 'Fashion',
    MUSIC: 'Music',
    OTHER: 'Other',
  };
  return labels[category] || category;
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    CRYPTO: 'bg-[#F59E0B]',
    TECH: 'bg-[#3390ec]',
    BUSINESS: 'bg-[#3390ec]',
    ENTERTAINMENT: 'bg-[#EF4444]',
    NEWS: 'bg-[#64D2FF]',
    EDUCATION: 'bg-[#22C55E]',
    LIFESTYLE: 'bg-white',
    GAMING: 'bg-[#EF4444]',
    SPORTS: 'bg-[#22C55E]',
    FINANCE: 'bg-[#F59E0B]',
    HEALTH: 'bg-[#EF4444]',
    TRAVEL: 'bg-[#64D2FF]',
    FOOD: 'bg-[#F59E0B]',
    FASHION: 'bg-[#3390ec]',
    MUSIC: 'bg-[#3390ec]',
    OTHER: 'bg-[#666666]',
  };
  return colors[category] || 'bg-[#1A1A1A]';
}
