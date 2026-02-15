import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { InlineKeyboard } from 'grammy';
import { BotContext, TelegramBotService } from '../telegram-bot.service';
import { DealsService } from '../../deals/deals.service';
import { ChannelsService } from '../../channels/channels.service';
import { UsersService } from '../../users/users.service';
import { AdFormat } from '@prisma/client';

interface DealCreationData {
  channelId?: string;
  adFormat?: AdFormat;
  price?: bigint;
  brief?: string;
  scheduledTime?: Date;
  postDuration?: number;
}

@Injectable()
export class CreateDealConversation {
  private readonly logger = new Logger(CreateDealConversation.name);

  constructor(
    private readonly botService: TelegramBotService,
    @Inject(forwardRef(() => DealsService))
    private readonly dealsService: DealsService,
    @Inject(forwardRef(() => ChannelsService))
    private readonly channelsService: ChannelsService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  async start(ctx: BotContext, channelId?: string): Promise<void> {
    const from = ctx.from;
    if (!from) return;

    ctx.session.step = 'create_deal:select_channel';
    ctx.session.data = channelId ? { channelId } : {};

    if (channelId) {

      await this.showFormatSelection(ctx);
      return;
    }

    const miniAppUrl = this.botService.getMiniAppUrl();
    const keyboard = new InlineKeyboard()
      .webApp('🚀 Open Marketplace', miniAppUrl)
      .row()
      .text('❌ Cancel', 'create_deal:cancel');

    await ctx.reply(
      '📢 <b>Create New Deal</b>\n\n' +
      'To create a new ad deal, please use our Mini App.\n\n' +
      'In the Mini App you can:\n' +
      '• Browse available channels\n' +
      '• View pricing and stats\n' +
      '• Send ad requests\n' +
      '• Manage payment',
      {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      },
    );
  }

  private async showFormatSelection(ctx: BotContext): Promise<void> {
    const data = ctx.session.data as DealCreationData;

    if (!data.channelId) {
      await ctx.reply('Please select a channel first.');
      return;
    }

    const channel = await this.channelsService.getChannelById(data.channelId);
    if (!channel) {
      await ctx.reply('Channel not found.');
      this.clearSession(ctx);
      return;
    }

    const pricing = (channel as any).pricing || [];
    const keyboard = new InlineKeyboard();

    for (const price of pricing) {
      const hourlyTon = Number(price.pricePerHour) / 1_000_000_000;
      const label = `${price.adFormat} - from ${hourlyTon} TON/hr`;
      keyboard.text(label, `create_deal:format:${price.adFormat}`).row();
    }

    if (pricing.length === 0) {
      await ctx.reply(
        '❌ This channel has no pricing set yet. Please try another channel.',
      );
      this.clearSession(ctx);
      return;
    }

    keyboard.text('❌ Cancel', 'create_deal:cancel');

    ctx.session.step = 'create_deal:select_format';

    await ctx.reply(
      `📺 <b>Creating deal with ${channel.title}</b>\n\n` +
      'Select an ad format:',
      {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      },
    );
  }

  async handleCallback(ctx: BotContext): Promise<void> {
    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData) return;

    const [, action, value] = callbackData.split(':');

    switch (action) {
      case 'cancel':
        this.clearSession(ctx);
        await ctx.answerCallbackQuery('Cancelled');
        await ctx.editMessageText('Deal creation cancelled.');
        break;

      case 'format':
        await this.handleFormatSelection(ctx, value as AdFormat);
        break;

      case 'duration':
        await this.handleDurationSelection(ctx, value);
        break;

      case 'confirm':
        await this.handleConfirmation(ctx);
        break;
    }
  }

  private async handleFormatSelection(ctx: BotContext, format: AdFormat): Promise<void> {
    const data = ctx.session.data as DealCreationData;
    data.adFormat = format;

    const channel = await this.channelsService.getChannelById(data.channelId!);
    const pricing = (channel as any).pricing?.find((p: any) => p.adFormat === format);

    if (!pricing) {
      await ctx.answerCallbackQuery('No pricing for this format');
      return;
    }

    const pricePerHour = Number(pricing.pricePerHour);
    const minDur = pricing.minHours || 1;
    const maxDur = pricing.maxHours || 168;

    const durations = [1, 3, 6, 12, 24, 48, 72, 168].filter(
      (h) => h >= minDur && h <= maxDur,
    );

    const keyboard = new InlineKeyboard();
    for (const hours of durations) {
      const subtotal = pricePerHour * hours;
      const total = subtotal * 1.05;
      const tonAmount = (total / 1_000_000_000).toFixed(2);
      const label =
        hours === 1 ? '1 hour' : hours === 24 ? '1 day' : hours === 168 ? '1 week' : `${hours}h`;
      keyboard.text(`${label} - ${tonAmount} TON`, `create_deal:duration:${hours}`).row();
    }

    if (pricing.pricePermanent) {
      const permTotal = Number(pricing.pricePermanent) * 1.05;
      const permTon = (permTotal / 1_000_000_000).toFixed(2);
      keyboard.text(`Permanent - ${permTon} TON`, `create_deal:duration:permanent`).row();
    }

    keyboard.text('Cancel', 'create_deal:cancel');

    ctx.session.step = 'create_deal:select_duration';
    ctx.session.data = data;

    const hourlyTon = (pricePerHour / 1_000_000_000).toFixed(2);

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `<b>Select Post Duration</b>\n\n` +
        `<b>Format:</b> ${format.replace(/_/g, ' ')}\n` +
        `<b>Rate:</b> ${hourlyTon} TON/hr\n\n` +
        `Price includes 5% platform fee.`,
      {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      },
    );
  }

  async handleMessage(ctx: BotContext): Promise<void> {
    const step = ctx.session.step;

    switch (step) {
      case 'create_deal:enter_brief':
        await this.handleBriefInput(ctx);
        break;

      default:
        return;
    }
  }

  private async handleBriefInput(ctx: BotContext): Promise<void> {
    const text = ctx.message?.text;
    if (!text) return;

    const data = ctx.session.data as DealCreationData;
    data.brief = text;
    ctx.session.data = data;

    await this.showConfirmation(ctx);
  }

  private async handleDurationSelection(ctx: BotContext, value: string): Promise<void> {
    const data = ctx.session.data as DealCreationData;
    const isPermanent = value === 'permanent';

    const channel = await this.channelsService.getChannelById(data.channelId!);
    const pricing = (channel as any).pricing?.find((p: any) => p.adFormat === data.adFormat);

    if (isPermanent) {
      data.postDuration = undefined;
      (data as any).isPermanent = true;
      if (pricing?.pricePermanent) {
        data.price = BigInt(Number(pricing.pricePermanent));
      }
    } else {
      const hours = parseInt(value, 10);
      data.postDuration = hours;
      (data as any).isPermanent = false;
      if (pricing) {
        const pricePerHour = Number(pricing.pricePerHour);
        const subtotal = pricePerHour * hours;
        data.price = BigInt(Math.floor(subtotal));
      }
    }

    ctx.session.data = data;
    ctx.session.step = 'create_deal:enter_brief';

    const keyboard = new InlineKeyboard()
      .text('Skip', 'create_deal:skip_brief')
      .text('❌ Cancel', 'create_deal:cancel');

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      '<b>Enter your brief</b>\n\n' +
        'Describe what you want to advertise. Include:\n' +
        '  What product/service\n' +
        '  Key message\n' +
        '  Any requirements\n\n' +
        'Or click Skip to proceed without a brief.',
      {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      },
    );
  }

  private async showConfirmation(ctx: BotContext): Promise<void> {
    const data = ctx.session.data as DealCreationData;
    const channel = await this.channelsService.getChannelById(data.channelId!);

    const priceInTon = Number(data.price || 0) / 1_000_000_000;
    const platformFee = priceInTon * 0.05;
    const totalAmount = priceInTon + platformFee;
    const isPermanent = (data as any).isPermanent || false;
    const durationLabel = isPermanent
      ? 'Permanent'
      : data.postDuration === 1
        ? '1 hour'
        : data.postDuration === 24
          ? '1 day'
          : `${data.postDuration} hours`;

    ctx.session.step = 'create_deal:confirm';

    const keyboard = new InlineKeyboard()
      .text('Create Deal', 'create_deal:confirm')
      .row()
      .text('« Edit', 'create_deal:edit')
      .text('❌ Cancel', 'create_deal:cancel');

    const message = `
<b>Confirm Deal</b>

<b>Channel:</b> ${channel?.title}
<b>Format:</b> ${data.adFormat?.replace(/_/g, ' ')}
<b>Duration:</b> ${durationLabel}

<b>Pricing:</b>
  Subtotal: ${priceInTon.toFixed(2)} TON
  Platform Fee (5%): ${platformFee.toFixed(2)} TON
  <b>Total: ${totalAmount.toFixed(2)} TON</b>

<b>Brief:</b>
${data.brief || 'Not provided'}

${isPermanent ? 'Post will remain in the channel permanently.' : `Post will be auto-deleted after ${durationLabel}.`}
Click "Create Deal" to proceed to payment.
    `.trim();

    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery();
      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    } else {
      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    }
  }

  private async handleConfirmation(ctx: BotContext): Promise<void> {
    const from = ctx.from;
    if (!from) return;

    const data = ctx.session.data as DealCreationData;

    try {
      const user = await this.usersService.findByTelegramId(BigInt(from.id));
      if (!user) {
        await ctx.answerCallbackQuery('User not found');
        return;
      }

      const channel = await this.channelsService.getChannelById(data.channelId!);
      if (!channel) {
        await ctx.answerCallbackQuery('Channel not found');
        return;
      }

      const deal = await this.dealsService.createDeal(user.id, {
        channelId: data.channelId!,
        adFormat: data.adFormat!,
        brief: data.brief,
        postDuration: data.postDuration,
        isPermanent: (data as any).isPermanent || false,
      });

      this.clearSession(ctx);

      const miniAppUrl = this.botService.getMiniAppUrl();

      const keyboard = new InlineKeyboard()
        .webApp('💳 Pay Now', `${miniAppUrl}?deal=${deal.id}`)
        .row()
        .text('📋 View Deal', `deal:view:${deal.id}`);

      await ctx.answerCallbackQuery('Deal created! ✅');
      await ctx.editMessageText(
        '✅ <b>Deal Created!</b>\n\n' +
        `<b>Reference:</b> ${deal.referenceNumber}\n\n` +
        'Your deal request has been sent to the channel owner.\n\n' +
        'To complete the deal, please proceed to payment. ' +
        'Funds will be held in escrow until the post is verified.',
        {
          parse_mode: 'HTML',
          reply_markup: keyboard,
        },
      );
    } catch (error) {
      this.logger.error(`Failed to create deal: ${(error as Error).message}`);
      await ctx.answerCallbackQuery('Failed to create deal');
      await ctx.reply(`❌ Error: ${(error as Error).message}`);
      this.clearSession(ctx);
    }
  }

  private clearSession(ctx: BotContext): void {
    ctx.session.step = undefined;
    ctx.session.data = {};
  }
}
