import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { TonWalletService } from '../escrow/ton-wallet.service';
import {
  BalanceTransactionType,
  WithdrawalStatus,
  Prisma,
} from '@prisma/client';

const MIN_WITHDRAWAL = BigInt(1_000_000_000);

const WITHDRAWAL_FEE = BigInt(50_000_000);

const PLATFORM_FEE_RATE = 0.05;

const REFERRAL_RATE = 0.20;

@Injectable()
export class BalanceService {
  private readonly logger = new Logger(BalanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tonWalletService: TonWalletService,
  ) {}

  async getOrCreateBalance(userId: string) {
    let balance = await this.prisma.userBalance.findUnique({
      where: { userId },
    });

    if (!balance) {
      balance = await this.prisma.userBalance.create({
        data: { userId },
      });
    }

    return balance;
  }

  async getBalanceWithHistory(userId: string, limit = 20) {
    const balance = await this.getOrCreateBalance(userId);

    const transactions = await this.prisma.balanceTransaction.findMany({
      where: { balanceId: balance.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const pendingWithdrawals = await this.prisma.withdrawal.findMany({
      where: {
        userId,
        status: { in: [WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING] },
      },
    });

    return {
      ...balance,

      available: balance.available.toString(),
      pending: balance.pending.toString(),
      totalEarned: balance.totalEarned.toString(),
      totalWithdrawn: balance.totalWithdrawn.toString(),
      totalReferral: balance.totalReferral.toString(),
      transactions: transactions.map(t => ({
        ...t,
        amount: t.amount.toString(),
      })),
      pendingWithdrawals: pendingWithdrawals.map(w => ({
        ...w,
        amount: w.amount.toString(),
        fee: w.fee.toString(),
        netAmount: w.netAmount.toString(),
      })),
    };
  }

  async creditDealEarning(
    publisherId: string,
    dealId: string,
    publisherAmount: bigint,
    platformFee: bigint,
    advertiserId?: string,
  ): Promise<void> {
    const balance = await this.getOrCreateBalance(publisherId);

    await this.prisma.$transaction(async (prisma) => {

      await prisma.userBalance.update({
        where: { id: balance.id },
        data: {
          available: { increment: publisherAmount },
          totalEarned: { increment: publisherAmount },
        },
      });

      await prisma.balanceTransaction.create({
        data: {
          balanceId: balance.id,
          type: BalanceTransactionType.DEAL_EARNING,
          amount: publisherAmount,
          description: `Earned from deal`,
          dealId,
        },
      });
    });

    this.logger.log(`Credited ${publisherAmount} to publisher ${publisherId} for deal ${dealId}`);

    await this.processReferralEarnings(publisherId, advertiserId, dealId, platformFee);
  }

  async processReferralEarnings(
    publisherId: string,
    advertiserId: string | undefined,
    dealId: string,
    platformFee: bigint,
  ): Promise<void> {

    const [publisherReferral, advertiserReferral] = await Promise.all([
      this.prisma.referral.findUnique({ where: { referredUserId: publisherId } }),
      advertiserId
        ? this.prisma.referral.findUnique({ where: { referredUserId: advertiserId } })
        : null,
    ]);

    const activeReferrals = [
      publisherReferral?.isActive ? publisherReferral : null,
      advertiserReferral?.isActive ? advertiserReferral : null,
    ].filter(Boolean);

    if (activeReferrals.length === 0) return;

    const referralRate = activeReferrals.length === 1 ? REFERRAL_RATE : REFERRAL_RATE / 2;

    for (const referral of activeReferrals) {
      if (!referral) continue;

      const referralEarning = BigInt(Math.floor(Number(platformFee) * referralRate));
      if (referralEarning <= 0n) continue;

      const referrerBalance = await this.getOrCreateBalance(referral.referrerId);
      const isPublisher = referral.referredUserId === publisherId;

      await this.prisma.$transaction(async (prisma) => {
        await prisma.userBalance.update({
          where: { id: referrerBalance.id },
          data: {
            available: { increment: referralEarning },
            totalEarned: { increment: referralEarning },
            totalReferral: { increment: referralEarning },
          },
        });

        await prisma.balanceTransaction.create({
          data: {
            balanceId: referrerBalance.id,
            type: BalanceTransactionType.REFERRAL_EARNING,
            amount: referralEarning,
            description: `Referral commission (${isPublisher ? 'publisher' : 'advertiser'})`,
            dealId,
            referralId: referral.id,
          },
        });

        await prisma.referralEarning.create({
          data: {
            referralId: referral.id,
            dealId,
            dealAmount: platformFee / BigInt(Math.floor(PLATFORM_FEE_RATE * 100)) * 100n,
            platformFee,
            earning: referralEarning,
          },
        });

        await prisma.referral.update({
          where: { id: referral.id },
          data: {
            totalEarned: { increment: referralEarning },
            dealCount: { increment: 1 },
          },
        });
      });

      this.logger.log(
        `Referral earning: ${referralEarning} credited to ${referral.referrerId} ` +
        `from ${isPublisher ? 'publisher' : 'advertiser'} ${referral.referredUserId} in deal ${dealId}`,
      );
    }
  }

  async requestWithdrawal(userId: string, amount: bigint, toAddress: string) {

    if (!this.tonWalletService.isValidAddress(toAddress)) {
      throw new BadRequestException('Invalid TON wallet address');
    }

    if (amount < MIN_WITHDRAWAL) {
      throw new BadRequestException(
        `Minimum withdrawal is ${this.tonWalletService.formatTon(MIN_WITHDRAWAL)} TON`,
      );
    }

    const balance = await this.getOrCreateBalance(userId);

    if (balance.available < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const netAmount = amount - WITHDRAWAL_FEE;
    if (netAmount <= 0n) {
      throw new BadRequestException('Amount too small after fee deduction');
    }

    const pendingCount = await this.prisma.withdrawal.count({
      where: {
        userId,
        status: { in: [WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING] },
      },
    });

    if (pendingCount > 0) {
      throw new BadRequestException('You have a pending withdrawal. Please wait for it to complete.');
    }

    const withdrawal = await this.prisma.$transaction(async (prisma) => {

      const updated = await prisma.userBalance.updateMany({
        where: { id: balance.id, available: { gte: amount } },
        data: { available: { decrement: amount } },
      });

      if (updated.count === 0) {
        throw new BadRequestException('Insufficient balance');
      }

      await prisma.balanceTransaction.create({
        data: {
          balanceId: balance.id,
          type: BalanceTransactionType.WITHDRAWAL,
          amount: -amount,
          description: `Withdrawal to ${toAddress.slice(0, 8)}...${toAddress.slice(-4)}`,
        },
      });

      return prisma.withdrawal.create({
        data: {
          userId,
          balanceId: balance.id,
          amount,
          fee: WITHDRAWAL_FEE,
          netAmount,
          toAddress: this.tonWalletService.normalizeAddress(toAddress),
          status: WithdrawalStatus.PENDING,
        },
      });
    });

    this.logger.log(`Withdrawal requested: ${amount} by user ${userId} to ${toAddress}`);

    this.processWithdrawal(withdrawal.id).catch((err) => {
      this.logger.error(`Withdrawal processing failed: ${err.message}`);
    });

    return {
      ...withdrawal,
      amount: withdrawal.amount.toString(),
      fee: withdrawal.fee.toString(),
      netAmount: withdrawal.netAmount.toString(),
    };
  }

  private async processWithdrawal(withdrawalId: string): Promise<void> {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal || withdrawal.status !== WithdrawalStatus.PENDING) return;

    await this.prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: WithdrawalStatus.PROCESSING },
    });

    try {

      const result = await this.tonWalletService.sendFromPlatformWallet(
        withdrawal.toAddress,
        withdrawal.netAmount,
        `Monofacture withdrawal`,
      );

      await this.prisma.$transaction(async (prisma) => {
        await prisma.withdrawal.update({
          where: { id: withdrawalId },
          data: {
            status: WithdrawalStatus.COMPLETED,
            txHash: result.hash,
            processedAt: new Date(),
          },
        });

        await prisma.userBalance.update({
          where: { id: withdrawal.balanceId },
          data: {
            totalWithdrawn: { increment: withdrawal.amount },
          },
        });
      });

      this.logger.log(`Withdrawal ${withdrawalId} completed: tx ${result.hash}`);
    } catch (error) {

      await this.prisma.$transaction(async (prisma) => {
        await prisma.withdrawal.update({
          where: { id: withdrawalId },
          data: {
            status: WithdrawalStatus.FAILED,
            errorMessage: (error as Error).message,
          },
        });

        await prisma.userBalance.update({
          where: { id: withdrawal.balanceId },
          data: {
            available: { increment: withdrawal.amount },
          },
        });

        await prisma.balanceTransaction.create({
          data: {
            balanceId: withdrawal.balanceId,
            type: BalanceTransactionType.REFUND_CREDIT,
            amount: withdrawal.amount,
            description: `Withdrawal failed - balance restored`,
            withdrawalId,
          },
        });
      });

      this.logger.error(`Withdrawal ${withdrawalId} failed: ${(error as Error).message}`);
      throw error;
    }
  }

  async getWithdrawals(userId: string, page = 1, limit = 20) {
    const [items, total] = await Promise.all([
      this.prisma.withdrawal.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.withdrawal.count({ where: { userId } }),
    ]);

    return {
      items: items.map(w => ({
        ...w,
        amount: w.amount.toString(),
        fee: w.fee.toString(),
        netAmount: w.netAmount.toString(),
      })),
      total,
      page,
      limit,
    };
  }

  async getTransactions(userId: string, page = 1, limit = 20, type?: string) {
    const balance = await this.getOrCreateBalance(userId);

    const where: any = { balanceId: balance.id };

    if (type && type !== 'all') {
      const typeMap: Record<string, BalanceTransactionType[]> = {
        earnings: [BalanceTransactionType.DEAL_EARNING],
        withdrawals: [BalanceTransactionType.WITHDRAWAL],
        referral: [BalanceTransactionType.REFERRAL_EARNING],
        refunds: [BalanceTransactionType.REFUND_CREDIT],
      };

      if (typeMap[type]) {
        where.type = { in: typeMap[type] };
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.balanceTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          deal: {
            select: {
              id: true,
              referenceNumber: true,
            },
          },
        },
      }),
      this.prisma.balanceTransaction.count({ where }),
    ]);

    return {
      items: items.map(t => ({
        ...t,
        amount: t.amount.toString(),
      })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }
}
