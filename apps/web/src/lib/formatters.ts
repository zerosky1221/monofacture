export function formatNumber(num: number | string | undefined): string {
  if (num === undefined || num === null) return '0';

  const n = typeof num === 'string' ? parseFloat(num) : num;

  if (isNaN(n)) return '0';

  if (n >= 1_000_000_000) {
    return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (n >= 1_000_000) {
    return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (n >= 1_000) {
    return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }

  return n.toLocaleString();
}

export function formatTon(amount: string | number | undefined): string {
  if (amount === undefined || amount === null) return '0';

  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(num)) return '0';

  if (num > 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(2);
  }

  if (num === 0) return '0';
  if (num < 0.01) return '<0.01';

  return num.toFixed(2).replace(/\.?0+$/, '');
}

export function formatTonWithSymbol(amount: string | number | undefined): string {
  return `${formatTon(amount)} TON`;
}

export function formatRelativeTime(date: string | Date | undefined): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;

  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatDate(date: string | Date | undefined): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;

  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | Date | undefined): string {
  if (!date) return '';

  const d = typeof date === 'string' ? new Date(date) : date;

  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatPercent(value: number | undefined, decimals = 1): string {
  if (value === undefined || value === null) return '0%';
  return `${(value * 100).toFixed(decimals)}%`;
}

export function truncateAddress(address: string, chars = 6): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatUsd(amount: number | string | undefined): string {
  if (amount === undefined || amount === null) return '$0';

  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(num)) return '$0';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}
