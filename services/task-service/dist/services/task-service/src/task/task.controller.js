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
import { Controller, Get, Post, Body, Patch, Param, Delete, Request, Query, } from '@nestjs/common';
import { TaskService } from './task.service';
let TaskController = class TaskController {
    constructor(taskService) {
        this.taskService = taskService;
    }
    async create(createTaskInput, req) {
        return this.taskService.createTask(createTaskInput, req.user.userId);
    }
    async findAll(filter) {
        return this.taskService.findAll(filter);
    }
    async findOne(id) {
        return this.taskService.findOne(id);
    }
    async update(id, updateTaskInput, req) {
        return this.taskService.updateTask(id, updateTaskInput, req.user.userId);
    }
    async remove(id, req) {
        const result = await this.taskService.removeTask(id, req.user.userId);
        return { success: result };
    }
    async health() {
        return { status: 'ok' };
    }
};
__decorate([
    Post(),
    __param(0, Body()),
    __param(1, Request()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TaskController.prototype, "create", null);
__decorate([
    Get(),
    __param(0, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TaskController.prototype, "findAll", null);
__decorate([
    Get(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TaskController.prototype, "findOne", null);
__decorate([
    Patch(':id'),
    __param(0, Param('id')),
    __param(1, Body()),
    __param(2, Request()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], TaskController.prototype, "update", null);
__decorate([
    Delete(':id'),
    __param(0, Param('id')),
    __param(1, Request()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TaskController.prototype, "remove", null);
__decorate([
    Get('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TaskController.prototype, "health", null);
TaskController = __decorate([
    Controller('tasks'),
    __metadata("design:paramtypes", [TaskService])
], TaskController);
export { TaskController };
