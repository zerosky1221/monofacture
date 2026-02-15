import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InlineKeyboard } from 'grammy';
import { BotContext } from '../telegram-bot.service';
import { DealsService } from '../../deals/deals.service';
import { UsersService } from '../../users/users.service';
import { DealStatus } from '@prisma/client';

@Injectable()
export class MyDealsCommand {
  constructor(
    @Inject(forwardRef(() => DealsService))
    private readonly dealsService: DealsService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
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

    const keyboard = new InlineKeyboard()
      .text(isRu ? '📥 Входящие' : '📥 Incoming', 'deals:incoming')
      .text(isRu ? '📤 Исходящие' : '📤 Outgoing', 'deals:outgoing')
      .row()
      .text(isRu ? '🔄 Активные' : '🔄 Active', 'deals:active')
      .text(isRu ? '✅ Завершённые' : '✅ Completed', 'deals:completed')
      .row()
      .text(isRu ? '« Назад' : '« Back to Menu', 'back_to_menu');

    const allDeals = await this.dealsService.getDealsForUser(user.id);
    const activeDealsCount = allDeals.filter(d =>
      ['PENDING_PAYMENT', 'IN_PROGRESS', 'CREATIVE_PENDING', 'CREATIVE_SUBMITTED', 'SCHEDULED', 'POSTED'].includes(d.status)
    ).length;

    await ctx.reply(
      isRu
        ? `📋 <b>Мои сделки</b>\n\n<b>Активных сделок:</b> ${activeDealsCount}\n\nВыберите категорию:`
        : `📋 <b>My Deals</b>\n\n<b>Active Deals:</b> ${activeDealsCount}\n\nSelect a category to view:`,
      {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      },
    );
  }

  async showDealDetails(ctx: BotContext, dealId: string): Promise<void> {
    const isRu = (ctx.session.language || 'en') === 'ru';
    const deal = await this.dealsService.getDealById(dealId);

    if (!deal) {
      await ctx.answerCallbackQuery(isRu ? 'Сделка не найдена' : 'Deal not found');
      return;
    }

    const keyboard = new InlineKeyboard();

    switch (deal.status) {
      case DealStatus.CREATED:
        keyboard
          .text(isRu ? '✅ Принять' : '✅ Accept', `deal:accept:${dealId}`)
          .text(isRu ? '❌ Отклонить' : '❌ Reject', `deal:reject:${dealId}`)
          .row();
        break;
      case DealStatus.CREATIVE_SUBMITTED:
        keyboard
          .text(isRu ? '👁️ Креатив' : '👁️ View Creative', `deal:creative:${dealId}`)
          .row()
          .text(isRu ? '✅ Одобрить' : '✅ Approve', `deal:approve:${dealId}`)
          .text(isRu ? '↩️ Правки' : '↩️ Request Revision', `deal:revision:${dealId}`)
          .row();
        break;
      case DealStatus.CREATIVE_APPROVED:
        keyboard
          .text(isRu ? '📅 Запланировать' : '📅 Schedule Post', `deal:schedule:${dealId}`)
          .row();
        break;
      case DealStatus.DISPUTED:
        keyboard
          .text(isRu ? '📄 Спор' : '📄 View Dispute', `deal:dispute:${dealId}`)
          .row();
        break;
    }

    keyboard
      .text(isRu ? '💬 Сообщения' : '💬 Messages', `deal:messages:${dealId}`)
      .row()
      .text(isRu ? '« Назад к сделкам' : '« Back to Deals', 'menu:deals');

    const statusEmoji = this.getStatusEmoji(deal.status);
    const priceInTon = Number(deal.totalAmount) / 1_000_000_000;

    const message = isRu ? `
📋 <b>Сделка ${deal.referenceNumber}</b>

<b>Статус:</b> ${statusEmoji} ${this.getStatusText(deal.status, true)}
<b>Формат:</b> ${deal.adFormat}
<b>Сумма:</b> ${priceInTon.toFixed(2)} TON

<b>Канал:</b> ${(deal as any).channel?.title || 'Неизвестно'}
<b>Рекламодатель:</b> @${(deal as any).advertiser?.telegramUsername || 'Неизвестно'}

<b>Создана:</b> ${new Date(deal.createdAt).toLocaleString('ru-RU')}
${deal.scheduledPostTime ? `<b>Запланирована:</b> ${new Date(deal.scheduledPostTime).toLocaleString('ru-RU')}` : ''}

${deal.brief ? `<b>Бриф:</b>\n${deal.brief}` : ''}
    `.trim() : `
📋 <b>Deal ${deal.referenceNumber}</b>

<b>Status:</b> ${statusEmoji} ${deal.status.replace(/_/g, ' ')}
<b>Format:</b> ${deal.adFormat}
<b>Amount:</b> ${priceInTon.toFixed(2)} TON

<b>Channel:</b> ${(deal as any).channel?.title || 'Unknown'}
<b>Advertiser:</b> @${(deal as any).advertiser?.telegramUsername || 'Unknown'}

<b>Created:</b> ${new Date(deal.createdAt).toLocaleString()}
${deal.scheduledPostTime ? `<b>Scheduled:</b> ${new Date(deal.scheduledPostTime).toLocaleString()}` : ''}

${deal.brief ? `<b>Brief:</b>\n${deal.brief}` : ''}
    `.trim();

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  }

  async acceptDeal(ctx: BotContext, dealId: string): Promise<void> {
    const isRu = (ctx.session.language || 'en') === 'ru';
    const from = ctx.from;
    if (!from) return;

    const user = await this.usersService.findByTelegramId(BigInt(from.id));
    if (!user) {
      await ctx.answerCallbackQuery(isRu ? 'Пользователь не найден' : 'User not found');
      return;
    }

    try {
      await this.dealsService.acceptDeal(dealId, user.id);
      await ctx.answerCallbackQuery(isRu ? 'Сделка принята! ✅' : 'Deal accepted! ✅');
      await this.showDealDetails(ctx, dealId);
    } catch (error) {
      await ctx.answerCallbackQuery(`${isRu ? 'Ошибка' : 'Error'}: ${(error as Error).message}`);
    }
  }

  async rejectDeal(ctx: BotContext, dealId: string): Promise<void> {
    const isRu = (ctx.session.language || 'en') === 'ru';
    const from = ctx.from;
    if (!from) return;

    const user = await this.usersService.findByTelegramId(BigInt(from.id));
    if (!user) {
      await ctx.answerCallbackQuery(isRu ? 'Пользователь не найден' : 'User not found');
      return;
    }

    try {
      await this.dealsService.rejectDeal(dealId, user.id, 'Rejected via bot');
      await ctx.answerCallbackQuery(isRu ? 'Сделка отклонена' : 'Deal rejected');
      await this.showDealDetails(ctx, dealId);
    } catch (error) {
      await ctx.answerCallbackQuery(`${isRu ? 'Ошибка' : 'Error'}: ${(error as Error).message}`);
    }
  }

  async showCreative(ctx: BotContext, dealId: string): Promise<void> {
    const isRu = (ctx.session.language || 'en') === 'ru';
    const deal = await this.dealsService.getDealById(dealId);

    if (!deal || !(deal as any).creative) {
      await ctx.answerCallbackQuery(isRu ? 'Креатив не найден' : 'Creative not found');
      return;
    }

    const creative = (deal as any).creative;
    const keyboard = new InlineKeyboard()
      .text(isRu ? '✅ Одобрить' : '✅ Approve', `deal:approve:${dealId}`)
      .text(isRu ? '↩️ Правки' : '↩️ Request Revision', `deal:revision:${dealId}`)
      .row()
      .text(isRu ? '« Назад к сделке' : '« Back to Deal', `deal:view:${dealId}`);

    const message = isRu ? `
🎨 <b>Креатив для сделки ${deal.referenceNumber}</b>

<b>Текст:</b>
${creative.text || 'Нет текста'}

<b>Медиа:</b> ${creative.mediaUrls?.length || 0} файл(ов)
<b>Кнопки:</b> ${creative.buttons ? 'Да' : 'Нет'}
<b>Версия:</b> ${creative.version}
<b>Статус:</b> ${creative.status}

${creative.revisionRequests?.length ? `<b>Замечания:</b>\n${creative.revisionRequests.join('\n')}` : ''}
    `.trim() : `
🎨 <b>Creative for Deal ${deal.referenceNumber}</b>

<b>Text:</b>
${creative.text || 'No text'}

<b>Media:</b> ${creative.mediaUrls?.length || 0} file(s)
<b>Buttons:</b> ${creative.buttons ? 'Yes' : 'No'}
<b>Version:</b> ${creative.version}
<b>Status:</b> ${creative.status}

${creative.revisionRequests?.length ? `<b>Revision Notes:</b>\n${creative.revisionRequests.join('\n')}` : ''}
    `.trim();

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  }

  private getStatusEmoji(status: DealStatus): string {
    const emojis: Record<DealStatus, string> = {
      [DealStatus.CREATED]: '🆕',
      [DealStatus.PENDING_PAYMENT]: '💳',
      [DealStatus.PAYMENT_RECEIVED]: '💰',
      [DealStatus.IN_PROGRESS]: '🔄',
      [DealStatus.CREATIVE_PENDING]: '✍️',
      [DealStatus.CREATIVE_SUBMITTED]: '📝',
      [DealStatus.CREATIVE_REVISION_REQUESTED]: '↩️',
      [DealStatus.CREATIVE_APPROVED]: '✅',
      [DealStatus.SCHEDULED]: '📅',
      [DealStatus.POSTED]: '📤',
      [DealStatus.VERIFYING]: '🔍',
      [DealStatus.VERIFIED]: '✓',
      [DealStatus.COMPLETED]: '🎉',
      [DealStatus.DISPUTED]: '⚠️',
      [DealStatus.REFUNDED]: '↩️',
      [DealStatus.CANCELLED]: '❌',
      [DealStatus.EXPIRED]: '⏰',
    };
    return emojis[status] || '❓';
  }

  private getStatusText(status: DealStatus, isRu: boolean): string {
    if (!isRu) return status.replace(/_/g, ' ');
    const texts: Record<DealStatus, string> = {
      [DealStatus.CREATED]: 'Создана',
      [DealStatus.PENDING_PAYMENT]: 'Ожидает оплаты',
      [DealStatus.PAYMENT_RECEIVED]: 'Оплата получена',
      [DealStatus.IN_PROGRESS]: 'В работе',
      [DealStatus.CREATIVE_PENDING]: 'Ожидает креатив',
      [DealStatus.CREATIVE_SUBMITTED]: 'Креатив отправлен',
      [DealStatus.CREATIVE_REVISION_REQUESTED]: 'Правки запрошены',
      [DealStatus.CREATIVE_APPROVED]: 'Креатив одобрен',
      [DealStatus.SCHEDULED]: 'Запланирована',
      [DealStatus.POSTED]: 'Опубликована',
      [DealStatus.VERIFYING]: 'Проверяется',
      [DealStatus.VERIFIED]: 'Проверена',
      [DealStatus.COMPLETED]: 'Завершена',
      [DealStatus.DISPUTED]: 'Спор',
      [DealStatus.REFUNDED]: 'Возврат',
      [DealStatus.CANCELLED]: 'Отменена',
      [DealStatus.EXPIRED]: 'Истекла',
    };
    return texts[status] || status;
  }
}
