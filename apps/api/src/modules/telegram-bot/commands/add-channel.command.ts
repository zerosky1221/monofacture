import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { BotContext, TelegramBotService } from '../telegram-bot.service';
import { ChannelsService } from '../../channels/channels.service';
import { UsersService } from '../../users/users.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { AdFormat } from '@prisma/client';

@Injectable()
export class AddChannelCommand {
  private readonly logger = new Logger(AddChannelCommand.name);

  constructor(
    private readonly botService: TelegramBotService,
    @Inject(forwardRef(() => ChannelsService))
    private readonly channelsService: ChannelsService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  async handle(ctx: BotContext): Promise<void> {
    const from = ctx.from;
    if (!from) return;
    const isRu = (ctx.session.language || 'en') === 'ru';

    const text = ctx.message?.text || '';
    const parts = text.split(' ');
    const usernameArg = parts[1]?.replace('@', '').trim();

    if (!usernameArg) {
      await ctx.reply(
        isRu
          ? '❌ <b>Формат:</b> /addchannel @имяканала\n\n' +
            '<b>Пример:</b> /addchannel @mychannel\n\n' +
            '⚠️ Убедитесь:\n' +
            '1. Добавьте @monofacturebot как админа канала\n' +
            '2. Вы являетесь админом/создателем канала'
          : '❌ <b>Usage:</b> /addchannel @channelname\n\n' +
            '<b>Example:</b> /addchannel @mychannel\n\n' +
            '⚠️ Make sure:\n' +
            '1. Add @monofacturebot as admin to your channel first\n' +
            '2. You are an admin/creator of the channel',
        { parse_mode: 'HTML' },
      );
      return;
    }

    await this.addByUsername(ctx, usernameArg);
  }

  async addByUsername(ctx: BotContext, usernameArg: string): Promise<void> {
    const from = ctx.from;
    if (!from) return;
    const isRu = (ctx.session.language || 'en') === 'ru';

    try {
      const user = await this.usersService.findByTelegramId(BigInt(from.id));
      if (!user) {
        await ctx.reply(
          isRu
            ? '❌ Сначала откройте маркетплейс для создания аккаунта.\n\nИспользуйте /start для получения ссылки.'
            : '❌ Please open the marketplace app first to create your account.\n\nUse /start to get the link to the app.',
        );
        return;
      }

      const bot = this.botService.getBot();
      if (!bot) {
        await ctx.reply(isRu ? '❌ Сервис бота недоступен' : '❌ Bot service unavailable');
        return;
      }

      let chat;
      try {
        chat = await bot.api.getChat('@' + usernameArg);
      } catch (error) {
        await ctx.reply(
          isRu
            ? '❌ Канал @' + usernameArg + ' не найден.\n\nУбедитесь, что канал существует и является публичным.'
            : '❌ Could not find channel @' + usernameArg + '\n\nMake sure the channel exists and is public.',
        );
        return;
      }

      if (chat.type !== 'channel') {
        await ctx.reply(isRu ? '❌ Это не канал. Укажите юзернейм канала.' : '❌ This is not a channel. Please provide a channel username.');
        return;
      }

      let botMember;
      try {
        const botInfo = await bot.api.getMe();
        botMember = await bot.api.getChatMember(chat.id, botInfo.id);
      } catch (error) {
        await ctx.reply(
          isRu
            ? '❌ Сначала добавьте @monofacturebot как администратора канала.\n\nНеобходимые права:\n• Публикация сообщений\n• Редактирование сообщений'
            : '❌ Please add @monofacturebot as admin to your channel first.\n\nRequired permissions:\n• Post messages\n• Edit messages',
        );
        return;
      }

      if (!['administrator', 'creator'].includes(botMember.status)) {
        await ctx.reply(
          isRu
            ? '❌ Добавьте @monofacturebot как <b>администратора</b> канала.\n\nНеобходимые права:\n• Публикация сообщений\n• Редактирование сообщений'
            : '❌ Please add @monofacturebot as <b>administrator</b> to your channel first.\n\nRequired permissions:\n• Post messages\n• Edit messages',
          { parse_mode: 'HTML' },
        );
        return;
      }

      let userMember;
      try {
        userMember = await bot.api.getChatMember(chat.id, from.id);
      } catch (error) {
        await ctx.reply(isRu ? '❌ Не удалось проверить ваш статус администратора в канале.' : '❌ Could not verify your admin status in the channel.');
        return;
      }

      if (!['administrator', 'creator'].includes(userMember.status)) {
        await ctx.reply(isRu ? '❌ Вы должны быть администратором или создателем канала.' : '❌ You must be an admin or creator of this channel to add it.');
        return;
      }

      const existingChannel = await this.channelsService.getChannelByTelegramId(String(chat.id));
      if (existingChannel) {
        if (existingChannel.ownerId === user.id) {
          await ctx.reply(isRu ? '❌ Вы уже зарегистрировали этот канал.' : '❌ You have already registered this channel.');
        } else {
          await ctx.reply(isRu ? '❌ Этот канал уже зарегистрирован другим пользователем.' : '❌ This channel is already registered by another user.');
        }
        return;
      }

      const existingByUsername = await this.prisma.channel.findFirst({
        where: { username: usernameArg.toLowerCase() },
      });
      if (existingByUsername) {
        await ctx.reply(isRu ? '❌ Этот канал уже зарегистрирован.' : '❌ This channel is already registered.');
        return;
      }

      let memberCount = 0;
      try {
        memberCount = await bot.api.getChatMemberCount(chat.id);
      } catch (error) {
        this.logger.warn(`Could not get member count for ${usernameArg}`);
      }

      const channel = await this.prisma.channel.create({
        data: {
          telegramId: BigInt(chat.id),
          title: chat.title || usernameArg,
          username: usernameArg.toLowerCase(),
          description: (chat as any).description || '',
          subscriberCount: memberCount,
          ownerId: user.id,
          isBotAdded: true,
          botAddedAt: new Date(),
          status: 'ACTIVE',
          isActive: true,
          isPublic: true,
        },
      });

      await this.prisma.channelPricing.create({
        data: {
          channelId: channel.id,
          adFormat: AdFormat.POST,
          pricePerHour: BigInt(5_000_000_000),
          minHours: 1,
          maxHours: 168,
          currency: 'TON',
          isActive: true,
        },
      });

      this.logger.log(`Channel @${usernameArg} added by user ${user.id}`);

      await ctx.reply(
        isRu
          ? `✅ <b>Канал успешно добавлен!</b>\n\n` +
            `<b>Канал:</b> @${usernameArg}\n` +
            `<b>Подписчики:</b> ${memberCount.toLocaleString()}\n` +
            `<b>Цена по умолчанию:</b> 10 TON за пост\n\n` +
            `Управляйте каналом в Mini App:\n` +
            `• Установите свои цены\n` +
            `• Просматривайте статистику\n` +
            `• Принимайте заказы на рекламу\n\n` +
            `Используйте /mychannels для просмотра каналов.`
          : `✅ <b>Channel Added Successfully!</b>\n\n` +
            `<b>Channel:</b> @${usernameArg}\n` +
            `<b>Subscribers:</b> ${memberCount.toLocaleString()}\n` +
            `<b>Default Price:</b> 10 TON per post\n\n` +
            `Manage your channel in the Mini App:\n` +
            `• Set custom pricing\n` +
            `• View statistics\n` +
            `• Accept advertising orders\n\n` +
            `Use /mychannels to see your channels.`,
        { parse_mode: 'HTML' },
      );
    } catch (error) {
      this.logger.error(`Error adding channel: ${(error as Error).message}`);
      await ctx.reply('❌ ' + (isRu ? 'Ошибка: ' : 'Error: ') + (error as Error).message);
    }
  }
}
