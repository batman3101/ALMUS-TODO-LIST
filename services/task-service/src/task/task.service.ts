import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import {
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilterInput,
  Task as TaskType,
  TaskConflict,
} from '@almus/shared-types';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>
  ) {}

  async createTask(
    createTaskInput: CreateTaskInput,
    userId: string
  ): Promise<TaskType> {
    const task = this.taskRepository.create({
      ...createTaskInput,
      createdBy: userId,
      version: 1,
    });

    const savedTask = await this.taskRepository.save(task);
    return this.mapToTaskType(savedTask);
  }

  async findAll(filter?: TaskFilterInput): Promise<TaskType[]> {
    const queryBuilder = this.taskRepository.createQueryBuilder('task');

    if (filter) {
      if (filter.status) {
        queryBuilder.andWhere('task.status = :status', {
          status: filter.status,
        });
      }
      if (filter.priority) {
        queryBuilder.andWhere('task.priority = :priority', {
          priority: filter.priority,
        });
      }
      if (filter.assigneeId) {
        queryBuilder.andWhere('task.assigneeId = :assigneeId', {
          assigneeId: filter.assigneeId,
        });
      }
      if (filter.createdBy) {
        queryBuilder.andWhere('task.createdBy = :createdBy', {
          createdBy: filter.createdBy,
        });
      }
      if (filter.dueDateFrom) {
        queryBuilder.andWhere('task.dueDate >= :dueDateFrom', {
          dueDateFrom: filter.dueDateFrom,
        });
      }
      if (filter.dueDateTo) {
        queryBuilder.andWhere('task.dueDate <= :dueDateTo', {
          dueDateTo: filter.dueDateTo,
        });
      }
    }

    const tasks = await queryBuilder.getMany();
    return tasks.map(task => this.mapToTaskType(task));
  }

  async findOne(id: string): Promise<TaskType> {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return this.mapToTaskType(task);
  }

  async updateTask(
    id: string,
    updateTaskInput: UpdateTaskInput,
    userId: string
  ): Promise<TaskType> {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // 권한 체크: 작성자나 관리자만 수정 가능
    if (task.createdBy !== userId) {
      // TODO: 관리자 권한 체크 추가
      throw new ForbiddenException('Only the creator can update this task');
    }

    // 동시 편집 충돌 방지
    if (task.version !== updateTaskInput.version) {
      throw new ConflictException('Task has been modified by another user');
    }

    // 버전 증가
    const updatedTask = {
      ...task,
      ...updateTaskInput,
      version: task.version + 1,
    };

    const savedTask = await this.taskRepository.save(updatedTask);
    return this.mapToTaskType(savedTask);
  }

  async removeTask(id: string, userId: string): Promise<boolean> {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // 권한 체크: 작성자나 관리자만 삭제 가능
    if (task.createdBy !== userId) {
      // TODO: 관리자 권한 체크 추가
      throw new ForbiddenException('Only the creator can delete this task');
    }

    await this.taskRepository.remove(task);
    return true;
  }

  async checkConflict(
    taskId: string,
    clientVersion: number
  ): Promise<TaskConflict | null> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) {
      return null;
    }

    if (task.version !== clientVersion) {
      return {
        taskId,
        serverVersion: task.version,
        clientVersion,
        serverData: this.mapToTaskType(task),
        clientData: null as any, // 클라이언트에서 제공해야 함
      };
    }

    return null;
  }

  private mapToTaskType(task: Task): TaskType {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      assigneeId: task.assigneeId,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      createdBy: task.createdBy,
      version: task.version,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}
