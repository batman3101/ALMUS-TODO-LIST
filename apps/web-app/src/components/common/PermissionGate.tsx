import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { PermissionAction, ResourceType } from '../../types/team';

interface PermissionGateProps {
  children: React.ReactNode;
  resourceType: ResourceType;
  resourceId: string;
  action: PermissionAction;
  fallback?: React.ReactNode;
  showFallback?: boolean;
  inverse?: boolean; // true일 경우 권한이 없을 때 children을 렌더링
}

/**
 * 권한 기반 컴포넌트 렌더링을 위한 게이트
 *
 * 사용 예시:
 * <PermissionGate
 *   resourceType={ResourceType.PROJECT}
 *   resourceId={projectId}
 *   action={PermissionAction.UPDATE}
 * >
 *   <EditButton />
 * </PermissionGate>
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  resourceType,
  resourceId,
  action,
  fallback = null,
  showFallback = true,
  inverse = false,
}) => {
  const { hasPermission, loading } = usePermissions();

  // 로딩 중일 때는 아무것도 렌더링하지 않음
  if (loading) {
    return null;
  }

  const permitted = hasPermission(resourceType, resourceId, action);
  const shouldRender = inverse ? !permitted : permitted;

  if (shouldRender) {
    return <>{children}</>;
  }

  return showFallback ? <>{fallback}</> : null;
};

// 다중 권한 체크를 위한 컴포넌트
interface MultiPermissionGateProps {
  children: React.ReactNode;
  permissions: Array<{
    resourceType: ResourceType;
    resourceId: string;
    action: PermissionAction;
  }>;
  operator?: 'AND' | 'OR'; // 기본값은 'AND'
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

export const MultiPermissionGate: React.FC<MultiPermissionGateProps> = ({
  children,
  permissions,
  operator = 'AND',
  fallback = null,
  showFallback = true,
}) => {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return null;
  }

  const results = permissions.map(({ resourceType, resourceId, action }) =>
    hasPermission(resourceType, resourceId, action)
  );

  const shouldRender =
    operator === 'AND'
      ? results.every(result => result)
      : results.some(result => result);

  if (shouldRender) {
    return <>{children}</>;
  }

  return showFallback ? <>{fallback}</> : null;
};

// 역할 기반 렌더링 컴포넌트
interface RoleGateProps {
  children: React.ReactNode;
  resourceType: ResourceType;
  resourceId: string;
  allowedRoles: string[];
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

export const RoleGate: React.FC<RoleGateProps> = ({
  children,
  resourceType,
  resourceId,
  allowedRoles,
  fallback = null,
  showFallback = true,
}) => {
  const { getUserTeamRole, getUserProjectRole, getUserTaskRole, loading } =
    usePermissions();

  if (loading) {
    return null;
  }

  let userRole: string | null = null;

  switch (resourceType) {
    case ResourceType.TEAM:
      userRole = getUserTeamRole(resourceId);
      break;
    case ResourceType.PROJECT:
      userRole = getUserProjectRole(resourceId);
      break;
    case ResourceType.TASK:
      userRole = getUserTaskRole(resourceId);
      break;
  }

  const hasAllowedRole = userRole && allowedRoles.includes(userRole);

  if (hasAllowedRole) {
    return <>{children}</>;
  }

  return showFallback ? <>{fallback}</> : null;
};

// 팀 권한 전용 게이트
export const TeamPermissionGate: React.FC<{
  children: React.ReactNode;
  teamId?: string;
  action: PermissionAction;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}> = ({ children, teamId, action, fallback, showFallback = true }) => {
  const { hasTeamPermission, loading } = usePermissions();

  if (loading) {
    return null;
  }

  const permitted = hasTeamPermission(action, teamId);

  if (permitted) {
    return <>{children}</>;
  }

  return showFallback ? <>{fallback}</> : null;
};

// 프로젝트 권한 전용 게이트
export const ProjectPermissionGate: React.FC<{
  children: React.ReactNode;
  projectId: string;
  action: PermissionAction;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}> = ({ children, projectId, action, fallback, showFallback = true }) => {
  const { hasProjectPermission, loading } = usePermissions();

  if (loading) {
    return null;
  }

  const permitted = hasProjectPermission(action, projectId);

  if (permitted) {
    return <>{children}</>;
  }

  return showFallback ? <>{fallback}</> : null;
};

// 작업 권한 전용 게이트
export const TaskPermissionGate: React.FC<{
  children: React.ReactNode;
  taskId: string;
  action: PermissionAction;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}> = ({ children, taskId, action, fallback, showFallback = true }) => {
  const { hasTaskPermission, loading } = usePermissions();

  if (loading) {
    return null;
  }

  const permitted = hasTaskPermission(action, taskId);

  if (permitted) {
    return <>{children}</>;
  }

  return showFallback ? <>{fallback}</> : null;
};

// 권한 기반 조건부 렌더링을 위한 유틸리티 컴포넌트
export const ConditionalRender: React.FC<{
  condition: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ condition, children, fallback = null }) => {
  return condition ? <>{children}</> : <>{fallback}</>;
};
