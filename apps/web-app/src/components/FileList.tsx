import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { firestore } from '../config/firebase';
import { useFileUpload } from '../hooks/useFileUpload';
import { FileMetadata } from '@almus/shared-types';

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

      const filesRef = collection(firestore, 'files');
      let q = query(filesRef);

      // 필터 조건 추가
      if (taskId) {
        q = query(q, where('taskId', '==', taskId));
      } else if (projectId) {
        q = query(q, where('projectId', '==', projectId));
      } else if (teamId) {
        q = query(q, where('teamId', '==', teamId));
      }

      const querySnapshot = await getDocs(q);
      const fileList: FileMetadata[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fileList.push({
          id: doc.id,
          name: data.name,
          size: data.size,
          type: data.type,
          url: data.url,
          uploaderId: data.uploaderId,
          uploaderName: data.uploaderName,
          taskId: data.taskId,
          projectId: data.projectId,
          teamId: data.teamId,
          version: data.version,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        });
      });

      setFiles(fileList);
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      const result = await deleteFile(fileId);
      if (result.success) {
        setFiles(prev => prev.filter(file => file.id !== fileId));
        onFileDeleted?.(fileId);
      } else {
        setError(result.error || '파일 삭제에 실패했습니다.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일 삭제에 실패했습니다.');
    }
  };

  const handleDownloadFile = async (fileId: string) => {
    try {
      const result = await downloadFile(fileId);
      if (result.success && result.url) {
        // 새 탭에서 파일 다운로드
        const link = document.createElement('a');
        link.href = result.url;
        link.download = '';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        setError(result.error || '파일 다운로드에 실패했습니다.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일 다운로드에 실패했습니다.');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string): string => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word')) return '📝';
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
    if (type.includes('text')) return '📄';
    return '📎';
  };

  if (loading) {
    return (
      <div className={`file-list ${className}`}>
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">파일 목록을 불러오는 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`file-list ${className}`}>
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className={`file-list ${className}`}>
        <div className="p-4 text-center text-gray-500">
          첨부된 파일이 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className={`file-list ${className}`}>
      <h3 className="text-lg font-medium text-gray-900 mb-4">첨부 파일</h3>
      
      <div className="space-y-2">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{getFileIcon(file.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(file.size)} • {file.uploaderName} • {file.createdAt.toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleDownloadFile(file.id)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                다운로드
              </button>
              <button
                onClick={() => handleDeleteFile(file.id)}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 