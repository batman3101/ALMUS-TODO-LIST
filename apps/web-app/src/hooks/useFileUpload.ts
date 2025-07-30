import { useState } from 'react';
import { logger } from '../utils/logger';
import { supabase } from '../../../../lib/supabase/client';
import { useAuth } from './useAuth';
import { FileMetadata, UploadState } from '@almus/shared-types';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UseFileUploadReturn {
  uploadFile: (
    file: File,
    path: string,
    metadata?: Partial<FileMetadata>
  ) => Promise<FileMetadata>;
  uploadMultipleFiles: (
    files: File[],
    path: string,
    metadata?: Partial<FileMetadata>
  ) => Promise<FileMetadata[]>;
  deleteFile: (fileId: string) => Promise<{ success: boolean; error?: string }>;
  downloadFile: (
    fileId: string
  ) => Promise<{ success: boolean; url?: string; error?: string }>;
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

  const uploadFile = async (
    file: File,
    path: string,
    metadata?: Partial<FileMetadata>
  ): Promise<FileMetadata> => {
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
      // Supabase Storage에 파일 업로드
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${path}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('files') // Supabase storage bucket name
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // 공개 URL 가져오기
      const { data: urlData } = supabase.storage
        .from('files')
        .getPublicUrl(filePath);

      // Supabase DB에 메타데이터 저장
      const fileMetadata = {
        name: file.name,
        size: file.size,
        type: file.type,
        url: urlData.publicUrl,
        bucket: 'files',
        path: filePath,
        uploader_id: user.id,
        uploader_name: user.displayName || user.email || 'Unknown',
        task_id: metadata?.taskId,
        project_id: metadata?.projectId,
        team_id: metadata?.teamId || user.teamId || '',
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: dbData, error: dbError } = await supabase
        .from('file_metadata')
        .insert([fileMetadata])
        .select()
        .single();

      if (dbError) {
        // 업로드된 파일 삭제 후 에러 throw
        await supabase.storage.from('files').remove([filePath]);
        throw dbError;
      }

      setUploadState({
        isUploading: false,
        progress: { loaded: file.size, total: file.size, percentage: 100 },
        error: null,
        downloadURL: urlData.publicUrl,
      });

      return {
        ...dbData,
        id: dbData.id,
        uploaderId: dbData.uploader_id,
        uploaderName: dbData.uploader_name,
        taskId: dbData.task_id,
        projectId: dbData.project_id,
        teamId: dbData.team_id,
        createdAt: new Date(dbData.created_at),
        updatedAt: new Date(dbData.updated_at),
      } as FileMetadata;
    } catch (error) {
      setUploadState({
        isUploading: false,
        progress: { loaded: 0, total: 0, percentage: 0 },
        error:
          error instanceof Error
            ? error.message
            : '파일 업로드에 실패했습니다.',
      });
      throw error;
    }
  };

  const uploadMultipleFiles = async (
    files: File[],
    path: string,
    metadata?: Partial<FileMetadata>
  ): Promise<FileMetadata[]> => {
    const results = await Promise.allSettled(
      files.map(file => uploadFile(file, path, metadata))
    );

    const successResults = results.filter(
      result => result.status === 'fulfilled'
    ) as PromiseFulfilledResult<FileMetadata>[];
    const errorResults = results.filter(
      result => result.status === 'rejected'
    ) as PromiseRejectedResult[];

    if (errorResults.length > 0) {
      logger.error('일부 파일 업로드 실패:', errorResults);
    }

    return successResults.map(result => result.value);
  };

  const deleteFile = async (
    fileId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: '인증이 필요합니다.' };
    }

    try {
      // Supabase DB에서 파일 메타데이터 조회
      const { data: fileData, error: fetchError } = await supabase
        .from('file_metadata')
        .select('*')
        .eq('id', fileId)
        .single();

      if (fetchError || !fileData) {
        return { success: false, error: '파일을 찾을 수 없습니다.' };
      }

      // 권한 확인 (업로더 또는 팀 관리자만 삭제 가능)
      if (fileData.uploader_id !== user.id && user.role !== 'ADMIN') {
        return { success: false, error: '파일을 삭제할 권한이 없습니다.' };
      }

      // Supabase Storage에서 파일 삭제
      const { error: storageError } = await supabase.storage
        .from('files')
        .remove([fileData.path]);

      if (storageError) {
        logger.warn('Storage 파일 삭제 실패:', storageError);
        // Storage 삭제 실패해도 메타데이터는 삭제 진행
      }

      // Supabase DB에서 메타데이터 삭제
      const { error: dbError } = await supabase
        .from('file_metadata')
        .delete()
        .eq('id', fileId);

      if (dbError) {
        throw dbError;
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : '파일 삭제에 실패했습니다.',
      };
    }
  };

  const downloadFile = async (
    fileId: string
  ): Promise<{ success: boolean; url?: string; error?: string }> => {
    try {
      // Supabase DB에서 파일 메타데이터 조회
      const { data: fileData, error: fetchError } = await supabase
        .from('file_metadata')
        .select('*')
        .eq('id', fileId)
        .single();

      if (fetchError || !fileData) {
        return { success: false, error: '파일을 찾을 수 없습니다.' };
      }

      return { success: true, url: fileData.url };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : '파일 다운로드에 실패했습니다.',
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
