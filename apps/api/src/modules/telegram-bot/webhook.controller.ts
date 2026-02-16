import {
  Controller,
  Post,
  Req,
  Logger,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import { FastifyRequest } from 'fastify';
import { TelegramBotService } from './telegram-bot.service';

@SkipThrottle()
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly secretToken: string;

  constructor(
    private readonly botService: TelegramBotService,
    private readonly configService: ConfigService,
  ) {
    this.secretToken = this.configService.get<string>(
      'telegram.webhookSecretToken',
      '',
    );
  }

  @Post('telegram')
  @HttpCode(HttpStatus.OK)
  async handleTelegramWebhook(
    @Req() req: FastifyRequest,
    @Headers('x-telegram-bot-api-secret-token') headerToken?: string,
  ): Promise<{ ok: boolean }> {

    if (this.secretToken && headerToken !== this.secretToken) {
      this.logger.warn('Webhook request rejected: invalid secret token');
      return { ok: false };
    }

    try {
      const update = req.body;
      if (!update || typeof update !== 'object') {
        this.logger.warn('Webhook received empty or invalid body');
        return { ok: false };
      }

      await this.botService.handleUpdate(update);
    } catch (error) {

      this.logger.error(
        `Webhook processing error: ${(error as Error).message}`,
      );
    }

    return { ok: true };
  }
}
