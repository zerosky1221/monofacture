import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ description: 'Message content', maxLength: 5000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;
}
