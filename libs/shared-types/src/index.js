export var UserRole;
(function (UserRole) {
  UserRole['ADMIN'] = 'ADMIN';
  UserRole['EDITOR'] = 'EDITOR';
  UserRole['VIEWER'] = 'VIEWER';
})(UserRole || (UserRole = {}));
export var TeamRole;
(function (TeamRole) {
  TeamRole['OWNER'] = 'OWNER';
  TeamRole['ADMIN'] = 'ADMIN';
  TeamRole['EDITOR'] = 'EDITOR';
  TeamRole['VIEWER'] = 'VIEWER';
})(TeamRole || (TeamRole = {}));
export var InvitationStatus;
(function (InvitationStatus) {
  InvitationStatus['PENDING'] = 'PENDING';
  InvitationStatus['ACCEPTED'] = 'ACCEPTED';
  InvitationStatus['REJECTED'] = 'REJECTED';
  InvitationStatus['EXPIRED'] = 'EXPIRED';
  InvitationStatus['CANCELLED'] = 'CANCELLED';
})(InvitationStatus || (InvitationStatus = {}));
// Advanced Permission System Types
export var ProjectRole;
(function (ProjectRole) {
  ProjectRole['PROJECT_MANAGER'] = 'PROJECT_MANAGER';
  ProjectRole['PROJECT_LEAD'] = 'PROJECT_LEAD';
  ProjectRole['CONTRIBUTOR'] = 'CONTRIBUTOR';
  ProjectRole['OBSERVER'] = 'OBSERVER';
})(ProjectRole || (ProjectRole = {}));
export var TaskRole;
(function (TaskRole) {
  TaskRole['ASSIGNEE'] = 'ASSIGNEE';
  TaskRole['REVIEWER'] = 'REVIEWER';
  TaskRole['COLLABORATOR'] = 'COLLABORATOR';
  TaskRole['WATCHER'] = 'WATCHER';
})(TaskRole || (TaskRole = {}));
export var PermissionAction;
(function (PermissionAction) {
  PermissionAction['CREATE'] = 'CREATE';
  PermissionAction['READ'] = 'READ';
  PermissionAction['UPDATE'] = 'UPDATE';
  PermissionAction['DELETE'] = 'DELETE';
  PermissionAction['ASSIGN'] = 'ASSIGN';
  PermissionAction['COMMENT'] = 'COMMENT';
  PermissionAction['COMPLETE'] = 'COMPLETE';
  PermissionAction['MANAGE_PERMISSIONS'] = 'MANAGE_PERMISSIONS';
})(PermissionAction || (PermissionAction = {}));
export var ResourceType;
(function (ResourceType) {
  ResourceType['TEAM'] = 'TEAM';
  ResourceType['PROJECT'] = 'PROJECT';
  ResourceType['TASK'] = 'TASK';
})(ResourceType || (ResourceType = {}));
export var ProjectStatus;
(function (ProjectStatus) {
  ProjectStatus['PLANNING'] = 'PLANNING';
  ProjectStatus['ACTIVE'] = 'ACTIVE';
  ProjectStatus['ON_HOLD'] = 'ON_HOLD';
  ProjectStatus['COMPLETED'] = 'COMPLETED';
  ProjectStatus['CANCELLED'] = 'CANCELLED';
})(ProjectStatus || (ProjectStatus = {}));
export var ProjectPriority;
(function (ProjectPriority) {
  ProjectPriority['LOW'] = 'LOW';
  ProjectPriority['MEDIUM'] = 'MEDIUM';
  ProjectPriority['HIGH'] = 'HIGH';
  ProjectPriority['URGENT'] = 'URGENT';
})(ProjectPriority || (ProjectPriority = {}));
export var TaskStatus;
(function (TaskStatus) {
  TaskStatus['TODO'] = 'TODO';
  TaskStatus['IN_PROGRESS'] = 'IN_PROGRESS';
  TaskStatus['REVIEW'] = 'REVIEW';
  TaskStatus['DONE'] = 'DONE';
})(TaskStatus || (TaskStatus = {}));
export var TaskPriority;
(function (TaskPriority) {
  TaskPriority['LOW'] = 'LOW';
  TaskPriority['MEDIUM'] = 'MEDIUM';
  TaskPriority['HIGH'] = 'HIGH';
  TaskPriority['URGENT'] = 'URGENT';
})(TaskPriority || (TaskPriority = {}));
export var ZoomLevel;
(function (ZoomLevel) {
  ZoomLevel['DAY'] = 'day';
  ZoomLevel['WEEK'] = 'week';
  ZoomLevel['MONTH'] = 'month';
  ZoomLevel['QUARTER'] = 'quarter';
  ZoomLevel['YEAR'] = 'year';
})(ZoomLevel || (ZoomLevel = {}));
// 알림 관련 타입
export var NotificationType;
(function (NotificationType) {
  NotificationType['TASK_DUE_REMINDER'] = 'TASK_DUE_REMINDER';
  NotificationType['TASK_STATUS_CHANGE'] = 'TASK_STATUS_CHANGE';
  NotificationType['TASK_ASSIGNED'] = 'TASK_ASSIGNED';
  NotificationType['TASK_COMMENT'] = 'TASK_COMMENT';
  NotificationType['TASK_OVERDUE'] = 'TASK_OVERDUE';
  NotificationType['SYSTEM_ANNOUNCEMENT'] = 'SYSTEM_ANNOUNCEMENT';
})(NotificationType || (NotificationType = {}));
export var NotificationChannel;
(function (NotificationChannel) {
  NotificationChannel['EMAIL'] = 'EMAIL';
  NotificationChannel['PUSH'] = 'PUSH';
  NotificationChannel['IN_APP'] = 'IN_APP';
  NotificationChannel['SLACK'] = 'SLACK';
  NotificationChannel['TEAMS'] = 'TEAMS';
  NotificationChannel['KAKAO'] = 'KAKAO';
})(NotificationChannel || (NotificationChannel = {}));
export var NotificationFrequency;
(function (NotificationFrequency) {
  NotificationFrequency['IMMEDIATE'] = 'IMMEDIATE';
  NotificationFrequency['DAILY'] = 'DAILY';
  NotificationFrequency['WEEKLY'] = 'WEEKLY';
  NotificationFrequency['NEVER'] = 'NEVER';
})(NotificationFrequency || (NotificationFrequency = {}));
// Re-export from firestore-schema
export * from './firestore-schema';
