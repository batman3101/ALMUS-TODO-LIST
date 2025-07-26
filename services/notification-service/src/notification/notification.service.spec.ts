import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationService } from './notification.service';
import { Notification } from './entities/notification.entity';
import { NotificationSettings } from './entities/notification-settings.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { NotificationType, NotificationChannel } from '@almus/shared-types';

describe('NotificationService', () => {
  let service: NotificationService;
  let notificationRepository: Repository<Notification>;
  let notificationSettingsRepository: Repository<NotificationSettings>;
  let notificationTemplateRepository: Repository<NotificationTemplate>;

  const mockNotificationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };

  const mockNotificationSettingsRepository = {
    findOne: jest.fn(),
  };

  const mockNotificationTemplateRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
        {
          provide: getRepositoryToken(NotificationSettings),
          useValue: mockNotificationSettingsRepository,
        },
        {
          provide: getRepositoryToken(NotificationTemplate),
          useValue: mockNotificationTemplateRepository,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    notificationRepository = module.get<Repository<Notification>>(
      getRepositoryToken(Notification),
    );
    notificationSettingsRepository = module.get<Repository<NotificationSettings>>(
      getRepositoryToken(NotificationSettings),
    );
    notificationTemplateRepository = module.get<Repository<NotificationTemplate>>(
      getRepositoryToken(NotificationTemplate),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('should create a notification', async () => {
      const createNotificationInput = {
        userId: 'test-user',
        type: NotificationType.TASK_ASSIGNED,
        title: 'New Task Assigned',
        message: 'You have been assigned a new task',
        channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
      };

      const mockNotification = { id: '1', ...createNotificationInput };
      mockNotificationRepository.create.mockReturnValue(mockNotification);
      mockNotificationRepository.save.mockResolvedValue(mockNotification);

      const result = await service.createNotification(createNotificationInput);

      expect(mockNotificationRepository.create).toHaveBeenCalledWith(createNotificationInput);
      expect(mockNotificationRepository.save).toHaveBeenCalledWith(mockNotification);
      expect(result).toEqual(mockNotification);
    });
  });

  describe('findNotificationsByUserId', () => {
    it('should return notifications for a user', async () => {
      const userId = 'test-user';
      const mockNotifications = [
        { id: '1', userId, title: 'Test Notification' },
      ];

      mockNotificationRepository.find.mockResolvedValue(mockNotifications);

      const result = await service.findNotificationsByUserId(userId);

      expect(mockNotificationRepository.find).toHaveBeenCalledWith({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockNotifications);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notificationId = 'test-notification';
      const mockNotification = { id: notificationId, isRead: false };
      const updatedNotification = { ...mockNotification, isRead: true };

      mockNotificationRepository.findOne.mockResolvedValue(mockNotification);
      mockNotificationRepository.save.mockResolvedValue(updatedNotification);

      const result = await service.markAsRead(notificationId);

      expect(mockNotificationRepository.findOne).toHaveBeenCalledWith({
        where: { id: notificationId },
      });
      expect(mockNotificationRepository.save).toHaveBeenCalledWith({
        ...mockNotification,
        isRead: true,
      });
      expect(result).toEqual(updatedNotification);
    });

    it('should throw NotFoundException when notification not found', async () => {
      const notificationId = 'non-existent';
      mockNotificationRepository.findOne.mockResolvedValue(null);

      await expect(service.markAsRead(notificationId)).rejects.toThrow('알림을 찾을 수 없습니다.');
    });
  });

  describe('getNotificationCount', () => {
    it('should return notification counts', async () => {
      const userId = 'test-user';
      mockNotificationRepository.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3); // unread

      const result = await service.getNotificationCount(userId);

      expect(result).toEqual({ total: 10, unread: 3 });
      expect(mockNotificationRepository.count).toHaveBeenCalledTimes(2);
    });
  });

  describe('findAll', () => {
    it('should return all notifications', async () => {
      const mockNotifications = [{ id: '1' }, { id: '2' }];
      mockNotificationRepository.find.mockResolvedValue(mockNotifications);

      const result = await service.findAll();

      expect(mockNotificationRepository.find).toHaveBeenCalled();
      expect(result).toEqual(mockNotifications);
    });
  });

  describe('findOne', () => {
    it('should return a notification by id', async () => {
      const notificationId = 'test-id';
      const mockNotification = { id: notificationId };
      mockNotificationRepository.findOne.mockResolvedValue(mockNotification);

      const result = await service.findOne(notificationId);

      expect(mockNotificationRepository.findOne).toHaveBeenCalledWith({
        where: { id: notificationId },
      });
      expect(result).toEqual(mockNotification);
    });
  });
});