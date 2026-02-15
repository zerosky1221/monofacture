import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { FastifyThrottlerGuard } from './common/guards/throttler.guard';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';

import { PrismaModule } from './core/database/prisma.module';
import { RedisModule } from './core/redis/redis.module';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { DealsModule } from './modules/deals/deals.module';
import { EscrowModule } from './modules/escrow/escrow.module';
import { PostingModule } from './modules/posting/posting.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { TelegramBotModule } from './modules/telegram-bot/telegram-bot.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { BalanceModule } from './modules/balance/balance.module';
import { ReferralModule } from './modules/referral/referral.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { ChannelReviewsModule } from './modules/channel-reviews/channel-reviews.module';
import { SupportModule } from './modules/support/support.module';
import { FaqModule } from './modules/faq/faq.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ChatModule } from './modules/chat/chat.module';
import { FiltersModule } from './modules/filters/filters.module';
import { AchievementsModule } from './modules/achievements/achievements.module';
import { VerificationModule } from './modules/verification/verification.module';
import { AdminModule } from './modules/admin/admin.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { HealthController } from './health.controller';

import configuration from './config/configuration';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      envFilePath: ['.env.local', '.env'],
    }),

    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),

    ScheduleModule.forRoot(),

    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),

    BullModule.forRootAsync({
      useFactory: () => ({
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD || undefined,
          db: parseInt(process.env.REDIS_DB || '0', 10),
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 1000,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      }),
    }),

    PrismaModule,
    RedisModule,

    AuthModule,
    UsersModule,
    ChannelsModule,
    PricingModule,
    CampaignsModule,
    DealsModule,
    EscrowModule,
    PostingModule,
    NotificationsModule,
    TelegramBotModule,
    JobsModule,
    BalanceModule,
    ReferralModule,
    ReviewsModule,
    ChannelReviewsModule,
    SupportModule,
    FaqModule,
    OnboardingModule,
    FavoritesModule,
    AnalyticsModule,
    ChatModule,
    FiltersModule,
    AchievementsModule,
    VerificationModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: FastifyThrottlerGuard,
    },
  ],
})
export class AppModule {}
