export var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "ADMIN";
    UserRole["EDITOR"] = "EDITOR";
    UserRole["VIEWER"] = "VIEWER";
})(UserRole || (UserRole = {}));
export var TaskStatus;
(function (TaskStatus) {
    TaskStatus["TODO"] = "TODO";
    TaskStatus["IN_PROGRESS"] = "IN_PROGRESS";
    TaskStatus["REVIEW"] = "REVIEW";
    TaskStatus["DONE"] = "DONE";
})(TaskStatus || (TaskStatus = {}));
export var TaskPriority;
(function (TaskPriority) {
    TaskPriority["LOW"] = "LOW";
    TaskPriority["MEDIUM"] = "MEDIUM";
    TaskPriority["HIGH"] = "HIGH";
    TaskPriority["URGENT"] = "URGENT";
})(TaskPriority || (TaskPriority = {}));
export var ZoomLevel;
(function (ZoomLevel) {
    ZoomLevel["DAY"] = "day";
    ZoomLevel["WEEK"] = "week";
    ZoomLevel["MONTH"] = "month";
    ZoomLevel["QUARTER"] = "quarter";
    ZoomLevel["YEAR"] = "year";
})(ZoomLevel || (ZoomLevel = {}));
// 알림 관련 타입
export var NotificationType;
(function (NotificationType) {
    NotificationType["TASK_DUE_REMINDER"] = "TASK_DUE_REMINDER";
    NotificationType["TASK_STATUS_CHANGE"] = "TASK_STATUS_CHANGE";
    NotificationType["TASK_ASSIGNED"] = "TASK_ASSIGNED";
    NotificationType["TASK_COMMENT"] = "TASK_COMMENT";
    NotificationType["TASK_OVERDUE"] = "TASK_OVERDUE";
    NotificationType["SYSTEM_ANNOUNCEMENT"] = "SYSTEM_ANNOUNCEMENT";
})(NotificationType || (NotificationType = {}));
export var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["EMAIL"] = "EMAIL";
    NotificationChannel["PUSH"] = "PUSH";
    NotificationChannel["IN_APP"] = "IN_APP";
    NotificationChannel["SLACK"] = "SLACK";
    NotificationChannel["TEAMS"] = "TEAMS";
    NotificationChannel["KAKAO"] = "KAKAO";
})(NotificationChannel || (NotificationChannel = {}));
export var NotificationFrequency;
(function (NotificationFrequency) {
    NotificationFrequency["IMMEDIATE"] = "IMMEDIATE";
    NotificationFrequency["DAILY"] = "DAILY";
    NotificationFrequency["WEEKLY"] = "WEEKLY";
    NotificationFrequency["NEVER"] = "NEVER";
})(NotificationFrequency || (NotificationFrequency = {}));
// Re-export from firestore-schema
export * from './firestore-schema';
//# sourceMappingURL=index.js.map