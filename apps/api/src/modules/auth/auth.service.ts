import { Injectable, UnauthorizedException, Logger, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { sha256 } from '@ton/crypto';
import { Address, Cell, contractAddress, loadStateInit } from '@ton/ton';
import { sign } from 'tweetnacl';
import { PrismaService } from '../../core/database/prisma.service';
import { RedisService } from '../../core/redis/redis.service';
import { ReferralService } from '../referral/referral.service';
import { AchievementsService } from '../achievements/achievements.service';
import { LeaderboardService } from '../achievements/leaderboard.service';
import { User, UserRole } from '@prisma/client';
import { TelegramAuthDto, TonConnectAuthDto, AuthResponseDto, TokenPayload } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly botToken: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => ReferralService))
    private readonly referralService: ReferralService,
    @Inject(forwardRef(() => AchievementsService))
    private readonly achievementsService: AchievementsService,
    @Inject(forwardRef(() => LeaderboardService))
    private readonly leaderboardService: LeaderboardService,
  ) {
    this.botToken = this.configService.get<string>('telegram.botToken') || '';
  }

  async authenticateWithTelegram(dto: TelegramAuthDto): Promise<AuthResponseDto> {
    this.logger.log('=== AUTH START ===');
    this.logger.log(`Raw initData length: ${dto.initData?.length}`);
    this.logger.log(`referralCode from dto: ${dto.referralCode || '(none)'}`);

    const isValid = this.validateTelegramInitData(dto.initData);
    if (!isValid) {
      this.logger.warn('=== AUTH FAILED: invalid initData ===');
      throw new UnauthorizedException('Invalid Telegram authentication data');
    }

    const initDataParams = new URLSearchParams(dto.initData);
    const userDataString = initDataParams.get('user');

    this.logger.log('All initData params:');
    initDataParams.forEach((value, key) => {
      if (key === 'hash') {
        this.logger.log(`  ${key}: ${value.substring(0, 10)}...`);
      } else if (key === 'user') {
        this.logger.log(`  ${key}: ${value.substring(0, 80)}...`);
      } else {
        this.logger.log(`  ${key}: ${value}`);
      }
    });

    if (!userDataString) {
      this.logger.warn('=== AUTH FAILED: no user in initData ===');
      throw new UnauthorizedException('User data not found in initData');
    }

    const userData = JSON.parse(userDataString) as {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
      is_premium?: boolean;
      photo_url?: string;
    };

    this.logger.log(`Telegram user: id=${userData.id}, name=${userData.first_name}, username=${userData.username || '(none)'}`);

    const startParam = initDataParams.get('start_param');
    this.logger.log(`start_param from initData: ${startParam || '(none)'}`);

    let referralCode: string | undefined;
    if (startParam && startParam.startsWith('ref_')) {
      referralCode = startParam;
      this.logger.log(`Using referral code from initData start_param: ${referralCode}`);
    } else if (dto.referralCode && dto.referralCode.startsWith('ref_')) {
      referralCode = dto.referralCode;
      this.logger.log(`Using referral code from DTO fallback: ${referralCode}`);
    } else {
      this.logger.log('No referral code found in start_param or DTO');
    }

    let user = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(userData.id) },
    });

    const isNewUser = !user;
    this.logger.log(`User lookup: isNewUser=${isNewUser}, existingUserId=${user?.id || '(none)'}`);

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          telegramId: BigInt(userData.id),
          telegramUsername: userData.username,
          firstName: userData.first_name,
          lastName: userData.last_name,
          photoUrl: userData.photo_url,
          languageCode: userData.language_code || 'en',
          isPremium: userData.is_premium || false,
          roles: [UserRole.USER],
        },
      });
      this.logger.log(`New user created: ${user.id}`);
    } else {

      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          telegramUsername: userData.username,
          firstName: userData.first_name,
          lastName: userData.last_name,
          photoUrl: userData.photo_url,
          isPremium: userData.is_premium || false,
          lastActiveAt: new Date(),
        },
      });
    }

    this.logger.log(`Referral decision: isNewUser=${isNewUser}, referralCode=${referralCode || '(none)'}`);
    if (isNewUser && referralCode) {
      this.logger.log(`Attempting to apply referral: ${referralCode} for user ${user.id}`);
      try {
        const applied = await this.referralService.applyReferralCode(user.id, referralCode);
        this.logger.log(`Referral apply result: ${applied}`);
        if (applied) {
          this.logger.log(`Referral ${referralCode} applied successfully for user ${user.id} via Mini App auth`);
        } else {
          this.logger.warn(`Referral ${referralCode} was NOT applied (returned false) for user ${user.id}`);
        }
      } catch (error) {
        this.logger.error(`Referral error for user ${user.id}: ${error}`);
      }
    } else if (!isNewUser) {
      this.logger.log(`Skipping referral: existing user ${user.id}`);
    } else {
      this.logger.log('Skipping referral: no code provided');
    }

    this.logger.log(`=== AUTH END === userId=${user.id}`);

    setTimeout(async () => {
      try {
        await this.leaderboardService.recalculateUserXp(user.id);
        await this.achievementsService.checkAndAwardAll(user.id);
      } catch (err) {
        this.logger.error(`Achievement/XP sync failed for user ${user.id}`, err);
      }
    }, 1000);

    return this.generateTokens(user);
  }

  async authenticateWithTonConnect(dto: TonConnectAuthDto): Promise<AuthResponseDto> {

    const isValid = await this.verifyTonProof(dto);
    if (!isValid) {
      throw new UnauthorizedException('Invalid TON Connect proof');
    }

    let user = await this.prisma.user.findFirst({
      where: { tonWalletAddress: dto.address },
    });

    if (!user) {

      if (dto.telegramUserId) {
        user = await this.prisma.user.findUnique({
          where: { telegramId: BigInt(dto.telegramUserId) },
        });

        if (user) {

          user = await this.prisma.user.update({
            where: { id: user.id },
            data: {
              tonWalletAddress: dto.address,
              tonWalletConnectedAt: new Date(),
            },
          });
        }
      }

      if (!user) {
        throw new UnauthorizedException('No user found for this wallet. Please authenticate with Telegram first.');
      }
    }

    return this.generateTokens(user);
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify<TokenPayload>(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      const isBlacklisted = await this.redisService.exists(`blacklist:${refreshToken}`);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const ttl = (payload.exp ?? 0) - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await this.redisService.set(`blacklist:${refreshToken}`, '1', ttl);
      }

      return this.generateTokens(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = this.jwtService.verify<TokenPayload>(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      const ttl = (payload.exp ?? 0) - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await this.redisService.set(`blacklist:${refreshToken}`, '1', ttl);
      }
    } catch {

    }
  }

  private validateTelegramInitData(initData: string): boolean {
    try {
      const params = new URLSearchParams(initData);
      const hash = params.get('hash');
      params.delete('hash');

      const sortedParams = Array.from(params.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(this.botToken)
        .digest();

      const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(sortedParams)
        .digest('hex');

      if (hash !== calculatedHash) {
        this.logger.warn('Telegram initData hash mismatch');
        return false;
      }

      const authDate = parseInt(params.get('auth_date') || '0', 10);
      const now = Math.floor(Date.now() / 1000);
      if (now - authDate > 86400) {
        this.logger.warn('Telegram initData expired');
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to validate Telegram initData:', error);
      return false;
    }
  }

  private static readonly TON_PROOF_PREFIX = 'ton-proof-item-v2/';
  private static readonly TON_CONNECT_PREFIX = 'ton-connect';
  private static readonly PROOF_VALID_SECONDS = 300;

  private async verifyTonProof(dto: TonConnectAuthDto): Promise<boolean> {
    try {
      if (!dto.address || !dto.proof || !dto.proof.state_init) {
        this.logger.warn('TON proof missing required fields');
        return false;
      }

      const stateInit = loadStateInit(
        Cell.fromBase64(dto.proof.state_init).beginParse(),
      );

      const publicKey = this.extractPublicKeyFromStateInit(stateInit);
      if (!publicKey) {
        this.logger.warn(`TON proof: could not extract public key from stateInit for ${dto.address}`);
        return false;
      }

      if (dto.public_key) {
        const wantedPublicKey = Buffer.from(dto.public_key, 'hex');
        if (!publicKey.equals(wantedPublicKey)) {
          this.logger.warn(`TON proof: public key mismatch for ${dto.address}`);
          return false;
        }
      }

      const wantedAddress = Address.parse(dto.address);
      const derivedAddress = contractAddress(wantedAddress.workChain, stateInit);
      if (!derivedAddress.equals(wantedAddress)) {
        this.logger.warn(`TON proof: address mismatch. Expected ${wantedAddress.toString()}, got ${derivedAddress.toString()}`);
        return false;
      }

      const webappUrl = this.configService.get<string>('webappUrl') || '';
      const allowedDomains = [
        new URL(webappUrl || 'http://localhost').hostname,
        'localhost',
      ].filter(Boolean);

      if (!allowedDomains.includes(dto.proof.domain.value)) {
        this.logger.warn(`TON proof: domain "${dto.proof.domain.value}" not in allowlist: [${allowedDomains.join(', ')}]`);
        return false;
      }

      const now = Math.floor(Date.now() / 1000);
      if (now - dto.proof.timestamp > AuthService.PROOF_VALID_SECONDS) {
        this.logger.warn(`TON proof expired: age=${now - dto.proof.timestamp}s, max=${AuthService.PROOF_VALID_SECONDS}s`);
        return false;
      }

      const wc = Buffer.alloc(4);
      wc.writeUInt32BE(wantedAddress.workChain, 0);

      const ts = Buffer.alloc(8);
      ts.writeBigUInt64LE(BigInt(dto.proof.timestamp), 0);

      const dl = Buffer.alloc(4);
      dl.writeUInt32LE(dto.proof.domain.lengthBytes, 0);

      const msg = Buffer.concat([
        Buffer.from(AuthService.TON_PROOF_PREFIX),
        wc,
        wantedAddress.hash,
        dl,
        Buffer.from(dto.proof.domain.value),
        ts,
        Buffer.from(dto.proof.payload),
      ]);

      const msgHash = Buffer.from(await sha256(msg));

      const fullMsg = Buffer.concat([
        Buffer.from([0xff, 0xff]),
        Buffer.from(AuthService.TON_CONNECT_PREFIX),
        msgHash,
      ]);

      const result = Buffer.from(await sha256(fullMsg));

      const signature = Buffer.from(dto.proof.signature, 'base64');
      const isValid = sign.detached.verify(
        new Uint8Array(result),
        new Uint8Array(signature),
        new Uint8Array(publicKey),
      );

      if (!isValid) {
        this.logger.warn(`TON proof: signature verification failed for ${dto.address}`);
      }

      return isValid;
    } catch (error) {
      this.logger.error(`TON proof verification failed for ${dto.address}: ${(error as Error).message}`);
      return false;
    }
  }

  private extractPublicKeyFromStateInit(stateInit: { code?: Cell | null; data?: Cell | null }): Buffer | null {
    try {
      if (!stateInit.data) return null;

      const ds = stateInit.data.beginParse();

      if (ds.remainingBits >= 320) {

        ds.skip(64);
        if (ds.remainingBits >= 256) {
          return ds.loadBuffer(32);
        }
      }

      const ds2 = stateInit.data.beginParse();
      if (ds2.remainingBits >= 288) {
        ds2.skip(32);
        return ds2.loadBuffer(32);
      }

      return null;
    } catch {
      return null;
    }
  }

  private generateTokens(user: User): AuthResponseDto {
    const payload: TokenPayload = {
      sub: user.id,
      telegramId: user.telegramId.toString(),
      roles: user.roles,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshExpiresIn', '7d'),
    });

    const expiresIn = this.configService.get<string>('jwt.expiresIn', '1d');
    const expiresAt = new Date();

    const match = expiresIn.match(/^(\d+)([dhms])$/);
    if (match) {
      const [, value, unit] = match;
      const multipliers: Record<string, number> = {
        d: 86400000,
        h: 3600000,
        m: 60000,
        s: 1000,
      };
      expiresAt.setTime(expiresAt.getTime() + parseInt(value, 10) * multipliers[unit]);
    }

    return {
      accessToken,
      refreshToken,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: user.id,
        telegramId: user.telegramId.toString(),
        telegramUsername: user.telegramUsername,
        firstName: user.firstName,
        lastName: user.lastName,
        photoUrl: user.photoUrl,
        roles: user.roles,
        tonWalletAddress: user.tonWalletAddress,
        isVerified: user.isVerified,
      },
    };
  }

  async validateUser(payload: TokenPayload): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
  }
}
