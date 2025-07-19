import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  Query,
} from '@nestjs/common';
import { TaskService } from './task.service';
import type {
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilterInput,
  Task as TaskType,
} from '@almus/shared-types';

@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  async create(
    @Body() createTaskInput: CreateTaskInput,
    @Request() req: any
  ): Promise<TaskType> {
    return this.taskService.createTask(createTaskInput, req.user.userId);
  }

  @Get()
  async findAll(@Query() filter?: TaskFilterInput): Promise<TaskType[]> {
    return this.taskService.findAll(filter);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<TaskType> {
    return this.taskService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTaskInput: UpdateTaskInput,
    @Request() req: any
  ): Promise<TaskType> {
    return this.taskService.updateTask(id, updateTaskInput, req.user.userId);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Request() req: any
  ): Promise<{ success: boolean }> {
    const result = await this.taskService.removeTask(id, req.user.userId);
    return { success: result };
  }

  @Get('health')
  async health(): Promise<{ status: string }> {
    return { status: 'ok' };
  }
}
