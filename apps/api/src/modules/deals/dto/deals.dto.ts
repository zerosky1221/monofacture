import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsNumber,
  IsDateString,
  IsBoolean,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { AdFormat, DealStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class InlineButtonDto {
  @ApiProperty()
  @IsString()
  text: string;

  @ApiProperty()
  @IsString()
  url: string;
}

export class CreateDealDto {
  @ApiProperty({ description: 'Channel ID' })
  @IsString()
  channelId: string;

  @ApiPropertyOptional({ description: 'Campaign ID if from a campaign' })
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiProperty({ enum: AdFormat })
  @IsEnum(AdFormat)
  adFormat: AdFormat;

  @ApiPropertyOptional({ description: 'Brief for the channel owner' })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  brief?: string;

  @ApiPropertyOptional({ description: 'Specific requirements' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  requirements?: string;

  @ApiPropertyOptional({ description: 'Scheduled time for posting' })
  @IsOptional()
  @IsDateString()
  scheduledPostTime?: string;

  @ApiPropertyOptional({ description: 'Post duration in hours' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  postDuration?: number;

  @ApiPropertyOptional({ description: 'Permanent post (no auto-delete)' })
  @IsOptional()
  @IsBoolean()
  isPermanent?: boolean;

  @ApiPropertyOptional({ description: 'Hide advertiser identity from channel owner' })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}

export class UpdateDealDto {
  @ApiPropertyOptional({ description: 'Brief for the channel owner' })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  brief?: string;

  @ApiPropertyOptional({ description: 'Specific requirements' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  requirements?: string;

  @ApiPropertyOptional({ description: 'Scheduled time for posting' })
  @IsOptional()
  @IsDateString()
  scheduledPostTime?: string;
}

export class SubmitCreativeDto {
  @ApiPropertyOptional({ description: 'Post text content' })
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  text?: string;

  @ApiPropertyOptional({ description: 'Media URLs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];

  @ApiPropertyOptional({ description: 'Inline buttons', type: [[InlineButtonDto]] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InlineButtonDto)
  buttons?: InlineButtonDto[][];
}

export class RequestRevisionDto {
  @ApiProperty({ description: 'Feedback for revision' })
  @IsString()
  @MaxLength(1000)
  feedback: string;
}

export class RejectDealDto {
  @ApiPropertyOptional({ description: 'Reason for rejection' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class CancelDealDto {
  @ApiPropertyOptional({ description: 'Reason for cancellation' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ConfirmPostDto {
  @ApiPropertyOptional({ description: 'URL of the published post' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  postUrl?: string;
}

export class DealFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['advertiser', 'channel_owner'] })
  @IsOptional()
  @IsString()
  role?: 'advertiser' | 'channel_owner';

  @ApiPropertyOptional({ enum: DealStatus, isArray: true })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  status?: DealStatus | DealStatus[];

  @ApiPropertyOptional({
    enum: ['createdAt', 'updatedAt', 'scheduledPostTime', 'price'],
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

export class DealResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  referenceNumber: string;

  @ApiProperty()
  advertiserId: string;

  @ApiProperty()
  channelOwnerId: string;

  @ApiProperty()
  channelId: string;

  @ApiProperty({ enum: AdFormat })
  adFormat: AdFormat;

  @ApiProperty()
  price: string;

  @ApiProperty()
  platformFee: string;

  @ApiProperty()
  totalAmount: string;

  @ApiProperty({ enum: DealStatus })
  status: DealStatus;

  @ApiPropertyOptional()
  brief: string | null;

  @ApiPropertyOptional()
  scheduledPostTime: Date | null;

  @ApiPropertyOptional()
  postDuration: number | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
