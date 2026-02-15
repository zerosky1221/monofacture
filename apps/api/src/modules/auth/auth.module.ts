import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TelegramGuard } from './guards/telegram.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ReferralModule } from '../referral/referral.module';
import { AchievementsModule } from '../achievements/achievements.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiresIn', '1d'),
        },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => ReferralModule),
    forwardRef(() => AchievementsModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, TelegramGuard, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard, TelegramGuard],
})
export class AuthModule {}
