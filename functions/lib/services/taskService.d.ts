import { CreateTaskRequest, UpdateTaskRequest, TaskQueryRequest, TaskAggregation } from '../types';
export declare class TaskService {
    /**
     * Task 생성
     */
    static createTask(userId: string, taskData: CreateTaskRequest): Promise<any>;
    /**
     * Task 수정
     */
    static updateTask(userId: string, taskId: string, updateData: UpdateTaskRequest): Promise<any>;
    /**
     * Task 삭제
     */
    static deleteTask(userId: string, taskId: string): Promise<void>;
    /**
     * Task 조회
     */
    static getTask(userId: string, taskId: string): Promise<any>;
    /**
     * Task 목록 조회
     */
    static getTasks(userId: string, query: TaskQueryRequest): Promise<any>;
    /**
     * Task 집계 정보 조회
     */
    static getTaskAggregation(userId: string, teamId: string): Promise<TaskAggregation>;
}
//# sourceMappingURL=taskService.d.ts.map