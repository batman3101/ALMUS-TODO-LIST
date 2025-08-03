// Supabase 관련 타입 및 스키마 내보내기
export * from './supabase-schema';

// Enums를 명시적으로 re-export하여 충돌 방지
export {
  TaskStatus,
  TaskPriority,
  TeamRole,
  ProjectStatus,
  MemberStatus,
  InvitationStatus,
} from './enums';
export type {
  UserRole,
  User,
  Task,
  ResourceType,
  PermissionAction,
  NotificationType,
  NotificationChannel,
  NotificationFrequency,
  Notification,
  NotificationSettings,
  NotificationTemplate,
  CreateNotificationInput,
  UpdateNotificationInput,
  CreateNotificationSettingsInput,
  UpdateNotificationSettingsInput,
  CreateNotificationTemplateInput,
  UpdateNotificationTemplateInput,
} from './supabase-schema';

// 공통 유틸리티 타입
export type UUID = string;
export type ISODateString = string;
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONArray
  | JSONObject;
export interface JSONObject {
  [x: string]: JSONValue;
}
export interface JSONArray extends Array<JSONValue> {}

// 에러 타입
export interface AppError {
  code: string;
  message: string;
  details?: JSONObject;
}

// API 응답 타입 (향상된 버전)
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: AppError;
  message?: string;
}

// 페이지네이션 타입 (PaginatedResponse는 supabase-schema.ts에서 가져옴)
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 필터 타입
export interface BaseFilter {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

// 날짜 범위 필터
export interface DateRangeFilter {
  startDate?: ISODateString;
  endDate?: ISODateString;
}

// 상태 필터
export interface StatusFilter<T = string> {
  status?: T | T[];
}

// 사용자 필터
export interface UserFilter {
  userId?: UUID;
  userIds?: UUID[];
}

// 팀 필터
export interface TeamFilter {
  teamId?: UUID;
  teamIds?: UUID[];
}

// 프로젝트 필터
export interface ProjectFilter {
  projectId?: UUID;
  projectIds?: UUID[];
}

// 태그 필터
export interface TagFilter {
  tags?: string[];
  tagMode?: 'any' | 'all'; // 'any': 하나라도 일치, 'all': 모두 일치
}

// 파일 업로드 관련 타입
export interface FileUploadOptions {
  maxSize?: number;
  allowedTypes?: string[];
  bucket?: string;
  folder?: string;
}

export interface UploadedFile {
  id: UUID;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  bucket: string;
  path: string;
  uploadedAt: ISODateString;
  uploadedBy: UUID;
}

// 검색 관련 타입
export interface SearchOptions {
  query: string;
  fields?: string[];
  fuzzy?: boolean;
  boost?: Record<string, number>;
}

export interface SearchResult<T = any> {
  item: T;
  score: number;
  highlights?: Record<string, string[]>;
}

// 실시간 이벤트 타입 (Supabase Realtime)
export interface RealtimeEvent<T = any> {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  old_record?: T;
  new_record?: T;
  timestamp: ISODateString;
}

// Supabase Realtime 채널 이벤트
export interface ChannelEvent<T = any> {
  type: string;
  payload: T;
  timestamp: ISODateString;
  userId?: UUID;
}

// 배치 작업 타입
export interface BatchOperation<T = any> {
  operation: 'create' | 'update' | 'delete';
  data: T;
  id?: UUID;
}

export interface BatchResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: AppError;
  operation: BatchOperation<T>;
}

// 감사 로그 타입 (PermissionAuditLog는 supabase-schema.ts에서 가져옴)
export interface AuditLog {
  id: UUID;
  userId: UUID;
  action: string;
  resource: string;
  resourceId: UUID;
  oldValue?: JSONValue;
  newValue?: JSONValue;
  ipAddress?: string;
  userAgent?: string;
  timestamp: ISODateString;
}

// 메트릭 및 분석 타입
export interface Metric {
  name: string;
  value: number;
  unit?: string;
  timestamp: ISODateString;
  dimensions?: Record<string, string>;
}

export interface TimeSeriesData {
  timestamp: ISODateString;
  value: number;
}

export interface AnalyticsData {
  metric: string;
  data: TimeSeriesData[];
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
  period?: 'hour' | 'day' | 'week' | 'month';
}

// Supabase RLS 관련 타입
export interface RLSPolicy {
  name: string;
  table: string;
  command: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
  role?: string;
  using?: string;
  withCheck?: string;
}

// 설정 타입
export interface AppConfig {
  name: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  features: Record<string, boolean>;
  limits: Record<string, number>;
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey?: string;
  };
}

// Storage 관련 타입
export interface StorageConfig {
  bucket: string;
  maxFileSize: number;
  allowedMimeTypes: string[];
  publicUrl?: string;
}

// Edge Functions 관련 타입
export interface EdgeFunctionResponse<T = unknown> {
  data?: T;
  error?: string;
  status: number;
}

// 헬스 체크 타입
export interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: ISODateString;
  details?: JSONObject;
  supabase?: {
    database: 'healthy' | 'unhealthy';
    storage: 'healthy' | 'unhealthy';
    auth: 'healthy' | 'unhealthy';
    realtime: 'healthy' | 'unhealthy';
  };
}

// 간트 차트 관련 타입 (기존 유지)
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
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
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

// Auth related types (Supabase Auth)
export interface AuthPayload {
  userId: string;
  email: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  iat?: number;
  exp?: number;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: import('./supabase-schema').User;
}

export interface OAuthProfile {
  provider: 'google' | 'microsoft' | 'github';
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

// 파일 메타데이터 타입 (Supabase Storage)
export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  bucket: string;
  path: string;
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

// Conflict resolution types (OT 관련)
export interface TaskConflict {
  taskId: string;
  serverVersion: number;
  clientVersion: number;
  serverData: import('./supabase-schema').Task;
  clientData: import('./supabase-schema').Task | null;
}

export interface TaskOperation {
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  taskId?: string;
  data?: Partial<import('./supabase-schema').Task>;
  version?: number;
}

// Legacy types (호환성을 위해 유지, 점진적으로 제거 예정)
export interface LegacyPermission {
  resource: string;
  action: string;
}

export interface RolePermissions {
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  permissions: LegacyPermission[];
}

// 팀 설정 타입 (기존 유지)
export interface TeamSettings {
  isPublic: boolean;
  allowInvitations: boolean;
  defaultMemberRole: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
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

// Input types for backward compatibility
export interface CreateUserInput {
  email: string;
  name: string;
  role?: 'ADMIN' | 'EDITOR' | 'VIEWER';
}

export interface UpdateUserInput {
  id: string;
  name?: string;
  role?: 'ADMIN' | 'EDITOR' | 'VIEWER';
  avatar?: string;
}

export interface LoginInput {
  email: string;
  password?: string;
  provider?: 'google' | 'microsoft' | 'github';
  code?: string;
}

export interface InviteTeamMemberInput {
  teamId: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
  message?: string;
}

export interface UpdateTeamMemberInput {
  id: string;
  role?: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
  isActive?: boolean;
}

export interface AcceptInvitationInput {
  token: string;
  userId?: string;
}

export interface RespondToInvitationInput {
  invitationId: string;
  action: 'ACCEPT' | 'REJECT';
}

// Permission check input
export interface PermissionCheckInput {
  userId: string;
  resource: {
    type: 'TEAM' | 'PROJECT' | 'TASK';
    teamId?: string;
    projectId?: string;
    taskId?: string;
  };
  action:
    | 'CREATE'
    | 'read'
    | 'update'
    | 'DELETE'
    | 'ASSIGN'
    | 'COMMENT'
    | 'COMPLETE'
    | 'MANAGE_PERMISSIONS';
}
