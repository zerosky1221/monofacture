import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { TelegramAuthDto, TonConnectAuthDto, RefreshTokenDto, AuthResponseDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('telegram')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate with Telegram WebApp' })
  @ApiResponse({ status: 200, description: 'Authentication successful', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid authentication data' })
  async authenticateWithTelegram(@Body() dto: TelegramAuthDto): Promise<AuthResponseDto> {
    return this.authService.authenticateWithTelegram(dto);
  }

  @Public()
  @Post('ton-connect')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate with TON Connect' })
  @ApiResponse({ status: 200, description: 'Authentication successful', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid TON Connect proof' })
  async authenticateWithTonConnect(@Body() dto: TonConnectAuthDto): Promise<AuthResponseDto> {
    return this.authService.authenticateWithTonConnect(dto);
  }

  @Public()
  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiResponse({ status: 204, description: 'Logout successful' })
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }
}
