import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from '@fastify/helmet';
import { AppModule } from './app.module';
import { BigIntSerializerInterceptor } from './common/interceptors/bigint-serializer.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: process.env.NODE_ENV !== 'production',
      connectionTimeout: 30000,
      keepAliveTimeout: 30000,
      bodyLimit: 1_048_576,
    }),
  );

  await app.register(helmet as any, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 4000);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');

  app.setGlobalPrefix(apiPrefix);

  const webappUrl = configService.get<string>('webappUrl');
  const nodeEnv = configService.get<string>('nodeEnv');
  const corsOrigins: string[] = [];

  if (webappUrl) {
    corsOrigins.push(webappUrl);
  }

  corsOrigins.push('https://app.zerosky.dev', 'https://zerosky.dev', 'https://api.zerosky.dev');

  if (nodeEnv === 'development') {
    corsOrigins.push('http://localhost:3000', 'http://localhost:5173');
  }

  if (corsOrigins.length === 0) {
    logger.warn('No CORS origins configured! Set WEBAPP_URL in environment.');
  }

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  app.useGlobalInterceptors(new BigIntSerializerInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Telegram Ads Marketplace API')
      .setDescription('API for the Telegram Ads Marketplace platform')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management endpoints')
      .addTag('channels', 'Channel management endpoints')
      .addTag('campaigns', 'Campaign management endpoints')
      .addTag('deals', 'Deal management endpoints')
      .addTag('escrow', 'Escrow and payment endpoints')
      .addTag('referral', 'Referral program endpoints')
      .addTag('favorites', 'Favorites management endpoints')
      .addTag('filters', 'Saved filters endpoints')
      .addTag('onboarding', 'User onboarding endpoints')
      .addTag('faq', 'FAQ endpoints')
      .addTag('analytics', 'Analytics and statistics endpoints')
      .addTag('achievements', 'Achievements and gamification endpoints')
      .addTag('verification', 'User verification endpoints')
      .addTag('reviews', 'Reviews and ratings endpoints')
      .addTag('support', 'Support tickets endpoints')
      .addTag('chat', 'Deal chat endpoints')
      .addTag('admin', 'Admin management endpoints')
      .addTag('balance', 'Balance and withdrawals endpoints')
      .addTag('notifications', 'Notifications endpoints')
      .addTag('posting', 'Post scheduling and publishing endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      useGlobalPrefix: false,
    });
    logger.log(`Swagger documentation available at /api/docs`);
  }

  app.enableShutdownHooks();

  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      logger.log(`Received ${signal}, starting graceful shutdown...`);
      try {
        await app.close();
        logger.log('Application closed gracefully');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    });
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  await app.listen(port, '0.0.0.0');
  logger.log(`Application running on port ${port}`);
  logger.log(`API available at /${apiPrefix}`);
  logger.log(`Environment: ${nodeEnv}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
