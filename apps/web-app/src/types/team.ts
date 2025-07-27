// 팀 관련 타입 정의 (shared-types import 문제 해결을 위한 임시 파일)

export interface User {
  id: string;
  email: string;
  name: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
  role?: string;
}

export enum TeamRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

// Advanced Permission System Types
export enum ProjectRole {
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  PROJECT_LEAD = 'PROJECT_LEAD',
  CONTRIBUTOR = 'CONTRIBUTOR',
  OBSERVER = 'OBSERVER',
}

export enum TaskRole {
  ASSIGNEE = 'ASSIGNEE',
  REVIEWER = 'REVIEWER',
  COLLABORATOR = 'COLLABORATOR',
  WATCHER = 'WATCHER',
}

export enum PermissionAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  ASSIGN = 'ASSIGN',
  COMMENT = 'COMMENT',
  COMPLETE = 'COMPLETE',
  MANAGE_PERMISSIONS = 'MANAGE_PERMISSIONS',
}

export enum ResourceType {
  TEAM = 'TEAM',
  PROJECT = 'PROJECT',
  TASK = 'TASK',
}

export enum ProjectStatus {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ProjectPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

// Firestore 컬렉션 이름 상수
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
} as const;

// Task types
export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  IN_REVIEW = 'REVIEW', // alias for REVIEW
  DONE = 'DONE',
  COMPLETED = 'DONE', // alias for DONE
  CANCELLED = 'CANCELLED',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assigneeId: string;
  assignee?: User;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  createdBy: string;
  createdByUser?: User;
  version: number;
  teamId: string;
  projectId?: string;
  createdAt: Date;
  updatedAt: Date;
  startDate?: Date;
  endDate?: Date;
  dependencies?: string[];
  progress?: number;
  collaborators?: User[];
  commentCount?: number;
}

// Re-export other types from shared-types for convenience
export type {
  Team,
  TeamMember,
  TeamInvitation,
  CreateTeamInput,
  UpdateTeamInput,
  InviteTeamMemberInput,
  FirestoreTeam,
  FirestoreTeamMember,
  FirestoreTeamInvitation,
  // Project types
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  FirestoreProject,
  // Permission types
  Permission,
  PermissionConditions,
  ProjectPermission,
  TaskPermission,
  CreateProjectPermissionInput,
  UpdateProjectPermissionInput,
  CreateTaskPermissionInput,
  UpdateTaskPermissionInput,
  PermissionCheckInput,
  FirestoreProjectPermission,
  FirestoreTaskPermission,
  FirestorePermissionAuditLog,
} from '@almus/shared-types';
