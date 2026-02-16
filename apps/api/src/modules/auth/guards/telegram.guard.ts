import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class TelegramGuard implements CanActivate {
  private readonly logger = new Logger(TelegramGuard.name);
  private readonly botToken: string;

  constructor(private readonly configService: ConfigService) {
    this.botToken = this.configService.get<string>('telegram.botToken') || '';
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const initData = request.headers['x-telegram-init-data'] || request.body?.initData;

    if (!initData) {
      throw new UnauthorizedException('Telegram initData not provided');
    }

    if (!this.validateInitData(initData)) {
      throw new UnauthorizedException('Invalid Telegram initData');
    }

    const params = new URLSearchParams(initData);
    const userDataString = params.get('user');

    if (userDataString) {
      request.telegramUser = JSON.parse(userDataString);
    }

    return true;
  }

  private validateInitData(initData: string): boolean {
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
        return false;
      }

      const authDate = parseInt(params.get('auth_date') || '0', 10);
      const now = Math.floor(Date.now() / 1000);

      return now - authDate <= 300;
    } catch (error) {
      this.logger.error('Failed to validate Telegram initData:', error);
      return false;
    }
  }
}
