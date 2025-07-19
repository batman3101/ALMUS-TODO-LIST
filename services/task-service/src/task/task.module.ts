import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { TaskResolver } from './task.resolver';
import { Task } from './entities/task.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Task])],
  providers: [TaskService, TaskResolver],
  controllers: [TaskController],
  exports: [TaskService],
})
export class TaskModule {}
