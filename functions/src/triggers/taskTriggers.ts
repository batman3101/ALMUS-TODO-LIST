import { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { firestore } from 'firebase-admin';
import { NotificationRequest } from '../types';
import { FCMService } from '../services/fcmService';

// Task 생성 시 알림 트리거
export const onTaskCreated = onDocumentCreated(
  {
    document: 'tasks/{taskId}',
    region: 'asia-northeast3',
  },
  async (event) => {
    try {
      const taskData = event.data?.data();
      if (!taskData) {
        console.log('Task 데이터가 없습니다.');
        return;
      }

      const { assigneeId, createdBy, title, teamId } = taskData;

      // 담당자에게 Push 알림 발송
      if (assigneeId && assigneeId !== createdBy) {
        const template = FCMService.getNotificationTemplate('TASK_CREATED', {
          title,
          taskId: event.params.taskId,
          teamId,
        });

        await FCMService.sendPushNotification(assigneeId, template, {
          createdBy,
        });
      }

      // 팀 멤버들에게 Push 알림 발송 (담당자 제외)
      const teamMembers = await getTeamMembers(teamId);
      for (const member of teamMembers) {
        if (member.id !== assigneeId && member.id !== createdBy) {
          const template = FCMService.getNotificationTemplate('TASK_CREATED', {
            title,
            taskId: event.params.taskId,
            teamId,
          });

          await FCMService.sendPushNotification(member.id, template, {
            createdBy,
          });
        }
      }

      console.log(`Task 생성 알림 완료: ${event.params.taskId}`);
    } catch (error) {
      console.error('Task 생성 알림 오류:', error);
    }
  }
);

// Task 수정 시 알림 트리거
export const onTaskUpdated = onDocumentUpdated(
  {
    document: 'tasks/{taskId}',
    region: 'asia-northeast3',
  },
  async (event) => {
    try {
      const beforeData = event.data?.before.data();
      const afterData = event.data?.after.data();

      if (!beforeData || !afterData) {
        console.log('Task 데이터가 없습니다.');
        return;
      }

      const { assigneeId, title, teamId } = afterData;
      const oldAssigneeId = beforeData.assigneeId;
      const oldStatus = beforeData.status;
      const newStatus = afterData.status;

      // 담당자 변경 시 Push 알림 발송
      if (assigneeId !== oldAssigneeId && assigneeId) {
        const template = FCMService.getNotificationTemplate('TASK_UPDATED', {
          title,
          taskId: event.params.taskId,
          teamId,
        });

        await FCMService.sendPushNotification(assigneeId, template, {
          oldAssigneeId,
          newAssigneeId: assigneeId,
        });
      }

      // 상태 변경 시 Push 알림 발송
      if (newStatus !== oldStatus) {
        const template = FCMService.getNotificationTemplate('TASK_UPDATED', {
          title,
          taskId: event.params.taskId,
          teamId,
        });

        await FCMService.sendPushNotification(assigneeId, template, {
          oldStatus,
          newStatus,
        });
      }

      console.log(`Task 수정 알림 완료: ${event.params.taskId}`);
    } catch (error) {
      console.error('Task 수정 알림 오류:', error);
    }
  }
);

// Task 삭제 시 알림 트리거
export const onTaskDeleted = onDocumentDeleted(
  {
    document: 'tasks/{taskId}',
    region: 'asia-northeast3',
  },
  async (event) => {
    try {
      const taskData = event.data?.data();
      if (!taskData) {
        console.log('Task 데이터가 없습니다.');
        return;
      }

      const { assigneeId, title, teamId, createdBy } = taskData;

      // 담당자에게 Push 알림 발송
      if (assigneeId && assigneeId !== createdBy) {
        const template = FCMService.getNotificationTemplate('TASK_UPDATED', {
          title,
          taskId: event.params.taskId,
          teamId,
        });

        await FCMService.sendPushNotification(assigneeId, template, {
          deletedBy: createdBy,
        });
      }

      console.log(`Task 삭제 알림 완료: ${event.params.taskId}`);
    } catch (error) {
      console.error('Task 삭제 알림 오류:', error);
    }
  }
);

// 마감일 임박 알림 스케줄러 (매일 오전 9시 실행)
export const checkDueTasks = onDocumentCreated(
  {
    document: 'scheduled_tasks/due_check',
    region: 'asia-northeast3',
  },
  async (event) => {
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // 마감일이 내일인 Task 조회
      const tasksSnapshot = await firestore()
        .collection('tasks')
        .where('dueDate', '>=', now)
        .where('dueDate', '<=', tomorrow)
        .where('status', '!=', 'DONE')
        .get();

      for (const doc of tasksSnapshot.docs) {
        const taskData = doc.data();
        const { assigneeId, title, teamId, dueDate } = taskData;

        if (assigneeId) {
          const template = FCMService.getNotificationTemplate('TASK_DUE_SOON', {
            title,
            taskId: doc.id,
            teamId,
            dueDate: new Date(dueDate).toLocaleDateString(),
          });

          await FCMService.sendPushNotification(assigneeId, template);
        }
      }

      console.log(`마감일 임박 알림 완료: ${tasksSnapshot.docs.length}개 Task`);
    } catch (error) {
      console.error('마감일 임박 알림 오류:', error);
    }
  }
);

// 지연 Task 알림 스케줄러 (매일 오전 9시 실행)
export const checkOverdueTasks = onDocumentCreated(
  {
    document: 'scheduled_tasks/overdue_check',
    region: 'asia-northeast3',
  },
  async (event) => {
    try {
      const now = new Date();

      // 마감일이 지난 Task 조회
      const tasksSnapshot = await firestore()
        .collection('tasks')
        .where('dueDate', '<', now)
        .where('status', '!=', 'DONE')
        .get();

      for (const doc of tasksSnapshot.docs) {
        const taskData = doc.data();
        const { assigneeId, title, teamId, dueDate } = taskData;

        if (assigneeId) {
          const template = FCMService.getNotificationTemplate('TASK_OVERDUE', {
            title,
            taskId: doc.id,
            teamId,
            dueDate: new Date(dueDate).toLocaleDateString(),
          });

          await FCMService.sendPushNotification(assigneeId, template, {
            overdueDays: Math.floor((now.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)).toString(),
          });
        }
      }

      console.log(`지연 Task 알림 완료: ${tasksSnapshot.docs.length}개 Task`);
    } catch (error) {
      console.error('지연 Task 알림 오류:', error);
    }
  }
);

// 알림 생성 헬퍼 함수
async function createNotification(notification: NotificationRequest): Promise<void> {
  try {
    await firestore().collection('notifications').add({
      ...notification,
      createdAt: new Date(),
      isRead: false,
    });
  } catch (error) {
    console.error('알림 생성 오류:', error);
  }
}

// 팀 멤버 조회 헬퍼 함수
async function getTeamMembers(teamId: string): Promise<Array<{ id: string; role: string }>> {
  try {
    const membersSnapshot = await firestore()
      .collection('teams')
      .doc(teamId)
      .collection('members')
      .get();

    return membersSnapshot.docs.map(doc => ({
      id: doc.id,
      role: doc.data().role || 'VIEWER',
    }));
  } catch (error) {
    console.error('팀 멤버 조회 오류:', error);
    return [];
  }
} 