import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsNumber,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ChannelCategory, AdFormat, CampaignStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateCampaignDto {
  @ApiProperty({ description: 'Campaign title' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Campaign description' })
  @IsString()
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional({ description: 'Detailed brief for channel owners' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  brief?: string;

  @ApiPropertyOptional({ enum: ChannelCategory, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(ChannelCategory, { each: true })
  targetCategories?: ChannelCategory[];

  @ApiPropertyOptional({ description: 'Target languages' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetLanguages?: string[];

  @ApiPropertyOptional({ description: 'Target countries' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetCountries?: string[];

  @ApiPropertyOptional({ description: 'Minimum subscribers required' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minSubscribers?: number;

  @ApiPropertyOptional({ description: 'Maximum subscribers' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxSubscribers?: number;

  @ApiPropertyOptional({ description: 'Minimum engagement rate' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minEngagement?: number;

  @ApiProperty({ enum: AdFormat, isArray: true })
  @IsArray()
  @IsEnum(AdFormat, { each: true })
  adFormats: AdFormat[];

  @ApiProperty({ description: 'Total budget in nanoTON' })
  @IsString()
  totalBudget: string;

  @ApiPropertyOptional({ description: 'Minimum price per post in nanoTON' })
  @IsOptional()
  @IsString()
  minPricePerPost?: string;

  @ApiPropertyOptional({ description: 'Maximum price per post in nanoTON' })
  @IsOptional()
  @IsString()
  maxPricePerPost?: string;

  @ApiPropertyOptional({ description: 'Campaign start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Campaign end date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Creative guidelines' })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  creativeGuidelines?: string;

  @ApiPropertyOptional({ description: 'Sample content' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  sampleContent?: string;

  @ApiPropertyOptional({ description: 'Things to not include' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  doNotInclude?: string[];
}

export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {}

export class CampaignApplicationDto {
  @ApiProperty({ description: 'Channel ID to apply with' })
  @IsString()
  channelId: string;

  @ApiProperty({ description: 'Proposed price in nanoTON' })
  @IsString()
  proposedPrice: string;

  @ApiProperty({ enum: AdFormat })
  @IsEnum(AdFormat)
  adFormat: AdFormat;

  @ApiPropertyOptional({ description: 'Application message' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;

  @ApiPropertyOptional({ description: 'Proposed date for posting' })
  @IsOptional()
  @IsDateString()
  proposedDate?: string;

  @ApiPropertyOptional({ description: 'Proposed time (e.g., "14:00")' })
  @IsOptional()
  @IsString()
  proposedTime?: string;
}

export class CampaignFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ChannelCategory, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(ChannelCategory, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  categories?: ChannelCategory[];

  @ApiPropertyOptional({ description: 'Minimum budget' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minBudget?: number;

  @ApiPropertyOptional({ description: 'Maximum budget' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxBudget?: number;

  @ApiPropertyOptional({ enum: AdFormat, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(AdFormat, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  adFormats?: AdFormat[];

  @ApiPropertyOptional({
    enum: ['createdAt', 'totalBudget', 'applicationCount'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class CampaignResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: CampaignStatus })
  status: CampaignStatus;

  @ApiProperty({ enum: ChannelCategory, isArray: true })
  targetCategories: ChannelCategory[];

  @ApiProperty({ enum: AdFormat, isArray: true })
  adFormats: AdFormat[];

  @ApiProperty()
  totalBudget: string;

  @ApiPropertyOptional()
  minPricePerPost: string | null;

  @ApiPropertyOptional()
  maxPricePerPost: string | null;

  @ApiPropertyOptional()
  startDate: Date | null;

  @ApiPropertyOptional()
  endDate: Date | null;

  @ApiProperty()
  applicationCount: number;

  @ApiProperty()
  acceptedCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  publishedAt: Date | null;
}
