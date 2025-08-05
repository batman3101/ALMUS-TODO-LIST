// TODO: Migrate from Firebase to Supabase
// This file needs to be refactored to use Supabase instead of Firebase
import { useState, useEffect } from 'react';
import { logger } from '../utils/logger';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './useAuth';
import {
  ProjectPermission,
  CreateProjectPermissionInput,
  UpdateProjectPermissionInput,
  ProjectRole,
  FIRESTORE_COLLECTIONS,
} from '../types/team';
import { toast } from '../utils/toast';

export const useProjectPermissions = (projectId: string) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<ProjectPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 프로젝트 권한 목록 로드
  useEffect(() => {
    if (!projectId) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    const permissionsQuery = query(
      collection(db, FIRESTORE_COLLECTIONS.PROJECT_PERMISSIONS),
      where('projectId', '==', projectId),
      where('isActive', '==', true),
      orderBy('grantedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      permissionsQuery,
      snapshot => {
        const permissionsData = snapshot.docs.map(doc => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            projectId: data.projectId,
            userId: data.userId,
            role: data.role,
            permissions: data.permissions || [],
            grantedBy: data.grantedBy,
            grantedAt: data.grantedAt.toDate(),
            expiresAt: data.expiresAt?.toDate(),
            isActive: data.isActive,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
          } as ProjectPermission;
        });
        setPermissions(permissionsData);
        setLoading(false);
        setError(null);
      },
      error => {
        logger.error('프로젝트 권한 로드 실패:', error);
        setError('프로젝트 권한을 불러오는데 실패했습니다.');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [projectId]);

  // 프로젝트 권한 부여
  const grantPermission = async (
    input: CreateProjectPermissionInput
  ): Promise<ProjectPermission> => {
    if (!user) throw new Error('사용자가 로그인되어 있지 않습니다');

    try {
      // 기존 권한이 있는지 확인
      const existingPermission = permissions.find(
        p => p.userId === input.userId
      );
      if (existingPermission) {
        throw new Error('해당 사용자에게 이미 권한이 부여되어 있습니다.');
      }

      const now = Timestamp.now();
      const permissionRef = doc(
        collection(db, FIRESTORE_COLLECTIONS.PROJECT_PERMISSIONS)
      );

      const permissionData = {
        id: permissionRef.id,
        projectId: input.projectId,
        userId: input.userId,
        role: input.role,
        permissions: input.permissions || [],
        grantedBy: user.id,
        grantedAt: now,
        expiresAt: input.expiresAt ? Timestamp.fromDate(input.expiresAt) : null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      await addDoc(
        collection(db, FIRESTORE_COLLECTIONS.PROJECT_PERMISSIONS),
        permissionData
      );

      const createdPermission: ProjectPermission = {
        id: permissionRef.id,
        projectId: permissionData.projectId,
        userId: permissionData.userId,
        role: permissionData.role,
        permissions: permissionData.permissions,
        grantedBy: permissionData.grantedBy,
        grantedAt: permissionData.grantedAt.toDate(),
        expiresAt: permissionData.expiresAt?.toDate(),
        isActive: permissionData.isActive,
        createdAt: permissionData.createdAt.toDate(),
        updatedAt: permissionData.updatedAt.toDate(),
      };

      // 감사 로그 작성
      await logPermissionChange('GRANTED', createdPermission);

      toast.success('프로젝트 권한이 부여되었습니다.');
      return createdPermission;
    } catch (error) {
      logger.error('프로젝트 권한 부여 실패:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : '프로젝트 권한 부여에 실패했습니다.'
      );
      throw error;
    }
  };

  // 프로젝트 권한 업데이트
  const updatePermission = async (
    input: UpdateProjectPermissionInput
  ): Promise<void> => {
    if (!user) throw new Error('사용자가 로그인되어 있지 않습니다');

    try {
      const permissionRef = doc(
        db,
        FIRESTORE_COLLECTIONS.PROJECT_PERMISSIONS,
        input.id
      );
      const updateData: any = {
        updatedAt: Timestamp.now(),
      };

      const existingPermission = permissions.find(p => p.id === input.id);
      if (!existingPermission) {
        throw new Error('권한을 찾을 수 없습니다.');
      }

      if (input.role !== undefined) updateData.role = input.role;
      if (input.permissions !== undefined)
        updateData.permissions = input.permissions;
      if (input.expiresAt !== undefined) {
        updateData.expiresAt = input.expiresAt
          ? Timestamp.fromDate(input.expiresAt)
          : null;
      }
      if (input.isActive !== undefined) updateData.isActive = input.isActive;

      await updateDoc(permissionRef, updateData);

      // 감사 로그 작성
      await logPermissionChange('MODIFIED', existingPermission, updateData);

      toast.success('프로젝트 권한이 업데이트되었습니다.');
    } catch (error) {
      logger.error('프로젝트 권한 업데이트 실패:', error);
      toast.error('프로젝트 권한 업데이트에 실패했습니다.');
      throw error;
    }
  };

  // 프로젝트 권한 취소
  const revokePermission = async (permissionId: string): Promise<void> => {
    if (!user) throw new Error('사용자가 로그인되어 있지 않습니다');

    try {
      const existingPermission = permissions.find(p => p.id === permissionId);
      if (!existingPermission) {
        throw new Error('권한을 찾을 수 없습니다.');
      }

      const permissionRef = doc(
        db,
        FIRESTORE_COLLECTIONS.PROJECT_PERMISSIONS,
        permissionId
      );
      await updateDoc(permissionRef, {
        isActive: false,
        updatedAt: Timestamp.now(),
      });

      // 감사 로그 작성
      await logPermissionChange('REVOKED', existingPermission);

      toast.success('프로젝트 권한이 취소되었습니다.');
    } catch (error) {
      logger.error('프로젝트 권한 취소 실패:', error);
      toast.error('프로젝트 권한 취소에 실패했습니다.');
      throw error;
    }
  };

  // 권한 변경 로그 작성
  const logPermissionChange = async (
    action: 'GRANTED' | 'REVOKED' | 'MODIFIED',
    permission: ProjectPermission,
    newData?: any
  ) => {
    try {
      const logData = {
        action,
        resourceType: 'PROJECT',
        resourceId: permission.projectId,
        userId: permission.userId,
        grantedBy: user!.id,
        previousPermissions: permission.permissions,
        newPermissions: newData?.permissions || permission.permissions,
        reason: `권한 ${action === 'GRANTED' ? '부여' : action === 'REVOKED' ? '취소' : '수정'}`,
        createdAt: Timestamp.now(),
      };

      await addDoc(
        collection(db, FIRESTORE_COLLECTIONS.PERMISSION_AUDIT_LOG),
        logData
      );
    } catch (error) {
      logger.error('권한 변경 로그 작성 실패:', error);
      // 로그 작성 실패는 주요 작업을 방해하지 않음
    }
  };

  // 사용자별 권한 조회
  const getUserPermission = (userId: string): ProjectPermission | null => {
    return permissions.find(p => p.userId === userId && p.isActive) || null;
  };

  // 역할별 권한 조회
  const getPermissionsByRole = (role: ProjectRole): ProjectPermission[] => {
    return permissions.filter(p => p.role === role && p.isActive);
  };

  // 만료된 권한 조회
  const getExpiredPermissions = (): ProjectPermission[] => {
    const now = new Date();
    return permissions.filter(
      p => p.isActive && p.expiresAt && p.expiresAt < now
    );
  };

  // 곧 만료될 권한 조회 (7일 내)
  const getExpiringPermissions = (): ProjectPermission[] => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return permissions.filter(
      p =>
        p.isActive &&
        p.expiresAt &&
        p.expiresAt > now &&
        p.expiresAt <= sevenDaysFromNow
    );
  };

  // 권한 통계
  const getPermissionStats = () => {
    const totalPermissions = permissions.filter(p => p.isActive).length;
    const roleStats = {
      [ProjectRole.PROJECT_MANAGER]: getPermissionsByRole(
        ProjectRole.PROJECT_MANAGER
      ).length,
      [ProjectRole.PROJECT_LEAD]: getPermissionsByRole(ProjectRole.PROJECT_LEAD)
        .length,
      [ProjectRole.CONTRIBUTOR]: getPermissionsByRole(ProjectRole.CONTRIBUTOR)
        .length,
      [ProjectRole.OBSERVER]: getPermissionsByRole(ProjectRole.OBSERVER).length,
    };
    const expiredCount = getExpiredPermissions().length;
    const expiringCount = getExpiringPermissions().length;

    return {
      totalPermissions,
      roleStats,
      expiredCount,
      expiringCount,
    };
  };

  // 대량 권한 부여
  const grantBulkPermissions = async (
    inputs: CreateProjectPermissionInput[]
  ): Promise<void> => {
    if (!user) throw new Error('사용자가 로그인되어 있지 않습니다');

    try {
      const batch = writeBatch(db);
      const now = Timestamp.now();

      inputs.forEach(input => {
        const permissionRef = doc(
          collection(db, FIRESTORE_COLLECTIONS.PROJECT_PERMISSIONS)
        );
        const permissionData = {
          id: permissionRef.id,
          projectId: input.projectId,
          userId: input.userId,
          role: input.role,
          permissions: input.permissions || [],
          grantedBy: user.id,
          grantedAt: now,
          expiresAt: input.expiresAt
            ? Timestamp.fromDate(input.expiresAt)
            : null,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        };

        batch.set(permissionRef, permissionData);
      });

      await batch.commit();
      toast.success(`${inputs.length}명에게 프로젝트 권한이 부여되었습니다.`);
    } catch (error) {
      logger.error('대량 권한 부여 실패:', error);
      toast.error('대량 권한 부여에 실패했습니다.');
      throw error;
    }
  };

  return {
    permissions,
    loading,
    error,
    grantPermission,
    updatePermission,
    revokePermission,
    getUserPermission,
    getPermissionsByRole,
    getExpiredPermissions,
    getExpiringPermissions,
    getPermissionStats,
    grantBulkPermissions,
  };
};
