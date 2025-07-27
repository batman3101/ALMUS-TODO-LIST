import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationType, NotificationChannel } from '@almus/shared-types';

describe('NotificationController', () => {
  let controller: NotificationController;
  let service: NotificationService;

  const mockNotificationService = {
    create: jest.fn(() => ({
      id: 'notification-id',
      title: 'Test Notification',
    })),
    findAll: jest.fn(() => []),
    findOne: jest.fn(() => ({
      id: 'notification-id',
      title: 'Test Notification',
    })),
    update: jest.fn(() => ({
      id: 'notification-id',
      title: 'Updated Notification',
    })),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
    service = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a notification', async () => {
      const createNotificationDto = {
        userId: 'test-user',
        type: NotificationType.TASK_ASSIGNED,
        title: 'New Task',
        message: 'You have a new task',
        channels: [NotificationChannel.EMAIL],
      };

      const result = await controller.create(createNotificationDto);

      expect(result).toEqual({
        id: 'notification-id',
        title: 'Test Notification',
      });
      expect(service.create).toHaveBeenCalledWith(createNotificationDto);
    });
  });

  describe('findAll', () => {
    it('should return all notifications', async () => {
      const result = await controller.findAll();

      expect(result).toEqual([]);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a notification by id', async () => {
      const notificationId = 'test-notification';

      const result = await controller.findOne(notificationId);

      expect(result).toEqual({
        id: 'notification-id',
        title: 'Test Notification',
      });
      expect(service.findOne).toHaveBeenCalledWith(notificationId);
    });
  });

  describe('update', () => {
    it('should update a notification', async () => {
      const notificationId = 'test-notification';
      const updateData = {
        title: 'Updated Title',
        isRead: true,
      };

      const result = await controller.update(notificationId, updateData);

      expect(result).toEqual({
        id: 'notification-id',
        title: 'Updated Notification',
      });
      expect(service.update).toHaveBeenCalledWith(notificationId, updateData);
    });
  });

  describe('remove', () => {
    it('should remove a notification', async () => {
      const notificationId = 'test-notification';

      await controller.remove(notificationId);

      expect(service.remove).toHaveBeenCalledWith(notificationId);
    });
  });
});
