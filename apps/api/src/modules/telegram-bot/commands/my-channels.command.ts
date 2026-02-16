import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InlineKeyboard } from 'grammy';
import { BotContext, TelegramBotService } from '../telegram-bot.service';
import { ChannelsService } from '../../channels/channels.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class MyChannelsCommand {
  constructor(
    @Inject(forwardRef(() => ChannelsService))
    private readonly channelsService: ChannelsService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => TelegramBotService))
    private readonly botService: TelegramBotService,
  ) {}

  async handle(ctx: BotContext): Promise<void> {
    const from = ctx.from;
    if (!from) return;
    const isRu = (ctx.session.language || 'en') === 'ru';

    const user = await this.usersService.findByTelegramId(BigInt(from.id));
    if (!user) {
      await ctx.reply(isRu ? 'Пожалуйста, сначала используйте /start для регистрации.' : 'Please use /start first to register.');
      return;
    }

    const channels = await this.channelsService.getChannelsByOwner(user.id);

    if (channels.length === 0) {
      const keyboard = new InlineKeyboard()
        .text(isRu ? '➕ Добавить канал' : '➕ Add Channel', 'add_channel')
        .row()
        .text(isRu ? '« Назад' : '« Back to Menu', 'back_to_menu');

      await ctx.reply(
        isRu
          ? '📺 <b>Мои каналы</b>\n\n' +
            'У вас пока нет каналов.\n\n' +
            'Чтобы добавить канал:\n' +
            '1. Добавьте бота как администратора канала\n' +
            '2. Нажмите «Добавить канал» ниже'
          : '📺 <b>My Channels</b>\n\n' +
            'You haven\'t added any channels yet.\n\n' +
            'To add a channel:\n' +
            '1. Add this bot as admin to your channel\n' +
            '2. Click "Add Channel" below',
        {
          parse_mode: 'HTML',
          reply_markup: keyboard,
        },
      );
      return;
    }

    const keyboard = new InlineKeyboard();

    for (const channel of channels.slice(0, 10)) {
      const statusEmoji = channel.isActive ? '🟢' : '🔴';
      keyboard
        .text(`${statusEmoji} ${channel.title}`, `channel:view:${channel.id}`)
        .row();
    }

    keyboard
      .text(isRu ? '➕ Добавить канал' : '➕ Add Channel', 'add_channel')
      .row()
      .text(isRu ? '« Назад' : '« Back to Menu', 'back_to_menu');

    await ctx.reply(
      isRu
        ? `📺 <b>Мои каналы</b>\n\nУ вас ${channels.length} канал(ов).\nВыберите канал для управления:`
        : `📺 <b>My Channels</b>\n\nYou have ${channels.length} channel(s).\nSelect a channel to manage:`,
      {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      },
    );
  }

  async showChannelDetails(ctx: BotContext, channelId: string): Promise<void> {
    const isRu = (ctx.session.language || 'en') === 'ru';
    const channel = await this.channelsService.getChannelById(channelId);

    if (!channel) {
      await ctx.answerCallbackQuery(isRu ? 'Канал не найден' : 'Channel not found');
      return;
    }

    const keyboard = new InlineKeyboard()
      .text(isRu ? '📊 Статистика' : '📊 Stats', `channel:stats:${channelId}`)
      .text(isRu ? '💰 Цены' : '💰 Pricing', `channel:pricing:${channelId}`)
      .row()
      .text(channel.isActive
        ? (isRu ? '🔴 Деактивировать' : '🔴 Deactivate')
        : (isRu ? '🟢 Активировать' : '🟢 Activate'), `channel:toggle:${channelId}`)
      .row()
      .text(isRu ? '« Назад к каналам' : '« Back to Channels', 'menu:channels');

    const statusText = channel.isActive
      ? (isRu ? '🟢 Активен' : '🟢 Active')
      : (isRu ? '🔴 Неактивен' : '🔴 Inactive');
    const verifiedText = channel.status === 'VERIFIED' || channel.status === 'ACTIVE'
      ? (isRu ? '✅ Верифицирован' : '✅ Verified')
      : (isRu ? '⏳ Ожидает верификации' : '⏳ Pending Verification');

    const message = isRu ? `
📺 <b>${channel.title}</b>
${channel.username ? `@${channel.username}` : ''}

<b>Статус:</b> ${statusText}
<b>Верификация:</b> ${verifiedText}

<b>Подписчики:</b> ${channel.subscriberCount?.toLocaleString() || 'Н/Д'}
<b>Ср. просмотры:</b> ${channel.averageViews?.toLocaleString() || 'Н/Д'}
<b>Вовлечённость:</b> ${(channel.engagementRate * 100).toFixed(1)}%

<b>Всего сделок:</b> ${channel.totalDeals}
<b>Успешных:</b> ${channel.successfulDeals}
<b>Рейтинг:</b> ${'⭐'.repeat(Math.round(channel.rating))} (${channel.rating.toFixed(1)})
    `.trim() : `
📺 <b>${channel.title}</b>
${channel.username ? `@${channel.username}` : ''}

<b>Status:</b> ${statusText}
<b>Verification:</b> ${verifiedText}

<b>Subscribers:</b> ${channel.subscriberCount?.toLocaleString() || 'N/A'}
<b>Avg Views:</b> ${channel.averageViews?.toLocaleString() || 'N/A'}
<b>Engagement:</b> ${(channel.engagementRate * 100).toFixed(1)}%

<b>Total Deals:</b> ${channel.totalDeals}
<b>Successful:</b> ${channel.successfulDeals}
<b>Rating:</b> ${'⭐'.repeat(Math.round(channel.rating))} (${channel.rating.toFixed(1)})
    `.trim();

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  }

  async showChannelStats(ctx: BotContext, channelId: string): Promise<void> {
    const isRu = (ctx.session.language || 'en') === 'ru';
    const channel = await this.channelsService.getChannelById(channelId);

    if (!channel) {
      await ctx.answerCallbackQuery(isRu ? 'Канал не найден' : 'Channel not found');
      return;
    }

    const stats = (channel as any).stats;
    const keyboard = new InlineKeyboard()
      .text(isRu ? '🔄 Обновить' : '🔄 Refresh Stats', `channel:refresh:${channelId}`)
      .row()
      .text(isRu ? '« Назад к каналу' : '« Back to Channel', `channel:view:${channelId}`);

    const message = isRu ? `
📊 <b>Статистика ${channel.title}</b>

<b>Подписчики:</b>
• Текущие: ${stats?.subscriberCount?.toLocaleString() || channel.subscriberCount?.toLocaleString() || 'Н/Д'}
• Рост за 24ч: ${stats?.subscriberGrowth24h > 0 ? '+' : ''}${stats?.subscriberGrowth24h || 0}
• Рост за 7д: ${stats?.subscriberGrowth7d > 0 ? '+' : ''}${stats?.subscriberGrowth7d || 0}

<b>Вовлечённость:</b>
• Ср. просмотры: ${stats?.averageViews?.toLocaleString() || 'Н/Д'}
• Вовлечённость: ${((stats?.engagementRate || 0) * 100).toFixed(1)}%
• Ср. реакции: ${stats?.averageReactions || 'Н/Д'}

<b>Активность:</b>
• Постов (24ч): ${stats?.postsLast24h || 0}
• Постов (7д): ${stats?.postsLast7d || 0}

<i>Обновлено: ${stats?.lastFetchedAt ? new Date(stats.lastFetchedAt).toLocaleString('ru-RU') : 'Никогда'}</i>
    `.trim() : `
📊 <b>Stats for ${channel.title}</b>

<b>Subscribers:</b>
• Current: ${stats?.subscriberCount?.toLocaleString() || channel.subscriberCount?.toLocaleString() || 'N/A'}
• 24h Growth: ${stats?.subscriberGrowth24h > 0 ? '+' : ''}${stats?.subscriberGrowth24h || 0}
• 7d Growth: ${stats?.subscriberGrowth7d > 0 ? '+' : ''}${stats?.subscriberGrowth7d || 0}

<b>Engagement:</b>
• Avg Views: ${stats?.averageViews?.toLocaleString() || 'N/A'}
• Engagement Rate: ${((stats?.engagementRate || 0) * 100).toFixed(1)}%
• Avg Reactions: ${stats?.averageReactions || 'N/A'}

<b>Activity:</b>
• Posts (24h): ${stats?.postsLast24h || 0}
• Posts (7d): ${stats?.postsLast7d || 0}

<i>Last updated: ${stats?.lastFetchedAt ? new Date(stats.lastFetchedAt).toLocaleString() : 'Never'}</i>
    `.trim();

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  }

  async showChannelPricing(ctx: BotContext, channelId: string): Promise<void> {
    const isRu = (ctx.session.language || 'en') === 'ru';
    const channel = await this.channelsService.getChannelById(channelId);

    if (!channel) {
      await ctx.answerCallbackQuery(isRu ? 'Канал не найден' : 'Channel not found');
      return;
    }

    const pricing = await this.channelsService.getPricing(channelId);

    const keyboard = new InlineKeyboard()
      .webApp(isRu ? 'Управление в приложении' : 'Manage in App', this.botService.getMiniAppUrl())
      .row()
      .text(isRu ? '« Назад к каналу' : '« Back to Channel', `channel:view:${channelId}`);

    let pricingText = '';
    if (pricing.length === 0) {
      pricingText = isRu ? 'Цены пока не установлены. Откройте приложение для настройки.' : 'No pricing set yet. Open the app to configure.';
    } else {
      for (const p of pricing) {
        const hourlyTon = Number(p.pricePerHour) / 1_000_000_000;
        pricingText += `• <b>${p.adFormat}:</b> ${hourlyTon} TON/${isRu ? 'ч' : 'hr'}`;
        if (p.pricePermanent) {
          const permTon = Number(p.pricePermanent) / 1_000_000_000;
          pricingText += ` | ${permTon} TON ${isRu ? 'навсегда' : 'permanent'}`;
        }
        pricingText += ` (${p.minHours}-${p.maxHours}${isRu ? 'ч' : 'h'})`;
        pricingText += '\n';
      }
    }

    const message = isRu ? `
💰 <b>Цены для ${channel.title}</b>

${pricingText}

<i>Указаны суммы после вычета комиссии платформы (5%)</i>
    `.trim() : `
💰 <b>Pricing for ${channel.title}</b>

${pricingText}

<i>Prices shown are what you receive after platform fee (5%)</i>
    `.trim();

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  }

  async toggleChannel(ctx: BotContext, channelId: string): Promise<void> {
    const isRu = (ctx.session.language || 'en') === 'ru';
    const userId = ctx.session?.userId;
    if (!userId) {
      await ctx.answerCallbackQuery(isRu ? 'Перезапустите с /start' : 'Please restart with /start');
      return;
    }

    const channel = await this.channelsService.getChannelById(channelId);

    if (!channel) {
      await ctx.answerCallbackQuery(isRu ? 'Канал не найден' : 'Channel not found');
      return;
    }

    const newIsActive = !channel.isActive;
    await this.channelsService.updateChannel(channelId, userId, {
      isActive: newIsActive,
    });

    const newStatus = newIsActive
      ? (isRu ? 'активирован' : 'activated')
      : (isRu ? 'деактивирован' : 'deactivated');
    await ctx.answerCallbackQuery(`${isRu ? 'Канал' : 'Channel'} ${newStatus}! ✅`);

    const updatedChannel = await this.channelsService.getChannelById(channelId);
    if (!updatedChannel) return;

    const keyboard = new InlineKeyboard()
      .text(isRu ? '📊 Статистика' : '📊 Stats', `channel:stats:${channelId}`)
      .text(isRu ? '💰 Цены' : '💰 Pricing', `channel:pricing:${channelId}`)
      .row()
      .text(updatedChannel.isActive
        ? (isRu ? '🔴 Деактивировать' : '🔴 Deactivate')
        : (isRu ? '🟢 Активировать' : '🟢 Activate'), `channel:toggle:${channelId}`)
      .row()
      .text(isRu ? '« Назад к каналам' : '« Back to Channels', 'menu:channels');

    const statusText = updatedChannel.isActive
      ? (isRu ? '🟢 Активен' : '🟢 Active')
      : (isRu ? '🔴 Неактивен' : '🔴 Inactive');
    const verifiedText = updatedChannel.status === 'VERIFIED' || updatedChannel.status === 'ACTIVE'
      ? (isRu ? '✅ Верифицирован' : '✅ Verified')
      : (isRu ? '⏳ Ожидает' : '⏳ Pending');

    const message = isRu ? `
📺 <b>${updatedChannel.title}</b>
${updatedChannel.username ? `@${updatedChannel.username}` : ''}

<b>Статус:</b> ${statusText}
<b>Верификация:</b> ${verifiedText}

<b>Подписчики:</b> ${updatedChannel.subscriberCount?.toLocaleString() || 'Н/Д'}
<b>Ср. просмотры:</b> ${updatedChannel.averageViews?.toLocaleString() || 'Н/Д'}
<b>Вовлечённость:</b> ${(updatedChannel.engagementRate * 100).toFixed(1)}%

<b>Всего сделок:</b> ${updatedChannel.totalDeals}
<b>Успешных:</b> ${updatedChannel.successfulDeals}
<b>Рейтинг:</b> ${'⭐'.repeat(Math.round(updatedChannel.rating))} (${updatedChannel.rating.toFixed(1)})
    `.trim() : `
📺 <b>${updatedChannel.title}</b>
${updatedChannel.username ? `@${updatedChannel.username}` : ''}

<b>Status:</b> ${statusText}
<b>Verification:</b> ${verifiedText}

<b>Subscribers:</b> ${updatedChannel.subscriberCount?.toLocaleString() || 'N/A'}
<b>Avg Views:</b> ${updatedChannel.averageViews?.toLocaleString() || 'N/A'}
<b>Engagement:</b> ${(updatedChannel.engagementRate * 100).toFixed(1)}%

<b>Total Deals:</b> ${updatedChannel.totalDeals}
<b>Successful:</b> ${updatedChannel.successfulDeals}
<b>Rating:</b> ${'⭐'.repeat(Math.round(updatedChannel.rating))} (${updatedChannel.rating.toFixed(1)})
    `.trim();

    try {
      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    } catch (e) {

      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    }
  }

  async startEditPricing(ctx: BotContext, channelId: string): Promise<void> {
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
          .text(isRu ? '« Назад' : '« Back', `channel:pricing:${channelId}`),
      },
    );
  }

  async refreshChannelStats(ctx: BotContext, channelId: string): Promise<void> {
    const isRu = (ctx.session.language || 'en') === 'ru';
    await ctx.answerCallbackQuery(isRu ? 'Обновляем...' : 'Refreshing stats...');

    await this.showChannelStats(ctx, channelId);
  }
}
