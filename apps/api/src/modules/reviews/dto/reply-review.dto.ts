import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class ReplyReviewDto {
  @ApiProperty({ description: 'Reply text', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  reply: string;
}
