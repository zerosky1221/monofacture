import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../core/database/prisma.service';
import {
  Campaign,
  CampaignStatus,
  CampaignApplication,
  CampaignApplicationStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignApplicationDto,
  CampaignFiltersDto,
} from './dto/campaigns.dto';
import { createPaginatedResponse, PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { EVENTS } from '@telegram-ads/shared';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(userId: string, dto: CreateCampaignDto): Promise<Campaign> {

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        roles: { push: UserRole.ADVERTISER },
      },
    });

    const campaign = await this.prisma.campaign.create({
      data: {
        advertiserId: userId,
        title: dto.title,
        description: dto.description,
        brief: dto.brief,
        targetCategories: dto.targetCategories || [],
        targetLanguages: dto.targetLanguages || [],
        targetCountries: dto.targetCountries || [],
        minSubscribers: dto.minSubscribers,
        maxSubscribers: dto.maxSubscribers,
        minEngagement: dto.minEngagement,
        adFormats: dto.adFormats,
        totalBudget: BigInt(dto.totalBudget),
        minPricePerPost: dto.minPricePerPost ? BigInt(dto.minPricePerPost) : null,
        maxPricePerPost: dto.maxPricePerPost ? BigInt(dto.maxPricePerPost) : null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        creativeGuidelines: dto.creativeGuidelines,
        sampleContent: dto.sampleContent,
        doNotInclude: dto.doNotInclude || [],
        status: CampaignStatus.DRAFT,
      },
    });

    this.eventEmitter.emit(EVENTS.CAMPAIGN_CREATED, { campaignId: campaign.id, userId });

    return campaign;
  }

  async findById(id: string): Promise<Campaign> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  async getCampaignDetails(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        advertiser: {
          select: {
            id: true,
            telegramUsername: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            rating: true,
            reviewCount: true,
          },
        },
        applications: {
          include: {
            channel: {
              select: {
                id: true,
                title: true,
                username: true,
                subscriberCount: true,
                photoUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            applications: true,
            deals: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  async update(id: string, userId: string, dto: UpdateCampaignDto): Promise<Campaign> {
    const campaign = await this.findById(id);

    if (campaign.advertiserId !== userId) {
      throw new ForbiddenException('You are not the owner of this campaign');
    }

    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.PAUSED) {
      throw new BadRequestException('Can only edit draft or paused campaigns');
    }

    return this.prisma.campaign.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        brief: dto.brief,
        targetCategories: dto.targetCategories,
        targetLanguages: dto.targetLanguages,
        targetCountries: dto.targetCountries,
        minSubscribers: dto.minSubscribers,
        maxSubscribers: dto.maxSubscribers,
        minEngagement: dto.minEngagement,
        adFormats: dto.adFormats,
        totalBudget: dto.totalBudget ? BigInt(dto.totalBudget) : undefined,
        minPricePerPost: dto.minPricePerPost ? BigInt(dto.minPricePerPost) : undefined,
        maxPricePerPost: dto.maxPricePerPost ? BigInt(dto.maxPricePerPost) : undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        creativeGuidelines: dto.creativeGuidelines,
        sampleContent: dto.sampleContent,
        doNotInclude: dto.doNotInclude,
      },
    });
  }

  async publish(id: string, userId: string): Promise<Campaign> {
    const campaign = await this.findById(id);

    if (campaign.advertiserId !== userId) {
      throw new ForbiddenException('You are not the owner of this campaign');
    }

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException('Can only publish draft campaigns');
    }

    const updatedCampaign = await this.prisma.campaign.update({
      where: { id },
      data: {
        status: CampaignStatus.ACTIVE,
        publishedAt: new Date(),
      },
    });

    this.eventEmitter.emit(EVENTS.CAMPAIGN_PUBLISHED, { campaignId: id, userId });

    return updatedCampaign;
  }

  async pause(id: string, userId: string): Promise<Campaign> {
    const campaign = await this.findById(id);

    if (campaign.advertiserId !== userId) {
      throw new ForbiddenException('You are not the owner of this campaign');
    }

    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException('Can only pause active campaigns');
    }

    return this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.PAUSED },
    });
  }

  async resume(id: string, userId: string): Promise<Campaign> {
    const campaign = await this.findById(id);

    if (campaign.advertiserId !== userId) {
      throw new ForbiddenException('You are not the owner of this campaign');
    }

    if (campaign.status !== CampaignStatus.PAUSED) {
      throw new BadRequestException('Can only resume paused campaigns');
    }

    return this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.ACTIVE },
    });
  }

  async close(id: string, userId: string): Promise<Campaign> {
    const campaign = await this.findById(id);

    if (campaign.advertiserId !== userId) {
      throw new ForbiddenException('You are not the owner of this campaign');
    }

    return this.prisma.campaign.update({
      where: { id },
      data: {
        status: CampaignStatus.COMPLETED,
        closedAt: new Date(),
      },
    });
  }

  async apply(
    campaignId: string,
    userId: string,
    dto: CampaignApplicationDto,
  ): Promise<CampaignApplication> {
    const campaign = await this.findById(campaignId);

    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException('Campaign is not active');
    }

    const channel = await this.prisma.channel.findFirst({
      where: {
        id: dto.channelId,
        ownerId: userId,
        status: 'ACTIVE',
      },
    });

    if (!channel) {
      throw new ForbiddenException('You do not own this channel or it is not active');
    }

    const existingApplication = await this.prisma.campaignApplication.findUnique({
      where: {
        campaignId_channelId: {
          campaignId,
          channelId: dto.channelId,
        },
      },
    });

    if (existingApplication) {
      throw new BadRequestException('Already applied to this campaign with this channel');
    }

    const application = await this.prisma.campaignApplication.create({
      data: {
        campaignId,
        channelId: dto.channelId,
        userId,
        proposedPrice: BigInt(dto.proposedPrice),
        adFormat: dto.adFormat,
        message: dto.message,
        proposedDate: dto.proposedDate ? new Date(dto.proposedDate) : null,
        proposedTime: dto.proposedTime,
      },
    });

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { applicationCount: { increment: 1 } },
    });

    return application;
  }

  async acceptApplication(
    campaignId: string,
    applicationId: string,
    userId: string,
  ): Promise<CampaignApplication> {
    const campaign = await this.findById(campaignId);

    if (campaign.advertiserId !== userId) {
      throw new ForbiddenException('You are not the owner of this campaign');
    }

    const application = await this.prisma.campaignApplication.findFirst({
      where: { id: applicationId, campaignId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.status !== CampaignApplicationStatus.PENDING) {
      throw new BadRequestException('Application already processed');
    }

    const updatedApplication = await this.prisma.campaignApplication.update({
      where: { id: applicationId },
      data: {
        status: CampaignApplicationStatus.ACCEPTED,
        respondedAt: new Date(),
      },
    });

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { acceptedCount: { increment: 1 } },
    });

    return updatedApplication;
  }

  async rejectApplication(
    campaignId: string,
    applicationId: string,
    userId: string,
  ): Promise<CampaignApplication> {
    const campaign = await this.findById(campaignId);

    if (campaign.advertiserId !== userId) {
      throw new ForbiddenException('You are not the owner of this campaign');
    }

    const application = await this.prisma.campaignApplication.findFirst({
      where: { id: applicationId, campaignId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return this.prisma.campaignApplication.update({
      where: { id: applicationId },
      data: {
        status: CampaignApplicationStatus.REJECTED,
        respondedAt: new Date(),
      },
    });
  }

  async findAll(filters: CampaignFiltersDto): Promise<PaginatedResponseDto<Campaign>> {
    const {
      page = 1,
      limit = 20,
      categories,
      minBudget,
      maxBudget,
      adFormats,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const where: Prisma.CampaignWhereInput = {
      status: CampaignStatus.ACTIVE,
    };

    if (categories && categories.length > 0) {
      where.targetCategories = { hasSome: categories };
    }

    if (minBudget !== undefined) {
      where.totalBudget = { ...where.totalBudget as object, gte: BigInt(minBudget) };
    }

    if (maxBudget !== undefined) {
      where.totalBudget = { ...where.totalBudget as object, lte: BigInt(maxBudget) };
    }

    if (adFormats && adFormats.length > 0) {
      where.adFormats = { hasSome: adFormats };
    }

    const [campaigns, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        include: {
          advertiser: {
            select: {
              id: true,
              telegramUsername: true,
              firstName: true,
              photoUrl: true,
              rating: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return createPaginatedResponse(campaigns, total, page, limit);
  }

  async findByAdvertiser(userId: string): Promise<Campaign[]> {
    return this.prisma.campaign.findMany({
      where: { advertiserId: userId },
      include: {
        _count: {
          select: {
            applications: true,
            deals: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyApplications(userId: string): Promise<CampaignApplication[]> {
    return this.prisma.campaignApplication.findMany({
      where: { userId },
      include: {
        campaign: {
          include: {
            advertiser: {
              select: {
                id: true,
                telegramUsername: true,
                firstName: true,
                photoUrl: true,
              },
            },
          },
        },
        channel: {
          select: {
            id: true,
            title: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    const campaign = await this.findById(id);

    if (campaign.advertiserId !== userId) {
      throw new ForbiddenException('You are not the owner of this campaign');
    }

    if (campaign.status === CampaignStatus.ACTIVE) {
      throw new BadRequestException('Cannot delete active campaigns. Please close them first.');
    }

    await this.prisma.campaign.delete({
      where: { id },
    });
  }
}
