import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { User, TicketStatus } from '@prisma/client';
import { SupportService, CreateTicketDto, AddMessageDto } from './support.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('support')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('tickets')
  @ApiOperation({ summary: 'Create a support ticket' })
  @ApiResponse({ status: 201, description: 'Ticket created successfully' })
  async createTicket(@CurrentUser() user: User, @Body() dto: CreateTicketDto) {
    return this.supportService.createTicket(user.id, dto);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'List my support tickets' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: TicketStatus })
  async findAllTickets(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: TicketStatus,
  ) {
    return this.supportService.findAllByUser(user.id, { page, limit, status });
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get ticket details' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  async findTicket(@CurrentUser() user: User, @Param('id') id: string) {
    return this.supportService.findById(user.id, id);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('tickets/:id/messages')
  @ApiOperation({ summary: 'Add a message to a ticket' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  async addMessage(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: AddMessageDto,
  ) {
    return this.supportService.addMessage(user.id, id, dto);
  }

  @Patch('tickets/:id/close')
  @ApiOperation({ summary: 'Close a ticket' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  async closeTicket(@CurrentUser() user: User, @Param('id') id: string) {
    return this.supportService.closeTicket(user.id, id);
  }

  @Patch('tickets/:id/reopen')
  @ApiOperation({ summary: 'Reopen a closed ticket' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  async reopenTicket(@CurrentUser() user: User, @Param('id') id: string) {
    return this.supportService.reopenTicket(user.id, id);
  }
}
