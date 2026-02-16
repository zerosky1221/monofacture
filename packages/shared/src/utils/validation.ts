import { MIN_DEAL_AMOUNT, MAX_DEAL_AMOUNT } from '../constants/platform.js';

export function isValidTelegramUsername(username: string): boolean {
  const pattern = /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/;
  return pattern.test(username.replace('@', ''));
}

export function isValidTonAddress(address: string): boolean {
  const base64Pattern = /^[A-Za-z0-9_-]{48}$/;
  const rawPattern = /^-?[0-9]+:[a-fA-F0-9]{64}$/;
  const friendlyPattern = /^(EQ|UQ|kQ|0Q)[A-Za-z0-9_-]{46}$/;

  return base64Pattern.test(address) || rawPattern.test(address) || friendlyPattern.test(address);
}

export function isValidDealAmount(amount: bigint): boolean {
  return amount >= MIN_DEAL_AMOUNT && amount <= MAX_DEAL_AMOUNT;
}

export function isValidEmail(email: string): boolean {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeString(str: string): string {
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

export function extractTelegramChannel(input: string): string | null {
  if (input.startsWith('@')) {
    const username = input.slice(1);
    return isValidTelegramUsername(username) ? username : null;
  }

  const tmePattern = /(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([a-zA-Z][a-zA-Z0-9_]{4,31})/;
  const match = input.match(tmePattern);
  if (match?.[1]) {
    return match[1];
  }

  if (isValidTelegramUsername(input)) {
    return input;
  }

  return null;
}
