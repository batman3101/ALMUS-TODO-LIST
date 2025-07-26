import { Test, TestingModule } from '@nestjs/testing';
import { TaskController } from './task.controller';
import { TaskService } from './task.service';
import { TaskStatus, TaskPriority } from '@almus/shared-types';

describe('TaskController', () => {
  let controller: TaskController;
  let service: TaskService;

  const mockTaskService = {
    findAll: jest.fn(() => []),
    findOne: jest.fn((id: string) => ({
      id,
      title: 'Test Task',
      description: 'Test Description',
      status: 'TODO',
      priority: 'MEDIUM',
    })),
    createTask: jest.fn((createTaskInput: any, userId: string) => ({
      id: 'new-id',
      ...createTaskInput,
      createdBy: userId,
    })),
    updateTask: jest.fn((id: string, updateTaskInput: any, userId: string) => ({
      id,
      ...updateTaskInput,
      updatedBy: userId,
    })),
    removeTask: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskController],
      providers: [
        {
          provide: TaskService,
          useValue: mockTaskService,
        },
      ],
    }).compile();

    controller = module.get<TaskController>(TaskController);
    service = module.get<TaskService>(TaskService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of tasks', async () => {
      const result = await controller.findAll();
      expect(result).toEqual([]);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single task', async () => {
      const taskId = 'test-id';
      const result = await controller.findOne(taskId);
      
      expect(result).toEqual({
        id: taskId,
        title: 'Test Task',
        description: 'Test Description',
        status: 'TODO',
        priority: 'MEDIUM',
      });
      expect(service.findOne).toHaveBeenCalledWith(taskId);
    });
  });

  describe('create', () => {
    it('should create a new task', async () => {
      const createTaskInput = {
        title: 'New Task',
        description: 'New Description',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        assigneeId: 'test-assignee',
        teamId: 'test-team',
      };
      const req = { user: { userId: 'test-user' } };

      const result = await controller.create(createTaskInput, req);

      expect(result).toEqual({
        id: 'new-id',
        ...createTaskInput,
        createdBy: 'test-user',
      });
      expect(service.createTask).toHaveBeenCalledWith(createTaskInput, 'test-user');
    });
  });

  describe('update', () => {
    it('should update a task', async () => {
      const taskId = 'test-id';
      const updateTaskInput = { title: 'Updated Task' };
      const req = { user: { userId: 'test-user' } };

      const result = await controller.update(taskId, updateTaskInput, req);

      expect(result).toEqual({
        id: taskId,
        ...updateTaskInput,
        updatedBy: 'test-user',
      });
      expect(service.updateTask).toHaveBeenCalledWith(taskId, updateTaskInput, 'test-user');
    });
  });

  describe('remove', () => {
    it('should remove a task', async () => {
      const taskId = 'test-id';
      const req = { user: { userId: 'test-user' } };

      const result = await controller.remove(taskId, req);

      expect(result).toEqual({ success: true });
      expect(service.removeTask).toHaveBeenCalledWith(taskId, 'test-user');
    });
  });
});