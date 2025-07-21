// Firebase Storage 관련 타입 정의
export const DEFAULT_FILE_UPLOAD_CONFIG = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowedTypes: [
    'image/*',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ],
  maxFiles: 10,
  autoUpload: true,
};
export const STORAGE_PATHS = {
  users: 'users',
  teams: 'teams',
  projects: 'projects',
  tasks: 'tasks',
  public: 'public',
};
