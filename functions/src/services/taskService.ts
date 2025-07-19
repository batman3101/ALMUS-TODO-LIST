import { firestore } from 'firebase-admin';
import { CreateTaskRequest, UpdateTaskRequest, TaskQueryRequest, TaskAggregation } from '../types';
import { AuthUtils } from '../utils/auth';

export class TaskService {
  /**
   * Task 생성
   */
  static async createTask(userId: string, taskData: CreateTaskRequest): Promise<any> {
    try {
      // 권한 검증
      const hasPermission = await AuthUtils.checkPermission({
        userId,
        teamId: taskData.teamId,
        action: 'CREATE',
        resourceType: 'TASK',
      });

      if (!hasPermission) {
        throw new Error('Task를 생성할 권한이 없습니다.');
      }

      // Task 데이터 검증
      if (!taskData.title || !taskData.assigneeId || !taskData.teamId) {
        throw new Error('필수 필드가 누락되었습니다.');
      }

      // 담당자가 팀 멤버인지 확인
      const isAssigneeMember = await AuthUtils.isTeamMember(taskData.assigneeId, taskData.teamId);
      if (!isAssigneeMember) {
        throw new Error('담당자가 팀 멤버가 아닙니다.');
      }

      const taskDoc = {
        title: taskData.title,
        description: taskData.description || '',
        assigneeId: taskData.assigneeId,
        status: taskData.status,
        priority: taskData.priority,
        dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
        teamId: taskData.teamId,
        projectId: taskData.projectId || null,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const docRef = await firestore().collection('tasks').add(taskDoc);
      
      return {
        id: docRef.id,
        ...taskDoc,
      };
    } catch (error) {
      throw new Error(`Task 생성 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Task 수정
   */
  static async updateTask(userId: string, taskId: string, updateData: UpdateTaskRequest): Promise<any> {
    try {
      // 기존 Task 조회
      const taskDoc = await firestore().collection('tasks').doc(taskId).get();
      if (!taskDoc.exists) {
        throw new Error('Task를 찾을 수 없습니다.');
      }

      const taskData = taskDoc.data();
      if (!taskData) {
        throw new Error('Task 데이터가 없습니다.');
      }

      // 권한 검증
      const hasPermission = await AuthUtils.checkPermission({
        userId,
        teamId: taskData.teamId,
        action: 'UPDATE',
        resourceType: 'TASK',
        resourceId: taskId,
      });

      if (!hasPermission) {
        throw new Error('Task를 수정할 권한이 없습니다.');
      }

      // 담당자 변경 시 팀 멤버 확인
      if (updateData.assigneeId && updateData.assigneeId !== taskData.assigneeId) {
        const isAssigneeMember = await AuthUtils.isTeamMember(updateData.assigneeId, taskData.teamId);
        if (!isAssigneeMember) {
          throw new Error('새 담당자가 팀 멤버가 아닙니다.');
        }
      }

      const updateDoc = {
        ...updateData,
        updatedAt: new Date(),
        version: taskData.version + 1,
      };

      // null 값 제거
      Object.keys(updateDoc).forEach(key => {
        const typedKey = key as keyof typeof updateDoc;
        if (updateDoc[typedKey] === null || updateDoc[typedKey] === undefined) {
          delete updateDoc[typedKey];
        }
      });

      await firestore().collection('tasks').doc(taskId).update(updateDoc);

      // 업데이트된 Task 조회
      const updatedDoc = await firestore().collection('tasks').doc(taskId).get();
      return {
        id: taskId,
        ...updatedDoc.data(),
      };
    } catch (error) {
      throw new Error(`Task 수정 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Task 삭제
   */
  static async deleteTask(userId: string, taskId: string): Promise<void> {
    try {
      // 기존 Task 조회
      const taskDoc = await firestore().collection('tasks').doc(taskId).get();
      if (!taskDoc.exists) {
        throw new Error('Task를 찾을 수 없습니다.');
      }

      const taskData = taskDoc.data();
      if (!taskData) {
        throw new Error('Task 데이터가 없습니다.');
      }

      // 권한 검증
      const hasPermission = await AuthUtils.checkPermission({
        userId,
        teamId: taskData.teamId,
        action: 'DELETE',
        resourceType: 'TASK',
        resourceId: taskId,
      });

      if (!hasPermission) {
        throw new Error('Task를 삭제할 권한이 없습니다.');
      }

      await firestore().collection('tasks').doc(taskId).delete();
    } catch (error) {
      throw new Error(`Task 삭제 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Task 조회
   */
  static async getTask(userId: string, taskId: string): Promise<any> {
    try {
      const taskDoc = await firestore().collection('tasks').doc(taskId).get();
      if (!taskDoc.exists) {
        throw new Error('Task를 찾을 수 없습니다.');
      }

      const taskData = taskDoc.data();
      if (!taskData) {
        throw new Error('Task 데이터가 없습니다.');
      }

      // 권한 검증
      const hasPermission = await AuthUtils.checkPermission({
        userId,
        teamId: taskData.teamId,
        action: 'READ',
        resourceType: 'TASK',
        resourceId: taskId,
      });

      if (!hasPermission) {
        throw new Error('Task를 조회할 권한이 없습니다.');
      }

      return {
        id: taskId,
        ...taskData,
      };
    } catch (error) {
      throw new Error(`Task 조회 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Task 목록 조회
   */
  static async getTasks(userId: string, query: TaskQueryRequest): Promise<any> {
    try {
      // 팀 멤버 확인
      const isMember = await AuthUtils.isTeamMember(userId, query.teamId);
      if (!isMember) {
        throw new Error('팀 멤버가 아닙니다.');
      }

      let tasksQuery = firestore()
        .collection('tasks')
        .where('teamId', '==', query.teamId);

      // 프로젝트 필터
      if (query.projectId) {
        tasksQuery = tasksQuery.where('projectId', '==', query.projectId);
      }

      // 상태 필터
      if (query.status) {
        tasksQuery = tasksQuery.where('status', '==', query.status);
      }

      // 담당자 필터
      if (query.assigneeId) {
        tasksQuery = tasksQuery.where('assigneeId', '==', query.assigneeId);
      }

      // 정렬 (생성일 역순)
      tasksQuery = tasksQuery.orderBy('createdAt', 'desc');

      // 페이징
      if (query.offset) {
        tasksQuery = tasksQuery.offset(query.offset);
      }

      if (query.limit) {
        tasksQuery = tasksQuery.limit(query.limit);
      }

      const snapshot = await tasksQuery.get();
      const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      return {
        tasks,
        total: tasks.length,
        limit: query.limit || 50,
        offset: query.offset || 0,
      };
    } catch (error) {
      throw new Error(`Task 목록 조회 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Task 집계 정보 조회
   */
  static async getTaskAggregation(userId: string, teamId: string): Promise<TaskAggregation> {
    try {
      // 팀 멤버 확인
      const isMember = await AuthUtils.isTeamMember(userId, teamId);
      if (!isMember) {
        throw new Error('팀 멤버가 아닙니다.');
      }

      const tasksSnapshot = await firestore()
        .collection('tasks')
        .where('teamId', '==', teamId)
        .get();

      const tasks = tasksSnapshot.docs.map(doc => doc.data());
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(task => task.status === 'DONE').length;
      const overdueTasks = tasks.filter(task => 
        task.dueDate && 
        new Date(task.dueDate) < now && 
        task.status !== 'DONE'
      ).length;
      const dueTodayTasks = tasks.filter(task => 
        task.dueDate && 
        new Date(task.dueDate) >= today && 
        new Date(task.dueDate) < new Date(today.getTime() + 24 * 60 * 60 * 1000) &&
        task.status !== 'DONE'
      ).length;

      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      return {
        teamId,
        totalTasks,
        completedTasks,
        overdueTasks,
        dueTodayTasks,
        completionRate: Math.round(completionRate * 100) / 100,
      };
    } catch (error) {
      throw new Error(`Task 집계 조회 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 