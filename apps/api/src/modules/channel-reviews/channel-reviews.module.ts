import { Module } from '@nestjs/common';
import { ChannelReviewsService } from './channel-reviews.service';
import { ChannelReviewsController } from './channel-reviews.controller';

@Module({
  controllers: [ChannelReviewsController],
  providers: [ChannelReviewsService],
  exports: [ChannelReviewsService],
})
export class ChannelReviewsModule {}
