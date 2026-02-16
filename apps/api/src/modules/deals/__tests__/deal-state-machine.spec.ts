import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException } from '@nestjs/common';
import { DealStateMachine } from '../deal-state-machine';
import { PrismaService } from '../../../core/database/prisma.service';
import { DealStatus, ActorType } from '@prisma/client';

describe('DealStateMachine', () => {
  let stateMachine: DealStateMachine;
  let prismaService: jest.Mocked<PrismaService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockDeal = {
    id: 'deal-123',
    referenceNumber: 'AD-001',
    status: DealStatus.CREATED,
    previousStatus: null,
    channelId: 'channel-1',
    advertiserId: 'user-1',
    channelOwnerId: 'user-2',
    price: BigInt(1_000_000_000),
    platformFee: BigInt(50_000_000),
    totalAmount: BigInt(1_050_000_000),
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActivityAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaTransaction = jest.fn().mockImplementation(async (callback) => {
      return callback({
        deal: {
          update: jest.fn().mockResolvedValue({ ...mockDeal, status: DealStatus.PENDING_PAYMENT }),
        },
        dealTimeline: {
          create: jest.fn().mockResolvedValue({}),
        },
      });
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DealStateMachine,
        {
          provide: PrismaService,
          useValue: {
            deal: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            dealTimeline: {
              create: jest.fn(),
            },
            $transaction: mockPrismaTransaction,
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    stateMachine = module.get<DealStateMachine>(DealStateMachine);
    prismaService = module.get(PrismaService);
    eventEmitter = module.get(EventEmitter2);
  });

  it('should be defined', () => {
    expect(stateMachine).toBeDefined();
  });

  describe('canTransition', () => {
    it('should allow valid transitions', () => {

      expect(
        stateMachine.canTransition(DealStatus.CREATED, DealStatus.PENDING_PAYMENT, 'channel_owner'),
      ).toBe(true);
    });

    it('should reject invalid transitions', () => {

      expect(
        stateMachine.canTransition(DealStatus.CREATED, DealStatus.COMPLETED, 'system'),
      ).toBe(false);
    });

    it('should reject unauthorized role transitions', () => {

      expect(
        stateMachine.canTransition(DealStatus.CREATED, DealStatus.PENDING_PAYMENT, 'advertiser'),
      ).toBe(false);
    });
  });

  describe('getAllowedTransitions', () => {
    it('should return allowed transitions for role', () => {
      const transitions = stateMachine.getAllowedTransitions(DealStatus.CREATED, 'channel_owner');

      expect(transitions.length).toBeGreaterThan(0);
      expect(transitions.some(t => t.to === DealStatus.PENDING_PAYMENT)).toBe(true);
    });

    it('should return empty array for no allowed transitions', () => {
      const transitions = stateMachine.getAllowedTransitions(DealStatus.COMPLETED, 'channel_owner');

      expect(transitions).toEqual([]);
    });
  });

  describe('accept', () => {
    it('should transition deal from CREATED to PENDING_PAYMENT', async () => {
      const createdDeal = { ...mockDeal, status: DealStatus.CREATED };
      (prismaService.deal.findUnique as jest.Mock).mockResolvedValue(createdDeal);

      const result = await stateMachine.accept('deal-123', 'user-2');

      expect(result.status).toBe(DealStatus.PENDING_PAYMENT);
      expect(eventEmitter.emit).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid transition', async () => {
      const completedDeal = { ...mockDeal, status: DealStatus.COMPLETED };
      (prismaService.deal.findUnique as jest.Mock).mockResolvedValue(completedDeal);

      await expect(stateMachine.accept('deal-123', 'user-2')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('reject', () => {
    it('should transition deal to CANCELLED with reason', async () => {
      const createdDeal = { ...mockDeal, status: DealStatus.CREATED };
      (prismaService.deal.findUnique as jest.Mock).mockResolvedValue(createdDeal);

      (prismaService.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          deal: {
            update: jest.fn().mockResolvedValue({ ...mockDeal, status: DealStatus.CANCELLED }),
          },
          dealTimeline: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const result = await stateMachine.reject('deal-123', 'user-2', 'Not interested');

      expect(result.status).toBe(DealStatus.CANCELLED);
    });
  });

  describe('cancel', () => {
    it('should allow channel owner to cancel from CREATED', async () => {
      const createdDeal = { ...mockDeal, status: DealStatus.CREATED };
      (prismaService.deal.findUnique as jest.Mock).mockResolvedValue(createdDeal);

      (prismaService.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          deal: {
            update: jest.fn().mockResolvedValue({ ...mockDeal, status: DealStatus.CANCELLED }),
          },
          dealTimeline: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const result = await stateMachine.cancel('deal-123', 'user-2', 'channel_owner', 'Not interested');

      expect(result.status).toBe(DealStatus.CANCELLED);
    });

    it('should allow advertiser to cancel from PENDING_PAYMENT', async () => {
      const pendingDeal = { ...mockDeal, status: DealStatus.PENDING_PAYMENT };
      (prismaService.deal.findUnique as jest.Mock).mockResolvedValue(pendingDeal);

      (prismaService.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          deal: {
            update: jest.fn().mockResolvedValue({ ...mockDeal, status: DealStatus.CANCELLED }),
          },
          dealTimeline: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const result = await stateMachine.cancel('deal-123', 'user-1', 'advertiser', 'Changed my mind');

      expect(result.status).toBe(DealStatus.CANCELLED);
    });
  });

  describe('confirmPayment', () => {
    it('should transition to PAYMENT_RECEIVED', async () => {
      const pendingPaymentDeal = { ...mockDeal, status: DealStatus.PENDING_PAYMENT };
      (prismaService.deal.findUnique as jest.Mock).mockResolvedValue(pendingPaymentDeal);

      (prismaService.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          deal: {
            update: jest.fn().mockResolvedValue({ ...mockDeal, status: DealStatus.PAYMENT_RECEIVED }),
          },
          dealTimeline: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const result = await stateMachine.confirmPayment('deal-123', 'tx-hash-123');

      expect(result.status).toBe(DealStatus.PAYMENT_RECEIVED);
    });
  });

  describe('complete', () => {
    it('should transition to COMPLETED and emit event', async () => {
      const verifiedDeal = { ...mockDeal, status: DealStatus.VERIFIED };
      (prismaService.deal.findUnique as jest.Mock).mockResolvedValue(verifiedDeal);

      (prismaService.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          deal: {
            update: jest.fn().mockResolvedValue({ ...mockDeal, status: DealStatus.COMPLETED }),
          },
          dealTimeline: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const result = await stateMachine.complete('deal-123');

      expect(result.status).toBe(DealStatus.COMPLETED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        expect.stringContaining('deal'),
        expect.any(Object),
      );
    });
  });

  describe('transition', () => {
    it('should throw BadRequestException when deal not found', async () => {
      (prismaService.deal.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        stateMachine.transition(DealStatus.PENDING_PAYMENT, 'channel_owner', {
          dealId: 'non-existent',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create timeline entry on successful transition', async () => {
      const createdDeal = { ...mockDeal, status: DealStatus.CREATED };
      (prismaService.deal.findUnique as jest.Mock).mockResolvedValue(createdDeal);

      await stateMachine.accept('deal-123', 'user-2');

      expect(prismaService.$transaction).toHaveBeenCalled();
    });
  });
});
