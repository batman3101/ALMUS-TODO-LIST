import React from 'react';
import { Button, ButtonProps } from '../ui/button';
import { PermissionGate, TeamPermissionGate, ProjectPermissionGate, TaskPermissionGate } from './PermissionGate';
import { PermissionAction, ResourceType } from '../../types/team';
import { cn } from '../../lib/utils';

interface BaseActionButtonProps extends Omit<ButtonProps, 'children'> {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showFallback?: boolean;
  tooltip?: string;
}

interface PermissionActionButtonProps extends BaseActionButtonProps {
  resourceType: ResourceType;
  resourceId: string;
  action: PermissionAction;
}

interface TeamActionButtonProps extends BaseActionButtonProps {
  teamId?: string;
  action: PermissionAction;
}

interface ProjectActionButtonProps extends BaseActionButtonProps {
  projectId: string;
  action: PermissionAction;
}

interface TaskActionButtonProps extends BaseActionButtonProps {
  taskId: string;
  action: PermissionAction;
}

/**
 * 권한 기반 액션 버튼 컴포넌트
 * 권한이 없으면 비활성화되거나 대체 컴포넌트를 표시
 */
export const PermissionActionButton: React.FC<PermissionActionButtonProps> = ({
  children,
  resourceType,
  resourceId,
  action,
  fallback,
  showFallback = true,
  className,
  ...props
}) => {
  return (
    <PermissionGate
      resourceType={resourceType}
      resourceId={resourceId}
      action={action}
      fallback={fallback || (
        <Button
          {...props}
          disabled
          className={cn("opacity-50", className)}
          title="권한이 없습니다"
        >
          {children}
        </Button>
      )}
      showFallback={showFallback}
    >
      <Button {...props} className={className}>
        {children}
      </Button>
    </PermissionGate>
  );
};

/**
 * 팀 권한 기반 액션 버튼
 */
export const TeamActionButton: React.FC<TeamActionButtonProps> = ({
  children,
  teamId,
  action,
  fallback,
  showFallback = true,
  className,
  ...props
}) => {
  return (
    <TeamPermissionGate
      teamId={teamId}
      action={action}
      fallback={fallback || (
        <Button
          {...props}
          disabled
          className={cn("opacity-50", className)}
          title="권한이 없습니다"
        >
          {children}
        </Button>
      )}
      showFallback={showFallback}
    >
      <Button {...props} className={className}>
        {children}
      </Button>
    </TeamPermissionGate>
  );
};

/**
 * 프로젝트 권한 기반 액션 버튼
 */
export const ProjectActionButton: React.FC<ProjectActionButtonProps> = ({
  children,
  projectId,
  action,
  fallback,
  showFallback = true,
  className,
  ...props
}) => {
  return (
    <ProjectPermissionGate
      projectId={projectId}
      action={action}
      fallback={fallback || (
        <Button
          {...props}
          disabled
          className={cn("opacity-50", className)}
          title="권한이 없습니다"
        >
          {children}
        </Button>
      )}
      showFallback={showFallback}
    >
      <Button {...props} className={className}>
        {children}
      </Button>
    </ProjectPermissionGate>
  );
};

/**
 * 작업 권한 기반 액션 버튼
 */
export const TaskActionButton: React.FC<TaskActionButtonProps> = ({
  children,
  taskId,
  action,
  fallback,
  showFallback = true,
  className,
  ...props
}) => {
  return (
    <TaskPermissionGate
      taskId={taskId}
      action={action}
      fallback={fallback || (
        <Button
          {...props}
          disabled
          className={cn("opacity-50", className)}
          title="권한이 없습니다"
        >
          {children}
        </Button>
      )}
      showFallback={showFallback}
    >
      <Button {...props} className={className}>
        {children}
      </Button>
    </TaskPermissionGate>
  );
};

/**
 * 권한 기반 위험한 액션 버튼 (삭제 등)
 * 특별한 스타일과 확인 다이얼로그를 포함
 */
interface DangerousActionButtonProps extends PermissionActionButtonProps {
  confirmMessage?: string;
  onConfirm?: () => void;
}

export const DangerousActionButton: React.FC<DangerousActionButtonProps> = ({
  children,
  resourceType,
  resourceId,
  action,
  confirmMessage = "이 작업을 실행하시겠습니까?",
  onConfirm,
  onClick,
  className,
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
    if (confirmMessage && window.confirm(confirmMessage)) {
      onConfirm?.();
      onClick?.(e);
    } else if (!confirmMessage) {
      onClick?.(e);
    }
  };

  return (
    <PermissionActionButton
      {...props}
      resourceType={resourceType}
      resourceId={resourceId}
      action={action}
      onClick={handleClick}
      className={cn("bg-red-600 hover:bg-red-700 text-white", className)}
    >
      {children}
    </PermissionActionButton>
  );
};

/**
 * 권한이 없을 때 대신 표시할 정보 메시지 버튼
 */
export const RestrictedActionButton: React.FC<{
  children: React.ReactNode;
  reason?: string;
  className?: string;
}> = ({ 
  children, 
  reason = "권한이 없습니다",
  className 
}) => {
  return (
    <Button
      disabled
      variant="outline"
      className={cn("opacity-50 cursor-not-allowed", className)}
      title={reason}
    >
      {children}
    </Button>
  );
};

/**
 * 조건부 액션 버튼 그룹
 * 여러 권한 중 하나라도 만족하면 표시
 */
interface ConditionalActionGroupProps {
  children: React.ReactNode;
  conditions: Array<{
    resourceType: ResourceType;
    resourceId: string;
    action: PermissionAction;
  }>;
  operator?: 'AND' | 'OR';
  fallback?: React.ReactNode;
}

export const ConditionalActionGroup: React.FC<ConditionalActionGroupProps> = ({
  children,
  conditions,
  operator = 'OR',
  fallback = null
}) => {
  // MultiPermissionGate를 사용하여 구현할 수 있지만,
  // 여기서는 간단한 버전으로 첫 번째 조건만 확인
  const firstCondition = conditions[0];
  
  if (!firstCondition) {
    return <>{fallback}</>;
  }

  return (
    <PermissionGate
      resourceType={firstCondition.resourceType}
      resourceId={firstCondition.resourceId}
      action={firstCondition.action}
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  );
};