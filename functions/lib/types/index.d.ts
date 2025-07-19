import { Request, Response } from 'express';
import { TaskStatus, TaskPriority } from '@almus/shared-types';
export interface ApiRequest extends Request {
    user?: {
        uid: string;
        email: string;
        role: string;
        teamId: string;
    };
}
export interface ApiResponse extends Response {
    success?: boolean;
    data?: any;
    error?: string;
}
export interface CallableRequestData {
    taskId?: string;
    title?: string;
    description?: string;
    assigneeId?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string;
    teamId?: string;
    projectId?: string;
}
export interface CallableResponseData {
    success: boolean;
    data?: any;
    error?: string;
}
export interface CreateTaskRequest {
    title: string;
    description?: string;
    assigneeId: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: string;
    teamId: string;
    projectId?: string;
}
export interface UpdateTaskRequest {
    taskId: string;
    title?: string;
    description?: string;
    assigneeId?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string;
}
export interface TaskQueryRequest {
    teamId: string;
    projectId?: string;
    status?: TaskStatus;
    assigneeId?: string;
    limit?: number;
    offset?: number;
}
export interface NotificationRequest {
    userId: string;
    type: 'TASK_CREATED' | 'TASK_UPDATED' | 'TASK_DUE_SOON' | 'TASK_OVERDUE';
    title: string;
    message: string;
    data?: any;
}
export interface TaskAggregation {
    teamId: string;
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    dueTodayTasks: number;
    completionRate: number;
}
export interface PermissionCheck {
    userId: string;
    teamId: string;
    action: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE';
    resourceType: 'TASK' | 'TEAM' | 'PROJECT' | 'FILE';
    resourceId?: string;
}
export interface ApiError {
    code: string;
    message: string;
    details?: any;
}
export interface RetryConfig {
    maxRetries: number;
    initialDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
}
export interface FunctionConfig {
    timeoutSeconds: number;
    memory: '256MiB' | '512MiB' | '1GiB' | '2GiB';
    region: string;
    retryConfig: RetryConfig;
}
//# sourceMappingURL=index.d.ts.map