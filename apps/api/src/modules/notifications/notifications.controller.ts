import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { IsOptional, IsBoolean, IsString } from 'class-validator';

class UpdateNotificationSettingsDto {
  @IsOptional() @IsBoolean() inApp?: boolean;
  @IsOptional() @IsBoolean() telegram?: boolean;
  @IsOptional() @IsBoolean() deals?: boolean;
  @IsOptional() @IsBoolean() reviews?: boolean;
  @IsOptional() @IsBoolean() wallet?: boolean;
  @IsOptional() @IsBoolean() referrals?: boolean;
  @IsOptional() @IsBoolean() marketing?: boolean;
  @IsOptional() @IsBoolean() quietHours?: boolean;
  @IsOptional() @IsString()  quietStart?: string;
  @IsOptional() @IsString()  quietEnd?: string;
  @IsOptional() @IsString()  quietTimezone?: string;
}

const FIELD_TO_PRISMA: Record<string, string> = {
  inApp: 'inAppEnabled',
  telegram: 'telegramEnabled',
  deals: 'dealsEnabled',
  reviews: 'reviewsEnabled',
  wallet: 'walletEnabled',
  referrals: 'referralEnabled',
  marketing: 'marketingEnabled',
  quietHours: 'quietHoursEnabled',
  quietStart: 'quietHoursStart',
  quietEnd: 'quietHoursEnd',
  quietTimezone: 'quietHoursTimezone',
};

const PRISMA_TO_FIELD: Record<string, string> = Object.fromEntries(
  Object.entries(FIELD_TO_PRISMA).map(([k, v]) => [v, k]),
);

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get my notifications' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  async getNotifications(
    @CurrentUser() user: User,
    @Query() pagination: PaginationDto,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.getUserNotifications(
      user.id,
      pagination.page,
      pagination.limit,
      unreadOnly === 'true',
    );
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  async markAsRead(
    @CurrentUser() user: User,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.markAsRead(notificationId, user.id);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser() user: User) {
    const count = await this.notificationsService.markAllAsRead(user.id);
    return { success: true, count };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  async deleteNotification(
    @CurrentUser() user: User,
    @Param('id') notificationId: string,
  ) {
    await this.notificationsService.delete(notificationId, user.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@CurrentUser() user: User) {
    const count = await this.notificationsService.getUnreadCount(user.id);
    return { count };
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get notification settings' })
  async getSettings(@CurrentUser() user: User) {
    const settings = await this.notificationsService.getOrCreateSettings(user.id);

    const result: Record<string, any> = {};
    for (const [prismaKey, value] of Object.entries(settings)) {
      const frontendKey = PRISMA_TO_FIELD[prismaKey];
      if (frontendKey) {
        result[frontendKey] = value;
      }
    }
    return result;
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update notification settings' })
  async updateSettings(
    @CurrentUser() user: User,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {

    const prismaData: Record<string, any> = {};
    for (const [key, value] of Object.entries(dto)) {
      const prismaKey = FIELD_TO_PRISMA[key];
      if (prismaKey && value !== undefined) {
        prismaData[prismaKey] = value;
      }
    }

    const settings = await this.notificationsService.updateSettings(user.id, prismaData);

    const result: Record<string, any> = {};
    for (const [prismaKey, value] of Object.entries(settings)) {
      const frontendKey = PRISMA_TO_FIELD[prismaKey];
      if (frontendKey) {
        result[frontendKey] = value;
      }
    }
    return result;
  }
}
