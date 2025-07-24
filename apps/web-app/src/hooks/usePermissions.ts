import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './useAuth';
import {
  Permission,
  ProjectPermission,
  TaskPermission,
  ProjectRole,
  TaskRole,
  TeamRole,
  PermissionAction,
  ResourceType,
  FIRESTORE_COLLECTIONS,
} from '../types/team';

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

const PROJECT_PERMISSIONS: Record<ProjectRole, Record<PermissionAction, boolean>> = {
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
  hasProjectPermission: (action: PermissionAction, projectId: string) => boolean;
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
  const [projectPermissions, setProjectPermissions] = useState<ProjectPermission[]>([]);
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

    const unsubscribes: (() => void)[] = [];

    // 프로젝트 권한 구독
    const projectPermissionsQuery = query(
      collection(db, FIRESTORE_COLLECTIONS.PROJECT_PERMISSIONS),
      where('userId', '==', user.id),
      where('isActive', '==', true)
    );

    const unsubscribeProjects = onSnapshot(projectPermissionsQuery, (snapshot) => {
      const permissions = snapshot.docs.map((doc) => {
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
      setProjectPermissions(permissions);
    });

    unsubscribes.push(unsubscribeProjects);

    // 작업 권한 구독
    const taskPermissionsQuery = query(
      collection(db, FIRESTORE_COLLECTIONS.TASK_PERMISSIONS),
      where('userId', '==', user.id),
      where('isActive', '==', true)
    );

    const unsubscribeTasks = onSnapshot(taskPermissionsQuery, (snapshot) => {
      const permissions = snapshot.docs.map((doc) => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          taskId: data.taskId,
          userId: data.userId,
          role: data.role,
          permissions: data.permissions || [],
          grantedBy: data.grantedBy,
          grantedAt: data.grantedAt.toDate(),
          expiresAt: data.expiresAt?.toDate(),
          isActive: data.isActive,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        } as TaskPermission;
      });
      setTaskPermissions(permissions);
      setLoading(false);
    });

    unsubscribes.push(unsubscribeTasks);

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user]);

  // 팀 역할 가져오기
  const getUserTeamRole = (teamId?: string): TeamRole | null => {
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
  const hasTeamPermission = (action: PermissionAction, teamId?: string): boolean => {
    const teamRole = getUserTeamRole(teamId);
    if (!teamRole) return false;
    return TEAM_PERMISSIONS[teamRole][action] || false;
  };

  // 프로젝트 권한 확인
  const hasProjectPermission = (action: PermissionAction, projectId: string): boolean => {
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
  const hasTaskPermission = (action: PermissionAction, taskId: string): boolean => {
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