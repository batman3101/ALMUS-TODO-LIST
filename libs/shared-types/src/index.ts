// User related types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  currentTeamId?: string;
  teams?: TeamMember[];
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

// Team related types
export interface Team {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  owner?: User;
  memberCount: number;
  settings: TeamSettings;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamSettings {
  isPublic: boolean;
  allowInvitations: boolean;
  defaultMemberRole: TeamRole;
  maxMembers: number;
  timeZone: string;
  language: string;
  features: TeamFeatures;
}

export interface TeamFeatures {
  ganttView: boolean;
  timeTracking: boolean;
  advancedReporting: boolean;
  customFields: boolean;
  integrations: boolean;
}

export enum TeamRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  user?: User;
  role: TeamRole;
  joinedAt: Date;
  invitedBy?: string;
  invitedByUser?: User;
  isActive: boolean;
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  team?: Team;
  email: string;
  role: TeamRole;
  token: string;
  invitedBy: string;
  invitedByUser?: User;
  message?: string;
  expiresAt: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  status: InvitationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

// Task related types
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
  teamId: string; // 팀 ID 추가
  createdAt: Date;
  updatedAt: Date;
  // 간트 차트 관련 필드 추가
  startDate?: Date;
  endDate?: Date;
  dependencies?: string[]; // 의존하는 Task ID 목록
  progress?: number; // 진행률 (0-100)
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  DONE = 'DONE',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

// 간트 차트 관련 타입
export interface TaskDependency {
  id: string;
  sourceTaskId: string;
  targetTaskId: string;
  type:
    | 'finish-to-start'
    | 'start-to-start'
    | 'finish-to-finish'
    | 'start-to-finish';
  lag?: number; // 지연일수 (일)
}

export enum ZoomLevel {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

export interface GanttTask {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  dependencies: string[];
  isDelayed: boolean;
  isOverdue: boolean;
}

export interface GanttViewConfig {
  zoomLevel: ZoomLevel;
  showDependencies: boolean;
  showProgress: boolean;
  showDelayedTasks: boolean;
  dateRange: {
    start: Date;
    end: Date;
  };
}

// 알림 관련 타입
export enum NotificationType {
  TASK_DUE_REMINDER = 'TASK_DUE_REMINDER',
  TASK_STATUS_CHANGE = 'TASK_STATUS_CHANGE',
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_COMMENT = 'TASK_COMMENT',
  TASK_OVERDUE = 'TASK_OVERDUE',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
  SLACK = 'SLACK',
  TEAMS = 'TEAMS',
  KAKAO = 'KAKAO',
}

export enum NotificationFrequency {
  IMMEDIATE = 'IMMEDIATE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  NEVER = 'NEVER',
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: NotificationChannel[];
  isRead: boolean;
  isSent: boolean;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationSettings {
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
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Auth related types
export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface OAuthProfile {
  provider: 'google' | 'microsoft';
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

// GraphQL types
export interface CreateUserInput {
  email: string;
  name: string;
  role?: UserRole;
}

export interface UpdateUserInput {
  id: string;
  name?: string;
  role?: UserRole;
  avatar?: string;
}

export interface LoginInput {
  email: string;
  password?: string;
  provider?: 'google' | 'microsoft';
  code?: string;
}

// Team Input types
export interface CreateTeamInput {
  name: string;
  description?: string;
  settings?: Partial<TeamSettings>;
}

export interface UpdateTeamInput {
  id: string;
  name?: string;
  description?: string;
  settings?: Partial<TeamSettings>;
  isActive?: boolean;
}

export interface InviteTeamMemberInput {
  teamId: string;
  email: string;
  role: TeamRole;
  message?: string;
}

export interface UpdateTeamMemberInput {
  id: string;
  role?: TeamRole;
  isActive?: boolean;
}

export interface TeamFilterInput {
  ownerId?: string;
  isActive?: boolean;
  memberUserId?: string;
}

export interface AcceptInvitationInput {
  token: string;
  userId?: string;
}

export interface RespondToInvitationInput {
  invitationId: string;
  action: 'ACCEPT' | 'REJECT';
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  assigneeId: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  startDate?: Date;
  endDate?: Date;
  dependencies?: string[];
  progress?: number;
  teamId: string;
  projectId?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  assigneeId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  startDate?: Date;
  endDate?: Date;
  dependencies?: string[];
  progress?: number;
  version?: number;
}

export interface TaskFilterInput {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  createdBy?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  startDateFrom?: Date;
  startDateTo?: Date;
}

// Notification types
export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: NotificationChannel[];
}

export interface UpdateNotificationInput {
  id: string;
  isRead?: boolean;
  isSent?: boolean;
}

export interface CreateNotificationSettingsInput {
  userId: string;
  taskDueReminder?: NotificationFrequency;
  taskStatusChange?: NotificationFrequency;
  taskAssigned?: NotificationFrequency;
  taskComment?: NotificationFrequency;
  taskOverdue?: NotificationFrequency;
  systemAnnouncement?: NotificationFrequency;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
  slackEnabled?: boolean;
  teamsEnabled?: boolean;
  kakaoEnabled?: boolean;
  emailAddress?: string;
  slackWebhook?: string;
  teamsWebhook?: string;
  kakaoWebhook?: string;
}

export interface UpdateNotificationSettingsInput {
  id: string;
  taskDueReminder?: NotificationFrequency;
  taskStatusChange?: NotificationFrequency;
  taskAssigned?: NotificationFrequency;
  taskComment?: NotificationFrequency;
  taskOverdue?: NotificationFrequency;
  systemAnnouncement?: NotificationFrequency;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
  slackEnabled?: boolean;
  teamsEnabled?: boolean;
  kakaoEnabled?: boolean;
  emailAddress?: string;
  slackWebhook?: string;
  teamsWebhook?: string;
  kakaoWebhook?: string;
}

// Permission types
export interface Permission {
  resource: string;
  action: string;
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}

// Conflict resolution types
export interface TaskConflict {
  taskId: string;
  serverVersion: number;
  clientVersion: number;
  serverData: Task;
  clientData: Task;
}

export interface TaskOperation {
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  taskId?: string;
  data?: Partial<Task>;
  version?: number;
}

// File upload types
export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploaderId: string;
  uploaderName: string;
  taskId?: string;
  projectId?: string;
  teamId: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadState {
  isUploading: boolean;
  progress: UploadProgress;
  error: string | null;
  downloadURL?: string;
}

// Re-export from firestore-schema
export * from './firestore-schema';
