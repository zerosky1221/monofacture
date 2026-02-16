import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  SupportTicket,
  SupportMessage,
  TicketStatus,
  TicketCategory,
  TicketPriority,
} from '@prisma/client';
import { createPaginatedResponse, PaginatedResponseDto } from '../../common/dto/pagination.dto';

export interface CreateTicketDto {
  category: TicketCategory;
  subject: string;
  message: string;
  priority?: TicketPriority;
  dealId?: string;
  channelId?: string;
  reportedUserId?: string;
  attachments?: any;
}

export interface AddMessageDto {
  message: string;
  attachments?: any;
}

export interface TicketListOptions {
  page?: number;
  limit?: number;
  status?: TicketStatus;
}

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  private async generateTicketNumber(): Promise<string> {
    const count = await this.prisma.supportTicket.count();
    return `MF-${String(count + 1).padStart(5, '0')}`;
  }

  async createTicket(userId: string, dto: CreateTicketDto): Promise<SupportTicket> {
    const ticketNumber = await this.generateTicketNumber();

    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId,
        category: dto.category,
        subject: dto.subject,
        priority: dto.priority || TicketPriority.MEDIUM,
        dealId: dto.dealId,
        channelId: dto.channelId,
        reportedUserId: dto.reportedUserId,
        messages: {
          create: {
            senderId: userId,
            content: dto.message,
            attachments: dto.attachments || undefined,
          },
        },
      },
      include: {
        messages: {
          include: { sender: true },
        },
        deal: true,
        channel: true,
      },
    });

    try {
      await this.notificationsService.create({
        userId,
        type: 'TICKET_CREATED',
        title: 'Support Ticket Created',
        message: `Your ticket ${ticketNumber} has been created. Our team will review it shortly.`,
        entityType: 'SupportTicket',
        entityId: ticket.id,
      });
    } catch (error) {
      this.logger.warn(`Failed to send ticket creation notification: ${(error as Error).message}`);
    }

    this.logger.log(`Ticket ${ticketNumber} created by user ${userId}`);

    return ticket;
  }

  async findAllByUser(
    userId: string,
    options: TicketListOptions = {},
  ): Promise<PaginatedResponseDto<SupportTicket>> {
    const { page = 1, limit = 20, status } = options;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { messages: true } },
          deal: true,
          channel: true,
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return createPaginatedResponse(tickets, total, page, limit);
  }

  async findById(userId: string, ticketId: string): Promise<SupportTicket> {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        userId,
      },
      include: {
        messages: {
          include: { sender: true },
          orderBy: { createdAt: 'asc' },
        },
        deal: true,
        channel: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  async addMessage(
    userId: string,
    ticketId: string,
    dto: AddMessageDto,
  ): Promise<SupportMessage> {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        userId,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException('Cannot add messages to a closed ticket. Please reopen it first.');
    }

    const message = await this.prisma.supportMessage.create({
      data: {
        ticketId,
        senderId: userId,
        content: dto.message,
        attachments: dto.attachments || undefined,
      },
      include: { sender: true },
    });

    if (ticket.status === TicketStatus.WAITING_USER) {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.IN_PROGRESS },
      });
    }

    return message;
  }

  async closeTicket(userId: string, ticketId: string): Promise<SupportTicket> {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        userId,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: TicketStatus.CLOSED,
        resolvedAt: new Date(),
      },
    });
  }

  async reopenTicket(userId: string, ticketId: string): Promise<SupportTicket> {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        userId,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.status !== TicketStatus.CLOSED && ticket.status !== TicketStatus.RESOLVED) {
      throw new BadRequestException('Only closed or resolved tickets can be reopened');
    }

    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: TicketStatus.OPEN,
        resolvedAt: null,
      },
    });
  }
}
