import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsBoolean, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { UserRole, UserStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'User email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Enable push notifications' })
  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable email notifications' })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Preferred language code', maxLength: 5 })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  languageCode?: string;
}

export class ConnectWalletDto {
  @ApiProperty({ description: 'TON wallet address' })
  @IsString()
  address: string;

  @ApiPropertyOptional({ description: 'Wallet public key' })
  @IsOptional()
  @IsString()
  publicKey?: string;

  @ApiPropertyOptional({ description: 'Set as main wallet', default: false })
  @IsOptional()
  @IsBoolean()
  setAsMain?: boolean;
}

export class UserFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search by username, name, or email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: UserStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ enum: UserRole, description: 'Filter by role' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    enum: ['createdAt', 'lastActiveAt', 'totalDeals', 'rating'],
    default: 'createdAt',
    description: 'Sort field',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc', description: 'Sort order' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  telegramId: string;

  @ApiPropertyOptional()
  telegramUsername: string | null;

  @ApiPropertyOptional()
  firstName: string | null;

  @ApiPropertyOptional()
  lastName: string | null;

  @ApiPropertyOptional()
  photoUrl: string | null;

  @ApiProperty({ enum: UserRole, isArray: true })
  roles: UserRole[];

  @ApiProperty({ enum: UserStatus })
  status: UserStatus;

  @ApiPropertyOptional()
  tonWalletAddress: string | null;

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty()
  totalDeals: number;

  @ApiProperty()
  successfulDeals: number;

  @ApiProperty()
  rating: number;

  @ApiProperty()
  reviewCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  lastActiveAt: Date;
}

export class UserStatisticsDto {
  @ApiProperty()
  totalDeals: number;

  @ApiProperty()
  successfulDeals: number;

  @ApiProperty()
  totalSpent: string;

  @ApiProperty()
  totalEarned: string;

  @ApiProperty()
  rating: number;

  @ApiProperty()
  reviewCount: number;

  @ApiProperty()
  activeDeals: number;

  @ApiProperty()
  pendingPayouts: string;
}
