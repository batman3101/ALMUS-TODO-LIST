import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationSettingsService } from './notification-settings.service';
import { NotificationTemplateService } from './notification-template.service';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { NotificationProviderService } from './notification-provider.service';
import { Notification } from './entities/notification.entity';
import { NotificationSettings } from './entities/notification-settings.entity';
import { NotificationTemplate } from './entities/notification-template.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationSettings,
      NotificationTemplate,
    ]),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationSettingsService,
    NotificationTemplateService,
    NotificationSchedulerService,
    NotificationProviderService,
  ],
  exports: [
    NotificationService,
    NotificationSettingsService,
    NotificationTemplateService,
    NotificationSchedulerService,
    NotificationProviderService,
  ],
})
export class NotificationModule {}
