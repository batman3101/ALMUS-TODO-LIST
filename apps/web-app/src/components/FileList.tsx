import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase-client.ts';
import { useFileUpload } from '../hooks/useFileUpload';
import { FileMetadata } from '@almus/shared-types';
import { logger } from '../utils/logger';
import { Download, Trash2, RefreshCw, Eye, FileText } from 'lucide-react';
import { createToast } from '../utils/toast';
import { useTheme } from '../contexts/ThemeContext';

interface FileListProps {
  taskId?: string;
  projectId?: string;
  teamId?: string;
  onFileDeleted?: (fileId: string) => void;
  onFileUploaded?: (file: FileMetadata) => void;
  editable?: boolean;
  className?: string;
}

export const FileList: React.FC<FileListProps> = ({
  taskId,
  projectId,
  teamId,
  onFileDeleted,
  onFileUploaded,
  editable = true,
  className = '',
}) => {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replacingFileId, setReplacingFileId] = useState<string | null>(null);
  const { deleteFile, downloadFile, uploadFile } = useFileUpload();
  const { theme } = useTheme();
  const toast = createToast(theme === 'dark');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFiles();
  }, [taskId, projectId, teamId]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('file_metadata')
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
    if (!window.confirm('파일을 삭제하시겠습니까?')) return;
    
    try {
      const result = await deleteFile(fileId);
      if (result.success) {
        setFiles(prev => prev.filter(file => file.id !== fileId));
        onFileDeleted?.(fileId);
        toast.success('파일이 삭제되었습니다.');
      } else {
        toast.error(result.error || '파일 삭제에 실패했습니다.');
      }
    } catch (error) {
      logger.error('파일 삭제 실패:', error);
      toast.error('파일 삭제에 실패했습니다.');
    }
  };

  const handleDownload = async (file: FileMetadata) => {
    try {
      const result = await downloadFile(file.id);
      if (result.success && result.url) {
        // 파일 다운로드
        const link = document.createElement('a');
        link.href = result.url;
        link.download = file.name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('파일 다운로드를 시작합니다.');
      } else {
        toast.error(result.error || '파일 다운로드에 실패했습니다.');
      }
    } catch (error) {
      logger.error('파일 다운로드 실패:', error);
      toast.error('파일 다운로드에 실패했습니다.');
    }
  };

  const handleView = async (file: FileMetadata) => {
    try {
      // 이미지 파일인지 확인
      if (file.type.startsWith('image/')) {
        // Windows 기본 이미지 뷰어로 열기 (새 탭에서 열기)
        window.open(file.url, '_blank');
      } else if (file.type === 'application/pdf') {
        // PDF는 브라우저에서 열기
        window.open(file.url, '_blank');
      } else {
        // 다른 파일은 다운로드
        handleDownload(file);
      }
    } catch (error) {
      logger.error('파일 열기 실패:', error);
      toast.error('파일을 열 수 없습니다.');
    }
  };

  const handleReplace = async (fileId: string) => {
    setReplacingFileId(fileId);
    fileInputRef.current?.click();
  };

  const handleFileReplace = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !replacingFileId) return;

    try {
      // 기존 파일 정보 가져오기
      const oldFile = files.find(f => f.id === replacingFileId);
      if (!oldFile) return;

      // 기존 파일 삭제
      await deleteFile(replacingFileId);

      // 새 파일 업로드
      const metadata = {
        taskId: oldFile.task_id,
        projectId: oldFile.project_id,
        teamId: oldFile.team_id,
      };
      
      const newFile = await uploadFile(
        file,
        taskId ? `tasks/${taskId}` : projectId ? `projects/${projectId}` : `teams/${teamId}`,
        metadata
      );

      // 파일 목록 업데이트
      setFiles(prev => prev.map(f => f.id === replacingFileId ? newFile : f));
      onFileUploaded?.(newFile);
      toast.success('파일이 교체되었습니다.');
    } catch (error) {
      logger.error('파일 교체 실패:', error);
      toast.error('파일 교체에 실패했습니다.');
    } finally {
      setReplacingFileId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <Eye className="h-6 w-6 text-blue-500" />;
    } else if (type === 'application/pdf') {
      return <FileText className="h-6 w-6 text-red-500" />;
    } else {
      return <FileText className="h-6 w-6 text-gray-400" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileReplace}
        className="hidden"
      />
      <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
        첨부 파일 ({files.length})
      </h3>
      {files.map(file => (
        <div
          key={file.id}
          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center space-x-3 flex-1">
            <div className="flex-shrink-0">
              {getFileIcon(file.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {file.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(file.size)} • {file.uploader_name} •{' '}
                {new Date(file.created_at).toLocaleDateString('ko-KR')}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {file.type.startsWith('image/') && (
              <button
                onClick={() => handleView(file)}
                className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-all"
                title="보기"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => handleDownload(file)}
              className="p-1.5 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-all"
              title="다운로드"
            >
              <Download className="w-4 h-4" />
            </button>
            {editable && (
              <>
                <button
                  onClick={() => handleReplace(file.id)}
                  className="p-1.5 text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded transition-all"
                  title="교체"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(file.id)}
                  className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                  title="삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
