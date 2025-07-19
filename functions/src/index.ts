import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Firebase Admin 초기화
initializeApp();

// HTTP 함수들
export {
  createTask,
  updateTask,
  deleteTask,
  getTask,
  getTasks,
  getTaskAggregation,
} from './http/taskHttp';

// FCM HTTP 함수들
export {
  saveFCMToken,
  deleteFCMToken,
  getNotificationSettings,
  saveNotificationSettings,
  sendTestNotification,
} from './http/fcmHttp';

// Firestore 트리거 함수들
export {
  onTaskCreated,
  onTaskUpdated,
  onTaskDeleted,
  checkDueTasks,
  checkOverdueTasks,
} from './triggers/taskTriggers';

// Callable 함수들 (향후 확장용)
export const helloWorld = onCall(
  {
    timeoutSeconds: 30,
    memory: '256MiB',
    region: 'asia-northeast3',
  },
  (request) => {
    return {
      message: 'Hello from Firebase Functions!',
      timestamp: new Date().toISOString(),
    };
  }
); 