// Firestore 컬렉션/문서 구조 정의

// Firebase Firestore 타입 임포트
import { Timestamp } from 'firebase/firestore';

// 타입 정의
export type UserRole = 'ADMIN' | 'EDITOR' | 'VIEWER';

export type TeamRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';

export type InvitationStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

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
  PROJECT_PERMISSIONS: 'project_permissions',
  TASK_PERMISSIONS: 'task_permissions',
  TEAMS: 'teams',
  TEAM_MEMBERS: 'team_members',
  TEAM_INVITATIONS: 'team_invitations',
  PERMISSION_AUDIT_LOG: 'permission_audit_log',
  // Real-time Collaboration Collections
  COMMENTS: 'comments',
  MENTIONS: 'mentions',
  COLLABORATIVE_SESSIONS: 'collaborative_sessions',
  EDIT_OPERATIONS: 'edit_operations',
  USER_PRESENCE: 'user_presence',
  DOCUMENT_VERSIONS: 'document_versions',
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
  data?: Record<string, unknown>;
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
  ownerId: string;
  status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  startDate?: Timestamp;
  endDate?: Timestamp;
  budget?: number;
  tags: string[];
  memberCount: number;
  taskCount: number;
  completedTaskCount: number;
  progress: number; // 0-100
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

// Advanced Permission System - Firestore Interfaces
export type ProjectRole =
  | 'PROJECT_MANAGER'
  | 'PROJECT_LEAD'
  | 'CONTRIBUTOR'
  | 'OBSERVER';
export type TaskRole = 'ASSIGNEE' | 'REVIEWER' | 'COLLABORATOR' | 'WATCHER';
export type PermissionAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'ASSIGN'
  | 'COMMENT'
  | 'COMPLETE'
  | 'MANAGE_PERMISSIONS';
export type ResourceType = 'TEAM' | 'PROJECT' | 'TASK';

export interface FirestorePermission {
  resource: ResourceType;
  action: PermissionAction;
  granted: boolean;
  conditions?: FirestorePermissionConditions;
}

export interface FirestorePermissionConditions {
  timeRange?: {
    start: Timestamp;
    end: Timestamp;
  };
  ipRange?: string[];
  deviceType?: string[];
  customConditions?: Record<string, unknown>;
}

export interface FirestoreProjectPermission {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  permissions: FirestorePermission[];
  grantedBy: string;
  grantedAt: Timestamp;
  expiresAt?: Timestamp;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirestoreTaskPermission {
  id: string;
  taskId: string;
  userId: string;
  role: TaskRole;
  permissions: FirestorePermission[];
  grantedBy: string;
  grantedAt: Timestamp;
  expiresAt?: Timestamp;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirestorePermissionAuditLog {
  id: string;
  action: 'GRANTED' | 'REVOKED' | 'MODIFIED' | 'EXPIRED';
  resourceType: ResourceType;
  resourceId: string;
  userId: string;
  grantedBy: string;
  previousPermissions?: FirestorePermission[];
  newPermissions?: FirestorePermission[];
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Timestamp;
}

// Real-time Collaboration Interfaces
export type CommentType = 'TASK' | 'PROJECT' | 'DOCUMENT';
export type PresenceStatus = 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE';
export type EditOperationType = 'INSERT' | 'DELETE' | 'REPLACE' | 'FORMAT';

export interface FirestoreComment {
  id: string;
  resourceType: CommentType;
  resourceId: string;
  parentCommentId?: string; // 답글인 경우
  authorId: string;
  content: string;
  mentions: string[]; // 멘션된 사용자 ID 목록
  isEdited: boolean;
  editedAt?: Timestamp;
  isDeleted: boolean;
  deletedAt?: Timestamp;
  reactions: FirestoreCommentReaction[];
  attachments: FirestoreCommentAttachment[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirestoreCommentReaction {
  userId: string;
  emoji: string;
  createdAt: Timestamp;
}

export interface FirestoreCommentAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Timestamp;
}

export interface FirestoreMention {
  id: string;
  commentId: string;
  mentionedUserId: string;
  mentionedByUserId: string;
  resourceType: CommentType;
  resourceId: string;
  isRead: boolean;
  readAt?: Timestamp;
  createdAt: Timestamp;
}

export interface FirestoreCollaborativeSession {
  id: string;
  resourceType: 'TASK' | 'PROJECT' | 'DOCUMENT';
  resourceId: string;
  participants: FirestoreSessionParticipant[];
  isActive: boolean;
  lastActivity: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirestoreSessionParticipant {
  userId: string;
  joinedAt: Timestamp;
  lastSeen: Timestamp;
  cursor?: FirestoreCursorPosition;
  selection?: FirestoreSelection;
  isActive: boolean;
}

export interface FirestoreCursorPosition {
  line: number;
  column: number;
  fieldPath?: string; // 특정 필드의 커서 위치
}

export interface FirestoreSelection {
  start: FirestoreCursorPosition;
  end: FirestoreCursorPosition;
  content?: string;
}

export interface FirestoreEditOperation {
  id: string;
  sessionId: string;
  resourceType: 'TASK' | 'PROJECT' | 'DOCUMENT';
  resourceId: string;
  userId: string;
  operation: {
    type: EditOperationType;
    position: FirestoreCursorPosition;
    content?: string;
    length?: number;
    attributes?: Record<string, unknown>;
  };
  timestamp: Timestamp;
  applied: boolean;
  appliedAt?: Timestamp;
  conflictsWith?: string[]; // 충돌하는 다른 operation ID들
  resolvedBy?: string; // 충돌 해결한 operation ID
  createdAt: Timestamp;
}

export interface FirestoreUserPresence {
  id: string; // userId와 동일
  userId: string;
  status: PresenceStatus;
  currentResource?: {
    type: 'TASK' | 'PROJECT' | 'DOCUMENT';
    id: string;
    name: string;
  };
  lastActivity: Timestamp;
  sessionId?: string;
  isTyping: boolean;
  typingInResource?: string;
  customStatus?: string;
  updatedAt: Timestamp;
}

export interface FirestoreDocumentVersion {
  id: string;
  resourceType: 'TASK' | 'PROJECT' | 'DOCUMENT';
  resourceId: string;
  version: number;
  content: Record<string, unknown>; // 해당 버전의 전체 내용
  changes: FirestoreVersionChange[];
  createdBy: string;
  summary?: string; // 변경 사항 요약
  tags?: string[]; // 버전 태그 (예: 'stable', 'draft', 'milestone')
  parentVersionId?: string;
  isAutoSave: boolean;
  createdAt: Timestamp;
}

export interface FirestoreVersionChange {
  fieldPath: string;
  oldValue: unknown;
  newValue: unknown;
  operationType: 'CREATE' | 'UPDATE' | 'DELETE';
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
  // Project Permissions 컬렉션 인덱스
  {
    collection: FIRESTORE_COLLECTIONS.PROJECT_PERMISSIONS,
    fields: ['projectId', 'isActive'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.PROJECT_PERMISSIONS,
    fields: ['userId', 'isActive'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.PROJECT_PERMISSIONS,
    fields: ['projectId', 'userId', 'isActive'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.PROJECT_PERMISSIONS,
    fields: ['projectId', 'role', 'grantedAt'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.PROJECT_PERMISSIONS,
    fields: ['expiresAt', 'isActive'],
  },
  // Task Permissions 컬렉션 인덱스
  {
    collection: FIRESTORE_COLLECTIONS.TASK_PERMISSIONS,
    fields: ['taskId', 'isActive'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.TASK_PERMISSIONS,
    fields: ['userId', 'isActive'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.TASK_PERMISSIONS,
    fields: ['taskId', 'userId', 'isActive'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.TASK_PERMISSIONS,
    fields: ['taskId', 'role', 'grantedAt'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.TASK_PERMISSIONS,
    fields: ['expiresAt', 'isActive'],
  },
  // Permission Audit Log 컬렉션 인덱스
  {
    collection: FIRESTORE_COLLECTIONS.PERMISSION_AUDIT_LOG,
    fields: ['userId', 'createdAt'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.PERMISSION_AUDIT_LOG,
    fields: ['resourceType', 'resourceId', 'createdAt'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.PERMISSION_AUDIT_LOG,
    fields: ['grantedBy', 'action', 'createdAt'],
  },
  // Real-time Collaboration 인덱스
  // Comments 컬렉션 인덱스
  {
    collection: FIRESTORE_COLLECTIONS.COMMENTS,
    fields: ['resourceType', 'resourceId', 'createdAt'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.COMMENTS,
    fields: ['authorId', 'createdAt'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.COMMENTS,
    fields: ['resourceType', 'resourceId', 'parentCommentId', 'createdAt'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.COMMENTS,
    fields: ['isDeleted', 'createdAt'],
  },
  // Mentions 컬렉션 인덱스
  {
    collection: FIRESTORE_COLLECTIONS.MENTIONS,
    fields: ['mentionedUserId', 'isRead', 'createdAt'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.MENTIONS,
    fields: ['commentId'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.MENTIONS,
    fields: ['resourceType', 'resourceId', 'createdAt'],
  },
  // Collaborative Sessions 컬렉션 인덱스
  {
    collection: FIRESTORE_COLLECTIONS.COLLABORATIVE_SESSIONS,
    fields: ['resourceType', 'resourceId', 'isActive'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.COLLABORATIVE_SESSIONS,
    fields: ['isActive', 'lastActivity'],
  },
  // Edit Operations 컬렉션 인덱스
  {
    collection: FIRESTORE_COLLECTIONS.EDIT_OPERATIONS,
    fields: ['sessionId', 'timestamp'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.EDIT_OPERATIONS,
    fields: ['resourceType', 'resourceId', 'timestamp'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.EDIT_OPERATIONS,
    fields: ['userId', 'timestamp'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.EDIT_OPERATIONS,
    fields: ['applied', 'timestamp'],
  },
  // User Presence 컬렉션 인덱스
  {
    collection: FIRESTORE_COLLECTIONS.USER_PRESENCE,
    fields: ['status', 'updatedAt'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.USER_PRESENCE,
    fields: ['sessionId'],
  },
  // Document Versions 컬렉션 인덱스
  {
    collection: FIRESTORE_COLLECTIONS.DOCUMENT_VERSIONS,
    fields: ['resourceType', 'resourceId', 'version'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.DOCUMENT_VERSIONS,
    fields: ['resourceType', 'resourceId', 'createdAt'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.DOCUMENT_VERSIONS,
    fields: ['createdBy', 'createdAt'],
  },
  {
    collection: FIRESTORE_COLLECTIONS.DOCUMENT_VERSIONS,
    fields: ['isAutoSave', 'createdAt'],
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
