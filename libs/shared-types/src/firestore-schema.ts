// Firestore 컬렉션/문서 구조 정의

// Firebase Firestore 타입 임포트
import { Timestamp } from 'firebase/firestore';

// 타입 정의
export type UserRole = 'ADMIN' | 'EDITOR' | 'VIEWER';

export type TeamRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_DUE'
  | 'TASK_COMPLETED'
  | 'TASK_COMMENT'
  | 'TASK_OVERDUE'
  | 'MENTION'
  | 'SYSTEM_ANNOUNCEMENT';

export type NotificationChannel =
  | 'EMAIL'
  | 'PUSH'
  | 'IN_APP'
  | 'SLACK'
  | 'TEAMS'
  | 'KAKAO';

export type NotificationFrequency =
  | 'IMMEDIATE'
  | 'HOURLY'
  | 'DAILY'
  | 'WEEKLY'
  | 'NEVER';

// 컬렉션 이름 상수
export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  TASKS: 'tasks',
  NOTIFICATIONS: 'notifications',
  NOTIFICATION_SETTINGS: 'notification_settings',
  NOTIFICATION_TEMPLATES: 'notification_templates',
  TASK_DEPENDENCIES: 'task_dependencies',
  PROJECTS: 'projects',
  TEAMS: 'teams',
  TEAM_MEMBERS: 'team_members',
  TEAM_INVITATIONS: 'team_invitations',
} as const;

// Firestore 문서 인터페이스
export interface FirestoreUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  currentTeamId?: string;
  isActive: boolean;
  lastLoginAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirestoreTask {
  id: string;
  title: string;
  description?: string;
  assigneeId: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Timestamp;
  createdBy: string;
  projectId: string;
  teamId: string;
  version: number;
  // 간트 차트 관련 필드
  startDate?: Timestamp;
  endDate?: Timestamp;
  dependencies: string[]; // 의존하는 Task ID 목록
  progress: number; // 진행률 (0-100)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirestoreNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: NotificationChannel[];
  isRead: boolean;
  isSent: boolean;
  sentAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirestoreNotificationSettings {
  id: string;
  userId: string;
  taskDueReminder: NotificationFrequency;
  taskStatusChange: NotificationFrequency;
  taskAssigned: NotificationFrequency;
  taskComment: NotificationFrequency;
  taskOverdue: NotificationFrequency;
  systemAnnouncement: NotificationFrequency;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  slackEnabled: boolean;
  teamsEnabled: boolean;
  kakaoEnabled: boolean;
  emailAddress?: string;
  slackWebhook?: string;
  teamsWebhook?: string;
  kakaoWebhook?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirestoreNotificationTemplate {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  variables: string[];
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirestoreTaskDependency {
  id: string;
  sourceTaskId: string;
  targetTaskId: string;
  type:
    | 'finish-to-start'
    | 'start-to-start'
    | 'finish-to-finish'
    | 'start-to-finish';
  lag?: number; // 지연일수 (일)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirestoreProject {
  id: string;
  name: string;
  description?: string;
  teamId: string;
  createdBy: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirestoreTeam {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  memberCount: number;
  settings: FirestoreTeamSettings;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirestoreTeamSettings {
  isPublic: boolean;
  allowInvitations: boolean;
  defaultMemberRole: TeamRole;
  maxMembers: number;
  timeZone: string;
  language: string;
  features: FirestoreTeamFeatures;
}

export interface FirestoreTeamFeatures {
  ganttView: boolean;
  timeTracking: boolean;
  advancedReporting: boolean;
  customFields: boolean;
  integrations: boolean;
}

export interface FirestoreTeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: Timestamp;
  invitedBy?: string;
  isActive: boolean;
}

export interface FirestoreTeamInvitation {
  id: string;
  teamId: string;
  email: string;
  role: TeamRole;
  token: string;
  invitedBy: string;
  message?: string;
  expiresAt: Timestamp;
  acceptedAt?: Timestamp;
  rejectedAt?: Timestamp;
  status: InvitationStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Firestore 인덱스 정의
export interface FirestoreIndex {
  collection: string;
  fields: string[];
  queryScopes?: ('COLLECTION' | 'COLLECTION_GROUP')[];
}

// 필수 인덱스 목록
export const REQUIRED_INDEXES: FirestoreIndex[] = [
  // Tasks 컬렉션 인덱스
  {
    collection: FIRESTORE_COLLECTIONS.TASKS,
    fields: ['teamId', 'status', 'createdAt'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.TASKS,
    fields: ['teamId', 'assigneeId', 'status'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.TASKS,
    fields: ['teamId', 'dueDate', 'status'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.TASKS,
    fields: ['teamId', 'priority', 'createdAt'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.TASKS,
    fields: ['projectId', 'status', 'createdAt'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.TASKS,
    fields: ['assigneeId', 'status', 'dueDate'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.TASKS,
    fields: ['createdBy', 'status', 'createdAt'],
  },
  // Notifications 컬렉션 인덱스
  {
    collection: FIRESTORE_COLLECTIONS.NOTIFICATIONS,
    fields: ['userId', 'isRead', 'createdAt'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.NOTIFICATIONS,
    fields: ['userId', 'type', 'createdAt'],
  },
  // Users 컬렉션 인덱스
  {
    collection: FIRESTORE_COLLECTIONS.USERS,
    fields: ['teamId', 'role'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.USERS,
    fields: ['email'],
  },
  // Projects 컬렉션 인덱스
  {
    collection: FIRESTORE_COLLECTIONS.PROJECTS,
    fields: ['teamId', 'isActive'],
  },
  // Teams 컬렉션 인덱스
  {
    collection: FIRESTORE_COLLECTIONS.TEAMS,
    fields: ['ownerId', 'isActive'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.TEAMS,
    fields: ['isActive', 'createdAt'],
  },
  // Team Members 컬렉션 인덱스
  {
    collection: FIRESTORE_COLLECTIONS.TEAM_MEMBERS,
    fields: ['teamId', 'isActive'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.TEAM_MEMBERS,
    fields: ['userId', 'isActive'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.TEAM_MEMBERS,
    fields: ['teamId', 'role', 'joinedAt'],
  },
  // Team Invitations 컬렉션 인덱스
  {
    collection: FIRESTORE_COLLECTIONS.TEAM_INVITATIONS,
    fields: ['teamId', 'status'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.TEAM_INVITATIONS,
    fields: ['email', 'status'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.TEAM_INVITATIONS,
    fields: ['token'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.TEAM_INVITATIONS,
    fields: ['expiresAt', 'status'],
  },
];

// Firestore 보안 규칙 타입
export interface FirestoreSecurityRule {
  match: string;
  allow: {
    read?: boolean | string;
    write?: boolean | string;
    create?: boolean | string;
    update?: boolean | string;
    delete?: boolean | string;
  };
}

// 쿼리 성능 최적화를 위한 서브컬렉션 구조
export interface FirestoreSubcollection {
  parentCollection: string;
  subcollectionName: string;
  documentId: string;
  data: any;
}

// Firestore 마이그레이션 타입
export interface FirestoreMigration {
  version: number;
  description: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}
