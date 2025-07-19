import { TaskService } from '../services/taskService';
import { AuthUtils } from '../utils/auth';

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      })),
      add: jest.fn(),
      where: jest.fn(() => ({
        where: jest.fn(() => ({
          orderBy: jest.fn(() => ({
            offset: jest.fn(() => ({
              limit: jest.fn(() => ({
                get: jest.fn(),
              })),
            })),
          })),
        })),
      })),
    })),
  })),
  auth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

// Mock AuthUtils
jest.mock('../utils/auth', () => ({
  AuthUtils: {
    checkPermission: jest.fn(),
    isTeamMember: jest.fn(),
  },
}));

describe('TaskService', () => {
  const mockUserId = 'user123';
  const mockTeamId = 'team123';
  const mockTaskId = 'task123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    it('should create a task successfully', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test Description',
        assigneeId: 'assignee123',
        status: 'TODO',
        priority: 'MEDIUM',
        teamId: mockTeamId,
      };

      (AuthUtils.checkPermission as jest.Mock).mockResolvedValue(true);
      (AuthUtils.isTeamMember as jest.Mock).mockResolvedValue(true);

      const result = await TaskService.createTask(mockUserId, taskData);

      expect(result).toBeDefined();
      expect(result.title).toBe(taskData.title);
      expect(AuthUtils.checkPermission).toHaveBeenCalledWith({
        userId: mockUserId,
        teamId: mockTeamId,
        action: 'CREATE',
        resourceType: 'TASK',
      });
    });

    it('should throw error when user lacks permission', async () => {
      const taskData = {
        title: 'Test Task',
        assigneeId: 'assignee123',
        status: 'TODO',
        priority: 'MEDIUM',
        teamId: mockTeamId,
      };

      (AuthUtils.checkPermission as jest.Mock).mockResolvedValue(false);

      await expect(TaskService.createTask(mockUserId, taskData)).rejects.toThrow(
        'Task를 생성할 권한이 없습니다.'
      );
    });

    it('should throw error when required fields are missing', async () => {
      const taskData = {
        title: '',
        assigneeId: '',
        status: 'TODO',
        priority: 'MEDIUM',
        teamId: '',
      };

      await expect(TaskService.createTask(mockUserId, taskData)).rejects.toThrow(
        '필수 필드가 누락되었습니다.'
      );
    });
  });

  describe('updateTask', () => {
    it('should update a task successfully', async () => {
      const updateData = {
        title: 'Updated Task',
        status: 'IN_PROGRESS',
      };

      const mockTaskDoc = {
        exists: true,
        data: () => ({
          teamId: mockTeamId,
          version: 1,
        }),
      };

      const mockFirestore = require('firebase-admin').firestore();
      mockFirestore.collection().doc().get.mockResolvedValue(mockTaskDoc);

      (AuthUtils.checkPermission as jest.Mock).mockResolvedValue(true);

      const result = await TaskService.updateTask(mockUserId, mockTaskId, updateData);

      expect(result).toBeDefined();
      expect(AuthUtils.checkPermission).toHaveBeenCalledWith({
        userId: mockUserId,
        teamId: mockTeamId,
        action: 'UPDATE',
        resourceType: 'TASK',
        resourceId: mockTaskId,
      });
    });

    it('should throw error when task not found', async () => {
      const updateData = {
        title: 'Updated Task',
      };

      const mockTaskDoc = {
        exists: false,
      };

      const mockFirestore = require('firebase-admin').firestore();
      mockFirestore.collection().doc().get.mockResolvedValue(mockTaskDoc);

      await expect(TaskService.updateTask(mockUserId, mockTaskId, updateData)).rejects.toThrow(
        'Task를 찾을 수 없습니다.'
      );
    });
  });

  describe('deleteTask', () => {
    it('should delete a task successfully', async () => {
      const mockTaskDoc = {
        exists: true,
        data: () => ({
          teamId: mockTeamId,
          createdBy: mockUserId,
        }),
      };

      const mockFirestore = require('firebase-admin').firestore();
      mockFirestore.collection().doc().get.mockResolvedValue(mockTaskDoc);

      (AuthUtils.checkPermission as jest.Mock).mockResolvedValue(true);

      await expect(TaskService.deleteTask(mockUserId, mockTaskId)).resolves.not.toThrow();

      expect(AuthUtils.checkPermission).toHaveBeenCalledWith({
        userId: mockUserId,
        teamId: mockTeamId,
        action: 'DELETE',
        resourceType: 'TASK',
        resourceId: mockTaskId,
      });
    });
  });

  describe('getTask', () => {
    it('should get a task successfully', async () => {
      const mockTaskData = {
        title: 'Test Task',
        teamId: mockTeamId,
      };

      const mockTaskDoc = {
        exists: true,
        data: () => mockTaskData,
      };

      const mockFirestore = require('firebase-admin').firestore();
      mockFirestore.collection().doc().get.mockResolvedValue(mockTaskDoc);

      (AuthUtils.checkPermission as jest.Mock).mockResolvedValue(true);

      const result = await TaskService.getTask(mockUserId, mockTaskId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockTaskId);
      expect(result.title).toBe(mockTaskData.title);
    });
  });

  describe('getTasks', () => {
    it('should get tasks list successfully', async () => {
      const query = {
        teamId: mockTeamId,
        limit: 10,
        offset: 0,
      };

      const mockTasksData = [
        { title: 'Task 1', teamId: mockTeamId },
        { title: 'Task 2', teamId: mockTeamId },
      ];

      const mockSnapshot = {
        docs: mockTasksData.map((data, index) => ({
          id: `task${index}`,
          data: () => data,
        })),
      };

      const mockFirestore = require('firebase-admin').firestore();
      mockFirestore.collection().where().where().orderBy().offset().limit().get.mockResolvedValue(mockSnapshot);

      (AuthUtils.isTeamMember as jest.Mock).mockResolvedValue(true);

      const result = await TaskService.getTasks(mockUserId, query);

      expect(result).toBeDefined();
      expect(result.tasks).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should throw error when user is not team member', async () => {
      const query = {
        teamId: mockTeamId,
      };

      (AuthUtils.isTeamMember as jest.Mock).mockResolvedValue(false);

      await expect(TaskService.getTasks(mockUserId, query)).rejects.toThrow('팀 멤버가 아닙니다.');
    });
  });

  describe('getTaskAggregation', () => {
    it('should get task aggregation successfully', async () => {
      const mockTasksData = [
        { status: 'DONE', dueDate: new Date('2023-01-01') },
        { status: 'TODO', dueDate: new Date('2023-12-31') },
        { status: 'IN_PROGRESS', dueDate: new Date('2023-01-01') },
      ];

      const mockSnapshot = {
        docs: mockTasksData.map((data, index) => ({
          data: () => data,
        })),
      };

      const mockFirestore = require('firebase-admin').firestore();
      mockFirestore.collection().where().get.mockResolvedValue(mockSnapshot);

      (AuthUtils.isTeamMember as jest.Mock).mockResolvedValue(true);

      const result = await TaskService.getTaskAggregation(mockUserId, mockTeamId);

      expect(result).toBeDefined();
      expect(result.teamId).toBe(mockTeamId);
      expect(result.totalTasks).toBe(3);
      expect(result.completedTasks).toBe(1);
    });
  });
}); 