import { 
  PermissionAction, 
  ResourceType, 
  TeamRole, 
  ProjectRole, 
  TaskRole,
  Permission,
  PermissionConditions 
} from '../types/team';

/**
 * 권한 관련 유틸리티 함수들
 */

// 권한 액션에 대한 한국어 라벨
export const getActionLabel = (action: PermissionAction): string => {
  const labels: Record<PermissionAction, string> = {
    [PermissionAction.CREATE]: '생성',
    [PermissionAction.READ]: '조회',
    [PermissionAction.UPDATE]: '수정',
    [PermissionAction.DELETE]: '삭제',
    [PermissionAction.ASSIGN]: '배정',
    [PermissionAction.COMMENT]: '댓글',
    [PermissionAction.COMPLETE]: '완료',
    [PermissionAction.MANAGE_PERMISSIONS]: '권한 관리',
  };
  return labels[action] || action;
};

// 리소스 타입에 대한 한국어 라벨
export const getResourceTypeLabel = (resourceType: ResourceType): string => {
  const labels: Record<ResourceType, string> = {
    [ResourceType.TEAM]: '팀',
    [ResourceType.PROJECT]: '프로젝트',
    [ResourceType.TASK]: '작업',
  };
  return labels[resourceType] || resourceType;
};

// 팀 역할에 대한 한국어 라벨
export const getTeamRoleLabel = (role: TeamRole): string => {
  const labels: Record<TeamRole, string> = {
    [TeamRole.OWNER]: '소유자',
    [TeamRole.ADMIN]: '관리자',
    [TeamRole.EDITOR]: '편집자',
    [TeamRole.VIEWER]: '조회자',
  };
  return labels[role] || role;
};

// 프로젝트 역할에 대한 한국어 라벨
export const getProjectRoleLabel = (role: ProjectRole): string => {
  const labels: Record<ProjectRole, string> = {
    [ProjectRole.PROJECT_MANAGER]: '프로젝트 매니저',
    [ProjectRole.PROJECT_LEAD]: '프로젝트 리드',
    [ProjectRole.CONTRIBUTOR]: '기여자',
    [ProjectRole.OBSERVER]: '관찰자',
  };
  return labels[role] || role;
};

// 작업 역할에 대한 한국어 라벨
export const getTaskRoleLabel = (role: TaskRole): string => {
  const labels: Record<TaskRole, string> = {
    [TaskRole.ASSIGNEE]: '담당자',
    [TaskRole.REVIEWER]: '리뷰어',
    [TaskRole.COLLABORATOR]: '협업자',
    [TaskRole.WATCHER]: '관찰자',
  };
  return labels[role] || role;
};

// 역할 계층 구조 정의
export const getRoleHierarchy = (resourceType: ResourceType): string[] => {
  switch (resourceType) {
    case ResourceType.TEAM:
      return [TeamRole.VIEWER, TeamRole.EDITOR, TeamRole.ADMIN, TeamRole.OWNER];
    case ResourceType.PROJECT:
      return [ProjectRole.OBSERVER, ProjectRole.CONTRIBUTOR, ProjectRole.PROJECT_LEAD, ProjectRole.PROJECT_MANAGER];
    case ResourceType.TASK:
      return [TaskRole.WATCHER, TaskRole.COLLABORATOR, TaskRole.REVIEWER, TaskRole.ASSIGNEE];
    default:
      return [];
  }
};

// 역할 레벨 비교
export const compareRoles = (role1: string, role2: string, resourceType: ResourceType): number => {
  const hierarchy = getRoleHierarchy(resourceType);
  const level1 = hierarchy.indexOf(role1);
  const level2 = hierarchy.indexOf(role2);
  
  if (level1 === -1 || level2 === -1) return 0;
  return level1 - level2;
};

// 상위 역할인지 확인
export const isHigherRole = (role1: string, role2: string, resourceType: ResourceType): boolean => {
  return compareRoles(role1, role2, resourceType) > 0;
};

// 권한 조건 확인
export const checkPermissionConditions = (
  conditions: PermissionConditions | undefined,
  context: {
    currentTime?: Date;
    userAttributes?: Record<string, any>;
    resourceAttributes?: Record<string, any>;
  }
): boolean => {
  if (!conditions) return true;

  const { currentTime = new Date(), userAttributes = {}, resourceAttributes = {} } = context;

  // 시간 기반 조건 확인
  if (conditions.timeRestriction) {
    const { startTime, endTime, allowedDays } = conditions.timeRestriction;
    
    if (startTime && endTime) {
      const currentHour = currentTime.getHours();
      const currentMinute = currentTime.getMinutes();
      const currentTimeMinutes = currentHour * 60 + currentMinute;
      
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      const startTimeMinutes = startHour * 60 + startMin;
      const endTimeMinutes = endHour * 60 + endMin;
      
      if (currentTimeMinutes < startTimeMinutes || currentTimeMinutes > endTimeMinutes) {
        return false;
      }
    }
    
    if (allowedDays && allowedDays.length > 0) {
      const currentDay = currentTime.getDay(); // 0 = Sunday, 1 = Monday, ...
      if (!allowedDays.includes(currentDay)) {
        return false;
      }
    }
  }

  // IP 제한 확인
  if (conditions.ipRestriction && conditions.ipRestriction.length > 0) {
    const userIp = userAttributes.ip;
    if (!userIp || !conditions.ipRestriction.some(allowedIp => 
      userIp.match(new RegExp(allowedIp.replace('*', '.*')))
    )) {
      return false;
    }
  }

  // 사용자 속성 기반 조건 확인
  if (conditions.userAttributeRequirements) {
    for (const [key, value] of Object.entries(conditions.userAttributeRequirements)) {
      if (userAttributes[key] !== value) {
        return false;
      }
    }
  }

  // 리소스 상태 기반 조건 확인
  if (conditions.resourceStateRequirements) {
    for (const [key, value] of Object.entries(conditions.resourceStateRequirements)) {
      if (resourceAttributes[key] !== value) {
        return false;
      }
    }
  }

  return true;
};

// 권한 만료 확인
export const isPermissionExpired = (permission: Permission): boolean => {
  if (!permission.conditions?.expiresAt) return false;
  return new Date() > permission.conditions.expiresAt;
};

// 권한 곧 만료 확인 (7일 내)
export const isPermissionExpiringSoon = (permission: Permission, days: number = 7): boolean => {
  if (!permission.conditions?.expiresAt) return false;
  const expiryDate = permission.conditions.expiresAt;
  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + days);
  return expiryDate <= warningDate && expiryDate > new Date();
};

// 권한 충돌 감지
export const detectPermissionConflicts = (permissions: Permission[]): Permission[] => {
  const conflicts: Permission[] = [];
  
  for (let i = 0; i < permissions.length; i++) {
    for (let j = i + 1; j < permissions.length; j++) {
      const perm1 = permissions[i];
      const perm2 = permissions[j];
      
      // 같은 리소스, 같은 액션에 대해 서로 다른 권한 부여
      if (
        perm1.resource === perm2.resource &&
        perm1.action === perm2.action &&
        perm1.granted !== perm2.granted
      ) {
        conflicts.push(perm1, perm2);
      }
    }
  }
  
  return [...new Set(conflicts)]; // 중복 제거
};

// 권한 상속 계산
export const calculateInheritedPermissions = (
  teamRole?: TeamRole,
  projectRole?: ProjectRole,
  taskRole?: TaskRole,
  explicitPermissions: Permission[] = []
): Permission[] => {
  const inheritedPermissions: Permission[] = [];
  
  // 팀 레벨 권한 상속
  if (teamRole) {
    const teamPermissions = getDefaultPermissionsForTeamRole(teamRole);
    inheritedPermissions.push(...teamPermissions);
  }
  
  // 프로젝트 레벨 권한 상속 (팀 권한을 오버라이드)
  if (projectRole) {
    const projectPermissions = getDefaultPermissionsForProjectRole(projectRole);
    inheritedPermissions.push(...projectPermissions);
  }
  
  // 작업 레벨 권한 상속 (프로젝트 권한을 오버라이드)
  if (taskRole) {
    const taskPermissions = getDefaultPermissionsForTaskRole(taskRole);
    inheritedPermissions.push(...taskPermissions);
  }
  
  // 명시적 권한으로 최종 오버라이드
  const finalPermissions = [...inheritedPermissions];
  
  explicitPermissions.forEach(explicitPerm => {
    const existingIndex = finalPermissions.findIndex(
      perm => perm.resource === explicitPerm.resource && perm.action === explicitPerm.action
    );
    
    if (existingIndex >= 0) {
      finalPermissions[existingIndex] = explicitPerm;
    } else {
      finalPermissions.push(explicitPerm);
    }
  });
  
  return finalPermissions;
};

// 팀 역할의 기본 권한 반환
export const getDefaultPermissionsForTeamRole = (role: TeamRole): Permission[] => {
  const basePermissions: Record<TeamRole, Array<{ resource: ResourceType; action: PermissionAction; granted: boolean }>> = {
    [TeamRole.OWNER]: [
      { resource: ResourceType.TEAM, action: PermissionAction.CREATE, granted: true },
      { resource: ResourceType.TEAM, action: PermissionAction.READ, granted: true },
      { resource: ResourceType.TEAM, action: PermissionAction.UPDATE, granted: true },
      { resource: ResourceType.TEAM, action: PermissionAction.DELETE, granted: true },
      { resource: ResourceType.TEAM, action: PermissionAction.MANAGE_PERMISSIONS, granted: true },
    ],
    [TeamRole.ADMIN]: [
      { resource: ResourceType.TEAM, action: PermissionAction.CREATE, granted: true },
      { resource: ResourceType.TEAM, action: PermissionAction.READ, granted: true },
      { resource: ResourceType.TEAM, action: PermissionAction.UPDATE, granted: true },
      { resource: ResourceType.TEAM, action: PermissionAction.DELETE, granted: false },
      { resource: ResourceType.TEAM, action: PermissionAction.MANAGE_PERMISSIONS, granted: true },
    ],
    [TeamRole.EDITOR]: [
      { resource: ResourceType.TEAM, action: PermissionAction.CREATE, granted: true },
      { resource: ResourceType.TEAM, action: PermissionAction.READ, granted: true },
      { resource: ResourceType.TEAM, action: PermissionAction.UPDATE, granted: true },
      { resource: ResourceType.TEAM, action: PermissionAction.DELETE, granted: false },
      { resource: ResourceType.TEAM, action: PermissionAction.MANAGE_PERMISSIONS, granted: false },
    ],
    [TeamRole.VIEWER]: [
      { resource: ResourceType.TEAM, action: PermissionAction.CREATE, granted: false },
      { resource: ResourceType.TEAM, action: PermissionAction.READ, granted: true },
      { resource: ResourceType.TEAM, action: PermissionAction.UPDATE, granted: false },
      { resource: ResourceType.TEAM, action: PermissionAction.DELETE, granted: false },
      { resource: ResourceType.TEAM, action: PermissionAction.MANAGE_PERMISSIONS, granted: false },
    ],
  };
  
  return basePermissions[role].map(perm => ({
    resource: perm.resource,
    action: perm.action,
    granted: perm.granted,
  }));
};

// 프로젝트 역할의 기본 권한 반환
export const getDefaultPermissionsForProjectRole = (role: ProjectRole): Permission[] => {
  // 프로젝트 역할별 기본 권한 정의
  // 실제 구현에서는 더 세밀한 권한 설정이 필요
  return [];
};

// 작업 역할의 기본 권한 반환
export const getDefaultPermissionsForTaskRole = (role: TaskRole): Permission[] => {
  // 작업 역할별 기본 권한 정의
  // 실제 구현에서는 더 세밀한 권한 설정이 필요
  return [];
};

// 권한 요약 생성
export const generatePermissionSummary = (permissions: Permission[]): {
  granted: number;
  denied: number;
  byResource: Record<ResourceType, { granted: number; denied: number }>;
  byAction: Record<PermissionAction, { granted: number; denied: number }>;
} => {
  const summary = {
    granted: 0,
    denied: 0,
    byResource: {} as Record<ResourceType, { granted: number; denied: number }>,
    byAction: {} as Record<PermissionAction, { granted: number; denied: number }>,
  };
  
  permissions.forEach(permission => {
    if (permission.granted) {
      summary.granted++;
    } else {
      summary.denied++;
    }
    
    // 리소스별 집계
    if (!summary.byResource[permission.resource]) {
      summary.byResource[permission.resource] = { granted: 0, denied: 0 };
    }
    if (permission.granted) {
      summary.byResource[permission.resource].granted++;
    } else {
      summary.byResource[permission.resource].denied++;
    }
    
    // 액션별 집계
    if (!summary.byAction[permission.action]) {
      summary.byAction[permission.action] = { granted: 0, denied: 0 };
    }
    if (permission.granted) {
      summary.byAction[permission.action].granted++;
    } else {
      summary.byAction[permission.action].denied++;
    }
  });
  
  return summary;
};