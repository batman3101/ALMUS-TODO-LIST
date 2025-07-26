import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePermissions } from './usePermissions';
import { PermissionAction, ResourceType } from '../types/team';
import { toast } from '../utils/toast';

interface PermissionGuardOptions {
  resourceType: ResourceType;
  resourceId: string;
  action: PermissionAction;
  redirectTo?: string;
  showToast?: boolean;
  onUnauthorized?: () => void;
}

interface UsePermissionGuardReturn {
  hasPermission: boolean;
  loading: boolean;
  checkPermission: (
    options: Omit<PermissionGuardOptions, 'resourceId'>
  ) => boolean;
}

export const usePermissionGuard = (
  options?: PermissionGuardOptions
): UsePermissionGuardReturn => {
  const { hasPermission: checkPermission, loading } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasPermission, setHasPermission] = useState<boolean>(true);

  useEffect(() => {
    if (!options || loading) return;

    const permitted = checkPermission(
      options.resourceType,
      options.resourceId,
      options.action
    );

    setHasPermission(permitted);

    if (!permitted) {
      // 권한이 없을 때의 처리
      if (options.showToast !== false) {
        const actionLabels: Record<PermissionAction, string> = {
          [PermissionAction.CREATE]: '생성',
          [PermissionAction.READ]: '조회',
          [PermissionAction.UPDATE]: '수정',
          [PermissionAction.DELETE]: '삭제',
          [PermissionAction.ASSIGN]: '배정',
          [PermissionAction.COMMENT]: '댓글',
          [PermissionAction.COMPLETE]: '완료',
          [PermissionAction.MANAGE_PERMISSIONS]: '권한 관리',
        };

        const resourceLabels: Record<ResourceType, string> = {
          [ResourceType.TEAM]: '팀',
          [ResourceType.PROJECT]: '프로젝트',
          [ResourceType.TASK]: '작업',
        };

        toast.error(
          `이 ${resourceLabels[options.resourceType]}에 대한 ${actionLabels[options.action]} 권한이 없습니다.`
        );
      }

      // 커스텀 콜백 실행
      if (options.onUnauthorized) {
        options.onUnauthorized();
      }

      // 리다이렉트 처리
      if (options.redirectTo) {
        navigate(options.redirectTo, {
          state: {
            from: location.pathname,
            reason: 'insufficient_permissions',
          },
        });
      }
    }
  }, [
    options?.resourceType,
    options?.resourceId,
    options?.action,
    loading,
    checkPermission,
    navigate,
    location.pathname,
    options?.redirectTo,
    options?.showToast,
    options?.onUnauthorized,
  ]);

  const checkPermissionDynamic = (
    dynamicOptions: Omit<PermissionGuardOptions, 'resourceId'>
  ) => {
    if (!options?.resourceId) return false;
    return checkPermission(
      dynamicOptions.resourceType,
      options.resourceId,
      dynamicOptions.action
    );
  };

  return {
    hasPermission,
    loading,
    checkPermission: checkPermissionDynamic,
  };
};

// HOC 버전
export const withPermissionGuard = <T extends object>(
  Component: React.ComponentType<T>,
  guardOptions: PermissionGuardOptions
) => {
  return (props: T) => {
    const { hasPermission, loading } = usePermissionGuard(guardOptions);

    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!hasPermission) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-lg font-medium mb-2">접근 권한이 없습니다</h3>
          <p className="text-sm text-center">
            이 리소스에 접근할 수 있는 권한이 없습니다.
            <br />
            관리자에게 권한 부여를 요청해주세요.
          </p>
        </div>
      );
    }

    return <Component {...props} />;
  };
};

// 라우트 가드 훅
export const useRoutePermissionGuard = (
  resourceType: ResourceType,
  resourceId: string,
  requiredAction: PermissionAction
) => {
  const { hasPermission, loading } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    const permitted = hasPermission(resourceType, resourceId, requiredAction);

    if (!permitted) {
      // 이전 페이지로 돌아가거나 홈으로 리다이렉트
      const canGoBack = window.history.length > 1;
      if (canGoBack && location.key !== 'default') {
        navigate(-1);
      } else {
        navigate('/dashboard', {
          state: {
            reason: 'insufficient_permissions',
            attempted: location.pathname,
          },
        });
      }

      toast.error('접근 권한이 없는 페이지입니다.');
    }
  }, [
    hasPermission,
    resourceType,
    resourceId,
    requiredAction,
    loading,
    navigate,
    location,
  ]);

  return {
    hasPermission:
      !loading && hasPermission(resourceType, resourceId, requiredAction),
    loading,
  };
};
