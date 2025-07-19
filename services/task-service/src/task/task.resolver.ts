import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { TaskService } from './task.service';
import type {
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilterInput,
  Task,
} from '@almus/shared-types';
import { TaskType, CreateTaskInputType, UpdateTaskInputType, TaskFilterInputType } from './dto/task.types';

@Resolver(() => TaskType)
export class TaskResolver {
  constructor(private readonly taskService: TaskService) {}

  @Mutation(() => TaskType)
  async createTask(
    @Args('input') createTaskInput: CreateTaskInput
  ): Promise<Task> {
    // TODO: 실제 사용자 ID 가져오기
    const userId = '1';
    return this.taskService.createTask(createTaskInput, userId);
  }

  @Query(() => [TaskType])
  async tasks(
    @Args('filter', { nullable: true }) filter?: TaskFilterInputType
  ): Promise<Task[]> {
    return this.taskService.findAll(filter as TaskFilterInput);
  }

  @Query(() => TaskType)
  async task(@Args('id') id: string): Promise<Task> {
    return this.taskService.findOne(id);
  }

  @Mutation(() => TaskType)
  async updateTask(
    @Args('id') id: string,
    @Args('input') updateTaskInput: UpdateTaskInputType
  ): Promise<Task> {
    // TODO: 실제 사용자 ID 가져오기
    const userId = '1';
    return this.taskService.updateTask(id, updateTaskInput as UpdateTaskInput, userId);
  }

  @Mutation(() => Boolean)
  async deleteTask(@Args('id') id: string): Promise<boolean> {
    // TODO: 실제 사용자 ID 가져오기
    const userId = '1';
    return this.taskService.removeTask(id, userId);
  }

  @ResolveField()
  async assignee(@Parent() task: Task): Promise<any> {
    // TODO: 실제 사용자 정보 가져오기
    return {
      id: task.assigneeId,
      name: 'Test User',
      email: 'test@example.com',
    };
  }

  @ResolveField()
  async createdByUser(@Parent() task: Task): Promise<any> {
    // TODO: 실제 사용자 정보 가져오기
    return {
      id: task.createdBy,
      name: 'Test User',
      email: 'test@example.com',
    };
  }
}
