import { AdFormat } from '../types/channel.types.js';

export const AD_FORMAT_LABELS: Record<AdFormat, string> = {
  [AdFormat.POST]: 'Post',
  [AdFormat.FORWARD]: 'Forward',
  [AdFormat.PIN_MESSAGE]: 'Pinned Message',
};

export const AD_FORMAT_DESCRIPTIONS: Record<AdFormat, string> = {
  [AdFormat.POST]: 'A regular post in the channel',
  [AdFormat.FORWARD]: 'Forward a message from another channel',
  [AdFormat.PIN_MESSAGE]: 'Pin a message at the top of the channel',
};

export const AD_FORMAT_DEFAULT_DURATIONS: Record<AdFormat, number> = {
  [AdFormat.POST]: 24,
  [AdFormat.FORWARD]: 24,
  [AdFormat.PIN_MESSAGE]: 48,
};
