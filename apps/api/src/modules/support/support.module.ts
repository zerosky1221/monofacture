import { Module, forwardRef } from '@nestjs/common';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [forwardRef(() => NotificationsModule)],
  controllers: [SupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
