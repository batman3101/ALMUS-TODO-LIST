var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ObjectType, Field, InputType, Int } from '@nestjs/graphql';
let TaskType = class TaskType {
};
__decorate([
    Field(),
    __metadata("design:type", String)
], TaskType.prototype, "id", void 0);
__decorate([
    Field(),
    __metadata("design:type", String)
], TaskType.prototype, "title", void 0);
__decorate([
    Field({ nullable: true }),
    __metadata("design:type", String)
], TaskType.prototype, "description", void 0);
__decorate([
    Field(),
    __metadata("design:type", String)
], TaskType.prototype, "assigneeId", void 0);
__decorate([
    Field(),
    __metadata("design:type", String)
], TaskType.prototype, "status", void 0);
__decorate([
    Field(),
    __metadata("design:type", String)
], TaskType.prototype, "priority", void 0);
__decorate([
    Field({ nullable: true }),
    __metadata("design:type", Date)
], TaskType.prototype, "dueDate", void 0);
__decorate([
    Field(),
    __metadata("design:type", String)
], TaskType.prototype, "createdBy", void 0);
__decorate([
    Field(),
    __metadata("design:type", Number)
], TaskType.prototype, "version", void 0);
__decorate([
    Field(),
    __metadata("design:type", Date)
], TaskType.prototype, "createdAt", void 0);
__decorate([
    Field(),
    __metadata("design:type", Date)
], TaskType.prototype, "updatedAt", void 0);
__decorate([
    Field({ nullable: true }),
    __metadata("design:type", Date)
], TaskType.prototype, "startDate", void 0);
__decorate([
    Field({ nullable: true }),
    __metadata("design:type", Date)
], TaskType.prototype, "endDate", void 0);
__decorate([
    Field(() => [String], { nullable: true }),
    __metadata("design:type", Array)
], TaskType.prototype, "dependencies", void 0);
__decorate([
    Field(() => Int, { nullable: true }),
    __metadata("design:type", Number)
], TaskType.prototype, "progress", void 0);
TaskType = __decorate([
    ObjectType()
], TaskType);
export { TaskType };
let CreateTaskInputType = class CreateTaskInputType {
};
__decorate([
    Field(),
    __metadata("design:type", String)
], CreateTaskInputType.prototype, "title", void 0);
__decorate([
    Field({ nullable: true }),
    __metadata("design:type", String)
], CreateTaskInputType.prototype, "description", void 0);
__decorate([
    Field(),
    __metadata("design:type", String)
], CreateTaskInputType.prototype, "assigneeId", void 0);
__decorate([
    Field(),
    __metadata("design:type", String)
], CreateTaskInputType.prototype, "status", void 0);
__decorate([
    Field(),
    __metadata("design:type", String)
], CreateTaskInputType.prototype, "priority", void 0);
__decorate([
    Field({ nullable: true }),
    __metadata("design:type", Date)
], CreateTaskInputType.prototype, "dueDate", void 0);
__decorate([
    Field({ nullable: true }),
    __metadata("design:type", Date)
], CreateTaskInputType.prototype, "startDate", void 0);
__decorate([
    Field({ nullable: true }),
    __metadata("design:type", Date)
], CreateTaskInputType.prototype, "endDate", void 0);
__decorate([
    Field(() => [String], { nullable: true }),
    __metadata("design:type", Array)
], CreateTaskInputType.prototype, "dependencies", void 0);
__decorate([
    Field(() => Int, { nullable: true }),
    __metadata("design:type", Number)
], CreateTaskInputType.prototype, "progress", void 0);
CreateTaskInputType = __decorate([
    InputType()
], CreateTaskInputType);
export { CreateTaskInputType };
let UpdateTaskInputType = class UpdateTaskInputType {
};
__decorate([
    Field(),
    __metadata("design:type", String)
], UpdateTaskInputType.prototype, "id", void 0);
__decorate([
    Field(),
    __metadata("design:type", Number)
], UpdateTaskInputType.prototype, "version", void 0);
__decorate([
    Field({ nullable: true }),
    __metadata("design:type", String)
], UpdateTaskInputType.prototype, "title", void 0);
__decorate([
    Field({ nullable: true }),
    __metadata("design:type", String)
], UpdateTaskInputType.prototype, "description", void 0);
__decorate([
    Field({ nullable: true }),
    __metadata("design:type", String)
], UpdateTaskInputType.prototype, "assigneeId", void 0);
__decorate([
    Field({ nullable: true }),
    __metadata("design:type", String)
], UpdateTaskInputType.prototype, "status", void 0);
__decorate([
    Field({ nullable: true }),
    __metadata("design:type", String)
], UpdateTaskInputType.prototype, "priority", void 0);
__decorate([
    Field({ nullable: true }),
    __metadata("design:type", Date)
], UpdateTaskInputType.prototype, "dueDate", void 0);
__decorate([
    Field({ nullable: true }),
    __metadata("design:type", Date)
], UpdateTaskInputType.prototype, "startDate", void 0);
__decorate([
    Field({ nullable: true }),
    __metadata("design:type", Date)
], UpdateTaskInputType.prototype, "endDate", void 0);
__decorate([
    Field(() => [String], { nullable: true }),
    __metadata("design:type", Array)
], UpdateTaskInputType.prototype, "dependencies", void 0);
__decorate([
    Field(() => Int, { nullable: true }),
    __metadata("design:type", Number)
], UpdateTaskInputType.prototype, "progress", void 0);
UpdateTaskInputType = __decorate([
    InputType()
], UpdateTaskInputType);
export { UpdateTaskInputType };
let TaskFilterInputType = class TaskFilterInputType {
};
__decorate([
    Field({ nullable: true }),
    __metadata("design:type", String)
], TaskFilterInputType.prototype, "assigneeId", void 0);
__decorate([
    Field({ nullable: true }),
    __metadata("design:type", String)
], TaskFilterInputType.prototype, "status", void 0);
__decorate([
    Field({ nullable: true }),
    __metadata("design:type", String)
], TaskFilterInputType.prototype, "priority", void 0);
__decorate([
    Field({ nullable: true }),
    __metadata("design:type", String)
], TaskFilterInputType.prototype, "teamId", void 0);
__decorate([
    Field({ nullable: true }),
    __metadata("design:type", String)
], TaskFilterInputType.prototype, "projectId", void 0);
TaskFilterInputType = __decorate([
    InputType()
], TaskFilterInputType);
export { TaskFilterInputType };
