import React, { useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useFileUpload } from '../hooks/useFileUpload';
import { FileMetadata } from '@almus/shared-types';
import { useNotification } from '../contexts/NotificationContext';

interface FileUploadProps {
  path: string;
  metadata?: Partial<FileMetadata>;
  onUploadComplete?: (result: { metadata: FileMetadata }) => void;
  onUploadError?: (error: string) => void;
  multiple?: boolean;
  accept?: string;
  maxFiles?: number;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  path,
  metadata,
  onUploadComplete,
  onUploadError,
  multiple = false,
  accept,
  className = '',
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { uploadFile, uploadMultipleFiles, uploadState, resetUploadState } =
    useFileUpload();
  const { success, error: showError, info } = useNotification();

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (files.length > 0) {
        info(t('file.filesSelected', { count: files.length }));
      }
      setSelectedFiles(files);
    },
    [info]
  );

  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    try {
      info(t('file.uploadStarted', { count: selectedFiles.length }));

      if (multiple) {
        const results = await uploadMultipleFiles(
          selectedFiles,
          path,
          metadata
        );
        const successResults = results.filter(
          (result: FileMetadata) => result.id
        );
        const errorResults = results.filter(
          (result: FileMetadata) => !result.id
        );

        if (successResults.length > 0) {
          success(
            t('file.uploadSuccessMultiple', { count: successResults.length })
          );
          onUploadComplete?.(successResults);
        }
        if (errorResults.length > 0) {
          const errorMessage = t('file.uploadFailedMultiple', {
            count: errorResults.length,
          });
          showError(errorMessage);
          onUploadError?.(errorMessage);
        }
      } else {
        const result = await uploadFile(selectedFiles[0], path, metadata);
        if (result.id) {
          success(
            t('file.uploadSuccessSingle', { name: selectedFiles[0].name })
          );
          onUploadComplete?.(result);
        } else {
          const errorMessage = t('file.uploadFailed');
          showError(errorMessage);
          onUploadError?.(errorMessage);
        }
      }

      // 파일 선택 초기화
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      resetUploadState();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t('file.uploadError');
      showError(errorMessage);
      onUploadError?.(errorMessage);
    }
  }, [
    selectedFiles,
    path,
    metadata,
    multiple,
    uploadFile,
    uploadMultipleFiles,
    onUploadComplete,
    onUploadError,
    resetUploadState,
    success,
    showError,
    info,
  ]);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const files = Array.from(event.dataTransfer.files);
      if (files.length > 0) {
        info(t('file.filesSelectedDrag', { count: files.length }));
      }
      setSelectedFiles(files);
    },
    [info]
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
    },
    []
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`file-upload ${className}`}>
      {/* 파일 선택 영역 */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="space-y-4">
          <div className="text-gray-600">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              {t('file.selectFiles')}
            </button>
            <p className="mt-2 text-sm text-gray-500">{t('file.dropFiles')}</p>
          </div>
        </div>
      </div>

      {/* 선택된 파일 목록 */}
      {selectedFiles.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            {t('file.selectedFiles')}:
          </h4>
          <ul className="space-y-2">
            {selectedFiles.map((file, index) => (
              <li
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">{file.name}</span>
                  <span className="text-xs text-gray-400">
                    ({formatFileSize(file.size)})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
                  }
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={handleUpload}
            disabled={uploadState.isUploading}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploadState.isUploading ? t('file.uploading') : t('file.upload')}
          </button>
        </div>
      )}

      {/* 업로드 진행률 */}
      {uploadState.isUploading && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadState.progress.percentage}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {t('file.uploadProgress', {
              percentage: Math.round(uploadState.progress.percentage),
            })}
          </p>
        </div>
      )}

      {/* 기존 브라우저 알림 제거 - 토스트 알림으로 대체됨 */}
    </div>
  );
};
