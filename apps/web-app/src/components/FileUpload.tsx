import React, { useRef, useState, useCallback } from 'react';
import { useFileUpload } from '../hooks/useFileUpload';
import { FileMetadata } from '@almus/shared-types';

interface FileUploadProps {
  path: string;
  metadata?: Partial<FileMetadata>;
  onUploadComplete?: (result: any) => void;
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
  maxFiles = 10,
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { uploadFile, uploadMultipleFiles, uploadState, resetUploadState } = useFileUpload();

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  }, []);

  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    try {
      if (multiple) {
        const results = await uploadMultipleFiles(selectedFiles, path, metadata);
        const successResults = results.filter((result: FileMetadata) => result.id);
        const errorResults = results.filter((result: FileMetadata) => !result.id);

        if (successResults.length > 0) {
          onUploadComplete?.(successResults);
        }
        if (errorResults.length > 0) {
          onUploadError?.('일부 파일 업로드에 실패했습니다.');
        }
      } else {
        const result = await uploadFile(selectedFiles[0], path, metadata);
        if (result.id) {
          onUploadComplete?.(result);
        } else {
          onUploadError?.('업로드 실패');
        }
      }

      // 파일 선택 초기화
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      resetUploadState();
    } catch (error) {
      onUploadError?.(error instanceof Error ? error.message : '업로드 실패');
    }
  }, [selectedFiles, path, metadata, multiple, uploadFile, uploadMultipleFiles, onUploadComplete, onUploadError, resetUploadState]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    setSelectedFiles(files);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

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
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              파일 선택
            </button>
            <p className="mt-2 text-sm text-gray-500">
              또는 파일을 여기에 드래그하세요
            </p>
          </div>
        </div>
      </div>

      {/* 선택된 파일 목록 */}
      {selectedFiles.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">선택된 파일:</h4>
          <ul className="space-y-2">
            {selectedFiles.map((file, index) => (
              <li key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">{file.name}</span>
                  <span className="text-xs text-gray-400">({formatFileSize(file.size)})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
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
            {uploadState.isUploading ? '업로드 중...' : '업로드'}
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
            {Math.round(uploadState.progress.percentage)}% 완료
          </p>
        </div>
      )}

      {/* 에러 메시지 */}
      {uploadState.error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {uploadState.error}
        </div>
      )}

      {/* 성공 메시지 */}
      {uploadState.downloadURL && (
        <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          파일이 성공적으로 업로드되었습니다!
        </div>
      )}
    </div>
  );
}; 