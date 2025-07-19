import { Request, Response } from 'express';
import { TaskStatus, TaskPriority } from '@almus/shared-types';

// HTTP 요청/응답 타입
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

// Callable 함수 요청/응답 타입
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

// Task 관련 타입
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

// 알림 관련 타입
export interface NotificationRequest {
  userId: string;
  type: 'TASK_CREATED' | 'TASK_UPDATED' | 'TASK_DUE_SOON' | 'TASK_OVERDUE';
  title: string;
  message: string;
  data?: any;
}

// 집계 관련 타입
export interface TaskAggregation {
  teamId: string;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  dueTodayTasks: number;
  completionRate: number;
}

// 권한 검증 타입
export interface PermissionCheck {
  userId: string;
  teamId: string;
  action: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE';
  resourceType: 'TASK' | 'TEAM' | 'PROJECT' | 'FILE';
  resourceId?: string;
}

// 오류 타입
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// 재시도 설정 타입
export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

// 함수 설정 타입
export interface FunctionConfig {
  timeoutSeconds: number;
  memory: '256MiB' | '512MiB' | '1GiB' | '2GiB';
  region: string;
  retryConfig: RetryConfig;
} 