import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { EscrowService } from './escrow.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../core/database/prisma.service';

@ApiTags('escrow')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('escrow')
export class EscrowController {
  constructor(
    private readonly escrowService: EscrowService,
    private readonly prisma: PrismaService,
  ) {}

  private async verifyDealParticipant(dealId: string, userId: string): Promise<void> {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      select: { advertiserId: true, channelOwnerId: true },
    });
    if (!deal || (deal.advertiserId !== userId && deal.channelOwnerId !== userId)) {
      throw new ForbiddenException('You are not a participant of this deal');
    }
  }

  @Get('deals/:dealId/payment-info')
  @ApiOperation({ summary: 'Get payment info for a deal' })
  @ApiParam({ name: 'dealId', description: 'Deal ID' })
  async getPaymentInfo(
    @Param('dealId') dealId: string,
    @CurrentUser() user: User,
  ) {
    await this.verifyDealParticipant(dealId, user.id);
    return this.escrowService.getPaymentInfo(dealId);
  }

  @Get('deals/:dealId')
  @ApiOperation({ summary: 'Get escrow details for a deal' })
  @ApiParam({ name: 'dealId', description: 'Deal ID' })
  async getEscrowByDeal(
    @Param('dealId') dealId: string,
    @CurrentUser() user: User,
  ) {
    await this.verifyDealParticipant(dealId, user.id);
    return this.escrowService.getEscrowByDealId(dealId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get my transaction history' })
  async getMyTransactions(
    @CurrentUser() user: User,
    @Query() pagination: PaginationDto,
  ) {
    return this.escrowService.getUserTransactions(
      user.id,
      pagination.page,
      pagination.limit,
    );
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('deals/:dealId/confirm')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually confirm payment (admin)' })
  @ApiParam({ name: 'dealId', description: 'Deal ID' })
  async confirmPayment(@Param('dealId') dealId: string) {
    const escrow = await this.escrowService.getEscrowByDealId(dealId);
    if (!escrow) {
      return { success: false, message: 'Escrow not found' };
    }

    const txHash = `manual_${Date.now().toString(16)}`;
    await this.escrowService.confirmPayment(escrow.id, txHash);
    return { success: true, message: 'Payment confirmed' };
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('deals/:dealId/release')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually release funds (admin)' })
  @ApiParam({ name: 'dealId', description: 'Deal ID' })
  async releaseFunds(@Param('dealId') dealId: string) {
    await this.escrowService.releaseFunds(dealId);
    return { success: true, message: 'Funds released' };
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('deals/:dealId/refund')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually refund funds (admin)' })
  @ApiParam({ name: 'dealId', description: 'Deal ID' })
  async refundFunds(@Param('dealId') dealId: string) {
    await this.escrowService.refundAdvertiser(dealId, 'Admin refund');
    return { success: true, message: 'Funds refunded' };
  }
}
