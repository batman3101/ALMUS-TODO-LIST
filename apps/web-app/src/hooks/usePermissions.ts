import { useState, useEffect } from 'react';
import { logger } from '../utils/logger';
import { supabase } from '@lib/supabase/client';
import { useAuth } from './useAuth';
import {
  ProjectPermission,
  TaskPermission,
  ProjectRole,
  TaskRole,
  PermissionAction,
  ResourceType,
} from '../types/team';
import { TeamRole } from '@almus/shared-types';

// 권한 매트릭스 정의
const TEAM_PERMISSIONS: Record<TeamRole, Record<PermissionAction, boolean>> = {
  [TeamRole.OWNER]: {
    [PermissionAction.CREATE]: true,
    [PermissionAction.READ]: true,
    [PermissionAction.UPDATE]: true,
    [PermissionAction.DELETE]: true,
    [PermissionAction.ASSIGN]: true,
    [PermissionAction.COMMENT]: true,
    [PermissionAction.COMPLETE]: true,
    [PermissionAction.MANAGE_PERMISSIONS]: true,
  },
  [TeamRole.ADMIN]: {
    [PermissionAction.CREATE]: true,
    [PermissionAction.READ]: true,
    [PermissionAction.UPDATE]: true,
    [PermissionAction.DELETE]: false,
    [PermissionAction.ASSIGN]: true,
    [PermissionAction.COMMENT]: true,
    [PermissionAction.COMPLETE]: true,
    [PermissionAction.MANAGE_PERMISSIONS]: true,
  },
  [TeamRole.EDITOR]: {
    [PermissionAction.CREATE]: true,
    [PermissionAction.READ]: true,
    [PermissionAction.UPDATE]: true,
    [PermissionAction.DELETE]: false,
    [PermissionAction.ASSIGN]: false,
    [PermissionAction.COMMENT]: true,
    [PermissionAction.COMPLETE]: true,
    [PermissionAction.MANAGE_PERMISSIONS]: false,
  },
  [TeamRole.VIEWER]: {
    [PermissionAction.CREATE]: false,
    [PermissionAction.READ]: true,
    [PermissionAction.UPDATE]: false,
    [PermissionAction.DELETE]: false,
    [PermissionAction.ASSIGN]: false,
    [PermissionAction.COMMENT]: true,
    [PermissionAction.COMPLETE]: false,
    [PermissionAction.MANAGE_PERMISSIONS]: false,
  },
};

const PROJECT_PERMISSIONS: Record<
  ProjectRole,
  Record<PermissionAction, boolean>
> = {
  [ProjectRole.PROJECT_MANAGER]: {
    [PermissionAction.CREATE]: true,
    [PermissionAction.READ]: true,
    [PermissionAction.UPDATE]: true,
    [PermissionAction.DELETE]: true,
    [PermissionAction.ASSIGN]: true,
    [PermissionAction.COMMENT]: true,
    [PermissionAction.COMPLETE]: true,
    [PermissionAction.MANAGE_PERMISSIONS]: true,
  },
  [ProjectRole.PROJECT_LEAD]: {
    [PermissionAction.CREATE]: true,
    [PermissionAction.READ]: true,
    [PermissionAction.UPDATE]: true,
    [PermissionAction.DELETE]: false,
    [PermissionAction.ASSIGN]: true,
    [PermissionAction.COMMENT]: true,
    [PermissionAction.COMPLETE]: true,
    [PermissionAction.MANAGE_PERMISSIONS]: false,
  },
  [ProjectRole.CONTRIBUTOR]: {
    [PermissionAction.CREATE]: true,
    [PermissionAction.READ]: true,
    [PermissionAction.UPDATE]: true,
    [PermissionAction.DELETE]: false,
    [PermissionAction.ASSIGN]: false,
    [PermissionAction.COMMENT]: true,
    [PermissionAction.COMPLETE]: true,
    [PermissionAction.MANAGE_PERMISSIONS]: false,
  },
  [ProjectRole.OBSERVER]: {
    [PermissionAction.CREATE]: false,
    [PermissionAction.READ]: true,
    [PermissionAction.UPDATE]: false,
    [PermissionAction.DELETE]: false,
    [PermissionAction.ASSIGN]: false,
    [PermissionAction.COMMENT]: true,
    [PermissionAction.COMPLETE]: false,
    [PermissionAction.MANAGE_PERMISSIONS]: false,
  },
};

const TASK_PERMISSIONS: Record<TaskRole, Record<PermissionAction, boolean>> = {
  [TaskRole.ASSIGNEE]: {
    [PermissionAction.CREATE]: false,
    [PermissionAction.READ]: true,
    [PermissionAction.UPDATE]: true,
    [PermissionAction.DELETE]: false,
    [PermissionAction.ASSIGN]: false,
    [PermissionAction.COMMENT]: true,
    [PermissionAction.COMPLETE]: true,
    [PermissionAction.MANAGE_PERMISSIONS]: false,
  },
  [TaskRole.REVIEWER]: {
    [PermissionAction.CREATE]: false,
    [PermissionAction.READ]: true,
    [PermissionAction.UPDATE]: true,
    [PermissionAction.DELETE]: false,
    [PermissionAction.ASSIGN]: false,
    [PermissionAction.COMMENT]: true,
    [PermissionAction.COMPLETE]: false,
    [PermissionAction.MANAGE_PERMISSIONS]: false,
  },
  [TaskRole.COLLABORATOR]: {
    [PermissionAction.CREATE]: false,
    [PermissionAction.READ]: true,
    [PermissionAction.UPDATE]: true,
    [PermissionAction.DELETE]: false,
    [PermissionAction.ASSIGN]: false,
    [PermissionAction.COMMENT]: true,
    [PermissionAction.COMPLETE]: false,
    [PermissionAction.MANAGE_PERMISSIONS]: false,
  },
  [TaskRole.WATCHER]: {
    [PermissionAction.CREATE]: false,
    [PermissionAction.READ]: true,
    [PermissionAction.UPDATE]: false,
    [PermissionAction.DELETE]: false,
    [PermissionAction.ASSIGN]: false,
    [PermissionAction.COMMENT]: true,
    [PermissionAction.COMPLETE]: false,
    [PermissionAction.MANAGE_PERMISSIONS]: false,
  },
};

interface UsePermissionsReturn {
  // 권한 확인 함수들
  hasPermission: (
    resourceType: ResourceType,
    resourceId: string,
    action: PermissionAction
  ) => boolean;
  hasTeamPermission: (action: PermissionAction, teamId?: string) => boolean;
  hasProjectPermission: (
    action: PermissionAction,
    projectId: string
  ) => boolean;
  hasTaskPermission: (action: PermissionAction, taskId: string) => boolean;

  // 권한 데이터
  projectPermissions: ProjectPermission[];
  taskPermissions: TaskPermission[];
  loading: boolean;

  // 유틸리티 함수들
  getUserTeamRole: (teamId?: string) => TeamRole | null;
  getUserProjectRole: (projectId: string) => ProjectRole | null;
  getUserTaskRole: (taskId: string) => TaskRole | null;
  canManageProjectPermissions: (projectId: string) => boolean;
  canManageTaskPermissions: (taskId: string) => boolean;
}

export const usePermissions = (): UsePermissionsReturn => {
  const { user } = useAuth();
  const [projectPermissions, setProjectPermissions] = useState<
    ProjectPermission[]
  >([]);
  const [taskPermissions, setTaskPermissions] = useState<TaskPermission[]>([]);
  const [loading, setLoading] = useState(true);

  // 사용자의 프로젝트 권한 로드
  useEffect(() => {
    if (!user) {
      setProjectPermissions([]);
      setTaskPermissions([]);
      setLoading(false);
      return;
    }

    const loadPermissions = async () => {
      try {
        // 프로젝트 권한 조회
        const { data: projectPerms, error: projectError } = await supabase
          .from('project_permissions')
          .select('*')
          .eq('user_id', user.uid)
          .eq('is_active', true);

        if (projectError) throw projectError;

        // 작업 권한 조회
        const { data: taskPerms, error: taskError } = await supabase
          .from('task_permissions')
          .select('*')
          .eq('user_id', user.uid)
          .eq('is_active', true);

        if (taskError) throw taskError;

        setProjectPermissions(
          projectPerms?.map(perm => ({
            id: perm.id,
            projectId: perm.project_id,
            userId: perm.user_id,
            role: perm.role as ProjectRole,
            permissions: perm.permissions || [],
            grantedBy: perm.granted_by,
            grantedAt: new Date(perm.granted_at),
            expiresAt: perm.expires_at ? new Date(perm.expires_at) : undefined,
            isActive: perm.is_active,
            createdAt: new Date(perm.created_at),
            updatedAt: new Date(perm.updated_at),
          })) || []
        );

        setTaskPermissions(
          taskPerms?.map(perm => ({
            id: perm.id,
            taskId: perm.task_id,
            userId: perm.user_id,
            role: perm.role as TaskRole,
            permissions: perm.permissions || [],
            grantedBy: perm.granted_by,
            grantedAt: new Date(perm.granted_at),
            expiresAt: perm.expires_at ? new Date(perm.expires_at) : undefined,
            isActive: perm.is_active,
            createdAt: new Date(perm.created_at),
            updatedAt: new Date(perm.updated_at),
          })) || []
        );

        // 실시간 권한 변경 구독
        const projectChannel = supabase
          .channel('project-permissions')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'project_permissions',
              filter: `user_id=eq.${user.uid}`,
            },
            () => {
              // 권한이 변경되면 다시 로드
              loadPermissions();
            }
          )
          .subscribe();

        const taskChannel = supabase
          .channel('task-permissions')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'task_permissions',
              filter: `user_id=eq.${user.uid}`,
            },
            () => {
              // 권한이 변경되면 다시 로드
              loadPermissions();
            }
          )
          .subscribe();

        return () => {
          projectChannel.unsubscribe();
          taskChannel.unsubscribe();
        };
      } catch (error) {
        logger.error('Failed to load permissions:', error);
      } finally {
        setLoading(false);
      }
    };

    const cleanup = loadPermissions();
    return () => {
      cleanup?.then(cleanupFn => cleanupFn?.());
    };
  }, [user]);

  // 팀 역할 가져오기
  const getUserTeamRole = (): TeamRole | null => {
    if (!user) return null;
    // useTeams hook에서 가져온 역할 정보 사용
    // 여기서는 간단히 user의 현재 팀 역할을 반환
    return TeamRole.EDITOR; // 임시값, 실제로는 useTeams에서 가져와야 함
  };

  // 프로젝트 역할 가져오기
  const getUserProjectRole = (projectId: string): ProjectRole | null => {
    const permission = projectPermissions.find(p => p.projectId === projectId);
    return permission?.role || null;
  };

  // 작업 역할 가져오기
  const getUserTaskRole = (taskId: string): TaskRole | null => {
    const permission = taskPermissions.find(p => p.taskId === taskId);
    return permission?.role || null;
  };

  // 팀 권한 확인
  const hasTeamPermission = (
    action: PermissionAction,
    teamId?: string
  ): boolean => {
    const teamRole = getUserTeamRole(teamId);
    if (!teamRole) return false;
    return TEAM_PERMISSIONS[teamRole][action] || false;
  };

  // 프로젝트 권한 확인
  const hasProjectPermission = (
    action: PermissionAction,
    projectId: string
  ): boolean => {
    // 1. 팀 레벨 권한 확인
    if (hasTeamPermission(action)) return true;

    // 2. 프로젝트 레벨 권한 확인
    const projectRole = getUserProjectRole(projectId);
    if (projectRole && PROJECT_PERMISSIONS[projectRole][action]) return true;

    // 3. 명시적 권한 확인
    const permission = projectPermissions.find(p => p.projectId === projectId);
    if (permission?.permissions) {
      const explicitPermission = permission.permissions.find(
        p => p.resource === ResourceType.PROJECT && p.action === action
      );
      if (explicitPermission) return explicitPermission.granted;
    }

    return false;
  };

  // 작업 권한 확인
  const hasTaskPermission = (
    action: PermissionAction,
    taskId: string
  ): boolean => {
    // 1. 팀 레벨 권한 확인
    if (hasTeamPermission(action)) return true;

    // 2. 작업 레벨 권한 확인
    const taskRole = getUserTaskRole(taskId);
    if (taskRole && TASK_PERMISSIONS[taskRole][action]) return true;

    // 3. 명시적 권한 확인
    const permission = taskPermissions.find(p => p.taskId === taskId);
    if (permission?.permissions) {
      const explicitPermission = permission.permissions.find(
        p => p.resource === ResourceType.TASK && p.action === action
      );
      if (explicitPermission) return explicitPermission.granted;
    }

    return false;
  };

  // 통합 권한 확인 함수
  const hasPermission = (
    resourceType: ResourceType,
    resourceId: string,
    action: PermissionAction
  ): boolean => {
    switch (resourceType) {
      case ResourceType.TEAM:
        return hasTeamPermission(action, resourceId);
      case ResourceType.PROJECT:
        return hasProjectPermission(action, resourceId);
      case ResourceType.TASK:
        return hasTaskPermission(action, resourceId);
      default:
        return false;
    }
  };

  // 프로젝트 권한 관리 가능 여부
  const canManageProjectPermissions = (projectId: string): boolean => {
    return hasProjectPermission(PermissionAction.MANAGE_PERMISSIONS, projectId);
  };

  // 작업 권한 관리 가능 여부
  const canManageTaskPermissions = (taskId: string): boolean => {
    return hasTaskPermission(PermissionAction.MANAGE_PERMISSIONS, taskId);
  };

  return {
    hasPermission,
    hasTeamPermission,
    hasProjectPermission,
    hasTaskPermission,
    projectPermissions,
    taskPermissions,
    loading,
    getUserTeamRole,
    getUserProjectRole,
    getUserTaskRole,
    canManageProjectPermissions,
    canManageTaskPermissions,
  };
};
