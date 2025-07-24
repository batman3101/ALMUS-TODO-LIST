// Firestore 컬렉션/문서 구조 정의
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
};
// 필수 인덱스 목록
export const REQUIRED_INDEXES = [
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
//# sourceMappingURL=firestore-schema.js.map