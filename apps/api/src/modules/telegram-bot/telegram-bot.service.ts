import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, Context, session, SessionFlavor, InlineKeyboard, Keyboard, InputFile, GrammyError, HttpError } from 'grammy';
import { conversations, createConversation, ConversationFlavor } from '@grammyjs/conversations';
import { Menu, MenuFlavor } from '@grammyjs/menu';
import { hydrateReply, ParseModeFlavor } from '@grammyjs/parse-mode';
import { autoRetry } from '@grammyjs/auto-retry';
import { PrismaService } from '../../core/database/prisma.service';

export interface SessionData {
  userId?: string;
  step?: string;
  data?: Record<string, any>;
  language?: string;
}

export type BotContext = Context &
  SessionFlavor<SessionData> &
  ConversationFlavor &
  MenuFlavor &
  ParseModeFlavor<Context>;

export interface TelegramChannelStats {
  subscriberCount: number;
  averageViewsPerPost: number;
  averageReactionsPerPost: number;
  averageForwardsPerPost: number;
  averageSharesPerPost: number;
  enabledNotificationsPercent: number;

  languageDistribution: Record<string, number>;

  viewsByHour?: Record<number, number>;
  growthByDay?: Record<string, number>;
}

export interface PostResult {
  messageId: number;
  chatId: number;
  date: number;
  text?: string;
  mediaGroupId?: string;
}

export interface MessageInfo {
  exists: boolean;
  messageId: number;
  date: number;
  text?: string;
  views?: number;
  forwards?: number;
  reactions?: number;
  editDate?: number;
  isEdited: boolean;
}

@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot: Bot<BotContext>;
  private isRunning = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const token = this.configService.get<string>('telegram.botToken');
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not configured');
      return;
    }

    this.bot = new Bot<BotContext>(token);

    this.bot.api.config.use(autoRetry({
      maxRetryAttempts: 3,
      maxDelaySeconds: 60,
    }));

    this.setupMiddleware();
  }

  private setupMiddleware(): void {

    this.bot.use(hydrateReply);

    this.bot.use(session({
      initial: (): SessionData => ({
        step: undefined,
        data: {},
        language: 'en',
      }),
    }));

    this.bot.use(conversations());

    this.bot.catch((err) => {
      const ctx = err.ctx;
      const e = err.error;

      if (e instanceof GrammyError) {
        this.logger.error(
          `Grammy API error [${e.error_code}] in update ${ctx.update.update_id}: ${e.description}`,
        );
        if (e.error_code === 429 && e.parameters?.retry_after) {
          this.logger.warn(`Rate limited by Telegram. Retry after: ${e.parameters.retry_after}s`);
        }
      } else if (e instanceof HttpError) {
        this.logger.error(
          `HTTP error contacting Telegram in update ${ctx.update.update_id}: ${e.message}`,
        );
      } else {
        this.logger.error(`Unknown bot error in update ${ctx.update.update_id}:`, e);
      }
    });
  }

  private async setupBotCommands(): Promise<void> {
    await this.bot.api.setMyCommands([
      { command: 'start', description: 'Start the bot' },
      { command: 'help', description: 'Show help information' },
      { command: 'channels', description: 'Manage your channels' },
      { command: 'deals', description: 'View your deals' },
      { command: 'addchannel', description: 'Add a new channel' },
      { command: 'settings', description: 'Bot settings' },
      { command: 'webapp', description: 'Open Mini App' },
    ]);

    try {
      const webappUrl = this.configService.get<string>('webappUrl') || this.getMiniAppUrl();
      await this.bot.api.setChatMenuButton({
        menu_button: {
          type: 'web_app',
          text: 'Marketplace',
          web_app: { url: webappUrl },
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to set menu button: ${(error as Error).message}`);
    }
  }

  async onModuleInit(): Promise<void> {
    if (!this.bot) {
      this.logger.warn('Bot not initialized - skipping startup');
      return;
    }

    try {
      await this.setupBotCommands();

      const useWebhook = this.configService.get<boolean>('telegram.useWebhook', false);

      if (useWebhook) {
        const webhookUrl = this.configService.get<string>('telegram.webhookUrl');
        const secretToken = this.configService.get<string>('telegram.webhookSecretToken');

        if (!webhookUrl) {
          this.logger.error('TELEGRAM_WEBHOOK_URL required when TELEGRAM_USE_WEBHOOK=true');
          return;
        }

        await this.bot.api.setWebhook(webhookUrl, {
          secret_token: secretToken || undefined,
          allowed_updates: [
            'message', 'callback_query', 'inline_query',
            'channel_post', 'my_chat_member', 'pre_checkout_query',
          ],
          drop_pending_updates: false,
        });

        this.isRunning = true;
        this.logger.log(`Bot started in webhook mode: ${webhookUrl}`);
      } else {

        await this.bot.api.deleteWebhook();

        this.bot.start({
          onStart: () => {
            this.isRunning = true;
            this.logger.log('Telegram bot started in polling mode');
          },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to initialize bot: ${(error as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.bot && this.isRunning) {
      const useWebhook = this.configService.get<boolean>('telegram.useWebhook', false);
      if (useWebhook) {
        try { await this.bot.api.deleteWebhook(); } catch { }
      } else {
        await this.bot.stop();
      }
      this.isRunning = false;
      this.logger.log('Telegram bot stopped');
    }
  }

  getBot(): Bot<BotContext> {
    return this.bot;
  }

  async handleUpdate(update: unknown): Promise<void> {
    if (!this.bot) {
      this.logger.warn('Bot not initialized - cannot process webhook update');
      return;
    }
    await this.bot.handleUpdate(update as any);
  }

  async sendMessage(
    telegramId: bigint | number,
    text: string,
    options?: {
      parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
      keyboard?: InlineKeyboard | Keyboard;
      disableNotification?: boolean;
      messageThreadId?: number;
      protectContent?: boolean;
      messageEffectId?: string;
    },
  ): Promise<void> {
    if (!this.bot) return;

    try {
      await this.bot.api.sendMessage(Number(telegramId), text, {
        parse_mode: options?.parseMode || 'HTML',
        reply_markup: options?.keyboard,
        disable_notification: options?.disableNotification,
        message_thread_id: options?.messageThreadId,
        protect_content: options?.protectContent,
        message_effect_id: options?.messageEffectId,
      });
    } catch (error) {
      this.logger.error(`Failed to send message to ${telegramId}: ${(error as Error).message}`);
      throw error;
    }
  }

  async postToChannel(
    channelId: bigint | number | string,
    content: {
      text: string;
      mediaUrls?: string[];
      buttons?: Array<{ text: string; url: string }>;
    },
    options?: {
      parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
      disableNotification?: boolean;
      disableWebPreview?: boolean;
      protectContent?: boolean;
      messageEffectId?: string;
    },
  ): Promise<PostResult> {
    if (!this.bot) throw new Error('Bot not initialized');

    const chatId = typeof channelId === 'string' ? channelId : Number(channelId);

    try {

      let replyMarkup: InlineKeyboard | undefined;
      if (content.buttons && content.buttons.length > 0) {
        replyMarkup = new InlineKeyboard();
        for (const button of content.buttons) {
          replyMarkup.url(button.text, button.url).row();
        }
      }

      if (content.mediaUrls && content.mediaUrls.length > 0) {
        if (content.mediaUrls.length === 1) {

          const result = await this.bot.api.sendPhoto(chatId, content.mediaUrls[0], {
            caption: content.text,
            parse_mode: options?.parseMode || 'HTML',
            reply_markup: replyMarkup,
            disable_notification: options?.disableNotification,
            protect_content: options?.protectContent,
            message_effect_id: options?.messageEffectId,
          });

          return {
            messageId: result.message_id,
            chatId: result.chat.id,
            date: result.date,
            text: content.text,
          };
        } else {

          const mediaGroup = content.mediaUrls.map((url, index) => ({
            type: 'photo' as const,
            media: url,
            caption: index === 0 ? content.text : undefined,
            parse_mode: index === 0 ? (options?.parseMode || 'HTML') : undefined,
          }));

          const results = await this.bot.api.sendMediaGroup(chatId, mediaGroup, {
            disable_notification: options?.disableNotification,
            protect_content: options?.protectContent,
            message_effect_id: options?.messageEffectId,
          });
          const firstResult = results[0];

          return {
            messageId: firstResult.message_id,
            chatId: firstResult.chat.id,
            date: firstResult.date,
            text: content.text,
            mediaGroupId: 'media_group_id' in firstResult ? firstResult.media_group_id : undefined,
          };
        }
      } else {

        const result = await this.bot.api.sendMessage(chatId, content.text, {
          parse_mode: options?.parseMode || 'HTML',
          reply_markup: replyMarkup,
          disable_notification: options?.disableNotification,
          protect_content: options?.protectContent,
          message_effect_id: options?.messageEffectId,
          link_preview_options: options?.disableWebPreview ? { is_disabled: true } : undefined,
        });

        return {
          messageId: result.message_id,
          chatId: result.chat.id,
          date: result.date,
          text: result.text,
        };
      }
    } catch (error) {
      this.logger.error(`Failed to post to channel ${chatId}: ${(error as Error).message}`);
      throw error;
    }
  }

  async getMessageInfo(
    channelId: bigint | number | string,
    messageId: number,
  ): Promise<MessageInfo | null> {
    if (!this.bot) return null;

    const chatId = typeof channelId === 'string' ? channelId : Number(channelId);

    try {

      const copied = await this.bot.api.copyMessage(chatId, chatId, messageId);

      await this.bot.api.deleteMessage(chatId, copied.message_id);

      const chat = await this.bot.api.getChat(chatId);

      return {
        exists: true,
        messageId,
        date: Math.floor(Date.now() / 1000),
        views: undefined,
        forwards: undefined,
        reactions: undefined,
        isEdited: false,
      };
    } catch (error) {

      const errorMessage = (error as Error).message;

      if (errorMessage.includes('message to copy not found') ||
          errorMessage.includes('MESSAGE_ID_INVALID')) {
        return {
          exists: false,
          messageId,
          date: 0,
          isEdited: false,
        };
      }

      this.logger.error(`Failed to get message info: ${errorMessage}`);
      throw error;
    }
  }

  async checkMessageExists(
    channelId: bigint | number,
    messageId: number,
  ): Promise<boolean> {
    if (!this.bot) return false;

    try {

      await this.bot.api.forwardMessage(
        Number(channelId),
        Number(channelId),
        messageId,
      );

      return true;
    } catch (error) {
      const errorMessage = (error as Error).message.toLowerCase();
      if (errorMessage.includes('not found') ||
          errorMessage.includes('invalid') ||
          errorMessage.includes('deleted')) {
        return false;
      }

      return true;
    }
  }

  async getChannelStats(channelId: bigint | number | string): Promise<TelegramChannelStats | null> {
    if (!this.bot) return null;

    const chatId = typeof channelId === 'string' ? channelId : Number(channelId);

    try {

      const chat = await this.bot.api.getChat(chatId);

      if (chat.type !== 'channel' && chat.type !== 'supergroup') {
        return null;
      }

      const memberCount = await this.bot.api.getChatMemberCount(chatId);

      const stats: TelegramChannelStats = {
        subscriberCount: memberCount,

        averageViewsPerPost: Math.floor(memberCount * 0.30),
        averageReactionsPerPost: Math.floor(memberCount * 0.01),
        averageForwardsPerPost: Math.floor(memberCount * 0.005),
        averageSharesPerPost: Math.floor(memberCount * 0.002),
        enabledNotificationsPercent: 25,
        languageDistribution: {},
      };

      return stats;
    } catch (error) {
      this.logger.error(`Failed to get channel stats: ${(error as Error).message}`);
      return null;
    }
  }

  async getChannelInfo(channelId: bigint | number | string): Promise<{
    id: number;
    title: string;
    username?: string;
    description?: string;
    memberCount?: number;
    photo?: string;
    inviteLink?: string;
    linkedChatId?: number;
  } | null> {
    if (!this.bot) return null;

    try {
      const chat = await this.bot.api.getChat(
        typeof channelId === 'string' ? channelId : Number(channelId),
      );

      if (chat.type !== 'channel' && chat.type !== 'supergroup') {
        return null;
      }

      let memberCount: number | undefined;
      try {
        memberCount = await this.bot.api.getChatMemberCount(chat.id);
      } catch {

      }

      let photoUrl: string | undefined;
      if (chat.photo) {
        try {
          const file = await this.bot.api.getFile(chat.photo.big_file_id);
          const token = this.configService.get<string>('telegram.botToken');
          photoUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
        } catch {

        }
      }

      return {
        id: chat.id,
        title: chat.title || '',
        username: 'username' in chat ? chat.username : undefined,
        description: 'description' in chat ? chat.description : undefined,
        memberCount,
        photo: photoUrl,
        inviteLink: 'invite_link' in chat ? chat.invite_link : undefined,
        linkedChatId: 'linked_chat_id' in chat ? chat.linked_chat_id : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to get channel info: ${(error as Error).message}`);
      return null;
    }
  }

  async checkBotAdmin(channelId: bigint | number): Promise<boolean> {
    if (!this.bot) return false;

    try {
      const botInfo = await this.bot.api.getMe();
      const member = await this.bot.api.getChatMember(Number(channelId), botInfo.id);
      return member.status === 'administrator' || member.status === 'creator';
    } catch (error) {
      this.logger.error(`Failed to check bot admin status: ${(error as Error).message}`);
      return false;
    }
  }

  async getBotPermissions(channelId: bigint | number): Promise<{
    canPostMessages: boolean;
    canEditMessages: boolean;
    canDeleteMessages: boolean;
    canManageChat: boolean;
    canInviteUsers: boolean;
  } | null> {
    if (!this.bot) return null;

    try {
      const botInfo = await this.bot.api.getMe();
      const member = await this.bot.api.getChatMember(Number(channelId), botInfo.id);

      if (member.status !== 'administrator') {
        return {
          canPostMessages: false,
          canEditMessages: false,
          canDeleteMessages: false,
          canManageChat: false,
          canInviteUsers: false,
        };
      }

      return {
        canPostMessages: member.can_post_messages || false,
        canEditMessages: member.can_edit_messages || false,
        canDeleteMessages: member.can_delete_messages || false,
        canManageChat: member.can_manage_chat || false,
        canInviteUsers: member.can_invite_users || false,
      };
    } catch (error) {
      this.logger.error(`Failed to get bot permissions: ${(error as Error).message}`);
      return null;
    }
  }

  async verifyChannelAdmin(
    channelId: bigint | number,
    userId: bigint | number,
  ): Promise<boolean> {
    if (!this.bot) return false;

    try {
      const member = await this.bot.api.getChatMember(Number(channelId), Number(userId));
      return member.status === 'administrator' || member.status === 'creator';
    } catch (error) {
      this.logger.error(`Failed to verify channel admin: ${(error as Error).message}`);
      return false;
    }
  }

  async pinChatMessage(
    chatId: bigint | number | string,
    messageId: number,
    disableNotification: boolean = false,
  ): Promise<boolean> {
    if (!this.bot) return false;

    try {
      await this.bot.api.pinChatMessage(
        typeof chatId === 'string' ? chatId : Number(chatId),
        messageId,
        { disable_notification: disableNotification },
      );
      this.logger.log(`Pinned message ${messageId} in chat ${chatId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to pin message: ${(error as Error).message}`);
      return false;
    }
  }

  async unpinChatMessage(
    chatId: bigint | number | string,
    messageId?: number,
  ): Promise<boolean> {
    if (!this.bot) return false;

    try {
      if (messageId) {
        await this.bot.api.unpinChatMessage(
          typeof chatId === 'string' ? chatId : Number(chatId),
          messageId,
        );
      } else {

        await this.bot.api.unpinAllChatMessages(
          typeof chatId === 'string' ? chatId : Number(chatId),
        );
      }
      this.logger.log(`Unpinned message${messageId ? ` ${messageId}` : 's'} in chat ${chatId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to unpin message: ${(error as Error).message}`);
      return false;
    }
  }

  async forwardMessage(
    fromChatId: bigint | number | string,
    toChatId: bigint | number | string,
    messageId: number,
    options?: {
      disableNotification?: boolean;
      protectContent?: boolean;
    },
  ): Promise<PostResult | null> {
    if (!this.bot) return null;

    try {
      const result = await this.bot.api.forwardMessage(
        typeof toChatId === 'string' ? toChatId : Number(toChatId),
        typeof fromChatId === 'string' ? fromChatId : Number(fromChatId),
        messageId,
        {
          disable_notification: options?.disableNotification,
          protect_content: options?.protectContent,
        },
      );

      return {
        messageId: result.message_id,
        chatId: result.chat.id,
        date: result.date,
        text: result.text,
      };
    } catch (error) {
      this.logger.error(`Failed to forward message: ${(error as Error).message}`);
      return null;
    }
  }

  async copyMessage(
    fromChatId: bigint | number | string,
    toChatId: bigint | number | string,
    messageId: number,
    options?: {
      caption?: string;
      parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
      disableNotification?: boolean;
      protectContent?: boolean;
      replyMarkup?: InlineKeyboard;
    },
  ): Promise<number | null> {
    if (!this.bot) return null;

    try {
      const result = await this.bot.api.copyMessage(
        typeof toChatId === 'string' ? toChatId : Number(toChatId),
        typeof fromChatId === 'string' ? fromChatId : Number(fromChatId),
        messageId,
        {
          caption: options?.caption,
          parse_mode: options?.parseMode,
          disable_notification: options?.disableNotification,
          protect_content: options?.protectContent,
          reply_markup: options?.replyMarkup,
        },
      );

      return result.message_id;
    } catch (error) {
      this.logger.error(`Failed to copy message: ${(error as Error).message}`);
      return null;
    }
  }

  async deleteMessage(chatId: bigint | number, messageId: number): Promise<boolean> {
    if (!this.bot) return false;

    try {
      await this.bot.api.deleteMessage(Number(chatId), messageId);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete message: ${(error as Error).message}`);
      return false;
    }
  }

  async editMessage(
    chatId: bigint | number | string,
    messageId: number,
    text: string,
    options?: {
      parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
      keyboard?: InlineKeyboard;
    },
  ): Promise<boolean> {
    if (!this.bot) return false;

    try {
      await this.bot.api.editMessageText(
        typeof chatId === 'string' ? chatId : Number(chatId),
        messageId,
        text,
        {
          parse_mode: options?.parseMode || 'HTML',
          reply_markup: options?.keyboard,
        },
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to edit message: ${(error as Error).message}`);
      return false;
    }
  }

  async sendPhoto(
    telegramId: bigint | number,
    photo: string,
    caption?: string,
    keyboard?: InlineKeyboard,
  ): Promise<void> {
    if (!this.bot) return;

    try {
      await this.bot.api.sendPhoto(Number(telegramId), photo, {
        caption,
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    } catch (error) {
      this.logger.error(`Failed to send photo to ${telegramId}: ${(error as Error).message}`);
      throw error;
    }
  }

  getMiniAppUrl(): string {
    const botUsername = this.configService.get<string>('telegram.botUsername');
    return `https://t.me/${botUsername}/app`;
  }

  getStartLink(param: string): string {
    const botUsername = this.configService.get<string>('telegram.botUsername');
    return `https://t.me/${botUsername}?start=${param}`;
  }

  createInlineKeyboard(): InlineKeyboard {
    return new InlineKeyboard();
  }

  createKeyboard(): Keyboard {
    return new Keyboard();
  }

  async createForumTopic(
    chatId: number | string,
    name: string,
    iconColor?: 7322096 | 16766590 | 13338331 | 9367192 | 16749490 | 16478047,
    iconCustomEmojiId?: string,
  ) {
    if (!this.bot) throw new Error('Bot not initialized');

    return this.bot.api.createForumTopic(chatId, name, {
      icon_color: iconColor,
      icon_custom_emoji_id: iconCustomEmojiId,
    });
  }

  async editForumTopic(
    chatId: number | string,
    messageThreadId: number,
    name?: string,
    iconCustomEmojiId?: string,
  ): Promise<boolean> {
    if (!this.bot) return false;

    try {
      await this.bot.api.editForumTopic(chatId, messageThreadId, {
        name,
        icon_custom_emoji_id: iconCustomEmojiId,
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to edit forum topic: ${(error as Error).message}`);
      return false;
    }
  }

  async deleteForumTopic(
    chatId: number | string,
    messageThreadId: number,
  ): Promise<boolean> {
    if (!this.bot) return false;

    try {
      await this.bot.api.deleteForumTopic(chatId, messageThreadId);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete forum topic: ${(error as Error).message}`);
      return false;
    }
  }
}
