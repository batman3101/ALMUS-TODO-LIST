import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationSettings } from './entities/notification-settings.entity';
import {
  NotificationSettings as NotificationSettingsType,
  CreateNotificationSettingsInput,
  UpdateNotificationSettingsInput,
  NotificationFrequency,
} from '@almus/shared-types';

@Injectable()
export class NotificationSettingsService {
  constructor(
    @InjectRepository(NotificationSettings)
    private notificationSettingsRepository: Repository<NotificationSettings>
  ) {}

  async createSettings(
    input: CreateNotificationSettingsInput
  ): Promise<NotificationSettingsType> {
    const settings = this.notificationSettingsRepository.create({
      userId: input.userId,
      taskDueReminder: input.taskDueReminder || NotificationFrequency.IMMEDIATE,
      taskStatusChange:
        input.taskStatusChange || NotificationFrequency.IMMEDIATE,
      taskAssigned: input.taskAssigned || NotificationFrequency.IMMEDIATE,
      taskComment: input.taskComment || NotificationFrequency.IMMEDIATE,
      taskOverdue: input.taskOverdue || NotificationFrequency.IMMEDIATE,
      systemAnnouncement:
        input.systemAnnouncement || NotificationFrequency.IMMEDIATE,
      emailEnabled:
        input.emailEnabled !== undefined ? input.emailEnabled : true,
      pushEnabled: input.pushEnabled !== undefined ? input.pushEnabled : true,
      inAppEnabled:
        input.inAppEnabled !== undefined ? input.inAppEnabled : true,
      slackEnabled:
        input.slackEnabled !== undefined ? input.slackEnabled : false,
      teamsEnabled:
        input.teamsEnabled !== undefined ? input.teamsEnabled : false,
      kakaoEnabled:
        input.kakaoEnabled !== undefined ? input.kakaoEnabled : false,
      emailAddress: input.emailAddress,
      slackWebhook: input.slackWebhook,
      teamsWebhook: input.teamsWebhook,
      kakaoWebhook: input.kakaoWebhook,
    });

    return this.notificationSettingsRepository.save(settings);
  }

  async findSettingsByUserId(
    userId: string
  ): Promise<NotificationSettingsType> {
    return this.notificationSettingsRepository.findOne({
      where: { userId },
    });
  }

  async updateSettings(
    input: UpdateNotificationSettingsInput
  ): Promise<NotificationSettingsType> {
    const settings = await this.notificationSettingsRepository.findOne({
      where: { id: input.id },
    });

    if (!settings) {
      throw new NotFoundException('알림 설정을 찾을 수 없습니다.');
    }

    Object.assign(settings, input);
    return this.notificationSettingsRepository.save(settings);
  }

  async getDefaultSettings(userId: string): Promise<NotificationSettingsType> {
    const existingSettings = await this.findSettingsByUserId(userId);
    if (existingSettings) {
      return existingSettings;
    }

    return this.createSettings({
      userId,
      taskDueReminder: NotificationFrequency.IMMEDIATE,
      taskStatusChange: NotificationFrequency.IMMEDIATE,
      taskAssigned: NotificationFrequency.IMMEDIATE,
      taskComment: NotificationFrequency.IMMEDIATE,
      taskOverdue: NotificationFrequency.IMMEDIATE,
      systemAnnouncement: NotificationFrequency.IMMEDIATE,
      emailEnabled: true,
      pushEnabled: true,
      inAppEnabled: true,
      slackEnabled: false,
      teamsEnabled: false,
      kakaoEnabled: false,
    });
  }
}
