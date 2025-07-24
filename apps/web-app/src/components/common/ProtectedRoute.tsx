import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { PermissionAction, ResourceType } from '../../types/team';
import { toast } from '../../utils/toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredPermission?: {
    resourceType: ResourceType;
    resourceId: string;
    action: PermissionAction;
  };
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * 인증 및 권한 기반 라우트 보호 컴포넌트
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requiredPermission,
  fallback,
  redirectTo = '/login',
}) => {
  const { user, loading: authLoading } = useAuth();
  const { hasPermission, loading: permissionLoading } = usePermissions();
  const location = useLocation();
  const [hasShownToast, setHasShownToast] = useState(false);

  const loading = authLoading || permissionLoading;

  useEffect(() => {
    // 토스트는 한 번만 표시
    setHasShownToast(false);
  }, [location.pathname]);

  // 로딩 중일 때 로딩 화면 표시
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">권한을 확인하는 중...</p>
        </div>
      </div>
    );
  }

  // 인증이 필요한데 로그인하지 않은 경우
  if (requireAuth && !user) {
    if (!hasShownToast) {
      toast.error('로그인이 필요한 페이지입니다.');
      setHasShownToast(true);
    }
    
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location.pathname }}
        replace 
      />
    );
  }

  // 특정 권한이 필요한 경우 권한 확인
  if (requiredPermission && user) {
    const permitted = hasPermission(
      requiredPermission.resourceType,
      requiredPermission.resourceId,
      requiredPermission.action
    );

    if (!permitted) {
      if (!hasShownToast) {
        toast.error('이 페이지에 접근할 권한이 없습니다.');
        setHasShownToast(true);
      }

      // 커스텀 fallback이 있으면 사용, 없으면 기본 권한 없음 페이지
      if (fallback) {
        return <>{fallback}</>;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen text-gray-500">
          <div className="text-8xl mb-6">🔒</div>
          <h1 className="text-2xl font-bold mb-4">접근 권한이 없습니다</h1>
          <p className="text-center mb-6 max-w-md">
            이 페이지에 접근하기 위한 권한이 없습니다.<br />
            관리자에게 권한 부여를 요청하거나 이전 페이지로 돌아가세요.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              이전 페이지로
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              대시보드로
            </button>
          </div>
        </div>
      );
    }
  }

  // 모든 조건을 만족하면 자식 컴포넌트 렌더링
  return <>{children}</>;
};

// 여러 권한 중 하나라도 만족하면 접근 가능한 라우트
interface MultiPermissionRouteProps {
  children: React.ReactNode;
  permissions: Array<{
    resourceType: ResourceType;
    resourceId: string;
    action: PermissionAction;
  }>;
  operator?: 'AND' | 'OR';
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export const MultiPermissionRoute: React.FC<MultiPermissionRouteProps> = ({
  children,
  permissions,
  operator = 'OR',
  fallback,
  redirectTo = '/dashboard',
}) => {
  const { user, loading: authLoading } = useAuth();
  const { hasPermission, loading: permissionLoading } = usePermissions();
  const location = useLocation();

  const loading = authLoading || permissionLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">권한을 확인하는 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate 
        to="/login" 
        state={{ from: location.pathname }}
        replace 
      />
    );
  }

  // 권한 확인
  const permissionResults = permissions.map(({ resourceType, resourceId, action }) =>
    hasPermission(resourceType, resourceId, action)
  );

  const hasRequiredPermission = operator === 'AND' 
    ? permissionResults.every(result => result)
    : permissionResults.some(result => result);

  if (!hasRequiredPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

// 역할 기반 라우트 보호
interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  resourceType: ResourceType;
  resourceId: string;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({
  children,
  allowedRoles,
  resourceType,
  resourceId,
  fallback,
  redirectTo = '/dashboard',
}) => {
  const { user, loading: authLoading } = useAuth();
  const { getUserTeamRole, getUserProjectRole, getUserTaskRole, loading: permissionLoading } = usePermissions();
  const location = useLocation();

  const loading = authLoading || permissionLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate 
        to="/login" 
        state={{ from: location.pathname }}
        replace 
      />
    );
  }

  // 사용자 역할 확인
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

  if (!hasAllowedRole) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

// 팀 관리자만 접근 가능한 라우트
export const AdminOnlyRoute: React.FC<{
  children: React.ReactNode;
  teamId?: string;
  fallback?: React.ReactNode;
}> = ({ children, teamId, fallback }) => {
  return (
    <ProtectedRoute
      requiredPermission={{
        resourceType: ResourceType.TEAM,
        resourceId: teamId || '',
        action: PermissionAction.MANAGE_PERMISSIONS,
      }}
      fallback={fallback}
    >
      {children}
    </ProtectedRoute>
  );
};