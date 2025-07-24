import { Timestamp } from 'firebase/firestore';
export type UserRole = 'ADMIN' | 'EDITOR' | 'VIEWER';
export type TeamRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type NotificationType = 'TASK_ASSIGNED' | 'TASK_DUE' | 'TASK_COMPLETED' | 'TASK_COMMENT' | 'TASK_OVERDUE' | 'MENTION' | 'SYSTEM_ANNOUNCEMENT';
export type NotificationChannel = 'EMAIL' | 'PUSH' | 'IN_APP' | 'SLACK' | 'TEAMS' | 'KAKAO';
export type NotificationFrequency = 'IMMEDIATE' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'NEVER';
export declare const FIRESTORE_COLLECTIONS: {
    readonly USERS: "users";
    readonly TASKS: "tasks";
    readonly NOTIFICATIONS: "notifications";
    readonly NOTIFICATION_SETTINGS: "notification_settings";
    readonly NOTIFICATION_TEMPLATES: "notification_templates";
    readonly TASK_DEPENDENCIES: "task_dependencies";
    readonly PROJECTS: "projects";
    readonly PROJECT_PERMISSIONS: "project_permissions";
    readonly TASK_PERMISSIONS: "task_permissions";
    readonly TEAMS: "teams";
    readonly TEAM_MEMBERS: "team_members";
    readonly TEAM_INVITATIONS: "team_invitations";
    readonly PERMISSION_AUDIT_LOG: "permission_audit_log";
};
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
    startDate?: Timestamp;
    endDate?: Timestamp;
    dependencies: string[];
    progress: number;
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
    type: 'finish-to-start' | 'start-to-start' | 'finish-to-finish' | 'start-to-finish';
    lag?: number;
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
    progress: number;
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
export type ProjectRole = 'PROJECT_MANAGER' | 'PROJECT_LEAD' | 'CONTRIBUTOR' | 'OBSERVER';
export type TaskRole = 'ASSIGNEE' | 'REVIEWER' | 'COLLABORATOR' | 'WATCHER';
export type PermissionAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'ASSIGN' | 'COMMENT' | 'COMPLETE' | 'MANAGE_PERMISSIONS';
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
    customConditions?: Record<string, any>;
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
export interface FirestoreIndex {
    collection: string;
    fields: string[];
    queryScopes?: ('COLLECTION' | 'COLLECTION_GROUP')[];
}
export declare const REQUIRED_INDEXES: FirestoreIndex[];
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
export interface FirestoreSubcollection {
    parentCollection: string;
    subcollectionName: string;
    documentId: string;
    data: any;
}
export interface FirestoreMigration {
    version: number;
    description: string;
    up: () => Promise<void>;
    down: () => Promise<void>;
}
//# sourceMappingURL=firestore-schema.d.ts.map