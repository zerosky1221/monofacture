import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('deals/:dealId/messages')
  async getMessages(
    @CurrentUser() user: User,
    @Param('dealId') dealId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.chatService.getMessages(user.id, dealId, +page, +limit);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('deals/:dealId/messages')
  async sendMessage(
    @CurrentUser() user: User,
    @Param('dealId') dealId: string,
    @Body() body: SendMessageDto,
  ) {
    return this.chatService.sendMessage(user.id, dealId, body.content);
  }

  @Get('unread')
  async getUnreadCount(@CurrentUser() user: User) {
    return this.chatService.getUnreadCount(user.id);
  }
}
