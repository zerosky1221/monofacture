import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { TonWalletService } from '../escrow/ton-wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly tonWalletService: TonWalletService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get platform stats (admin only)' })
  async getPlatformStats() {
    return this.adminService.getPlatformStats();
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue breakdown (admin only)' })
  async getRevenueBreakdown(@Query('period') period: 'day' | 'week' | 'month') {
    return this.adminService.getRevenueBreakdown(period || 'month');
  }

  @Get('wallet-balance')
  @ApiOperation({ summary: 'Get platform wallet balance (admin only)' })
  async getPlatformWalletBalance() {
    return this.tonWalletService.getPlatformWalletBalance();
  }
}
