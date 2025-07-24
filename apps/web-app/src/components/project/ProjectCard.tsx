import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Calendar,
  Users,
  CheckCircle,
  Circle,
  MoreVertical,
  Edit,
  Trash,
  Settings,
  UserPlus,
  BarChart3,
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import { Project, ProjectStatus, PermissionAction, ResourceType } from '../../types/team';
import { ProjectPermissionGate, PermissionGate } from '../common/PermissionGate';

interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
  onDelete?: (projectId: string) => void;
  onManagePermissions?: (projectId: string) => void;
  onViewAnalytics?: (projectId: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onEdit,
  onDelete,
  onManagePermissions,
  onViewAnalytics,
}) => {
  const [showFullDescription, setShowFullDescription] = useState(false);

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.ACTIVE:
        return 'bg-green-100 text-green-800 border-green-200';
      case ProjectStatus.PLANNING:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case ProjectStatus.ON_HOLD:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case ProjectStatus.COMPLETED:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case ProjectStatus.CANCELLED:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.ACTIVE:
        return '진행중';
      case ProjectStatus.PLANNING:
        return '계획중';
      case ProjectStatus.ON_HOLD:
        return '보류';
      case ProjectStatus.COMPLETED:
        return '완료';
      case ProjectStatus.CANCELLED:
        return '취소';
      default:
        return status;
    }
  };

  const progressPercentage = Math.round(project.progress || 0);
  const isOverdue = project.endDate && project.endDate < new Date() && project.status !== ProjectStatus.COMPLETED;

  return (
    <Card className={cn("h-full transition-all hover:shadow-md", isOverdue && "border-red-200")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate mb-2">
              {project.name}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={getStatusColor(project.status)}>
                {getStatusLabel(project.status)}
              </Badge>
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  지연됨
                </Badge>
              )}
            </div>
          </div>
          
          {/* 권한 기반 액션 메뉴 */}
          <PermissionGate
            resourceType={ResourceType.PROJECT}
            resourceId={project.id}
            action={PermissionAction.UPDATE}
            fallback={null}
            showFallback={false}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* 프로젝트 수정 - UPDATE 권한 필요 */}
                <ProjectPermissionGate
                  projectId={project.id}
                  action={PermissionAction.UPDATE}
                >
                  <DropdownMenuItem
                    onClick={() => onEdit?.(project)}
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    프로젝트 수정
                  </DropdownMenuItem>
                </ProjectPermissionGate>

                {/* 분석 보기 - READ 권한 필요 */}
                <ProjectPermissionGate
                  projectId={project.id}
                  action={PermissionAction.READ}
                >
                  <DropdownMenuItem
                    onClick={() => onViewAnalytics?.(project.id)}
                    className="flex items-center gap-2"
                  >
                    <BarChart3 className="h-4 w-4" />
                    분석 보기
                  </DropdownMenuItem>
                </ProjectPermissionGate>

                <DropdownMenuSeparator />

                {/* 권한 관리 - MANAGE_PERMISSIONS 권한 필요 */}
                <ProjectPermissionGate
                  projectId={project.id}
                  action={PermissionAction.MANAGE_PERMISSIONS}
                >
                  <DropdownMenuItem
                    onClick={() => onManagePermissions?.(project.id)}
                    className="flex items-center gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    권한 관리
                  </DropdownMenuItem>
                </ProjectPermissionGate>

                {/* 프로젝트 삭제 - DELETE 권한 필요 */}
                <ProjectPermissionGate
                  projectId={project.id}
                  action={PermissionAction.DELETE}
                >
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete?.(project.id)}
                    className="flex items-center gap-2 text-red-600"
                  >
                    <Trash className="h-4 w-4" />
                    프로젝트 삭제
                  </DropdownMenuItem>
                </ProjectPermissionGate>
              </DropdownMenuContent>
            </DropdownMenu>
          </PermissionGate>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* 프로젝트 설명 */}
        {project.description && (
          <div className="mb-4">
            <p className={cn(
              "text-sm text-gray-600",
              !showFullDescription && "line-clamp-2"
            )}>
              {project.description}
            </p>
            {project.description.length > 100 && (
              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="text-xs text-blue-600 hover:text-blue-800 mt-1"
              >
                {showFullDescription ? '접기' : '더 보기'}
              </button>
            )}
          </div>
        )}

        {/* 진행률 표시 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">진행도</span>
            <span className="text-sm text-gray-600">{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={cn(
                "h-2 rounded-full transition-all",
                progressPercentage < 30 ? 'bg-red-500' :
                progressPercentage < 70 ? 'bg-yellow-500' : 'bg-green-500'
              )}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* 작업 통계 */}
        <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4" />
            <span>{project.completedTaskCount}/{project.taskCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{project.memberCount}명</span>
          </div>
        </div>

        {/* 일정 정보 */}
        <div className="space-y-2 text-sm">
          {project.startDate && (
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>시작: {format(project.startDate, 'PPP', { locale: ko })}</span>
            </div>
          )}
          {project.endDate && (
            <div className={cn(
              "flex items-center gap-2",
              isOverdue ? "text-red-600" : "text-gray-600"
            )}>
              <Calendar className="h-4 w-4" />
              <span>종료: {format(project.endDate, 'PPP', { locale: ko })}</span>
              {isOverdue && <span className="text-xs">(지연)</span>}
            </div>
          )}
        </div>

        {/* 태그 */}
        {project.tags && project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {project.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {project.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{project.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* 권한 기반 액션 버튼 */}
        <div className="flex gap-2 mt-4">
          {/* 프로젝트 보기 - READ 권한 필요 */}
          <ProjectPermissionGate
            projectId={project.id}
            action={PermissionAction.READ}
          >
            <Button variant="outline" size="sm" className="flex-1">
              프로젝트 보기
            </Button>
          </ProjectPermissionGate>

          {/* 빠른 편집 - UPDATE 권한 필요 */}
          <ProjectPermissionGate
            projectId={project.id}
            action={PermissionAction.UPDATE}
            fallback={
              <Button variant="ghost" size="sm" disabled className="text-gray-400">
                편집 권한 없음
              </Button>
            }
          >
            <Button
              variant="default"
              size="sm"
              onClick={() => onEdit?.(project)}
            >
              편집
            </Button>
          </ProjectPermissionGate>
        </div>

        {/* 권한이 없을 때 표시되는 메시지 */}
        <PermissionGate
          resourceType={ResourceType.PROJECT}
          resourceId={project.id}
          action={PermissionAction.READ}
          inverse={true}
          showFallback={true}
          fallback={
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
              <div className="flex items-center gap-2 text-gray-600">
                <Circle className="h-4 w-4" />
                <span className="text-sm">이 프로젝트에 대한 접근 권한이 제한되어 있습니다.</span>
              </div>
            </div>
          }
        />
      </CardContent>
    </Card>
  );
};