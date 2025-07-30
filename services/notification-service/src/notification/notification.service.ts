import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationSettings } from './entities/notification-settings.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import type {
  Notification as NotificationTypeInterface,
  CreateNotificationInput,
  NotificationType,
  NotificationChannel,
} from '@almus/shared-types';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationSettings)
    private notificationSettingsRepository: Repository<NotificationSettings>,
    @InjectRepository(NotificationTemplate)
    private notificationTemplateRepository: Repository<NotificationTemplate>
  ) {}

  async createNotification(
    input: CreateNotificationInput
  ): Promise<NotificationTypeInterface> {
    const notification = this.notificationRepository.create({
      user_id: input.user_id,
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.data,
      channels: input.channels,
    });

    const savedNotification = await this.notificationRepository.save(notification);
    return this.mapToNotificationInterface(savedNotification);
  }

  async findNotificationsByUserId(userId: string): Promise<NotificationType[]> {
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findUnreadNotificationsByUserId(
    userId: string
  ): Promise<NotificationType[]> {
    return this.notificationRepository.find({
      where: { userId, isRead: false },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(notificationId: string): Promise<NotificationType> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('알림을 찾을 수 없습니다.');
    }

    notification.isRead = true;
    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true }
    );
  }

  async deleteNotification(notificationId: string): Promise<void> {
    const result = await this.notificationRepository.delete(notificationId);
    if (result.affected === 0) {
      throw new NotFoundException('알림을 찾을 수 없습니다.');
    }
  }

  async getNotificationCount(
    userId: string
  ): Promise<{ total: number; unread: number }> {
    const [total, unread] = await Promise.all([
      this.notificationRepository.count({ where: { userId } }),
      this.notificationRepository.count({ where: { userId, isRead: false } }),
    ]);

    return { total, unread };
  }

  async createTaskDueReminder(
    userId: string,
    taskId: string,
    taskTitle: string,
    dueDate: Date
  ): Promise<NotificationType> {
    const settings = await this.notificationSettingsRepository.findOne({
      where: { userId },
    });

    if (!settings || settings.taskDueReminder === 'NEVER') {
      return null;
    }

    const template = await this.notificationTemplateRepository.findOne({
      where: { type: NotificationTypeEnum.TASK_DUE_REMINDER, isActive: true },
    });

    const title = template?.title || '태스크 마감일 알림';
    const message =
      template?.message ||
      `"${taskTitle}" 태스크의 마감일이 ${dueDate.toLocaleDateString()}입니다.`;

    const channels: NotificationChannel[] = [];
    if (settings.emailEnabled) channels.push(NotificationChannel.EMAIL);
    if (settings.pushEnabled) channels.push(NotificationChannel.PUSH);
    if (settings.inAppEnabled) channels.push(NotificationChannel.IN_APP);

    return this.createNotification({
      userId,
      type: NotificationTypeEnum.TASK_DUE_REMINDER,
      title,
      message,
      data: { taskId, dueDate },
      channels,
    });
  }

  async createTaskStatusChangeNotification(
    userId: string,
    taskId: string,
    taskTitle: string,
    oldStatus: string,
    newStatus: string
  ): Promise<NotificationType> {
    const settings = await this.notificationSettingsRepository.findOne({
      where: { userId },
    });

    if (!settings || settings.taskStatusChange === 'NEVER') {
      return null;
    }

    const template = await this.notificationTemplateRepository.findOne({
      where: { type: NotificationTypeEnum.TASK_STATUS_CHANGE, isActive: true },
    });

    const title = template?.title || '태스크 상태 변경 알림';
    const message =
      template?.message ||
      `"${taskTitle}" 태스크의 상태가 ${oldStatus}에서 ${newStatus}로 변경되었습니다.`;

    const channels: NotificationChannel[] = [];
    if (settings.emailEnabled) channels.push(NotificationChannel.EMAIL);
    if (settings.pushEnabled) channels.push(NotificationChannel.PUSH);
    if (settings.inAppEnabled) channels.push(NotificationChannel.IN_APP);

    return this.createNotification({
      userId,
      type: NotificationTypeEnum.TASK_STATUS_CHANGE,
      title,
      message,
      data: { taskId, oldStatus, newStatus },
      channels,
    });
  }

  // Controller methods
  async create(
    createNotificationDto: CreateNotificationInput
  ): Promise<NotificationType> {
    return this.createNotification(createNotificationDto);
  }

  async findAll(): Promise<NotificationType[]> {
    return this.notificationRepository.find();
  }

  async findOne(id: string): Promise<NotificationType> {
    return this.notificationRepository.findOne({ where: { id } });
  }

  async update(
    id: string,
    updateNotificationDto: Partial<NotificationType>
  ): Promise<NotificationType> {
    // TypeORM 호환성을 위해 데이터 변환
    const updateData: any = { ...updateNotificationDto };
    await this.notificationRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.deleteNotification(id);
  }
}
