import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { BalanceService } from './balance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsString, IsNotEmpty, Matches, MaxLength } from 'class-validator';

class WithdrawDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/, { message: 'Amount must be a numeric string (nanoTON)' })
  amount: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(68)
  @Matches(/^(EQ|UQ|0:)[a-zA-Z0-9_\-+/]{32,66}$/, {
    message: 'Invalid TON wallet address format',
  })
  toAddress: string;
}

@ApiTags('balance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('balance')
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  @Get()
  @ApiOperation({ summary: 'Get my balance and recent transactions' })
  async getBalance(@CurrentUser() user: User) {
    return this.balanceService.getBalanceWithHistory(user.id);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request withdrawal to TON wallet' })
  async withdraw(@CurrentUser() user: User, @Body() dto: WithdrawDto) {
    const amount = BigInt(dto.amount);
    return this.balanceService.requestWithdrawal(user.id, amount, dto.toAddress);
  }

  @Get('withdrawals')
  @ApiOperation({ summary: 'Get withdrawal history' })
  async getWithdrawals(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.balanceService.getWithdrawals(
      user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get paginated transaction history' })
  async getTransactions(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
  ) {
    return this.balanceService.getTransactions(
      user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      type,
    );
  }
}
