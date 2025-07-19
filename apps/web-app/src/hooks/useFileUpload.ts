import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { storage, firestore } from '../config/firebase';
import { useAuth } from './useAuth';
import { getDoc } from 'firebase/firestore';
import { FileMetadata, UploadState } from '@almus/shared-types';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UseFileUploadReturn {
  uploadFile: (file: File, path: string, metadata?: Partial<FileMetadata>) => Promise<FileMetadata>;
  uploadMultipleFiles: (files: File[], path: string, metadata?: Partial<FileMetadata>) => Promise<FileMetadata[]>;
  deleteFile: (fileId: string) => Promise<{ success: boolean; error?: string }>;
  downloadFile: (fileId: string) => Promise<{ success: boolean; url?: string; error?: string }>;
  uploadState: UploadState;
  resetUploadState: () => void;
}

export const useFileUpload = (): UseFileUploadReturn => {
  const { user } = useAuth();
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: { loaded: 0, total: 0, percentage: 0 },
    error: null,
  });

  const uploadFile = async (file: File, path: string, metadata?: Partial<FileMetadata>): Promise<FileMetadata> => {
    if (!user) {
      throw new Error('인증이 필요합니다.');
    }

    // 파일 크기 검증 (100MB 제한)
    if (file.size > 100 * 1024 * 1024) {
      throw new Error('파일 크기는 100MB를 초과할 수 없습니다.');
    }

    // 파일 타입 검증
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error('지원하지 않는 파일 타입입니다.');
    }

    setUploadState({
      isUploading: true,
      progress: { loaded: 0, total: file.size, percentage: 0 },
      error: null,
    });

    try {
      // Storage에 파일 업로드
      const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
      
      // 업로드 진행률 모니터링 (Firebase Storage는 기본적으로 진행률을 제공하지 않음)
      const uploadTask = uploadBytes(storageRef, file);
      
      // 진행률 시뮬레이션 (실제로는 Firebase Storage에서 제공하지 않음)
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: {
            loaded: prev.progress.loaded + file.size / 10,
            total: file.size,
            percentage: Math.min((prev.progress.loaded + file.size / 10) / file.size * 100, 90),
          },
        }));
      }, 100);

      await uploadTask;
      clearInterval(progressInterval);

      // 다운로드 URL 가져오기
      const downloadURL = await getDownloadURL(storageRef);

      // Firestore에 메타데이터 저장
      const fileMetadata: FileMetadata = {
        id: storageRef.name,
        name: file.name,
        size: file.size,
        type: file.type,
        url: downloadURL,
        uploaderId: user.uid,
        uploaderName: user.displayName || user.email || 'Unknown',
        taskId: metadata?.taskId,
        projectId: metadata?.projectId,
        teamId: metadata?.teamId || user.teamId || '',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(doc(firestore, 'files', fileMetadata.id), fileMetadata);

      setUploadState({
        isUploading: false,
        progress: { loaded: file.size, total: file.size, percentage: 100 },
        error: null,
        downloadURL,
      });

      return fileMetadata;
    } catch (error) {
      setUploadState({
        isUploading: false,
        progress: { loaded: 0, total: 0, percentage: 0 },
        error: error instanceof Error ? error.message : '파일 업로드에 실패했습니다.',
      });
      throw error;
    }
  };

  const uploadMultipleFiles = async (files: File[], path: string, metadata?: Partial<FileMetadata>): Promise<FileMetadata[]> => {
    const results = await Promise.allSettled(
      files.map(file => uploadFile(file, path, metadata))
    );

    const successResults = results.filter(result => result.status === 'fulfilled') as PromiseFulfilledResult<FileMetadata>[];
    const errorResults = results.filter(result => result.status === 'rejected') as PromiseRejectedResult[];

    if (errorResults.length > 0) {
      console.error('일부 파일 업로드 실패:', errorResults);
    }

    return successResults.map(result => result.value);
  };

  const deleteFile = async (fileId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: '인증이 필요합니다.' };
    }

    try {
      // Firestore에서 파일 메타데이터 조회
      const fileDoc = await doc(firestore, 'files', fileId);
      const fileSnap = await getDoc(fileDoc);

      if (!fileSnap.exists()) {
        return { success: false, error: '파일을 찾을 수 없습니다.' };
      }

      const fileData = fileSnap.data() as FileMetadata;

      // 권한 확인 (업로더 또는 팀 관리자만 삭제 가능)
      if (fileData.uploaderId !== user.uid && user.role !== 'ADMIN') {
        return { success: false, error: '파일을 삭제할 권한이 없습니다.' };
      }

      // Storage에서 파일 삭제
      const storageRef = ref(storage, fileId);
      await deleteObject(storageRef);

      // Firestore에서 메타데이터 삭제
      await deleteDoc(fileDoc);

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '파일 삭제에 실패했습니다.' 
      };
    }
  };

  const downloadFile = async (fileId: string): Promise<{ success: boolean; url?: string; error?: string }> => {
    try {
      // Firestore에서 파일 메타데이터 조회
      const fileDoc = await doc(firestore, 'files', fileId);
      const fileSnap = await getDoc(fileDoc);

      if (!fileSnap.exists()) {
        return { success: false, error: '파일을 찾을 수 없습니다.' };
      }

      const fileData = fileSnap.data() as FileMetadata;

      return { success: true, url: fileData.url };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '파일 다운로드에 실패했습니다.' 
      };
    }
  };

  const resetUploadState = () => {
    setUploadState({
      isUploading: false,
      progress: { loaded: 0, total: 0, percentage: 0 },
      error: null,
    });
  };

  return {
    uploadFile,
    uploadMultipleFiles,
    deleteFile,
    downloadFile,
    uploadState,
    resetUploadState,
  };
}; 