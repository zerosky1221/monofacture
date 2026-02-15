import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../core/database/prisma.service';
import { TonWalletService } from './ton-wallet.service';
import { BalanceService } from '../balance/balance.service';
import { DealStateMachine } from '../deals/deal-state-machine';
import {
  Escrow,
  EscrowStatus,
  Transaction,
  TransactionType,
  TransactionStatus,
} from '@prisma/client';
import { EVENTS, QUEUES } from '@telegram-ads/shared';

const PLATFORM_FEE_RATE = 0.05;

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tonWalletService: TonWalletService,
    @Inject(forwardRef(() => BalanceService))
    private readonly balanceService: BalanceService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => DealStateMachine))
    private readonly dealStateMachine: DealStateMachine,
    @InjectQueue(QUEUES.ESCROW_MONITOR) private readonly monitorQueue: Queue,
  ) {}

  async createEscrow(dealId: string): Promise<Escrow> {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        advertiser: true,
        channelOwner: true,
      },
    });

    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    if (!deal.advertiser.tonWalletAddress) {
      throw new BadRequestException('Advertiser has no connected TON wallet');
    }


    const publisherWallet = deal.channelOwner.tonWalletAddress || this.tonWalletService.getPlatformWalletAddress();

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 24 * 60 * 60);

    const publisherAmount = deal.totalAmount - deal.platformFee;

    const dealIdNumeric = this.tonWalletService.dealIdToHash(dealId);

    let escrowWalletAddress: string;
    let deployed = false;
    try {
      const result = await this.tonWalletService.deployEscrowContract({
        dealId: dealIdNumeric,
        advertiserAddress: deal.advertiser.tonWalletAddress,
        publisherAddress: publisherWallet,
        totalAmount: deal.totalAmount,
        publisherAmount,
        deadline,
      });
      escrowWalletAddress = result.contractAddress;
      deployed = result.deployed;
    } catch (deployError) {

      this.logger.warn(`Contract deploy failed, using computed address: ${(deployError as Error).message}`);
      escrowWalletAddress = await this.tonWalletService.computeEscrowAddress({
        dealId: dealIdNumeric,
        advertiserAddress: deal.advertiser.tonWalletAddress,
        publisherAddress: publisherWallet,
        totalAmount: deal.totalAmount,
        publisherAmount,
        deadline,
      });
    }

    const escrow = await this.prisma.escrow.create({
      data: {
        dealId,
        escrowWalletAddress,
        advertiserWallet: deal.advertiser.tonWalletAddress,
        channelOwnerWallet: publisherWallet,
        platformWallet: this.tonWalletService.getPlatformWalletAddress(),
        amount: publisherAmount,
        platformFee: deal.platformFee,
        totalAmount: deal.totalAmount,
        status: EscrowStatus.PENDING,
        expiresAt: new Date(Number(deadline) * 1000),

        metadata: {
          dealIdHash: dealIdNumeric.toString(),
          deadline: deadline.toString(),
          publisherAmount: publisherAmount.toString(),
          contractType: 'TOLK_ESCROW_V4',
        },
      },
    });

    this.eventEmitter.emit(EVENTS.ESCROW_CREATED, {
      escrowId: escrow.id,
      dealId,
    });

    await this.monitorQueue.add(
      'monitor-payment',
      { escrowId: escrow.id, dealId },
      {
        delay: 10000,
        removeOnComplete: true,
      },
    );

    this.logger.log(`Escrow created for deal ${dealId}: ${escrowWalletAddress} (Tolk v4.0)`);

    return escrow;
  }

  async getEscrowByDealId(dealId: string): Promise<Escrow | null> {
    return this.prisma.escrow.findUnique({
      where: { dealId },
    });
  }

  async getPaymentInfo(dealId: string): Promise<{
    address: string;
    amount: string;
    amountFormatted: string;
    paymentLink: string;
    qrData: string;
    expiresAt: Date;
  }> {
    let escrow = await this.getEscrowByDealId(dealId);

    if (escrow && escrow.status === EscrowStatus.CANCELLED) {
      this.logger.log(`Found CANCELLED escrow for deal ${dealId}, deleting and creating new FunC escrow...`);
      await this.prisma.escrow.delete({ where: { id: escrow.id } });
      escrow = null;
    }

    if (!escrow) {
      this.logger.log(`Escrow not found for deal ${dealId}, creating on demand...`);
      try {
        escrow = await this.createEscrow(dealId);
      } catch (error) {
        this.logger.error(`Failed to create escrow on demand: ${(error as Error).message}`);
        throw new NotFoundException(`Escrow not found and could not be created: ${(error as Error).message}`);
      }
    }

    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
    });

    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    const paymentLink = this.tonWalletService.generatePaymentLink(
      escrow.escrowWalletAddress,
      escrow.totalAmount,
      `Payment for deal ${deal.referenceNumber}`,
    );

    return {
      address: escrow.escrowWalletAddress,
      amount: escrow.totalAmount.toString(),
      amountFormatted: this.tonWalletService.formatTon(escrow.totalAmount),
      paymentLink,
      qrData: paymentLink,
      expiresAt: escrow.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }

  async confirmPayment(escrowId: string, txHash: string): Promise<Escrow> {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
    });

    if (!escrow) {
      throw new NotFoundException('Escrow not found');
    }

    if (escrow.status !== EscrowStatus.PENDING) {
      throw new BadRequestException('Escrow is not in pending state');
    }

    const updatedEscrow = await this.prisma.escrow.update({
      where: { id: escrowId },
      data: {
        status: EscrowStatus.FUNDED,
        fundingTxHash: txHash,
        fundedAt: new Date(),
      },
    });

    await this.prisma.transaction.create({
      data: {
        escrowId,
        type: TransactionType.ESCROW_LOCK,
        status: TransactionStatus.CONFIRMED,
        amount: escrow.totalAmount,
        currency: 'TON',
        fromAddress: escrow.advertiserWallet,
        toAddress: escrow.escrowWalletAddress,
        txHash,
        confirmedAt: new Date(),
        description: `Escrow funded for deal`,
      },
    });

    await this.dealStateMachine.confirmPayment(escrow.dealId, txHash);

    await this.dealStateMachine.start(escrow.dealId);

    this.eventEmitter.emit(EVENTS.ESCROW_FUNDED, {
      escrowId,
      dealId: escrow.dealId,
      txHash,
    });

    this.logger.log(`Escrow ${escrowId} funded with tx ${txHash}`);

    return updatedEscrow;
  }

  async releaseFunds(dealId: string): Promise<Escrow> {
    const escrow = await this.getEscrowByDealId(dealId);

    if (!escrow) {
      throw new NotFoundException('Escrow not found');
    }

    if (escrow.status !== EscrowStatus.FUNDED && escrow.status !== EscrowStatus.LOCKED) {
      throw new BadRequestException('Escrow is not in funded/locked state');
    }

    await this.prisma.escrow.update({
      where: { id: escrow.id },
      data: { status: EscrowStatus.RELEASING },
    });

    try {

      const { hash: releaseHash } = await this.tonWalletService.sendReleaseMessage(
        escrow.escrowWalletAddress,
      );

      const publisherAmount = escrow.amount;
      const platformFee = escrow.platformFee;

      const updatedEscrow = await this.prisma.escrow.update({
        where: { id: escrow.id },
        data: {
          status: EscrowStatus.RELEASED,
          releaseTxHash: releaseHash,
          releasedAt: new Date(),
        },
      });

      await this.prisma.transaction.create({
        data: {
          escrowId: escrow.id,
          type: TransactionType.PAYOUT,
          status: TransactionStatus.CONFIRMED,
          amount: escrow.totalAmount,
          currency: 'TON',
          fromAddress: escrow.escrowWalletAddress,
          toAddress: escrow.platformWallet,
          txHash: releaseHash,
          confirmedAt: new Date(),
          description: 'Escrow released to platform',
        },
      });

      const deal = await this.prisma.deal.findUnique({
        where: { id: dealId },
      });

      if (deal) {

        await this.balanceService.creditDealEarning(
          deal.channelOwnerId,
          dealId,
          publisherAmount,
          platformFee,
          deal.advertiserId,
        );

        this.logger.log(`Credited ${publisherAmount} to publisher ${deal.channelOwnerId} balance`);

        await this.dealStateMachine.complete(dealId);

        await this.prisma.user.update({
          where: { id: deal.channelOwnerId },
          data: {
            totalEarned: { increment: publisherAmount },
            totalDeals: { increment: 1 },
            successfulDeals: { increment: 1 },
          },
        });

        await this.prisma.user.update({
          where: { id: deal.advertiserId },
          data: {
            totalSpent: { increment: escrow.totalAmount },
            totalDeals: { increment: 1 },
            successfulDeals: { increment: 1 },
          },
        });

        await this.prisma.channel.update({
          where: { id: deal.channelId },
          data: {
            totalDeals: { increment: 1 },
            successfulDeals: { increment: 1 },
            totalEarnings: { increment: publisherAmount },
          },
        });
      }

      this.eventEmitter.emit(EVENTS.ESCROW_RELEASED, {
        escrowId: escrow.id,
        dealId,
        txHash: releaseHash,
        publisherAmount: publisherAmount.toString(),
        platformFee: platformFee.toString(),
      });

      this.logger.log(`Escrow ${escrow.id} released via Tolk contract`);

      return updatedEscrow;
    } catch (error) {

      await this.prisma.escrow.update({
        where: { id: escrow.id },
        data: { status: EscrowStatus.FUNDED },
      });
      throw error;
    }
  }

  async refundAdvertiser(dealId: string, reason?: string): Promise<Escrow> {
    const escrow = await this.getEscrowByDealId(dealId);

    if (!escrow) {
      throw new NotFoundException('Escrow not found');
    }

    if (escrow.status !== EscrowStatus.FUNDED && escrow.status !== EscrowStatus.LOCKED) {
      throw new BadRequestException('Escrow is not in funded/locked state');
    }

    await this.prisma.escrow.update({
      where: { id: escrow.id },
      data: { status: EscrowStatus.REFUNDING },
    });

    try {

      const { hash: refundHash } = await this.tonWalletService.sendRefundMessage(
        escrow.escrowWalletAddress,
      );

      const updatedEscrow = await this.prisma.escrow.update({
        where: { id: escrow.id },
        data: {
          status: EscrowStatus.REFUNDED,
          refundTxHash: refundHash,
          refundedAt: new Date(),
        },
      });

      await this.prisma.transaction.create({
        data: {
          escrowId: escrow.id,
          type: TransactionType.ESCROW_REFUND,
          status: TransactionStatus.CONFIRMED,
          amount: escrow.totalAmount,
          currency: 'TON',
          fromAddress: escrow.escrowWalletAddress,
          toAddress: escrow.advertiserWallet,
          txHash: refundHash,
          confirmedAt: new Date(),
          description: reason || 'Refund via smart contract',
        },
      });

      this.eventEmitter.emit(EVENTS.ESCROW_REFUNDED, {
        escrowId: escrow.id,
        dealId,
        txHash: refundHash,
        reason,
      });

      this.logger.log(`Escrow ${escrow.id} refunded via Tolk contract`);

      return updatedEscrow;
    } catch (error) {

      await this.prisma.escrow.update({
        where: { id: escrow.id },
        data: { status: EscrowStatus.FUNDED },
      });
      throw error;
    }
  }

  async checkPayment(escrowId: string): Promise<boolean> {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
    });

    if (!escrow || escrow.status !== EscrowStatus.PENDING) {
      return false;
    }

    const paymentCheck = await this.tonWalletService.checkPaymentReceived(
      escrow.escrowWalletAddress,
      escrow.totalAmount,
      Math.floor(escrow.createdAt.getTime() / 1000) - 60,
    );

    if (paymentCheck.received) {
      const txHash = paymentCheck.txHash || `tx_${Date.now().toString(16)}`;
      await this.confirmPayment(escrowId, txHash);
      return true;
    }

    return false;
  }

  async getUserTransactions(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ items: Transaction[]; total: number }> {
    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transaction.count({ where: { userId } }),
    ]);

    return { items, total };
  }
}
