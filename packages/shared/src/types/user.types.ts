export enum UserRole {
  USER = 'USER',
  CHANNEL_OWNER = 'CHANNEL_OWNER',
  ADVERTISER = 'ADVERTISER',
  PR_MANAGER = 'PR_MANAGER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

export interface User {
  id: string;
  telegramId: bigint;
  telegramUsername: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  languageCode: string | null;
  isPremium: boolean;
  roles: UserRole[];
  status: UserStatus;
  tonWalletAddress: string | null;
  tonWalletConnectedAt: Date | null;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  email: string | null;
  isVerified: boolean;
  verifiedAt: Date | null;
  totalDeals: number;
  successfulDeals: number;
  totalSpent: bigint;
  totalEarned: bigint;
  rating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
}

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  refreshToken: string | null;
  deviceInfo: Record<string, unknown> | null;
  ipAddress: string | null;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date;
}

export interface UserWallet {
  id: string;
  userId: string;
  address: string;
  publicKey: string | null;
  isMain: boolean;
  balance: bigint;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  telegramId: bigint;
  telegramUsername?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  languageCode?: string;
  isPremium?: boolean;
}

export interface UpdateUserDto {
  email?: string;
  notificationsEnabled?: boolean;
  emailNotifications?: boolean;
  languageCode?: string;
}
