// Firebase Storage 관련 타입 정의

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

export interface FileUploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
}

export interface FileUploadState {
  isUploading: boolean;
  progress: FileUploadProgress;
  error?: string;
  downloadURL?: string;
}

export interface FileUploadConfig {
  maxFileSize: number; // bytes (100MB = 100 * 1024 * 1024)
  allowedTypes: string[];
  maxFiles: number;
  autoUpload: boolean;
}

export const DEFAULT_FILE_UPLOAD_CONFIG: FileUploadConfig = {
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

export interface FileStoragePath {
  users: string;
  teams: string;
  projects: string;
  tasks: string;
  public: string;
}

export const STORAGE_PATHS: FileStoragePath = {
  users: 'users',
  teams: 'teams',
  projects: 'projects',
  tasks: 'tasks',
  public: 'public',
};

export interface FileUploadResult {
  success: boolean;
  fileId?: string;
  downloadURL?: string;
  error?: string;
  metadata?: FileMetadata;
}

export interface FileDownloadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface FileDeleteResult {
  success: boolean;
  error?: string;
}

// 파일 업로드 이벤트 타입
export type FileUploadEvent = 
  | { type: 'START'; file: File }
  | { type: 'PROGRESS'; progress: FileUploadProgress }
  | { type: 'SUCCESS'; result: FileUploadResult }
  | { type: 'ERROR'; error: string };

// 파일 업로드 훅 반환 타입
export interface UseFileUploadReturn {
  uploadFile: (file: File, path: string, metadata?: Partial<FileMetadata>) => Promise<FileUploadResult>;
  uploadMultipleFiles: (files: File[], path: string, metadata?: Partial<FileMetadata>) => Promise<FileUploadResult[]>;
  deleteFile: (fileId: string, path: string) => Promise<FileDeleteResult>;
  downloadFile: (fileId: string, path: string) => Promise<FileDownloadResult>;
  uploadState: FileUploadState;
  resetUploadState: () => void;
} 