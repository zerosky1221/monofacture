import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InlineKeyboard } from 'grammy';
import { BotContext, TelegramBotService } from '../telegram-bot.service';
import { UsersService } from '../../users/users.service';
import { ReferralService } from '../../referral/referral.service';
import { CreativeSubmissionConversation } from '../conversations/creative-submission.conversation';

@Injectable()
export class StartCommand {
  constructor(
    private readonly botService: TelegramBotService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => ReferralService))
    private readonly referralService: ReferralService,
    @Inject(forwardRef(() => CreativeSubmissionConversation))
    private readonly creativeConversation: CreativeSubmissionConversation,
  ) {}

  async handle(ctx: BotContext): Promise<void> {
    const from = ctx.from;
    if (!from) return;

    const startParam = ctx.match as string | undefined;
    let referralCode: string | undefined;

    if (startParam && startParam.startsWith('ref_')) {
      referralCode = startParam;
    }

    let user = await this.usersService.findByTelegramId(BigInt(from.id));
    const isNewUser = !user;

    if (!user) {
      user = await this.usersService.createFromTelegram({
        telegramId: BigInt(from.id),
        telegramUsername: from.username,
        firstName: from.first_name,
        lastName: from.last_name,
        languageCode: from.language_code,
      });
    }

    ctx.session.userId = user!.id;
    ctx.session.language = user!.languageCode || 'en';

    if (isNewUser && referralCode) {
      const applied = await this.referralService.applyReferralCode(user!.id, referralCode);
      if (applied) {
        const isRu = (ctx.session.language || from.language_code || 'en') === 'ru';
        await ctx.reply(
          isRu
            ? '🎉 <b>Реферальный бонус применён!</b>\n\nВас пригласил друг. Добро пожаловать в Monofacture!'
            : '🎉 <b>Referral bonus applied!</b>\n\nYou were invited by a friend. Welcome to Monofacture!',
          { parse_mode: 'HTML' },
        );
      }
    }

    if (startParam && !startParam.startsWith('ref_')) {
      await this.handleStartParam(ctx, startParam);
      return;
    }

    await this.sendWelcome(ctx);
  }

  private async sendWelcome(ctx: BotContext): Promise<void> {
    const miniAppUrl = process.env.TELEGRAM_WEBAPP_URL || this.botService.getMiniAppUrl();
    const lang = ctx.session.language || 'en';
    const isRu = lang === 'ru';

    const keyboard = new InlineKeyboard()
      .webApp(isRu ? '🚀 Открыть маркетплейс' : '🚀 Open Marketplace', miniAppUrl)
      .row()
      .text(isRu ? '📺 Мои каналы' : '📺 My Channels', 'menu:channels')
      .text(isRu ? '📋 Мои сделки' : '📋 My Deals', 'menu:deals')
      .row()
      .text(isRu ? '📢 Создать кампанию' : '📢 Create Campaign', 'menu:campaign')
      .text(isRu ? '⚙️ Настройки' : '⚙️ Settings', 'menu:settings')
      .row()
      .text(isRu ? '❓ Помощь' : '❓ Help', 'menu:help');

    const message = isRu ? `
👋 <b>Добро пожаловать в Monofacture!</b>

Связывайтесь с владельцами каналов и рекламодателями напрямую в Telegram.

<b>Для владельцев каналов:</b>
- Разместите свой канал и установите цены
- Получайте запросы на рекламу
- Безопасная оплата через TON эскроу

<b>Для рекламодателей:</b>
- Найдите идеальные каналы для рекламы
- Создавайте кампании и охватывайте тысячи
- Безопасные платежи с защитой эскроу

Используйте кнопки ниже или откройте Mini App!
    `.trim() : `
👋 <b>Welcome to Monofacture!</b>

Connect with channel owners or advertisers directly on Telegram.

<b>For Channel Owners:</b>
- List your channel and set prices
- Receive ad requests from advertisers
- Get paid securely via TON escrow

<b>For Advertisers:</b>
- Find the perfect channels for your ads
- Create campaigns and reach thousands
- Secure payments with escrow protection

Use the buttons below or open the Mini App to get started!
    `.trim();

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  }

  private async handleStartParam(ctx: BotContext, param: string): Promise<void> {

    const [action, ...args] = param.split('_');

    switch (action) {
      case 'channel':
        await ctx.reply(`Opening channel ${args.join('_')}...`);
        break;
      case 'deal':
        await ctx.reply(`Opening deal ${args.join('_')}...`);
        break;
      case 'campaign':
        await ctx.reply(`Opening campaign ${args.join('_')}...`);
        break;
      case 'addchannel':
        await this.handleAddChannel(ctx);
        break;
      case 'verify':
        await this.handleVerification(ctx, args[0]);
        break;
      case 'creative':
        await this.creativeConversation.handleDeepLinkCreative(ctx, args.join('_'));
        break;
      case 'review':
        await this.creativeConversation.handleDeepLinkReview(ctx, args.join('_'));
        break;
      default:
        await this.sendWelcome(ctx);
    }
  }

  private async handleAddChannel(ctx: BotContext): Promise<void> {
    const isRu = (ctx.session.language || 'en') === 'ru';

    await ctx.reply(
      isRu
        ? '📢 <b>Добавить канал</b>\n\n' +
          'Отправьте юзернейм вашего канала, например:\n' +
          '<code>@yourchannel</code>\n\n' +
          '⚠️ Перед этим убедитесь:\n' +
          '• @monofacturebot добавлен как админ канала\n' +
          '• Вы являетесь админом/создателем канала'
        : '📢 <b>Add Channel</b>\n\n' +
          'Send your channel username, for example:\n' +
          '<code>@yourchannel</code>\n\n' +
          '⚠️ Before that, make sure:\n' +
          '• @monofacturebot is added as admin to your channel\n' +
          '• You are an admin/creator of the channel',
      { parse_mode: 'HTML' },
    );
  }

  private async handleVerification(ctx: BotContext, token: string): Promise<void> {
    const keyboard = new InlineKeyboard()
      .text('✅ Verify Now', `verify:${token}`)
      .row()
      .text('« Back to Menu', 'back_to_menu');

    await ctx.reply(
      '🔐 <b>Channel Verification</b>\n\n' +
      'Click the button below to verify ownership of your channel.\n\n' +
      'Make sure you have added this bot as an administrator to your channel first.',
      {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      },
    );
  }
}
