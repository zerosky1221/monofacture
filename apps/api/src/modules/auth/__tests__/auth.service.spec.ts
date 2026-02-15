import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { RedisService } from '../../../core/redis/redis.service';
import { ReferralService } from '../../referral/referral.service';
import { AchievementsService } from '../../achievements/achievements.service';
import { LeaderboardService } from '../../achievements/leaderboard.service';
import { UserRole } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: jest.Mocked<JwtService>;
  let prismaService: jest.Mocked<PrismaService>;
  let redisService: jest.Mocked<RedisService>;

  const mockUser = {
    id: 'user-123',
    telegramId: BigInt(123456789),
    telegramUsername: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    photoUrl: null,
    roles: [UserRole.USER],
    isActive: true,
    isVerified: false,
    tonWalletAddress: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
            verify: jest.fn().mockReturnValue({ sub: 'user-123', telegramId: '123456789', roles: ['USER'] }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: RedisService,
          useValue: {
            exists: jest.fn().mockResolvedValue(false),
            set: jest.fn().mockResolvedValue('OK'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                'telegram.botToken': 'test-bot-token',
                'jwt.secret': 'test-jwt-secret',
                'jwt.expiresIn': '1d',
                'jwt.refreshSecret': 'test-refresh-secret',
                'jwt.refreshExpiresIn': '7d',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: ReferralService,
          useValue: {
            processReferral: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: AchievementsService,
          useValue: {
            checkAndAwardAll: jest.fn().mockResolvedValue({ newlyAwarded: [], totalXpGained: 0 }),
          },
        },
        {
          provide: LeaderboardService,
          useValue: {
            recalculateUserXp: jest.fn().mockResolvedValue(0),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get(JwtService);
    prismaService = module.get(PrismaService);
    redisService = module.get(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('refreshToken', () => {
    it('should generate new tokens from valid refresh token', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.refreshToken('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
    });

    it('should throw UnauthorizedException for blacklisted token', async () => {
      (redisService.exists as jest.Mock).mockResolvedValue(true);

      await expect(service.refreshToken('blacklisted-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.refreshToken('valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should blacklist the refresh token', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue({
        sub: 'user-123',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      await service.logout('valid-refresh-token');

      expect(redisService.set).toHaveBeenCalled();
    });

    it('should not throw for invalid token', async () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.logout('invalid-token')).resolves.not.toThrow();
    });
  });

  describe('validateUser', () => {
    it('should return user for valid payload', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.validateUser({
        sub: 'user-123',
        telegramId: '123456789',
        roles: ['USER'],
      });

      expect(result).toEqual(mockUser);
    });

    it('should return null for non-existent user', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.validateUser({
        sub: 'non-existent',
        telegramId: '0',
        roles: [],
      });

      expect(result).toBeNull();
    });
  });
});
