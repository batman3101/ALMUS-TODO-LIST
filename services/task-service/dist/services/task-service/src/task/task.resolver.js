var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Resolver, Query, Mutation, Args, ResolveField, Parent, } from '@nestjs/graphql';
import { TaskService } from './task.service';
import { TaskType, UpdateTaskInputType, TaskFilterInputType, } from './dto/task.types';
let TaskResolver = class TaskResolver {
    constructor(taskService) {
        this.taskService = taskService;
    }
    async createTask(createTaskInput) {
        // TODO: 실제 사용자 ID 가져오기
        const userId = '1';
        return this.taskService.createTask(createTaskInput, userId);
    }
    async tasks(filter) {
        return this.taskService.findAll(filter);
    }
    async task(id) {
        return this.taskService.findOne(id);
    }
    async updateTask(id, updateTaskInput) {
        // TODO: 실제 사용자 ID 가져오기
        const userId = '1';
        return this.taskService.updateTask(id, updateTaskInput, userId);
    }
    async deleteTask(id) {
        // TODO: 실제 사용자 ID 가져오기
        const userId = '1';
        return this.taskService.removeTask(id, userId);
    }
    async assignee(task) {
        // TODO: 실제 사용자 정보 가져오기
        if (!task.assignee_id) {
            return null;
        }
        return {
            id: task.assignee_id,
            name: 'Test User',
            email: 'test@example.com',
        };
    }
    async createdByUser(task) {
        // TODO: 실제 사용자 정보 가져오기
        return {
            id: task.created_by,
            name: 'Test User',
            email: 'test@example.com',
        };
    }
};
__decorate([
    Mutation(() => TaskType),
    __param(0, Args('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TaskResolver.prototype, "createTask", null);
__decorate([
    Query(() => [TaskType]),
    __param(0, Args('filter', { nullable: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [TaskFilterInputType]),
    __metadata("design:returntype", Promise)
], TaskResolver.prototype, "tasks", null);
__decorate([
    Query(() => TaskType),
    __param(0, Args('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TaskResolver.prototype, "task", null);
__decorate([
    Mutation(() => TaskType),
    __param(0, Args('id')),
    __param(1, Args('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateTaskInputType]),
    __metadata("design:returntype", Promise)
], TaskResolver.prototype, "updateTask", null);
__decorate([
    Mutation(() => Boolean),
    __param(0, Args('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TaskResolver.prototype, "deleteTask", null);
__decorate([
    ResolveField(),
    __param(0, Parent()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TaskResolver.prototype, "assignee", null);
__decorate([
    ResolveField(),
    __param(0, Parent()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TaskResolver.prototype, "createdByUser", null);
TaskResolver = __decorate([
    Resolver(() => TaskType),
    __metadata("design:paramtypes", [TaskService])
], TaskResolver);
export { TaskResolver };
