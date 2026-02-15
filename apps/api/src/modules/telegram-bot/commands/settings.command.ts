import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InlineKeyboard } from 'grammy';
import { BotContext } from '../telegram-bot.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class SettingsCommand {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  async handle(ctx: BotContext): Promise<void> {
    const from = ctx.from;
    if (!from) return;

    const user = await this.usersService.findByTelegramId(BigInt(from.id));
    if (!user) {
      await ctx.reply(
        ctx.session.language === 'ru'
          ? 'Пожалуйста, сначала используйте /start для регистрации.'
          : 'Please use /start first to register.',
      );
      return;
    }

    const lang = user.languageCode || 'en';
    const isRu = lang === 'ru';
    const notifEmoji = user.notificationsEnabled ? '🔔' : '🔕';
    const walletStatus = user.tonWalletAddress
      ? (isRu ? '✅ Подключён' : '✅ Connected')
      : (isRu ? '❌ Не подключён' : '❌ Not connected');

    const keyboard = new InlineKeyboard()
      .text(`${notifEmoji} ${isRu ? 'Уведомления' : 'Notifications'}`, 'settings:notifications')
      .row()
      .text(`🌐 ${isRu ? 'Язык' : 'Language'}`, 'settings:language')
      .row()
      .text(`💰 ${isRu ? 'Кошелёк' : 'Wallet'}`, 'settings:wallet')
      .row()
      .text(`🔐 ${isRu ? 'Конфиденциальность' : 'Privacy'}`, 'settings:privacy')
      .row()
      .text(isRu ? '« Назад' : '« Back to Menu', 'back_to_menu');

    const message = isRu ? `
⚙️ <b>Настройки</b>

<b>Аккаунт:</b>
• ID: <code>${user.id}</code>
• Telegram: @${user.telegramUsername || 'Не указан'}

<b>Уведомления:</b> ${user.notificationsEnabled ? 'Включены' : 'Выключены'}
<b>Язык:</b> ${lang.toUpperCase()}
<b>Кошелёк:</b> ${walletStatus}

Выберите опцию для настройки:
    `.trim() : `
⚙️ <b>Settings</b>

<b>Account:</b>
• User ID: <code>${user.id}</code>
• Telegram: @${user.telegramUsername || 'Not set'}

<b>Notifications:</b> ${user.notificationsEnabled ? 'Enabled' : 'Disabled'}
<b>Language:</b> ${lang.toUpperCase()}
<b>Wallet:</b> ${walletStatus}

Select an option to configure:
    `.trim();

    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  }

  async toggleNotifications(ctx: BotContext): Promise<void> {
    const from = ctx.from;
    if (!from) return;
    const isRu = (ctx.session.language || 'en') === 'ru';

    const user = await this.usersService.findByTelegramId(BigInt(from.id));
    if (!user) {
      await ctx.answerCallbackQuery(isRu ? 'Пользователь не найден' : 'User not found');
      return;
    }

    await this.usersService.updateUser(user.id, {
      notificationsEnabled: !user.notificationsEnabled,
    });

    const newStatus = !user.notificationsEnabled
      ? (isRu ? 'включены' : 'enabled')
      : (isRu ? 'выключены' : 'disabled');
    await ctx.answerCallbackQuery(`${isRu ? 'Уведомления' : 'Notifications'} ${newStatus}!`);

    await this.handle(ctx);
  }

  async showLanguageOptions(ctx: BotContext): Promise<void> {
    const lang = ctx.session.language || 'en';
    const keyboard = new InlineKeyboard()
      .text('🇬🇧 English', 'settings:lang:en')
      .text('🇷🇺 Русский', 'settings:lang:ru')
      .row()
      .text(lang === 'ru' ? '« Назад' : '« Back to Settings', 'menu:settings');

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      lang === 'ru'
        ? '🌐 <b>Выберите язык</b>\n\nВыберите предпочитаемый язык:'
        : '🌐 <b>Select Language</b>\n\nChoose your preferred language:',
      {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      },
    );
  }

  async setLanguage(ctx: BotContext, langCode: string): Promise<void> {
    const from = ctx.from;
    if (!from) return;

    const user = await this.usersService.findByTelegramId(BigInt(from.id));
    if (!user) {
      await ctx.answerCallbackQuery('User not found');
      return;
    }

    await this.usersService.updateUser(user.id, {
      languageCode: langCode,
    });

    ctx.session.language = langCode;

    await ctx.answerCallbackQuery(langCode === 'ru' ? 'Язык обновлён!' : 'Language updated!');
    await this.handle(ctx);
  }

  async showWalletSettings(ctx: BotContext): Promise<void> {
    const from = ctx.from;
    if (!from) return;
    const isRu = (ctx.session.language || 'en') === 'ru';

    const user = await this.usersService.findByTelegramId(BigInt(from.id));
    if (!user) {
      await ctx.answerCallbackQuery(isRu ? 'Пользователь не найден' : 'User not found');
      return;
    }

    const keyboard = new InlineKeyboard();

    if (user.tonWalletAddress) {
      keyboard
        .text(isRu ? '🔄 Сменить кошелёк' : '🔄 Change Wallet', 'settings:wallet:change')
        .row()
        .text(isRu ? '❌ Отключить' : '❌ Disconnect', 'settings:wallet:disconnect')
        .row();
    } else {
      keyboard
        .text(isRu ? '🔗 Подключить кошелёк' : '🔗 Connect Wallet', 'settings:wallet:connect')
        .row();
    }

    keyboard.text(isRu ? '« Назад к настройкам' : '« Back to Settings', 'menu:settings');

    const walletInfo = user.tonWalletAddress
      ? (isRu
          ? `<b>Подключён:</b> <code>${user.tonWalletAddress.slice(0, 10)}...${user.tonWalletAddress.slice(-8)}</code>\n` +
            `<b>С:</b> ${user.tonWalletConnectedAt ? new Date(user.tonWalletConnectedAt).toLocaleDateString('ru-RU') : 'Неизвестно'}`
          : `<b>Connected:</b> <code>${user.tonWalletAddress.slice(0, 10)}...${user.tonWalletAddress.slice(-8)}</code>\n` +
            `<b>Since:</b> ${user.tonWalletConnectedAt ? new Date(user.tonWalletConnectedAt).toLocaleDateString() : 'Unknown'}`)
      : (isRu ? 'Кошелёк не подключён' : 'No wallet connected');

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      isRu
        ? `💰 <b>Настройки кошелька</b>\n\n${walletInfo}\n\nПодключите TON кошелёк для получения платежей.`
        : `💰 <b>Wallet Settings</b>\n\n${walletInfo}\n\nConnect your TON wallet to receive payments.`,
      {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      },
    );
  }

  async showPrivacySettings(ctx: BotContext): Promise<void> {
    const isRu = (ctx.session.language || 'en') === 'ru';

    const keyboard = new InlineKeyboard()
      .text(isRu ? '📊 Скачать мои данные' : '📊 Download My Data', 'settings:privacy:download')
      .row()
      .text(isRu ? '🗑️ Удалить аккаунт' : '🗑️ Delete Account', 'settings:privacy:delete')
      .row()
      .text(isRu ? '« Назад к настройкам' : '« Back to Settings', 'menu:settings');

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      isRu
        ? '🔐 <b>Конфиденциальность</b>\n\n' +
          '<b>Ваши данные:</b>\n' +
          '• Мы храним только необходимую информацию\n' +
          '• Ваши данные зашифрованы\n' +
          '• Вы можете запросить экспорт данных\n\n' +
          '<b>Опции:</b>'
        : '🔐 <b>Privacy Settings</b>\n\n' +
          '<b>Your Data:</b>\n' +
          '• We store only necessary information\n' +
          '• Your data is encrypted\n' +
          '• You can request data export\n\n' +
          '<b>Options:</b>',
      {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      },
    );
  }
}
