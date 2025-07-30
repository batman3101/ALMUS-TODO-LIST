import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase/client';
import { useFileUpload } from '../hooks/useFileUpload';
import { FileMetadata } from '@almus/shared-types';
import { logger } from '../utils/logger';

interface FileListProps {
  taskId?: string;
  projectId?: string;
  teamId?: string;
  onFileDeleted?: (fileId: string) => void;
  className?: string;
}

export const FileList: React.FC<FileListProps> = ({
  taskId,
  projectId,
  teamId,
  onFileDeleted,
  className = '',
}) => {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { deleteFile, downloadFile } = useFileUpload();

  useEffect(() => {
    loadFiles();
  }, [taskId, projectId, teamId]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('files')
        .select('*')
        .order('created_at', { ascending: false });

      // 필터 조건 추가
      if (taskId) {
        query = query.eq('task_id', taskId);
      } else if (projectId) {
        query = query.eq('project_id', projectId);
      } else if (teamId) {
        query = query.eq('team_id', teamId);
      }

      const { data: fileList, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      setFiles(fileList || []);
    } catch (error) {
      logger.error('파일 목록 로드 실패:', error);
      setError('파일 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      await deleteFile(fileId);
      setFiles(prev => prev.filter(file => file.id !== fileId));
      onFileDeleted?.(fileId);
    } catch (error) {
      logger.error('파일 삭제 실패:', error);
      setError('파일 삭제에 실패했습니다.');
    }
  };

  const handleDownload = async (file: FileMetadata) => {
    try {
      await downloadFile(file.id, file.name);
    } catch (error) {
      logger.error('파일 다운로드 실패:', error);
      setError('파일 다운로드에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className={`flex justify-center items-center p-4 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-red-600 p-4 ${className}`}>
        <p>{error}</p>
        <button
          onClick={loadFiles}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className={`text-gray-500 p-4 text-center ${className}`}>
        <p>업로드된 파일이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <h3 className="text-lg font-semibold mb-3">첨부 파일</h3>
      {files.map(file => (
        <div
          key={file.id}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
        >
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <svg
                className="h-8 w-8 text-gray-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500">
                {(file.size / 1024).toFixed(1)} KB •{' '}
                {new Date(file.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleDownload(file)}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              다운로드
            </button>
            <button
              onClick={() => handleDelete(file.id)}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
            >
              삭제
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
