import { Request, Response } from 'express';
import { onRequest } from 'firebase-functions/v2/https';
import { TaskService } from '../services/taskService';
import { AuthUtils } from '../utils/auth';
import {
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskQueryRequest,
  ApiRequest,
  ApiResponse,
} from '../types';

// Task 생성 HTTP 함수
export const createTask = onRequest(
  {
    timeoutSeconds: 30,
    memory: '256MiB',
    region: 'asia-northeast3',
  },
  async (req: Request, res: Response) => {
    try {
      const apiReq = req as ApiRequest;
      const apiRes = res as ApiResponse;

      // 사용자 인증
      const user = await AuthUtils.verifyUser(apiReq);
      apiReq.user = user;

      // 요청 데이터 검증
      const taskData: CreateTaskRequest = req.body;
      if (!taskData.title || !taskData.assigneeId || !taskData.teamId) {
        apiRes.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다.',
        });
        return;
      }

      // Task 생성
      const result = await TaskService.createTask(user.uid, taskData);

      apiRes.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Task 생성 오류:', error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : 'Task 생성에 실패했습니다.',
      });
    }
  }
);

// Task 수정 HTTP 함수
export const updateTask = onRequest(
  {
    timeoutSeconds: 30,
    memory: '256MiB',
    region: 'asia-northeast3',
  },
  async (req: Request, res: Response) => {
    try {
      const apiReq = req as ApiRequest;
      const apiRes = res as ApiResponse;

      // 사용자 인증
      const user = await AuthUtils.verifyUser(apiReq);
      apiReq.user = user;

      const taskId = req.params.taskId;
      if (!taskId) {
        apiRes.status(400).json({
          success: false,
          error: 'Task ID가 필요합니다.',
        });
        return;
      }

      // 요청 데이터 검증
      const updateData: UpdateTaskRequest = req.body;
      if (Object.keys(updateData).length === 0) {
        apiRes.status(400).json({
          success: false,
          error: '수정할 데이터가 없습니다.',
        });
        return;
      }

      // Task 수정
      const result = await TaskService.updateTask(user.uid, taskId, updateData);

      apiRes.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Task 수정 오류:', error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : 'Task 수정에 실패했습니다.',
      });
    }
  }
);

// Task 삭제 HTTP 함수
export const deleteTask = onRequest(
  {
    timeoutSeconds: 30,
    memory: '256MiB',
    region: 'asia-northeast3',
  },
  async (req: Request, res: Response) => {
    try {
      const apiReq = req as ApiRequest;
      const apiRes = res as ApiResponse;

      // 사용자 인증
      const user = await AuthUtils.verifyUser(apiReq);
      apiReq.user = user;

      const taskId = req.params.taskId;
      if (!taskId) {
        apiRes.status(400).json({
          success: false,
          error: 'Task ID가 필요합니다.',
        });
        return;
      }

      // Task 삭제
      await TaskService.deleteTask(user.uid, taskId);

      apiRes.status(200).json({
        success: true,
        message: 'Task가 삭제되었습니다.',
      });
    } catch (error) {
      console.error('Task 삭제 오류:', error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : 'Task 삭제에 실패했습니다.',
      });
    }
  }
);

// Task 조회 HTTP 함수
export const getTask = onRequest(
  {
    timeoutSeconds: 30,
    memory: '256MiB',
    region: 'asia-northeast3',
  },
  async (req: Request, res: Response) => {
    try {
      const apiReq = req as ApiRequest;
      const apiRes = res as ApiResponse;

      // 사용자 인증
      const user = await AuthUtils.verifyUser(apiReq);
      apiReq.user = user;

      const taskId = req.params.taskId;
      if (!taskId) {
        apiRes.status(400).json({
          success: false,
          error: 'Task ID가 필요합니다.',
        });
        return;
      }

      // Task 조회
      const result = await TaskService.getTask(user.uid, taskId);

      apiRes.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Task 조회 오류:', error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : 'Task 조회에 실패했습니다.',
      });
    }
  }
);

// Task 목록 조회 HTTP 함수
export const getTasks = onRequest(
  {
    timeoutSeconds: 30,
    memory: '256MiB',
    region: 'asia-northeast3',
  },
  async (req: Request, res: Response) => {
    try {
      const apiReq = req as ApiRequest;
      const apiRes = res as ApiResponse;

      // 사용자 인증
      const user = await AuthUtils.verifyUser(apiReq);
      apiReq.user = user;

      // 쿼리 파라미터 검증
      const query: TaskQueryRequest = {
        teamId: req.query.teamId as string,
        projectId: req.query.projectId as string,
        status: req.query.status as any,
        assigneeId: req.query.assigneeId as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      };

      if (!query.teamId) {
        apiRes.status(400).json({
          success: false,
          error: '팀 ID가 필요합니다.',
        });
        return;
      }

      // Task 목록 조회
      const result = await TaskService.getTasks(user.uid, query);

      apiRes.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Task 목록 조회 오류:', error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Task 목록 조회에 실패했습니다.',
      });
    }
  }
);

// Task 집계 조회 HTTP 함수
export const getTaskAggregation = onRequest(
  {
    timeoutSeconds: 30,
    memory: '256MiB',
    region: 'asia-northeast3',
  },
  async (req: Request, res: Response) => {
    try {
      const apiReq = req as ApiRequest;
      const apiRes = res as ApiResponse;

      // 사용자 인증
      const user = await AuthUtils.verifyUser(apiReq);
      apiReq.user = user;

      const teamId = req.params.teamId;
      if (!teamId) {
        apiRes.status(400).json({
          success: false,
          error: '팀 ID가 필요합니다.',
        });
        return;
      }

      // Task 집계 조회
      const result = await TaskService.getTaskAggregation(user.uid, teamId);

      apiRes.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Task 집계 조회 오류:', error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Task 집계 조회에 실패했습니다.',
      });
    }
  }
);
