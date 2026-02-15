import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '@prisma/client';

export class TelegramAuthDto {
  @ApiProperty({ description: 'Telegram WebApp initData string' })
  @IsString()
  @IsNotEmpty()
  initData: string;

  @ApiPropertyOptional({ description: 'Referral code from startapp deep link (frontend fallback)' })
  @IsOptional()
  @IsString()
  referralCode?: string;
}

export class TonProofDomainDto {
  @ApiProperty()
  @IsNumber()
  lengthBytes: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  value: string;
}

export class TonProofDto {
  @ApiProperty()
  @IsNumber()
  timestamp: number;

  @ApiProperty()
  @ValidateNested()
  @Type(() => TonProofDomainDto)
  domain: TonProofDomainDto;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signature: string;

  @ApiProperty()
  @IsString()
  payload: string;

  @ApiProperty({ description: 'Wallet stateInit in base64' })
  @IsString()
  @IsNotEmpty()
  state_init: string;
}

export class TonConnectAuthDto {
  @ApiProperty({ description: 'TON wallet address' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ description: 'TON network (mainnet or testnet)' })
  @IsString()
  @IsNotEmpty()
  network: string;

  @ApiPropertyOptional({ description: 'Wallet public key (hex)' })
  @IsOptional()
  @IsString()
  public_key?: string;

  @ApiProperty({ description: 'TON Connect proof' })
  @ValidateNested()
  @Type(() => TonProofDto)
  proof: TonProofDto;

  @ApiPropertyOptional({ description: 'Linked Telegram user ID' })
  @IsOptional()
  @IsNumber()
  telegramUserId?: number;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
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

  @ApiPropertyOptional()
  tonWalletAddress: string | null;

  @ApiProperty()
  isVerified: boolean;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  expiresAt: string;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}

export interface TokenPayload {
  sub: string;
  telegramId: string;
  roles: UserRole[];
  iat?: number;
  exp?: number;
}
