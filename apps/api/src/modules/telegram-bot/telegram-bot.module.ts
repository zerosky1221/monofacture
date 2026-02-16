import { Module, forwardRef } from '@nestjs/common';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramBotUpdate } from './telegram-bot.update';
import { WebhookController } from './webhook.controller';
import { UsersModule } from '../users/users.module';
import { ChannelsModule } from '../channels/channels.module';
import { DealsModule } from '../deals/deals.module';
import { PostingModule } from '../posting/posting.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReferralModule } from '../referral/referral.module';

import { StartCommand } from './commands/start.command';
import { HelpCommand } from './commands/help.command';
import { MyChannelsCommand } from './commands/my-channels.command';
import { MyDealsCommand } from './commands/my-deals.command';
import { SettingsCommand } from './commands/settings.command';
import { AddChannelCommand } from './commands/add-channel.command';
import { RemoveChannelCommand } from './commands/remove-channel.command';

import { AddChannelConversation } from './conversations/add-channel.conversation';
import { CreateDealConversation } from './conversations/create-deal.conversation';
import { CreativeSubmissionConversation } from './conversations/creative-submission.conversation';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => ChannelsModule),
    forwardRef(() => DealsModule),
    forwardRef(() => PostingModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => ReferralModule),
  ],
  controllers: [WebhookController],
  providers: [
    TelegramBotService,
    TelegramBotUpdate,

    StartCommand,
    HelpCommand,
    MyChannelsCommand,
    MyDealsCommand,
    SettingsCommand,
    AddChannelCommand,
    RemoveChannelCommand,

    AddChannelConversation,
    CreateDealConversation,
    CreativeSubmissionConversation,
  ],
  exports: [TelegramBotService, CreativeSubmissionConversation],
})
export class TelegramBotModule {}
