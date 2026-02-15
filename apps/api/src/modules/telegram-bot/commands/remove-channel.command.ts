import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { BotContext } from '../telegram-bot.service';
import { ChannelsService } from '../../channels/channels.service';
import { UsersService } from '../../users/users.service';
import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class RemoveChannelCommand {
  private readonly logger = new Logger(RemoveChannelCommand.name);

  constructor(
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
          ? '❌ <b>Формат:</b> /removechannel @имяканала\n\n<b>Пример:</b> /removechannel @mychannel'
          : '❌ <b>Usage:</b> /removechannel @channelname\n\n<b>Example:</b> /removechannel @mychannel',
        { parse_mode: 'HTML' },
      );
      return;
    }

    try {

      const user = await this.usersService.findByTelegramId(BigInt(from.id));
      if (!user) {
        await ctx.reply(isRu ? '❌ Сначала откройте маркетплейс для создания аккаунта.' : '❌ Please open the marketplace app first to create your account.');
        return;
      }

      const channel = await this.prisma.channel.findFirst({
        where: { username: usernameArg.toLowerCase() },
      });

      if (!channel) {
        await ctx.reply(isRu
          ? '❌ Канал @' + usernameArg + ' не зарегистрирован в маркетплейсе.'
          : '❌ Channel @' + usernameArg + ' is not registered in the marketplace.');
        return;
      }

      if (channel.ownerId !== user.id) {
        await ctx.reply(isRu ? '❌ Вы не являетесь владельцем этого канала.' : '❌ You are not the owner of this channel.');
        return;
      }

      const activeDeals = await this.prisma.deal.count({
        where: {
          channelId: channel.id,
          status: {
            notIn: ['COMPLETED', 'CANCELLED', 'REFUNDED', 'EXPIRED'],
          },
        },
      });

      if (activeDeals > 0) {
        await ctx.reply(
          isRu
            ? `❌ Нельзя удалить канал с ${activeDeals} активными сделками.\n\nСначала завершите или отмените все сделки.`
            : `❌ Cannot remove channel with ${activeDeals} active deal(s).\n\nPlease complete or cancel all deals first.`,
        );
        return;
      }

      await this.prisma.channel.delete({
        where: { id: channel.id },
      });

      this.logger.log(`Channel @${usernameArg} removed by user ${user.id}`);

      await ctx.reply(
        isRu
          ? `✅ <b>Канал удалён</b>\n\nКанал @${usernameArg} удалён из маркетплейса.\n\nВы можете добавить его снова:\n/addchannel @${usernameArg}`
          : `✅ <b>Channel Removed</b>\n\nChannel @${usernameArg} has been removed from the marketplace.\n\nYou can add it again anytime with:\n/addchannel @${usernameArg}`,
        { parse_mode: 'HTML' },
      );
    } catch (error) {
      this.logger.error(`Error removing channel: ${(error as Error).message}`);
      await ctx.reply('❌ ' + (isRu ? 'Ошибка: ' : 'Error: ') + (error as Error).message);
    }
  }
}
