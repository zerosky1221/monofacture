import type { ChannelCategory, AdFormat } from './channel.types.js';

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface Campaign {
  id: string;
  advertiserId: string;
  title: string;
  description: string;
  brief: string | null;
  status: CampaignStatus;
  targetCategories: ChannelCategory[];
  targetLanguages: string[];
  targetCountries: string[];
  minSubscribers: number | null;
  maxSubscribers: number | null;
  minEngagement: number | null;
  adFormats: AdFormat[];
  totalBudget: bigint;
  minPricePerPost: bigint | null;
  maxPricePerPost: bigint | null;
  currency: string;
  startDate: Date | null;
  endDate: Date | null;
  preferredPostTimes: number[] | null;
  creativeGuidelines: string | null;
  sampleContent: string | null;
  attachments: string[] | null;
  doNotInclude: string[];
  applicationCount: number;
  acceptedCount: number;
  completedDeals: number;
  totalSpent: bigint;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  closedAt: Date | null;
}

export interface CampaignApplication {
  id: string;
  campaignId: string;
  channelId: string;
  proposedPrice: bigint;
  adFormat: AdFormat;
  message: string | null;
  proposedDate: Date | null;
  proposedTime: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  createdAt: Date;
  respondedAt: Date | null;
}

export interface CreateCampaignDto {
  title: string;
  description: string;
  brief?: string;
  targetCategories?: ChannelCategory[];
  targetLanguages?: string[];
  targetCountries?: string[];
  minSubscribers?: number;
  maxSubscribers?: number;
  minEngagement?: number;
  adFormats: AdFormat[];
  totalBudget: string;
  minPricePerPost?: string;
  maxPricePerPost?: string;
  startDate?: string;
  endDate?: string;
  creativeGuidelines?: string;
  sampleContent?: string;
  doNotInclude?: string[];
}

export interface UpdateCampaignDto extends Partial<CreateCampaignDto> {}

export interface CampaignApplicationInput {
  channelId: string;
  proposedPrice: string;
  adFormat: AdFormat;
  message?: string;
  proposedDate?: string;
  proposedTime?: string;
}

export interface CampaignFilters {
  categories?: ChannelCategory[];
  minBudget?: number;
  maxBudget?: number;
  adFormats?: AdFormat[];
  sortBy?: 'budget' | 'created' | 'deadline';
  sortOrder?: 'asc' | 'desc';
}
