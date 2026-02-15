import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsOptional,
  IsArray,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateChannelReviewDto {
  @ApiProperty({ description: 'Deal ID' })
  @IsString()
  dealId: string;

  @ApiProperty({ description: 'Channel ID' })
  @IsString()
  channelId: string;

  @ApiProperty({ description: 'Overall rating 1-5', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  overallRating: number;

  @ApiPropertyOptional({ description: 'Audience quality rating 1-5' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  audienceQuality?: number;

  @ApiPropertyOptional({ description: 'Engagement rating 1-5' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  engagementRating?: number;

  @ApiPropertyOptional({ description: 'Reach accuracy rating 1-5' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  reachAccuracy?: number;

  @ApiPropertyOptional({ description: 'Text comment', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;

  @ApiPropertyOptional({ description: 'Quick tags', isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
