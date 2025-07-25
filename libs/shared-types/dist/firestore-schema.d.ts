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
    readonly COMMENTS: "comments";
    readonly MENTIONS: "mentions";
    readonly COLLABORATIVE_SESSIONS: "collaborative_sessions";
    readonly EDIT_OPERATIONS: "edit_operations";
    readonly USER_PRESENCE: "user_presence";
    readonly DOCUMENT_VERSIONS: "document_versions";
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
export type CommentType = 'TASK' | 'PROJECT' | 'DOCUMENT';
export type PresenceStatus = 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE';
export type EditOperationType = 'INSERT' | 'DELETE' | 'REPLACE' | 'FORMAT';
export interface FirestoreComment {
    id: string;
    resourceType: CommentType;
    resourceId: string;
    parentCommentId?: string;
    authorId: string;
    content: string;
    mentions: string[];
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
    fieldPath?: string;
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
    conflictsWith?: string[];
    resolvedBy?: string;
    createdAt: Timestamp;
}
export interface FirestoreUserPresence {
    id: string;
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
    content: Record<string, unknown>;
    changes: FirestoreVersionChange[];
    createdBy: string;
    summary?: string;
    tags?: string[];
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