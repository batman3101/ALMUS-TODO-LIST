import * as admin from 'firebase-admin';
import {
  FIRESTORE_COLLECTIONS,
  FirestoreUser,
  FirestoreTask,
  FirestoreNotification,
} from '../libs/shared-types/src/firestore-schema';

// Firebase Admin 초기화
const serviceAccount = require('../config/firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'almus-todo-app',
});

const db = admin.firestore();

// 샘플 데이터 생성 함수들
export async function createSampleTeams() {
  const teams = [
    {
      id: 'team-1',
      name: '개발팀',
      description: '소프트웨어 개발 팀',
      createdBy: 'user-1',
      isActive: true,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      id: 'team-2',
      name: '디자인팀',
      description: 'UI/UX 디자인 팀',
      createdBy: 'user-2',
      isActive: true,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
  ];

  for (const team of teams) {
    await db.collection(FIRESTORE_COLLECTIONS.TEAMS).doc(team.id).set(team);
    console.log(`Created team: ${team.name}`);
  }
}

export async function createSampleUsers() {
  const users: FirestoreUser[] = [
    {
      id: 'user-1',
      email: 'admin@almus.com',
      name: '관리자',
      role: 'ADMIN',
      teamId: 'team-1',
      projectIds: ['project-1', 'project-2'],
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      id: 'user-2',
      email: 'developer@almus.com',
      name: '개발자',
      role: 'EDITOR',
      teamId: 'team-1',
      projectIds: ['project-1'],
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      id: 'user-3',
      email: 'designer@almus.com',
      name: '디자이너',
      role: 'EDITOR',
      teamId: 'team-2',
      projectIds: ['project-2'],
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
  ];

  for (const user of users) {
    await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(user.id).set(user);
    console.log(`Created user: ${user.name}`);
  }
}

export async function createSampleProjects() {
  const projects = [
    {
      id: 'project-1',
      name: '웹앱 개발',
      description: 'React 기반 웹 애플리케이션 개발',
      teamId: 'team-1',
      createdBy: 'user-1',
      isActive: true,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      id: 'project-2',
      name: 'UI/UX 개선',
      description: '사용자 인터페이스 개선 프로젝트',
      teamId: 'team-2',
      createdBy: 'user-2',
      isActive: true,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
  ];

  for (const project of projects) {
    await db
      .collection(FIRESTORE_COLLECTIONS.PROJECTS)
      .doc(project.id)
      .set(project);
    console.log(`Created project: ${project.name}`);
  }
}

export async function createSampleTasks() {
  const tasks: FirestoreTask[] = [
    {
      id: 'task-1',
      title: '로그인 페이지 구현',
      description: 'OAuth2 기반 로그인 기능 구현',
      assigneeId: 'user-2',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: admin.firestore.Timestamp.fromDate(new Date('2024-02-15')),
      createdBy: 'user-1',
      projectId: 'project-1',
      teamId: 'team-1',
      version: 1,
      startDate: admin.firestore.Timestamp.fromDate(new Date('2024-01-15')),
      endDate: admin.firestore.Timestamp.fromDate(new Date('2024-02-15')),
      dependencies: [],
      progress: 60,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      id: 'task-2',
      title: '대시보드 디자인',
      description: '사용자 대시보드 UI/UX 디자인',
      assigneeId: 'user-3',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: admin.firestore.Timestamp.fromDate(new Date('2024-02-20')),
      createdBy: 'user-2',
      projectId: 'project-2',
      teamId: 'team-2',
      version: 1,
      startDate: admin.firestore.Timestamp.fromDate(new Date('2024-01-20')),
      endDate: admin.firestore.Timestamp.fromDate(new Date('2024-02-20')),
      dependencies: ['task-1'],
      progress: 0,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      id: 'task-3',
      title: 'API 문서 작성',
      description: 'GraphQL API 문서 작성 및 예제 코드',
      assigneeId: 'user-2',
      status: 'REVIEW',
      priority: 'LOW',
      dueDate: admin.firestore.Timestamp.fromDate(new Date('2024-02-10')),
      createdBy: 'user-1',
      projectId: 'project-1',
      teamId: 'team-1',
      version: 1,
      startDate: admin.firestore.Timestamp.fromDate(new Date('2024-01-10')),
      endDate: admin.firestore.Timestamp.fromDate(new Date('2024-02-10')),
      dependencies: [],
      progress: 90,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
  ];

  for (const task of tasks) {
    await db.collection(FIRESTORE_COLLECTIONS.TASKS).doc(task.id).set(task);
    console.log(`Created task: ${task.title}`);
  }
}

export async function createSampleNotifications() {
  const notifications: FirestoreNotification[] = [
    {
      id: 'notification-1',
      userId: 'user-2',
      type: 'TASK_ASSIGNED',
      title: '새로운 Task가 할당되었습니다',
      message: '로그인 페이지 구현 Task가 할당되었습니다.',
      data: { taskId: 'task-1' },
      channels: ['IN_APP', 'EMAIL'],
      isRead: false,
      isSent: true,
      sentAt: admin.firestore.Timestamp.now(),
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      id: 'notification-2',
      userId: 'user-3',
      type: 'TASK_DUE_REMINDER',
      title: 'Task 마감일이 임박했습니다',
      message: '대시보드 디자인 Task의 마감일이 3일 남았습니다.',
      data: { taskId: 'task-2', daysLeft: 3 },
      channels: ['IN_APP', 'PUSH'],
      isRead: true,
      isSent: true,
      sentAt: admin.firestore.Timestamp.now(),
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
  ];

  for (const notification of notifications) {
    await db
      .collection(FIRESTORE_COLLECTIONS.NOTIFICATIONS)
      .doc(notification.id)
      .set(notification);
    console.log(`Created notification: ${notification.title}`);
  }
}

// 메인 마이그레이션 함수
export async function runMigration() {
  try {
    console.log('Starting Firestore migration...');

    // 순서대로 샘플 데이터 생성
    await createSampleTeams();
    await createSampleUsers();
    await createSampleProjects();
    await createSampleTasks();
    await createSampleNotifications();

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// 스크립트 실행
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}
