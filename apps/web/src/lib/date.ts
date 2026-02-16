import { formatDistanceToNow, format } from 'date-fns';

function toDate(input: Date | string | null | undefined): Date | null {
  if (!input) return null;
  const d = input instanceof Date ? input : new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDateTime(date: Date | string | null | undefined): string {
  const d = toDate(date);
  if (!d) return '\u2014';
  return format(d, 'd MMM yyyy, HH:mm');
}

export function formatRelative(date: Date | string | null | undefined): string {
  const d = toDate(date);
  if (!d) return '\u2014';
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatTime(input: Date | string | null | undefined): string {
  const d = toDate(input);
  if (!d) return '\u2014';
  return format(d, 'HH:mm');
}

export function formatDate(input: Date | string | null | undefined): string {
  const d = toDate(input);
  if (!d) return '\u2014';
  return format(d, 'd MMM yyyy');
}

export function formatDealTimestamp(date: Date | string | null | undefined): string {
  const d = toDate(date);
  if (!d) return '\u2014';
  return format(d, 'd MMM, HH:mm');
}

export function formatMonthYear(input: Date | string | null | undefined): string {
  const d = toDate(input);
  if (!d) return '\u2014';
  return format(d, 'MMMM yyyy');
}

export function parseSubscriberInput(value: string): number | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(k|m)?$/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  const unit = match[2];
  if (unit === 'k') return Math.round(num * 1000);
  if (unit === 'm') return Math.round(num * 1000000);
  return Math.round(num);
}

export function formatSubscribers(count: number): string {
  if (count >= 1_000_000) return (count / 1_000_000).toFixed(count % 1_000_000 === 0 ? 0 : 1) + 'M';
  if (count >= 1_000) return (count / 1_000).toFixed(count % 1_000 === 0 ? 0 : 1) + 'K';
  return count.toString();
}
