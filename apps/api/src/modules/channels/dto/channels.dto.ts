import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  MaxLength,
  IsInt,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ChannelStatus, ChannelCategory, AdFormat } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateChannelDto {
  @ApiPropertyOptional({ description: 'Channel username (without @)' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  username?: string;

  @ApiPropertyOptional({ description: 'Telegram channel ID' })
  @IsOptional()
  @IsString()
  telegramId?: string;

  @ApiPropertyOptional({ description: 'Channel title' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: 'Channel description' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Channel photo URL' })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional({ description: 'Subscriber count' })
  @IsOptional()
  @IsNumber()
  subscriberCount?: number;

  @ApiPropertyOptional({ enum: ChannelCategory, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(ChannelCategory, { each: true })
  categories?: ChannelCategory[];

  @ApiPropertyOptional({ description: 'Primary language code' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  language?: string;
}

export class UpdateChannelDto {
  @ApiPropertyOptional({ description: 'Channel description' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: ChannelCategory, description: 'Single category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: ChannelCategory, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(ChannelCategory, { each: true })
  categories?: ChannelCategory[];

  @ApiPropertyOptional({ description: 'Tags for discovery' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Primary language' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Whether channel is publicly listed' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Hide owner identity from advertisers' })
  @IsOptional()
  @IsBoolean()
  isOwnerAnonymous?: boolean;

  @ApiPropertyOptional({ description: 'Auto-accept deals within budget' })
  @IsOptional()
  @IsBoolean()
  autoAcceptDeals?: boolean;

  @ApiPropertyOptional({ description: 'Whether channel is accepting new orders' })
  @IsOptional()
  @IsBoolean()
  isAcceptingOrders?: boolean;

  @ApiPropertyOptional({ description: 'Ad requirements text' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adRequirements?: string;

  @ApiPropertyOptional({ description: 'Minimum budget to accept (nanoTON)' })
  @IsOptional()
  @IsString()
  minBudget?: string;

  @ApiPropertyOptional({ description: 'Maximum budget to accept (nanoTON)' })
  @IsOptional()
  @IsString()
  maxBudget?: string;

  @ApiPropertyOptional({ description: 'Whether channel is active for deals' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ChannelPricingDto {
  @ApiProperty({ enum: AdFormat })
  @IsEnum(AdFormat)
  adFormat: AdFormat;

  @ApiProperty({ description: 'Price per hour in nanoTON' })
  @IsString()
  pricePerHour: string;

  @ApiPropertyOptional({ description: 'Permanent placement price in nanoTON (null = not offered)' })
  @IsOptional()
  @IsString()
  pricePermanent?: string | null;

  @ApiPropertyOptional({ description: 'Minimum hours' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  minHours?: number;

  @ApiPropertyOptional({ description: 'Maximum hours' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  maxHours?: number;

  @ApiPropertyOptional({ description: 'Publish time window start (HH:MM)' })
  @IsOptional()
  @IsString()
  publishTimeStart?: string | null;

  @ApiPropertyOptional({ description: 'Publish time window end (HH:MM)' })
  @IsOptional()
  @IsString()
  publishTimeEnd?: string | null;

  @ApiPropertyOptional({ description: 'Timezone for publish time window' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Pricing description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Default duration in hours (deprecated)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;

  @ApiPropertyOptional({ description: 'What is included' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includes?: string[];

  @ApiPropertyOptional({ description: 'Whether pricing is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ChannelFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ChannelCategory, description: 'Single category filter' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: ChannelCategory, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(ChannelCategory, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  categories?: ChannelCategory[];

  @ApiPropertyOptional({ description: 'Filter by language' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Minimum subscribers' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minSubscribers?: number;

  @ApiPropertyOptional({ description: 'Maximum subscribers' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxSubscribers?: number;

  @ApiPropertyOptional({ description: 'Minimum price (nanoTON)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price (nanoTON)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @ApiPropertyOptional({ enum: AdFormat, description: 'Filter by ad format' })
  @IsOptional()
  @IsEnum(AdFormat)
  adFormat?: AdFormat;

  @ApiPropertyOptional({ description: 'Minimum channel rating (e.g. 4)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ description: 'Only verified channels' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  verified?: boolean;

  @ApiPropertyOptional({
    enum: ['subscriberCount', 'rating', 'channelRating', 'price', 'totalDeals', 'createdAt'],
    default: 'subscriberCount',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class ChannelResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  telegramId: string;

  @ApiPropertyOptional()
  username: string | null;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiPropertyOptional()
  photoUrl: string | null;

  @ApiProperty({ enum: ChannelStatus })
  status: ChannelStatus;

  @ApiProperty({ enum: ChannelCategory, isArray: true })
  categories: ChannelCategory[];

  @ApiProperty()
  language: string;

  @ApiProperty()
  subscriberCount: number;

  @ApiProperty()
  averageViews: number;

  @ApiProperty()
  engagementRate: number;

  @ApiProperty()
  rating: number;

  @ApiProperty()
  reviewCount: number;

  @ApiProperty()
  totalDeals: number;

  @ApiProperty()
  createdAt: Date;
}
