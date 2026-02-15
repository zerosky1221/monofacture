import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { InlineKeyboard } from 'grammy';
import { BotContext, TelegramBotService } from '../telegram-bot.service';
import { ChannelsService } from '../../channels/channels.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class AddChannelConversation {
  private readonly logger = new Logger(AddChannelConversation.name);

  constructor(
    private readonly botService: TelegramBotService,
    @Inject(forwardRef(() => ChannelsService))
    private readonly channelsService: ChannelsService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  async start(ctx: BotContext): Promise<void> {
    await ctx.answerCallbackQuery();

    ctx.session.step = 'add_channel:waiting_username';
    ctx.session.data = {};

    const keyboard = new InlineKeyboard()
      .text('❌ Cancel', 'add_channel:cancel');

    await ctx.editMessageText(
      '📺 <b>Add New Channel</b>\n\n' +
      'Please forward any message from your channel, or send the channel username (e.g., @mychannel).\n\n' +
      '<b>Requirements:</b>\n' +
      '• You must be an admin of the channel\n' +
      '• The bot must be added as admin\n' +
      '• Channel must have at least 100 subscribers',
      {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      },
    );
  }

  async handleMessage(ctx: BotContext): Promise<void> {
    const step = ctx.session.step;

    switch (step) {
      case 'add_channel:waiting_username':
        await this.handleChannelInput(ctx);
        break;
      case 'add_channel:confirm':
        await this.handleConfirmation(ctx);
        break;
      default:

        return;
    }
  }

  private async handleChannelInput(ctx: BotContext): Promise<void> {
    const from = ctx.from;
    if (!from) return;

    let channelIdentifier: string | number | null = null;

    const msg = ctx.message as any;
    if (msg?.forward_from_chat) {
      const forwardedChat = msg.forward_from_chat;
      if (forwardedChat.type === 'channel') {
        channelIdentifier = forwardedChat.id;
      }
    } else if (ctx.message?.text) {

      const text = ctx.message.text.trim();
      if (text.startsWith('@')) {
        channelIdentifier = text;
      } else if (text.match(/^-?\d+$/)) {
        channelIdentifier = parseInt(text, 10);
      }
    }

    if (!channelIdentifier) {
      await ctx.reply(
        '❌ Invalid input. Please forward a message from your channel or send the channel username (e.g., @mychannel).',
      );
      return;
    }

    const channelInfo = await this.botService.getChannelInfo(channelIdentifier);

    if (!channelInfo) {
      await ctx.reply(
        '❌ Could not find this channel. Please make sure:\n' +
        '• The channel exists\n' +
        '• The bot is added as admin\n' +
        '• The username is correct',
      );
      return;
    }

    const isBotAdmin = await this.botService.checkBotAdmin(BigInt(channelInfo.id));
    if (!isBotAdmin) {
      const keyboard = new InlineKeyboard()
        .text('🔄 Check Again', 'add_channel:check')
        .row()
        .text('❌ Cancel', 'add_channel:cancel');

      await ctx.reply(
        '⚠️ <b>Bot Not Admin</b>\n\n' +
        'Please add this bot as an administrator to your channel with these permissions:\n' +
        '• Post messages\n' +
        '• Edit messages\n' +
        '• Delete messages\n\n' +
        'After adding the bot, click "Check Again".',
        {
          parse_mode: 'HTML',
          reply_markup: keyboard,
        },
      );
      ctx.session.data = { channelId: channelInfo.id };
      return;
    }

    const isUserAdmin = await this.botService.verifyChannelAdmin(
      BigInt(channelInfo.id),
      BigInt(from.id),
    );

    if (!isUserAdmin) {
      await ctx.reply(
        '❌ You must be an administrator of this channel to add it.',
      );
      return;
    }

    if (channelInfo.memberCount && channelInfo.memberCount < 100) {
      await ctx.reply(
        '❌ Your channel needs at least 100 subscribers to be listed.',
      );
      return;
    }

    ctx.session.data = {
      channelId: channelInfo.id,
      channelTitle: channelInfo.title,
      channelUsername: channelInfo.username,
      memberCount: channelInfo.memberCount,
      photoUrl: channelInfo.photo,
    };
    ctx.session.step = 'add_channel:confirm';

    const keyboard = new InlineKeyboard()
      .text('✅ Confirm', 'add_channel:confirm')
      .text('❌ Cancel', 'add_channel:cancel');

    await ctx.reply(
      '📺 <b>Confirm Channel</b>\n\n' +
      `<b>Title:</b> ${channelInfo.title}\n` +
      `<b>Username:</b> ${channelInfo.username ? `@${channelInfo.username}` : 'Private'}\n` +
      `<b>Subscribers:</b> ${channelInfo.memberCount?.toLocaleString() || 'Unknown'}\n\n` +
      'Is this the correct channel?',
      {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      },
    );
  }

  async handleConfirmation(ctx: BotContext): Promise<void> {
    const from = ctx.from;
    if (!from) return;

    const data = ctx.session.data;
    if (!data?.channelId) {
      await ctx.answerCallbackQuery('Session expired. Please start again.');
      this.clearSession(ctx);
      return;
    }

    try {
      const user = await this.usersService.findByTelegramId(BigInt(from.id));
      if (!user) {
        await ctx.answerCallbackQuery('User not found');
        return;
      }

      const existingChannel = await this.channelsService.getChannelByTelegramId(
        String(data.channelId),
      );

      if (existingChannel) {
        await ctx.answerCallbackQuery('Channel already registered!');
        await ctx.editMessageText(
          '⚠️ This channel is already registered in our system.\n\n' +
          'If you own this channel, please contact support.',
        );
        this.clearSession(ctx);
        return;
      }

      const channel = await this.channelsService.createChannel(user.id, {
        telegramId: String(data.channelId),
        username: data.channelUsername,
        title: data.channelTitle,
        photoUrl: data.photoUrl,
        subscriberCount: data.memberCount,
      });

      try {
        await this.channelsService.verifyChannel(channel.id, user.id);
      } catch (e) {

      }

      this.clearSession(ctx);

      const keyboard = new InlineKeyboard()
        .text('⚙️ Configure Pricing', `channel:pricing:${channel.id}`)
        .row()
        .text('📺 My Channels', 'menu:channels');

      await ctx.answerCallbackQuery('Channel added! ✅');
      await ctx.editMessageText(
        '✅ <b>Channel Added Successfully!</b>\n\n' +
        `<b>${channel.title}</b> has been added to your channels.\n\n` +
        'Next steps:\n' +
        '1. Configure your pricing\n' +
        '2. Add channel description\n' +
        '3. Set availability\n\n' +
        'Your channel is now pending verification.',
        {
          parse_mode: 'HTML',
          reply_markup: keyboard,
        },
      );
    } catch (error) {
      this.logger.error(`Failed to add channel: ${(error as Error).message}`);
      await ctx.answerCallbackQuery('Failed to add channel');
      await ctx.reply(`❌ Error: ${(error as Error).message}`);
      this.clearSession(ctx);
    }
  }

  async handleCallback(ctx: BotContext): Promise<void> {
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    const [, action] = data.split(':');

    switch (action) {
      case 'cancel':
        this.clearSession(ctx);
        await ctx.answerCallbackQuery('Cancelled');
        await ctx.editMessageText('Channel addition cancelled.');
        break;
      case 'check':
        await this.handleChannelInput(ctx);
        break;
      case 'confirm':
        await this.handleConfirmation(ctx);
        break;
    }
  }

  private clearSession(ctx: BotContext): void {
    ctx.session.step = undefined;
    ctx.session.data = {};
  }
}
