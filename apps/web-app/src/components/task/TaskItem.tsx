import React, { useState } from 'react';
import { logger } from '../../utils/logger';
import { CollaborativeWorkspace } from '../collaboration/CollaborativeWorkspace';
import { CommentSystem } from '../collaboration/CommentSystem';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Calendar,
  User,
  MessageCircle,
  Flag,
  MoreVertical,
  Edit,
  Trash,
  UserPlus,
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import {
  Task,
  TaskStatus,
  TaskPriority,
  PermissionAction,
  ResourceType,
  TaskRole,
} from '../../types/team';
import {
  TaskPermissionGate,
  PermissionGate,
  RoleGate,
} from '../common/PermissionGate';

interface TaskItemProps {
  task: Task;
  showProject?: boolean;
  onToggleComplete?: (taskId: string, completed: boolean) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onAssign?: (taskId: string) => void;
  onManagePermissions?: (taskId: string) => void;
  enableCollaboration?: boolean;
  showDetailView?: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  showProject = false,
  onToggleComplete,
  onEdit,
  onDelete,
  onAssign,
  onManagePermissions,
  enableCollaboration = false,
  showDetailView = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCollaborativeView, setShowCollaborativeView] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.URGENT:
        return 'bg-red-100 text-red-800 border-red-200';
      case TaskPriority.HIGH:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case TaskPriority.MEDIUM:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case TaskPriority.LOW:
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.TODO:
        return 'bg-gray-100 text-gray-800';
      case TaskStatus.IN_PROGRESS:
        return 'bg-blue-100 text-blue-800';
      case TaskStatus.IN_REVIEW:
        return 'bg-purple-100 text-purple-800';
      case TaskStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case TaskStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityLabel = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.URGENT:
        return '긴급';
      case TaskPriority.HIGH:
        return '높음';
      case TaskPriority.MEDIUM:
        return '보통';
      case TaskPriority.LOW:
        return '낮음';
      default:
        return priority;
    }
  };

  const getStatusLabel = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.TODO:
        return '할 일';
      case TaskStatus.IN_PROGRESS:
        return '진행중';
      case TaskStatus.IN_REVIEW:
        return '검토중';
      case TaskStatus.COMPLETED:
        return '완료';
      case TaskStatus.CANCELLED:
        return '취소';
      default:
        return status;
    }
  };

  const isCompleted = task.status === TaskStatus.COMPLETED;
  const isOverdue = task.dueDate && task.dueDate < new Date() && !isCompleted;
  const isDueSoon =
    task.dueDate &&
    task.dueDate > new Date() &&
    task.dueDate <= new Date(Date.now() + 24 * 60 * 60 * 1000); // 24시간 내

  return (
    <Card
      className={cn(
        'transition-all hover:shadow-sm',
        isCompleted && 'opacity-75',
        isOverdue && 'border-red-200 bg-red-50/30'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* 완료 체크박스 - COMPLETE 권한 또는 담당자만 가능 */}
          <div className="flex-shrink-0 pt-1">
            <TaskPermissionGate
              taskId={task.id}
              action={PermissionAction.COMPLETE}
              fallback={
                <RoleGate
                  resourceType={ResourceType.TASK}
                  resourceId={task.id}
                  allowedRoles={[TaskRole.ASSIGNEE]}
                  fallback={
                    <div className="w-5 h-5 border-2 border-gray-300 rounded bg-gray-100" />
                  }
                >
                  <Checkbox
                    checked={isCompleted}
                    onCheckedChange={checked =>
                      onToggleComplete?.(task.id, Boolean(checked))
                    }
                    className="w-5 h-5"
                  />
                </RoleGate>
              }
            >
              <Checkbox
                checked={isCompleted}
                onCheckedChange={checked =>
                  onToggleComplete?.(task.id, Boolean(checked))
                }
                className="w-5 h-5"
              />
            </TaskPermissionGate>
          </div>

          {/* 작업 내용 */}
          <div className="flex-1 min-w-0">
            {/* 제목과 액션 버튼 */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4
                className={cn(
                  'font-medium text-sm leading-5',
                  isCompleted && 'line-through text-gray-500'
                )}
              >
                {task.title}
              </h4>

              {/* 권한 기반 액션 메뉴 */}
              <PermissionGate
                resourceType={ResourceType.TASK}
                resourceId={task.id}
                action={PermissionAction.UPDATE}
                fallback={null}
                showFallback={false}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {/* 작업 수정 - UPDATE 권한 */}
                    <TaskPermissionGate
                      taskId={task.id}
                      action={PermissionAction.UPDATE}
                    >
                      <DropdownMenuItem
                        onClick={() => onEdit?.(task)}
                        className="flex items-center gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        작업 수정
                      </DropdownMenuItem>
                    </TaskPermissionGate>

                    {/* 담당자 지정 - ASSIGN 권한 */}
                    <TaskPermissionGate
                      taskId={task.id}
                      action={PermissionAction.ASSIGN}
                    >
                      <DropdownMenuItem
                        onClick={() => onAssign?.(task.id)}
                        className="flex items-center gap-2"
                      >
                        <UserPlus className="h-4 w-4" />
                        담당자 지정
                      </DropdownMenuItem>
                    </TaskPermissionGate>

                    <DropdownMenuSeparator />

                    {/* 권한 관리 - MANAGE_PERMISSIONS 권한 */}
                    <TaskPermissionGate
                      taskId={task.id}
                      action={PermissionAction.MANAGE_PERMISSIONS}
                    >
                      <DropdownMenuItem
                        onClick={() => onManagePermissions?.(task.id)}
                        className="flex items-center gap-2"
                      >
                        <User className="h-4 w-4" />
                        권한 관리
                      </DropdownMenuItem>
                    </TaskPermissionGate>

                    {/* 작업 삭제 - DELETE 권한 */}
                    <TaskPermissionGate
                      taskId={task.id}
                      action={PermissionAction.DELETE}
                    >
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete?.(task.id)}
                        className="flex items-center gap-2 text-red-600"
                      >
                        <Trash className="h-4 w-4" />
                        작업 삭제
                      </DropdownMenuItem>
                    </TaskPermissionGate>
                  </DropdownMenuContent>
                </DropdownMenu>
              </PermissionGate>
            </div>

            {/* 설명 */}
            {task.description && (
              <p
                className={cn(
                  'text-xs text-gray-600 mb-2',
                  !isExpanded && 'line-clamp-2',
                  isCompleted && 'line-through'
                )}
              >
                {task.description}
              </p>
            )}

            {/* 메타 정보 */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {/* 상태 */}
              <Badge className={cn('text-xs', getStatusColor(task.status))}>
                {getStatusLabel(task.status)}
              </Badge>

              {/* 우선순위 */}
              <Badge className={cn('text-xs', getPriorityColor(task.priority))}>
                <Flag className="h-3 w-3 mr-1" />
                {getPriorityLabel(task.priority)}
              </Badge>

              {/* 지연/마감임박 경고 */}
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  지연됨
                </Badge>
              )}
              {isDueSoon && !isOverdue && (
                <Badge
                  variant="outline"
                  className="text-xs border-orange-200 text-orange-700"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  마감임박
                </Badge>
              )}
            </div>

            {/* 일정 및 담당자 정보 */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              {/* 마감일 */}
              {task.dueDate && (
                <div
                  className={cn(
                    'flex items-center gap-1',
                    isOverdue && 'text-red-600'
                  )}
                >
                  <Calendar className="h-3 w-3" />
                  <span>{format(task.dueDate, 'MM/dd')}</span>
                </div>
              )}

              {/* 담당자 */}
              {task.assigneeId && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>담당자</span>
                </div>
              )}

              {/* 댓글 수 */}
              {task.commentCount && task.commentCount > 0 && (
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  <span>{task.commentCount}</span>
                </div>
              )}
            </div>

            {/* 프로젝트 정보 (옵션) */}
            {showProject && task.projectId && (
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">
                  프로젝트: {task.projectId}
                </Badge>
              </div>
            )}

            {/* 권한 기반 액션 버튼 */}
            <div className="flex gap-2 mt-3">
              {/* 댓글 보기/추가 - COMMENT 권한 */}
              <TaskPermissionGate
                taskId={task.id}
                action={PermissionAction.COMMENT}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowComments(!showComments)}
                  className="text-xs"
                >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  댓글 {task.commentCount ? `(${task.commentCount})` : ''}
                </Button>
              </TaskPermissionGate>

              {/* 협업 모드 - 활성화된 경우만 */}
              {enableCollaboration && (
                <TaskPermissionGate
                  taskId={task.id}
                  action={PermissionAction.UPDATE}
                >
                  <Button
                    variant={showCollaborativeView ? 'default' : 'outline'}
                    size="sm"
                    onClick={() =>
                      setShowCollaborativeView(!showCollaborativeView)
                    }
                    className="text-xs"
                  >
                    <Users className="h-3 w-3 mr-1" />
                    실시간 편집
                  </Button>
                </TaskPermissionGate>
              )}

              {/* 자세히 보기 */}
              {showDetailView && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  {isExpanded ? '간략히' : '자세히'}
                </Button>
              )}

              {/* 상태 변경 - UPDATE 권한 또는 담당자 */}
              <TaskPermissionGate
                taskId={task.id}
                action={PermissionAction.UPDATE}
                fallback={
                  <RoleGate
                    resourceType={ResourceType.TASK}
                    resourceId={task.id}
                    allowedRoles={[TaskRole.ASSIGNEE]}
                    fallback={null}
                    showFallback={false}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      disabled={isCompleted}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      상태 변경
                    </Button>
                  </RoleGate>
                }
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  disabled={isCompleted}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  상태 변경
                </Button>
              </TaskPermissionGate>
            </div>

            {/* 권한이 없을 때 표시 */}
            <PermissionGate
              resourceType={ResourceType.TASK}
              resourceId={task.id}
              action={PermissionAction.READ}
              inverse={true}
              fallback={
                <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
                  이 작업에 대한 세부 정보를 볼 권한이 없습니다.
                </div>
              }
            >
              <div></div>
            </PermissionGate>

            {/* 실시간 협업 뷰 */}
            {showCollaborativeView && enableCollaboration && (
              <div className="mt-4 border-t pt-4">
                <CollaborativeWorkspace
                  resourceType="TASK"
                  resourceId={task.id}
                  title={`작업: ${task.title}`}
                  data={{
                    title: task.title,
                    description: task.description || '',
                    status: task.status,
                    priority: task.priority,
                  }}
                  onDataChange={data => {
                    // 작업 데이터 업데이트 로직
                    logger.log('Task data updated:', data);
                  }}
                  onSave={data => {
                    // 작업 저장 로직
                    logger.log('Task saved:', data);
                  }}
                  className="collaborative-task-editor"
                />
              </div>
            )}

            {/* 댓글 시스템 */}
            {showComments && (
              <div className="mt-4 border-t pt-4">
                <CommentSystem
                  resourceType="TASK"
                  resourceId={task.id}
                  className="task-comments"
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
