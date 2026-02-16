import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { InlineKeyboard } from 'grammy';
import { TelegramBotService, BotContext } from './telegram-bot.service';
import { StartCommand } from './commands/start.command';
import { HelpCommand } from './commands/help.command';
import { MyChannelsCommand } from './commands/my-channels.command';
import { MyDealsCommand } from './commands/my-deals.command';
import { SettingsCommand } from './commands/settings.command';
import { AddChannelCommand } from './commands/add-channel.command';
import { RemoveChannelCommand } from './commands/remove-channel.command';
import { AddChannelConversation } from './conversations/add-channel.conversation';
import { CreativeSubmissionConversation } from './conversations/creative-submission.conversation';
import { ChannelsService } from '../channels/channels.service';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class TelegramBotUpdate implements OnModuleInit {
  private readonly logger = new Logger(TelegramBotUpdate.name);

  constructor(
    private readonly botService: TelegramBotService,
    private readonly startCommand: StartCommand,
    private readonly helpCommand: HelpCommand,
    private readonly myChannelsCommand: MyChannelsCommand,
    private readonly myDealsCommand: MyDealsCommand,
    private readonly settingsCommand: SettingsCommand,
    private readonly addChannelCommand: AddChannelCommand,
    private readonly removeChannelCommand: RemoveChannelCommand,
    private readonly addChannelConversation: AddChannelConversation,
    private readonly creativeConversation: CreativeSubmissionConversation,
    @Inject(forwardRef(() => ChannelsService))
    private readonly channelsService: ChannelsService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    const bot = this.botService.getBot();
    if (!bot) return;

    bot.command('start', (ctx) => this.startCommand.handle(ctx));
    bot.command('help', (ctx) => this.helpCommand.handle(ctx));
    bot.command('channels', (ctx) => this.myChannelsCommand.handle(ctx));
    bot.command('mychannels', (ctx) => this.myChannelsCommand.handle(ctx));
    bot.command('deals', (ctx) => this.myDealsCommand.handle(ctx));
    bot.command('settings', (ctx) => this.settingsCommand.handle(ctx));
    bot.command('webapp', (ctx) => this.handleWebApp(ctx));
    bot.command('addchannel', (ctx) => this.addChannelCommand.handle(ctx));
    bot.command('removechannel', (ctx) => this.removeChannelCommand.handle(ctx));

    bot.callbackQuery(/^channel:/, (ctx) => this.handleChannelCallback(ctx));
    bot.callbackQuery(/^pricing:/, (ctx) => this.handlePricingCallback(ctx));
    bot.callbackQuery(/^deal:/, (ctx) => this.handleDealCallback(ctx));
    bot.callbackQuery(/^deals:/, (ctx) => this.handleDealsFilterCallback(ctx));
    bot.callbackQuery(/^help:/, (ctx) => this.handleHelpCallback(ctx));
    bot.callbackQuery(/^creative:/, (ctx) => this.handleCreativeCallback(ctx));
    bot.callbackQuery(/^settings:/, (ctx) => this.handleSettingsCallback(ctx));
    bot.callbackQuery(/^verify:/, (ctx) => this.handleVerifyCallback(ctx));
    bot.callbackQuery('add_channel', (ctx) => this.addChannelConversation.start(ctx));
    bot.callbackQuery(/^add_channel:/, (ctx) => this.addChannelConversation.handleCallback(ctx));
    bot.callbackQuery('back_to_menu', (ctx) => this.handleBackToMenu(ctx));
    bot.callbackQuery(/^menu:/, (ctx) => this.handleMenuCallback(ctx));

    bot.on('inline_query', (ctx) => this.handleInlineQuery(ctx));

    bot.on('channel_post', (ctx) => this.handleChannelPost(ctx));

    bot.on('my_chat_member', (ctx) => this.handleChatMemberUpdate(ctx));

    bot.on('pre_checkout_query', (ctx) => this.handlePreCheckoutQuery(ctx));
    bot.on('message:successful_payment', (ctx) => this.handleSuccessfulPayment(ctx));

    bot.on('message:text', (ctx) => this.handleTextMessage(ctx));
    bot.on('message:photo', (ctx) => this.handleTextMessage(ctx));
    bot.on('message:video', (ctx) => this.handleTextMessage(ctx));
    bot.on('message:document', (ctx) => this.handleTextMessage(ctx));
    bot.on('message:animation', (ctx) => this.handleTextMessage(ctx));
    bot.on('message:forward_origin', (ctx) => this.handleTextMessage(ctx));

    this.logger.log('Bot handlers registered');
  }

  private async handleWebApp(ctx: BotContext): Promise<void> {
    const isRu = (ctx.session.language || 'en') === 'ru';
    const miniAppUrl = this.botService.getMiniAppUrl();
    const keyboard = new InlineKeyboard()
      .webApp(isRu ? 'Открыть маркетплейс' : 'Open Marketplace', miniAppUrl);

    await ctx.reply(
      isRu
        ? '🚀 <b>Маркетплейс рекламы в Telegram</b>\n\nОткройте Mini App для просмотра каналов, создания кампаний и управления сделками.'
        : '🚀 <b>Telegram Ads Marketplace</b>\n\nOpen the Mini App to browse channels, create campaigns, and manage your deals.',
      {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      },
    );
  }

  private async handleChannelCallback(ctx: BotContext): Promise<void> {
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    const [, action, channelId] = data.split(':');

    switch (action) {
      case 'view':
        await this.myChannelsCommand.showChannelDetails(ctx, channelId);
        break;
      case 'stats':
        await this.myChannelsCommand.showChannelStats(ctx, channelId);
        break;
      case 'pricing':
        await this.myChannelsCommand.showChannelPricing(ctx, channelId);
        break;
      case 'edit_pricing':
        await this.myChannelsCommand.startEditPricing(ctx, channelId);
        break;
      case 'toggle':
        await this.myChannelsCommand.toggleChannel(ctx, channelId);
        break;
      case 'refresh':
        await this.myChannelsCommand.refreshChannelStats(ctx, channelId);
        break;
      default:
        await ctx.answerCallbackQuery('Unknown action');
    }
  }

  private async handleDealCallback(ctx: BotContext): Promise<void> {
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    const [, action, dealId] = data.split(':');

    switch (action) {
      case 'view':
        await this.myDealsCommand.showDealDetails(ctx, dealId);
        break;
      case 'accept':
        await this.myDealsCommand.acceptDeal(ctx, dealId);
        break;
      case 'reject':
        await this.myDealsCommand.rejectDeal(ctx, dealId);
        break;
      case 'creative':
        await this.myDealsCommand.showCreative(ctx, dealId);
        break;
      case 'approve':

        await this.creativeConversation.handleApproveCreative(ctx, dealId);
        break;
      case 'revision':

        await this.creativeConversation.handleRequestRevision(ctx, dealId);
        break;
      case 'schedule': {
        const isRu = (ctx.session.language || 'en') === 'ru';
        await ctx.answerCallbackQuery();
        await ctx.editMessageText(
          isRu
            ? '📅 <b>Запланировать публикацию</b>\n\nДля планирования поста используйте Mini App.\n\nОткройте детали сделки и выберите время публикации.'
            : '📅 <b>Schedule Post</b>\n\nTo schedule the post, please use the Mini App.\n\nOpen the deal details and select a posting time.',
          {
            parse_mode: 'HTML',
            reply_markup: new InlineKeyboard()
              .webApp(isRu ? 'Открыть Mini App' : 'Open Mini App', this.botService.getMiniAppUrl())
              .row()
              .text(isRu ? '« Назад к сделке' : '« Back to Deal', `deal:view:${dealId}`),
          },
        );
        break;
      }
      case 'dispute': {
        const isRu = (ctx.session.language || 'en') === 'ru';
        await ctx.answerCallbackQuery();
        await ctx.editMessageText(
          isRu
            ? '⚠️ <b>Открыть спор</b>\n\nДля открытия спора используйте Mini App.\n\nВам нужно предоставить доказательства и описать проблему.'
            : '⚠️ <b>Open Dispute</b>\n\nTo open a dispute, please use the Mini App.\n\nYou will need to provide evidence and describe the issue.',
          {
            parse_mode: 'HTML',
            reply_markup: new InlineKeyboard()
              .webApp(isRu ? 'Открыть Mini App' : 'Open Mini App', this.botService.getMiniAppUrl())
              .row()
              .text(isRu ? '« Назад к сделке' : '« Back to Deal', `deal:view:${dealId}`),
          },
        );
        break;
      }
      case 'messages': {
        const isRu = (ctx.session.language || 'en') === 'ru';
        await ctx.answerCallbackQuery();
        await ctx.editMessageText(
          isRu
            ? '💬 <b>Сообщения сделки</b>\n\nДля просмотра и отправки сообщений используйте Mini App.\n\nВся переписка по сделке доступна там.'
            : '💬 <b>Deal Messages</b>\n\nTo view and send messages, please use the Mini App.\n\nAll deal communication is available there.',
          {
            parse_mode: 'HTML',
            reply_markup: new InlineKeyboard()
              .webApp(isRu ? 'Открыть Mini App' : 'Open Mini App', this.botService.getMiniAppUrl())
              .row()
              .text(isRu ? '« Назад к сделке' : '« Back to Deal', `deal:view:${dealId}`),
          },
        );
        break;
      }
      default:
        await ctx.answerCallbackQuery('Unknown action');
    }
  }

  private async handleSettingsCallback(ctx: BotContext): Promise<void> {
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    const parts = data.split(':');
    const action = parts[1];
    const subAction = parts[2];

    switch (action) {
      case 'notifications':
        await this.settingsCommand.toggleNotifications(ctx);
        break;
      case 'language':
        await this.settingsCommand.showLanguageOptions(ctx);
        break;
      case 'lang':

        if (subAction) {
          await this.settingsCommand.setLanguage(ctx, subAction);
        } else {
          await ctx.answerCallbackQuery('Invalid language');
        }
        break;
      case 'wallet':
        if (!subAction) {
          await this.settingsCommand.showWalletSettings(ctx);
        } else {

          await this.handleWalletAction(ctx, subAction);
        }
        break;
      case 'privacy':
        if (!subAction) {
          await this.settingsCommand.showPrivacySettings(ctx);
        } else {

          await this.handlePrivacyAction(ctx, subAction);
        }
        break;
      default:
        await ctx.answerCallbackQuery('Unknown action');
    }
  }

  private async handleWalletAction(ctx: BotContext, action: string): Promise<void> {
    const isRu = (ctx.session.language || 'en') === 'ru';
    switch (action) {
      case 'connect':
        await ctx.answerCallbackQuery();
        await ctx.editMessageText(
          isRu
            ? '🔗 <b>Подключить кошелёк</b>\n\nНажмите кнопку ниже — откроется страница кошелька.'
            : '🔗 <b>Connect Wallet</b>\n\nTap the button below to open the wallet page.',
          {
            parse_mode: 'HTML',
            reply_markup: new InlineKeyboard()
              .webApp(isRu ? 'Открыть кошелёк' : 'Open Wallet', this.botService.getMiniAppUrl() + '#wallet')
              .row()
              .text(isRu ? '« Назад к настройкам' : '« Back to Settings', 'menu:settings'),
          },
        );
        break;
      case 'disconnect':
        await ctx.answerCallbackQuery(isRu ? 'Кошелёк отключён' : 'Wallet disconnected');

        await this.settingsCommand.showWalletSettings(ctx);
        break;
      case 'change':
        await ctx.answerCallbackQuery();
        await ctx.editMessageText(
          isRu
            ? '🔄 <b>Сменить кошелёк</b>\n\nНажмите кнопку ниже — откроется страница кошелька.'
            : '🔄 <b>Change Wallet</b>\n\nTap the button below to open the wallet page.',
          {
            parse_mode: 'HTML',
            reply_markup: new InlineKeyboard()
              .webApp(isRu ? 'Открыть кошелёк' : 'Open Wallet', this.botService.getMiniAppUrl() + '#wallet')
              .row()
              .text(isRu ? '« Назад к настройкам' : '« Back to Settings', 'menu:settings'),
          },
        );
        break;
      default:
        await ctx.answerCallbackQuery(isRu ? 'Неизвестное действие' : 'Unknown wallet action');
    }
  }

  private async handlePrivacyAction(ctx: BotContext, action: string): Promise<void> {
    const isRu = (ctx.session.language || 'en') === 'ru';
    switch (action) {
      case 'download':
        await ctx.answerCallbackQuery(isRu ? 'Подготавливаем данные...' : 'Preparing your data...');
        await ctx.editMessageText(
          isRu
            ? '📊 <b>Скачать мои данные</b>\n\nЭкспорт данных готовится.\nЭта функция скоро будет доступна.\n\nСвяжитесь с @support_username для запросов данных.'
            : '📊 <b>Download My Data</b>\n\nYour data export is being prepared.\nThis feature will be available soon.\n\nFor now, please contact @support_username for data requests.',
          {
            parse_mode: 'HTML',
            reply_markup: new InlineKeyboard().text(isRu ? '« Назад' : '« Back to Privacy', 'settings:privacy'),
          },
        );
        break;
      case 'delete':
        await ctx.answerCallbackQuery();
        await ctx.editMessageText(
          isRu
            ? '🗑️ <b>Удалить аккаунт</b>\n\n⚠️ <b>Внимание:</b> Это действие необратимо!\n\nУдаление аккаунта приведёт к:\n• Удалению всех каналов\n• Отмене активных сделок\n• Удалению всех данных\n\nДля продолжения свяжитесь с @support_username.'
            : '🗑️ <b>Delete Account</b>\n\n⚠️ <b>Warning:</b> This action is irreversible!\n\nDeleting your account will:\n• Remove all your channels\n• Cancel all active deals\n• Delete all your data\n\nTo proceed, please contact @support_username.',
          {
            parse_mode: 'HTML',
            reply_markup: new InlineKeyboard().text(isRu ? '« Назад' : '« Back to Privacy', 'settings:privacy'),
          },
        );
        break;
      default:
        await ctx.answerCallbackQuery(isRu ? 'Неизвестное действие' : 'Unknown privacy action');
    }
  }

  private async handlePricingCallback(ctx: BotContext): Promise<void> {
    const isRu = (ctx.session.language || 'en') === 'ru';
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      isRu
        ? 'Цены теперь настраиваются в Mini App.\n\nОткройте приложение для настройки цен канала.'
        : 'Pricing is now managed in the Mini App.\n\nOpen the app to configure your channel pricing.',
      {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .webApp(isRu ? 'Открыть приложение' : 'Open App', this.botService.getMiniAppUrl())
          .row()
          .text(isRu ? '« Назад' : '« Back', 'menu:channels'),
      },
    );
  }

  private async handleCreativeCallback(ctx: BotContext): Promise<void> {
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    const [, action, dealId] = data.split(':');

    switch (action) {
      case 'start':
        await this.creativeConversation.handleStartCreative(ctx, dealId);
        break;
      case 'submit':
        await this.creativeConversation.handleSubmitCreative(ctx, dealId);
        break;
      case 'edit':
        await this.creativeConversation.handleEditCreative(ctx, dealId);
        break;
      case 'cancel':
        await this.creativeConversation.handleCancelCreative(ctx, dealId);
        break;
      case 'approve':
        await this.creativeConversation.handleApproveCreative(ctx, dealId);
        break;
      case 'revision':
        await this.creativeConversation.handleRequestRevision(ctx, dealId);
        break;
      case 'reject':
        await this.creativeConversation.handleRejectCreative(ctx, dealId);
        break;
      case 'complete':
        await this.creativeConversation.handleConfirmCompletion(ctx, dealId);
        break;
      case 'dispute':
        await ctx.answerCallbackQuery('Dispute flow coming soon');
        break;
      default:
        await ctx.answerCallbackQuery('Unknown action');
    }
  }

  private async handleBackToMenu(ctx: BotContext): Promise<void> {
    await ctx.answerCallbackQuery();
    await this.startCommand.handle(ctx);
  }

  private async handleVerifyCallback(ctx: BotContext): Promise<void> {
    const isRu = (ctx.session.language || 'en') === 'ru';
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    const [, token] = data.split(':');
    if (!token) {
      await ctx.answerCallbackQuery(isRu ? 'Недействительный токен' : 'Invalid verification token');
      return;
    }

    await ctx.answerCallbackQuery(isRu ? 'Проверяем...' : 'Verifying...');

    await ctx.editMessageText(
      isRu
        ? '✅ <b>Верификация</b>\n\nВерификация канала обрабатывается.\n\nУбедитесь, что бот добавлен как администратор канала.'
        : '✅ <b>Verification</b>\n\nChannel verification is being processed.\n\nPlease make sure the bot is added as admin to your channel.',
      {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard()
          .text(isRu ? '📺 Мои каналы' : '📺 My Channels', 'menu:channels')
          .row()
          .text(isRu ? '« Назад' : '« Back to Menu', 'back_to_menu'),
      },
    );
  }

  private async handleHelpCallback(ctx: BotContext): Promise<void> {
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    const [, action] = data.split(':');

    switch (action) {
      case 'channel_owner':
        await this.helpCommand.showChannelOwnerGuide(ctx);
        break;
      case 'advertiser':
        await this.helpCommand.showAdvertiserGuide(ctx);
        break;
      case 'payments':
        await this.helpCommand.showPaymentsGuide(ctx);
        break;
      case 'safety':
        await this.helpCommand.showSafetyGuide(ctx);
        break;
      default:
        await ctx.answerCallbackQuery('Unknown help topic');
    }
  }

  private async handleDealsFilterCallback(ctx: BotContext): Promise<void> {
    const isRu = (ctx.session.language || 'en') === 'ru';
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    const [, filter] = data.split(':');
    const from = ctx.from;
    if (!from) return;

    const user = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(from.id) },
    });

    if (!user) {
      await ctx.answerCallbackQuery(isRu ? 'Используйте /start' : 'Please use /start first');
      return;
    }

    await ctx.answerCallbackQuery();

    let statusFilter: string[] = [];
    let title = '';

    switch (filter) {
      case 'incoming':
        title = isRu ? '📥 Входящие сделки' : '📥 Incoming Deals';
        statusFilter = ['CREATED', 'PENDING_PAYMENT'];
        break;
      case 'outgoing':
        title = isRu ? '📤 Исходящие сделки' : '📤 Outgoing Deals';
        statusFilter = ['CREATED', 'PENDING_PAYMENT'];
        break;
      case 'active':
        title = isRu ? '🔄 Активные сделки' : '🔄 Active Deals';
        statusFilter = ['IN_PROGRESS', 'CREATIVE_PENDING', 'CREATIVE_SUBMITTED', 'CREATIVE_APPROVED', 'SCHEDULED', 'POSTED', 'VERIFYING'];
        break;
      case 'completed':
        title = isRu ? '✅ Завершённые сделки' : '✅ Completed Deals';
        statusFilter = ['COMPLETED', 'VERIFIED'];
        break;
      default:
        await ctx.editMessageText(isRu ? 'Неизвестный фильтр' : 'Unknown filter');
        return;
    }

    const deals = await this.prisma.deal.findMany({
      where: {
        OR: [
          { advertiserId: user.id },
          { channel: { ownerId: user.id } },
        ],
        status: { in: statusFilter as any },
      },
      include: { channel: true, advertiser: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (deals.length === 0) {
      const keyboard = new InlineKeyboard().text(isRu ? '« Назад к сделкам' : '« Back to Deals', 'menu:deals');
      await ctx.editMessageText(
        `<b>${title}</b>\n\n${isRu ? 'Сделок не найдено.' : 'No deals found in this category.'}`,
        { parse_mode: 'HTML', reply_markup: keyboard },
      );
      return;
    }

    const keyboard = new InlineKeyboard();
    for (const deal of deals) {
      const amount = Number(deal.totalAmount) / 1_000_000_000;
      keyboard.text(
        `${deal.referenceNumber} - ${amount.toFixed(1)} TON`,
        `deal:view:${deal.id}`,
      ).row();
    }
    keyboard.text(isRu ? '« Назад к сделкам' : '« Back to Deals', 'menu:deals');

    await ctx.editMessageText(
      `<b>${title}</b>\n\n${isRu ? `Найдено ${deals.length} сделок:` : `Found ${deals.length} deal(s):`}`,
      { parse_mode: 'HTML', reply_markup: keyboard },
    );
  }

  private async handleMenuCallback(ctx: BotContext): Promise<void> {
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    const [, action] = data.split(':');

    switch (action) {
      case 'channels':
        await ctx.answerCallbackQuery();
        await this.myChannelsCommand.handle(ctx);
        break;
      case 'deals':
        await ctx.answerCallbackQuery();
        await this.myDealsCommand.handle(ctx);
        break;
      case 'settings':
        await ctx.answerCallbackQuery();
        await this.settingsCommand.handle(ctx);
        break;
      case 'help':
        await ctx.answerCallbackQuery();
        await this.helpCommand.handle(ctx);
        break;
      case 'campaign': {
        const isRu = (ctx.session.language || 'en') === 'ru';
        await ctx.answerCallbackQuery();
        await ctx.reply(isRu ? 'Создание кампаний скоро будет доступно!' : 'Campaign creation coming soon!');
        break;
      }
      default:
        await ctx.answerCallbackQuery('Unknown menu');
    }
  }

  private async handleInlineQuery(ctx: BotContext): Promise<void> {
    const query = ctx.inlineQuery?.query;
    if (!query) return;

    await ctx.answerInlineQuery([]);
  }

  private async handleChannelPost(ctx: BotContext): Promise<void> {
    const post = ctx.channelPost;
    if (!post) return;

    const chatId = post.chat.id;
    const messageId = post.message_id;

    this.logger.debug(`Channel post: chatId=${chatId}, msgId=${messageId}`);

    try {

      const channel = await this.channelsService.getChannelByTelegramId(String(chatId));
      if (!channel) return;

      const pendingDeals = await this.prisma.deal.findMany({
        where: {
          channelId: channel.id,
          status: { in: ['SCHEDULED', 'CREATIVE_APPROVED', 'POSTED'] },
        },
        include: { publishedPosts: true },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      });

      for (const deal of pendingDeals) {
        const matchingPost = deal.publishedPosts.find(
          (p) => p.telegramMessageId === messageId,
        );

        if (matchingPost) {
          await this.prisma.publishedPost.update({
            where: { id: matchingPost.id },
            data: {
              lastVerifiedAt: new Date(),
              verificationCount: { increment: 1 },
            },
          });
          this.logger.log(`Verified published post for deal ${deal.id}`);
        }
      }
    } catch (error) {
      this.logger.error(`Channel post handler error: ${(error as Error).message}`);
    }
  }

  private async handleTextMessage(ctx: BotContext): Promise<void> {
    const step = ctx.session?.step;

    if (step?.startsWith('add_channel:')) {
      await this.addChannelConversation.handleMessage(ctx);
      return;
    }

    if (step?.startsWith('edit_pricing:')) {
      const isRu = (ctx.session.language || 'en') === 'ru';
      await ctx.reply(isRu ? 'Цены теперь настраиваются в Mini App.' : 'Pricing is now managed in the Mini App.', {
        reply_markup: new InlineKeyboard().webApp(isRu ? 'Открыть приложение' : 'Open App', this.botService.getMiniAppUrl()),
      });
      ctx.session.step = undefined;
      ctx.session.data = {};
      return;
    }

    if (step === 'creative:awaiting_message') {
      await this.creativeConversation.handleCreativeMessage(ctx);
      return;
    }

    if (step === 'creative:revision_feedback') {
      await this.creativeConversation.handleRevisionFeedback(ctx);
      return;
    }

    const text = ctx.message?.text?.trim();
    if (text && /^@[a-zA-Z]\w{3,}$/.test(text)) {
      const username = text.slice(1);
      await this.addChannelCommand.addByUsername(ctx, username);
      return;
    }
  }

  private async handleChatMemberUpdate(ctx: BotContext): Promise<void> {
    const update = ctx.myChatMember;
    if (!update) return;

    const chat = update.chat;
    const newStatus = update.new_chat_member.status;
    const oldStatus = update.old_chat_member.status;
    const fromUser = update.from;

    if (chat.type === 'channel' || chat.type === 'supergroup') {
      if (newStatus === 'administrator' && oldStatus !== 'administrator') {
        this.logger.log(
          `Bot added as admin to ${chat.type} ${chat.id} (@${(chat as any).username || 'unknown'})`,
        );

        if (fromUser) {
          try {

            const dbUser = await this.prisma.user.findUnique({ where: { telegramId: BigInt(fromUser.id) } });
            const isRu = (dbUser?.languageCode || fromUser.language_code || 'en') === 'ru';
            await this.botService.sendMessage(
              fromUser.id,
              isRu
                ? `<b>Бот добавлен!</b>\n\nЯ добавлен как админ в <b>${(chat as any).title || 'ваш канал'}</b>.\nИспользуйте /channels или Mini App для регистрации.`
                : `<b>Bot Added!</b>\n\nI've been added as admin to <b>${(chat as any).title || 'your channel'}</b>.\nUse /channels or the Mini App to register it.`,
            );
          } catch (error) {
            this.logger.warn(`Could not notify user ${fromUser.id}: ${(error as Error).message}`);
          }
        }
      } else if (newStatus !== 'administrator' && oldStatus === 'administrator') {
        this.logger.log(`Bot removed as admin from ${chat.type} ${chat.id}`);
        try {
          const channel = await this.channelsService.getChannelByTelegramId(String(chat.id));
          if (channel) {
            await this.prisma.channel.update({
              where: { id: channel.id },
              data: { isActive: false },
            });
            this.logger.log(`Deactivated channel ${channel.id} (${channel.title})`);
          }
        } catch (error) {
          this.logger.warn(`Failed to deactivate channel: ${(error as Error).message}`);
        }
      }
    } else if (chat.type === 'private') {
      if (newStatus === 'kicked' && oldStatus !== 'kicked') {
        this.logger.log(`User ${fromUser.id} blocked the bot`);
      } else if (oldStatus === 'kicked' && newStatus === 'member') {
        this.logger.log(`User ${fromUser.id} unblocked the bot`);
      }
    }
  }

  private async handlePreCheckoutQuery(ctx: BotContext): Promise<void> {
    try {
      const query = ctx.preCheckoutQuery;
      if (!query) return;

      this.logger.log(
        `Pre-checkout query ${query.id}: ${query.total_amount} ${query.currency}, ` +
        `payload: ${query.invoice_payload}`,
      );

      await ctx.answerPreCheckoutQuery(true);
    } catch (error) {
      this.logger.error(`Pre-checkout error: ${(error as Error).message}`);
      try {
        await ctx.answerPreCheckoutQuery(false, 'Payment processing error. Please try again.');
      } catch {

      }
    }
  }

  private async handleSuccessfulPayment(ctx: BotContext): Promise<void> {
    const payment = ctx.message?.successful_payment;
    if (!payment) return;

    this.logger.log(
      `Payment received from ${ctx.from?.id}: ` +
      `${payment.total_amount} ${payment.currency}, payload: ${payment.invoice_payload}`,
    );

    const isRu = (ctx.session?.language || 'en') === 'ru';
    await ctx.reply(
      isRu
        ? '<b>Оплата получена!</b>\n\nВаш платёж успешно обработан.'
        : '<b>Payment Received!</b>\n\nYour payment has been processed successfully.',
      { parse_mode: 'HTML' },
    );
  }
}
