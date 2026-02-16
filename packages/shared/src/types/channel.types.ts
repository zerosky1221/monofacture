export enum ChannelStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  VERIFIED = 'VERIFIED',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  REJECTED = 'REJECTED',
}

export enum ChannelCategory {
  CRYPTO = 'CRYPTO',
  TECH = 'TECH',
  BUSINESS = 'BUSINESS',
  ENTERTAINMENT = 'ENTERTAINMENT',
  NEWS = 'NEWS',
  EDUCATION = 'EDUCATION',
  LIFESTYLE = 'LIFESTYLE',
  GAMING = 'GAMING',
  SPORTS = 'SPORTS',
  FINANCE = 'FINANCE',
  HEALTH = 'HEALTH',
  TRAVEL = 'TRAVEL',
  FOOD = 'FOOD',
  FASHION = 'FASHION',
  MUSIC = 'MUSIC',
  ART = 'ART',
  SCIENCE = 'SCIENCE',
  POLITICS = 'POLITICS',
  OTHER = 'OTHER',
}

export enum AdFormat {
  POST = 'POST',
  FORWARD = 'FORWARD',
  PIN_MESSAGE = 'PIN_MESSAGE',
}

export interface Channel {
  id: string;
  telegramId: bigint;
  username: string | null;
  title: string;
  description: string | null;
  inviteLink: string | null;
  photoUrl: string | null;
  ownerId: string;
  status: ChannelStatus;
  isActive: boolean;
  categories: ChannelCategory[];
  tags: string[];
  language: string;
  country: string | null;
  isBotAdded: boolean;
  botAddedAt: Date | null;
  verificationToken: string | null;
  verifiedAt: Date | null;
  subscriberCount: number;
  averageViews: number;
  averageReach: number;
  engagementRate: number;
  premiumSubscribers: number;
  totalDeals: number;
  successfulDeals: number;
  totalEarnings: bigint;
  rating: number;
  reviewCount: number;
  isPublic: boolean;
  autoAcceptDeals: boolean;
  minBudget: bigint | null;
  maxBudget: bigint | null;
  statsUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChannelPricing {
  id: string;
  channelId: string;
  adFormat: AdFormat;
  pricePerHour: bigint;
  pricePermanent: bigint | null;
  minHours: number;
  maxHours: number;
  publishTimeStart: string | null;
  publishTimeEnd: string | null;
  timezone: string;
  currency: string;
  description: string | null;
  duration: number | null;
  includes: string[];
  isActive: boolean;
  minOrderTime: number | null;
  maxOrderTime: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChannelStats {
  id: string;
  channelId: string;
  subscriberCount: number;
  subscriberGrowth24h: number;
  subscriberGrowth7d: number;
  subscriberGrowth30d: number;
  averageViews: number;
  averageReach: number;
  averageViewsGrowth: number;
  engagementRate: number;
  averageReactions: number;
  averageComments: number;
  averageShares: number;
  premiumSubscribers: number;
  premiumViewsPercentage: number;
  languageDistribution: Record<string, number> | null;
  genderDistribution: Record<string, number> | null;
  ageDistribution: Record<string, number> | null;
  geoDistribution: Record<string, number> | null;
  postsLast24h: number;
  postsLast7d: number;
  postsLast30d: number;
  averagePostsPerDay: number;
  peakHours: number[] | null;
  rawTelegramStats: Record<string, unknown> | null;
  updatedAt: Date;
  lastFetchedAt: Date;
}

export interface ChannelAdmin {
  id: string;
  channelId: string;
  userId: string;
  canManageDeals: boolean;
  canManagePricing: boolean;
  canManageSettings: boolean;
  canWithdraw: boolean;
  canAddAdmins: boolean;
  telegramAdminRights: Record<string, unknown> | null;
  isActive: boolean;
  addedAt: Date;
  lastVerifiedAt: Date | null;
}

export interface CreateChannelDto {
  channelUsername: string;
}

export interface UpdateChannelDto {
  description?: string;
  categories?: ChannelCategory[];
  tags?: string[];
  isPublic?: boolean;
  autoAcceptDeals?: boolean;
  minBudget?: string;
  maxBudget?: string;
}

export interface ChannelPricingInput {
  adFormat: AdFormat;
  pricePerHour: string;
  pricePermanent?: string | null;
  minHours?: number;
  maxHours?: number;
  publishTimeStart?: string | null;
  publishTimeEnd?: string | null;
  timezone?: string;
  description?: string;
  duration?: number;
  includes?: string[];
  isActive?: boolean;
}

export interface ChannelFilters {
  search?: string;
  categories?: ChannelCategory[];
  language?: string;
  minSubscribers?: number;
  maxSubscribers?: number;
  minPrice?: number;
  maxPrice?: number;
  adFormat?: AdFormat;
  sortBy?: 'subscribers' | 'rating' | 'price' | 'deals' | 'created';
  sortOrder?: 'asc' | 'desc';
}
