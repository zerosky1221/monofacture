import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { ReferralService } from './referral.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('referral')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('referral')
export class ReferralController {
  private readonly botUsername: string;

  constructor(
    private readonly referralService: ReferralService,
    private readonly configService: ConfigService,
  ) {
    this.botUsername = this.configService.get<string>('telegram.botUsername') || 'monofacturebot';
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get referral statistics' })
  async getStats(@CurrentUser() user: User) {
    return this.referralService.getReferralStats(user.id);
  }

  @Get('code')
  @ApiOperation({ summary: 'Get or generate referral code' })
  async getCode(@CurrentUser() user: User) {
    const code = await this.referralService.getOrCreateReferralCode(user.id);
    return {
      code,
      referralLink: `https://t.me/${this.botUsername}?startapp=${code}`,
    };
  }

  @Get('my-referrals')
  @ApiOperation({ summary: 'Get list of users you referred' })
  async getMyReferrals(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.referralService.getMyReferrals(
      user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('earnings')
  @ApiOperation({ summary: 'Get paginated referral earnings' })
  async getEarnings(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.referralService.getEarnings(
      user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }
}
