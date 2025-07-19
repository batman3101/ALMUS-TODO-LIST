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
    maxFileSize: number;
    allowedTypes: string[];
    maxFiles: number;
    autoUpload: boolean;
}
export declare const DEFAULT_FILE_UPLOAD_CONFIG: FileUploadConfig;
export interface FileStoragePath {
    users: string;
    teams: string;
    projects: string;
    tasks: string;
    public: string;
}
export declare const STORAGE_PATHS: FileStoragePath;
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
export type FileUploadEvent = {
    type: 'START';
    file: File;
} | {
    type: 'PROGRESS';
    progress: FileUploadProgress;
} | {
    type: 'SUCCESS';
    result: FileUploadResult;
} | {
    type: 'ERROR';
    error: string;
};
export interface UseFileUploadReturn {
    uploadFile: (file: File, path: string, metadata?: Partial<FileMetadata>) => Promise<FileUploadResult>;
    uploadMultipleFiles: (files: File[], path: string, metadata?: Partial<FileMetadata>) => Promise<FileUploadResult[]>;
    deleteFile: (fileId: string, path: string) => Promise<FileDeleteResult>;
    downloadFile: (fileId: string, path: string) => Promise<FileDownloadResult>;
    uploadState: FileUploadState;
    resetUploadState: () => void;
}
//# sourceMappingURL=firebase-storage.d.ts.map