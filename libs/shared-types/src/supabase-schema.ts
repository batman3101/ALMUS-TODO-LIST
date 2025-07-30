// Supabase Database Schema Types
// Converted from Firestore to PostgreSQL schema

// Enum types that match the database
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
export type ProjectStatus =
  | 'PLANNING'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CANCELLED';
export type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
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
export type CommentType = 'TASK' | 'PROJECT' | 'DOCUMENT';
export type PresenceStatus = 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE';
export type EditOperationType = 'INSERT' | 'DELETE' | 'REPLACE' | 'FORMAT';
export type DependencyType =
  | 'finish-to-start'
  | 'start-to-start'
  | 'finish-to-finish'
  | 'start-to-finish';

// Core entity types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  current_team_id?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  member_count: number;
  settings: TeamSettings;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  joined_at: string;
  invited_by?: string;
  is_active: boolean;
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  role: TeamRole;
  token: string;
  invited_by: string;
  message?: string;
  expires_at: string;
  accepted_at?: string;
  rejected_at?: string;
  status: InvitationStatus;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  team_id: string;
  owner_id: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  start_date?: string;
  end_date?: string;
  budget?: number;
  tags: string[];
  member_count: number;
  task_count: number;
  completed_task_count: number;
  progress: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignee_id?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  start_date?: string;
  end_date?: string;
  created_by: string;
  project_id: string;
  team_id: string;
  dependencies: string[];
  progress: number;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface TaskDependency {
  id: string;
  source_task_id: string;
  target_task_id: string;
  type: DependencyType;
  lag: number;
  created_at: string;
  updated_at: string;
}

// Permission system types
export interface Permission {
  resource: ResourceType;
  action: PermissionAction;
  granted: boolean;
  conditions?: PermissionConditions;
}

export interface PermissionConditions {
  timeRange?: {
    start: string;
    end: string;
  };
  ipRange?: string[];
  deviceType?: string[];
  customConditions?: Record<string, unknown>;
}

export interface ProjectPermission {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  permissions: Permission[];
  granted_by: string;
  granted_at: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskPermission {
  id: string;
  task_id: string;
  user_id: string;
  role: TaskRole;
  permissions: Permission[];
  granted_by: string;
  granted_at: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PermissionAuditLog {
  id: string;
  action: 'GRANTED' | 'REVOKED' | 'MODIFIED' | 'EXPIRED';
  resource_type: ResourceType;
  resource_id: string;
  user_id: string;
  granted_by: string;
  previous_permissions?: Permission[];
  new_permissions?: Permission[];
  reason?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// Notification system types
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  channels: NotificationChannel[];
  is_read: boolean;
  is_sent: boolean;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationSettings {
  id: string;
  user_id: string;
  task_due_reminder: NotificationFrequency;
  task_status_change: NotificationFrequency;
  task_assigned: NotificationFrequency;
  task_comment: NotificationFrequency;
  task_overdue: NotificationFrequency;
  system_announcement: NotificationFrequency;
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  slack_enabled: boolean;
  teams_enabled: boolean;
  kakao_enabled: boolean;
  email_address?: string;
  slack_webhook?: string;
  teams_webhook?: string;
  kakao_webhook?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Collaboration system types
export interface Comment {
  id: string;
  resource_type: CommentType;
  resource_id: string;
  parent_comment_id?: string;
  author_id: string;
  content: string;
  mentions: string[];
  is_edited: boolean;
  edited_at?: string;
  is_deleted: boolean;
  deleted_at?: string;
  reactions: CommentReaction[];
  attachments: CommentAttachment[];
  created_at: string;
  updated_at: string;
}

export interface CommentReaction {
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface CommentAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploaded_by: string;
  uploaded_at: string;
}

export interface Mention {
  id: string;
  comment_id: string;
  mentioned_user_id: string;
  mentioned_by_user_id: string;
  resource_type: CommentType;
  resource_id: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface CollaborativeSession {
  id: string;
  resource_type: 'TASK' | 'PROJECT' | 'DOCUMENT';
  resource_id: string;
  participants: SessionParticipant[];
  is_active: boolean;
  last_activity: string;
  created_at: string;
  updated_at: string;
}

export interface SessionParticipant {
  user_id: string;
  joined_at: string;
  last_seen: string;
  cursor?: CursorPosition;
  selection?: Selection;
  is_active: boolean;
}

export interface CursorPosition {
  line: number;
  column: number;
  field_path?: string;
}

export interface Selection {
  start: CursorPosition;
  end: CursorPosition;
  content?: string;
}

export interface EditOperation {
  id: string;
  session_id: string;
  resource_type: 'TASK' | 'PROJECT' | 'DOCUMENT';
  resource_id: string;
  user_id: string;
  operation: {
    type: EditOperationType;
    position: CursorPosition;
    content?: string;
    length?: number;
    attributes?: Record<string, unknown>;
  };
  timestamp: string;
  applied: boolean;
  applied_at?: string;
  conflicts_with?: string[];
  resolved_by?: string;
  created_at: string;
}

export interface UserPresence {
  id: string;
  user_id: string;
  status: PresenceStatus;
  current_resource?: {
    type: 'TASK' | 'PROJECT' | 'DOCUMENT';
    id: string;
    name: string;
  };
  last_activity: string;
  session_id?: string;
  is_typing: boolean;
  typing_in_resource?: string;
  custom_status?: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  resource_type: 'TASK' | 'PROJECT' | 'DOCUMENT';
  resource_id: string;
  version: number;
  content: Record<string, unknown>;
  changes: VersionChange[];
  created_by: string;
  summary?: string;
  tags?: string[];
  parent_version_id?: string;
  is_auto_save: boolean;
  created_at: string;
}

export interface VersionChange {
  field_path: string;
  old_value: unknown;
  new_value: unknown;
  operation_type: 'CREATE' | 'UPDATE' | 'DELETE';
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// Query filter types
export interface TaskFilters {
  team_id?: string;
  project_id?: string;
  assignee_id?: string;
  status?: TaskStatus[];
  priority?: TaskPriority[];
  due_date_from?: string;
  due_date_to?: string;
  created_by?: string;
  search?: string;
}

export interface ProjectFilters {
  team_id?: string;
  owner_id?: string;
  status?: ProjectStatus[];
  priority?: ProjectPriority[];
  search?: string;
}

export interface NotificationFilters {
  user_id?: string;
  type?: NotificationType[];
  is_read?: boolean;
  date_from?: string;
  date_to?: string;
}

// Input types for mutations
export interface CreateTeamInput {
  name: string;
  description?: string;
  settings?: Partial<TeamSettings>;
}

export interface UpdateTeamInput {
  name?: string;
  description?: string;
  settings?: Partial<TeamSettings>;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  team_id: string;
  priority?: ProjectPriority;
  start_date?: string;
  end_date?: string;
  budget?: number;
  tags?: string[];
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  start_date?: string;
  end_date?: string;
  budget?: number;
  tags?: string[];
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  assignee_id?: string;
  project_id: string;
  team_id: string;
  priority?: TaskPriority;
  due_date?: string;
  start_date?: string;
  end_date?: string;
  dependencies?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  assignee_id?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string;
  start_date?: string;
  end_date?: string;
  dependencies?: string[];
  progress?: number;
}

export interface CreateCommentInput {
  resource_type: CommentType;
  resource_id: string;
  content: string;
  parent_comment_id?: string;
  mentions?: string[];
}

export interface UpdateCommentInput {
  content?: string;
  mentions?: string[];
}

// Notification system input types
export interface CreateNotificationInput {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  channels: NotificationChannel[];
}

export interface UpdateNotificationInput {
  title?: string;
  message?: string;
  data?: Record<string, unknown>;
  channels?: NotificationChannel[];
  is_read?: boolean;
}

export interface CreateNotificationSettingsInput {
  user_id: string;
  task_due_reminder?: NotificationFrequency;
  task_status_change?: NotificationFrequency;
  task_assigned?: NotificationFrequency;
  task_comment?: NotificationFrequency;
  task_overdue?: NotificationFrequency;
  system_announcement?: NotificationFrequency;
  email_enabled?: boolean;
  push_enabled?: boolean;
  in_app_enabled?: boolean;
  slack_enabled?: boolean;
  teams_enabled?: boolean;
  kakao_enabled?: boolean;
  email_address?: string;
  slack_webhook?: string;
  teams_webhook?: string;
  kakao_webhook?: string;
}

export interface UpdateNotificationSettingsInput {
  task_due_reminder?: NotificationFrequency;
  task_status_change?: NotificationFrequency;
  task_assigned?: NotificationFrequency;
  task_comment?: NotificationFrequency;
  task_overdue?: NotificationFrequency;
  system_announcement?: NotificationFrequency;
  email_enabled?: boolean;
  push_enabled?: boolean;
  in_app_enabled?: boolean;
  slack_enabled?: boolean;
  teams_enabled?: boolean;
  kakao_enabled?: boolean;
  email_address?: string;
  slack_webhook?: string;
  teams_webhook?: string;
  kakao_webhook?: string;
}

export interface CreateNotificationTemplateInput {
  type: NotificationType;
  title: string;
  message: string;
  variables?: string[];
}

export interface UpdateNotificationTemplateInput {
  title?: string;
  message?: string;
  variables?: string[];
  is_active?: boolean;
}
