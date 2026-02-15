import { Injectable } from '@nestjs/common';
import { InlineKeyboard } from 'grammy';
import { BotContext, TelegramBotService } from '../telegram-bot.service';

@Injectable()
export class HelpCommand {
  constructor(private readonly botService: TelegramBotService) {}

  async handle(ctx: BotContext): Promise<void> {
    const isRu = (ctx.session.language || 'en') === 'ru';

    const keyboard = new InlineKeyboard()
      .text(isRu ? '📺 Гайд для владельцев каналов' : '📺 Channel Owners Guide', 'help:channel_owner')
      .row()
      .text(isRu ? '📢 Гайд для рекламодателей' : '📢 Advertisers Guide', 'help:advertiser')
      .row()
      .text(isRu ? '💰 Платежи и эскроу' : '💰 Payments & Escrow', 'help:payments')
      .row()
      .text(isRu ? '🔒 Безопасность и споры' : '🔒 Safety & Disputes', 'help:safety')
      .row()
      .text(isRu ? '« Назад' : '« Back to Menu', 'back_to_menu');

    const message = isRu ? `
❓ <b>Помощь и FAQ</b>

Добро пожаловать в центр помощи! Выберите тему ниже.

<b>Быстрые команды:</b>
/start - Главное меню
/channels - Управление каналами
/deals - Ваши сделки
/settings - Настройки бота
/webapp - Открыть Mini App

<b>Нужна поддержка?</b>
Создайте тикет в Mini App → Поддержка.
    `.trim() : `
❓ <b>Help & FAQ</b>

Welcome to the help center! Select a topic below to learn more.

<b>Quick Commands:</b>
/start - Main menu
/channels - Manage your channels
/deals - View your deals
/settings - Bot settings
/webapp - Open Mini App

<b>Need Support?</b>
Create a ticket in the Mini App → Support.
    `.trim();

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  }

  async showChannelOwnerGuide(ctx: BotContext): Promise<void> {
    const isRu = (ctx.session.language || 'en') === 'ru';

    const keyboard = new InlineKeyboard()
      .text(isRu ? '« Назад к помощи' : '« Back to Help', 'menu:help');

    const message = isRu ? `
📺 <b>Гайд для владельцев каналов</b>

<b>Начало работы:</b>
1. Добавьте бота как администратора канала
2. Используйте /channels для добавления канала
3. Установите цены и доступность
4. Начинайте получать заказы на рекламу!

<b>Управление сделками:</b>
• Внимательно проверяйте запросы на рекламу
• Общайтесь с рекламодателями
• Публикуйте рекламу в согласованное время
• Средства хранятся на эскроу

<b>Получение оплаты:</b>
• Подключите свой TON кошелёк
• Средства выплачиваются после верификации поста
• Обычно в течение 24-48 часов

<b>Советы:</b>
• Обновляйте статистику канала
• Отвечайте на запросы быстро
• Стройте хорошую репутацию
    `.trim() : `
📺 <b>Channel Owners Guide</b>

<b>Getting Started:</b>
1. Add this bot as admin to your channel
2. Use /channels to add your channel
3. Set your pricing and availability
4. Start receiving ad requests!

<b>Managing Deals:</b>
• Review ad requests carefully
• Communicate with advertisers
• Post ads at agreed times
• Funds are held in escrow

<b>Getting Paid:</b>
• Connect your TON wallet
• Funds release after post verification
• Typically within 24-48 hours

<b>Tips:</b>
• Keep your stats updated
• Respond to requests quickly
• Build a good reputation
    `.trim();

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  }

  async showAdvertiserGuide(ctx: BotContext): Promise<void> {
    const isRu = (ctx.session.language || 'en') === 'ru';

    const keyboard = new InlineKeyboard()
      .text(isRu ? '« Назад к помощи' : '« Back to Help', 'menu:help');

    const message = isRu ? `
📢 <b>Гайд для рекламодателей</b>

<b>Поиск каналов:</b>
1. Просматривайте каналы по категориям
2. Проверяйте статистику и отзывы
3. Сравнивайте цены
4. Отправляйте запросы на рекламу

<b>Создание кампаний:</b>
• Установите бюджет и цели
• Подготовьте рекламный контент
• Выберите время публикации
• Отслеживайте результаты

<b>Оплата:</b>
• Средства хранятся на эскроу
• Выплачиваются после верификации
• Защищены смарт-контрактом

<b>Советы:</b>
• Тщательно выбирайте каналы
• Подготавливайте чёткие ТЗ
• Общайтесь о требованиях
    `.trim() : `
📢 <b>Advertisers Guide</b>

<b>Finding Channels:</b>
1. Browse channels by category
2. Check stats and reviews
3. Compare pricing options
4. Send ad requests

<b>Creating Campaigns:</b>
• Set your budget and targets
• Define your ad content
• Choose posting times
• Track performance

<b>Payments:</b>
• Funds are held in escrow
• Released after verification
• Protected by smart contracts

<b>Tips:</b>
• Choose channels carefully
• Provide clear briefs
• Communicate requirements
    `.trim();

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  }

  async showPaymentsGuide(ctx: BotContext): Promise<void> {
    const isRu = (ctx.session.language || 'en') === 'ru';

    const keyboard = new InlineKeyboard()
      .text(isRu ? '« Назад к помощи' : '« Back to Help', 'menu:help');

    const message = isRu ? `
💰 <b>Платежи и эскроу</b>

<b>Как работает эскроу:</b>
1. Рекламодатель оплачивает сделку
2. Средства безопасно хранятся на эскроу
3. Владелец канала публикует рекламу
4. Система верифицирует публикацию
5. Средства выплачиваются владельцу канала

<b>Способы оплаты:</b>
• TON (Toncoin)
• Поддержка Wallet Connect

<b>Комиссии:</b>
• Комиссия платформы: 5%
• Скрытых платежей нет

<b>Безопасность:</b>
• Эскроу на смарт-контракте
• Автоматическая верификация
• Разрешение споров
    `.trim() : `
💰 <b>Payments & Escrow</b>

<b>How Escrow Works:</b>
1. Advertiser funds the deal
2. Funds held securely in escrow
3. Channel owner posts the ad
4. System verifies the post
5. Funds released to channel owner

<b>Supported Payments:</b>
• TON (Toncoin)
• Wallet Connect supported

<b>Fees:</b>
• Platform fee: 5%
• No hidden charges

<b>Security:</b>
• Smart contract escrow
• Automated verification
• Dispute resolution available
    `.trim();

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  }

  async showSafetyGuide(ctx: BotContext): Promise<void> {
    const isRu = (ctx.session.language || 'en') === 'ru';

    const keyboard = new InlineKeyboard()
      .text(isRu ? '« Назад к помощи' : '« Back to Help', 'menu:help');

    const message = isRu ? `
🔒 <b>Безопасность и споры</b>

<b>Правила безопасности:</b>
• Всегда используйте систему эскроу
• Никогда не платите вне платформы
• Сообщайте о подозрительной активности

<b>Открытие спора:</b>
1. Перейдите в детали сделки
2. Нажмите «Открыть спор»
3. Предоставьте доказательства
4. Наша команда рассмотрит спор

<b>Частые проблемы:</b>
• Пост не опубликован
• Пост удалён раньше срока
• Опубликован неверный контент
• Проблемы с оплатой

<b>Разрешение:</b>
• Большинство споров решается за 24-48ч
• Справедливые решения на основе доказательств
• Возможен частичный возврат средств
    `.trim() : `
🔒 <b>Safety & Disputes</b>

<b>Stay Safe:</b>
• Always use our escrow system
• Never pay outside the platform
• Report suspicious activity

<b>Opening a Dispute:</b>
1. Go to the deal details
2. Click "Open Dispute"
3. Provide evidence
4. Our team will review

<b>Common Issues:</b>
• Post not published
• Post deleted early
• Wrong content posted
• Payment issues

<b>Resolution:</b>
• Most disputes resolved in 24-48h
• Fair decisions based on evidence
• Partial refunds possible
    `.trim();

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  }
}
