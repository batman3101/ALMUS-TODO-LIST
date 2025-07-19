import { Resolver, Query, Mutation, Args, ResolveField, Parent } from '@nestjs/graphql';
import { TaskService } from './task.service';
import { CreateTaskInput, UpdateTaskInput, TaskFilterInput, Task as TaskType } from '@almus/shared-types';

@Resolver(() => TaskType)
export class TaskResolver {
  constructor(private readonly taskService: TaskService) {}

  @Mutation(() => TaskType)
  async createTask(@Args('input') createTaskInput: CreateTaskInput): Promise<TaskType> {
    // TODO: 실제 사용자 ID 가져오기
    const userId = '1';
    return this.taskService.createTask(createTaskInput, userId);
  }

  @Query(() => [TaskType])
  async tasks(@Args('filter', { nullable: true }) filter?: TaskFilterInput): Promise<TaskType[]> {
    return this.taskService.findAll(filter);
  }

  @Query(() => TaskType)
  async task(@Args('id') id: string): Promise<TaskType> {
    return this.taskService.findOne(id);
  }

  @Mutation(() => TaskType)
  async updateTask(
    @Args('id') id: string,
    @Args('input') updateTaskInput: UpdateTaskInput,
  ): Promise<TaskType> {
    // TODO: 실제 사용자 ID 가져오기
    const userId = '1';
    return this.taskService.updateTask(id, updateTaskInput, userId);
  }

  @Mutation(() => Boolean)
  async deleteTask(@Args('id') id: string): Promise<boolean> {
    // TODO: 실제 사용자 ID 가져오기
    const userId = '1';
    return this.taskService.removeTask(id, userId);
  }

  @ResolveField()
  async assignee(@Parent() task: TaskType): Promise<any> {
    // TODO: 실제 사용자 정보 가져오기
    return {
      id: task.assigneeId,
      name: 'Test User',
      email: 'test@example.com',
    };
  }

  @ResolveField()
  async createdByUser(@Parent() task: TaskType): Promise<any> {
    // TODO: 실제 사용자 정보 가져오기
    return {
      id: task.createdBy,
      name: 'Test User',
      email: 'test@example.com',
    };
  }
} 