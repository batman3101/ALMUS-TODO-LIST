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
    TEAMS: 'teams',
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
];
//# sourceMappingURL=firestore-schema.js.map