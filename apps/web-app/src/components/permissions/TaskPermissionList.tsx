import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import {
  MoreVertical,
  UserX,
  Edit,
  Clock,
  AlertTriangle,
  UserCheck,
  Eye,
  GitPullRequest,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import {
  TaskPermission,
  TaskRole,
  UpdateTaskPermissionInput,
} from '../../types/team';
import { useTaskPermissions } from '../../hooks/useTaskPermissions';
import { TaskPermissionEditModal } from './TaskPermissionEditModal';

interface TaskPermissionListProps {
  taskId: string;
  permissions: TaskPermission[];
  loading: boolean;
  canManagePermissions: boolean;
}

export const TaskPermissionList: React.FC<TaskPermissionListProps> = ({
  taskId,
  permissions,
  loading,
  canManagePermissions,
}) => {
  const { revokePermission, updatePermission } = useTaskPermissions(taskId);
  const [selectedPermission, setSelectedPermission] =
    useState<TaskPermission | null>(null);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  const roleLabels: Record<TaskRole, string> = {
    [TaskRole.ASSIGNEE]: '담당자',
    [TaskRole.REVIEWER]: '리뷰어',
    [TaskRole.COLLABORATOR]: '협업자',
    [TaskRole.WATCHER]: '관찰자',
  };

  const roleIcons: Record<TaskRole, React.ReactNode> = {
    [TaskRole.ASSIGNEE]: <UserCheck className="h-4 w-4" />,
    [TaskRole.REVIEWER]: <GitPullRequest className="h-4 w-4" />,
    [TaskRole.COLLABORATOR]: <Users className="h-4 w-4" />,
    [TaskRole.WATCHER]: <Eye className="h-4 w-4" />,
  };

  const getRoleBadgeColor = (role: TaskRole) => {
    switch (role) {
      case TaskRole.ASSIGNEE:
        return 'bg-green-100 text-green-800 border-green-200';
      case TaskRole.REVIEWER:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case TaskRole.COLLABORATOR:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case TaskRole.WATCHER:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isExpired = (permission: TaskPermission) => {
    return permission.expiresAt && permission.expiresAt < new Date();
  };

  const isExpiringSoon = (permission: TaskPermission) => {
    if (!permission.expiresAt) return false;
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    return (
      permission.expiresAt <= sevenDaysFromNow &&
      permission.expiresAt > new Date()
    );
  };

  const handleRevoke = async () => {
    if (!selectedPermission) return;

    const isAssignee = selectedPermission.role === TaskRole.ASSIGNEE;
    if (isAssignee) {
      const confirmRevoke = window.confirm(
        '담당자 권한을 취소하면 이 작업에 담당자가 없게 됩니다. 계속하시겠습니까?'
      );
      if (!confirmRevoke) return;
    }

    setIsRevoking(true);
    try {
      await revokePermission(selectedPermission.id);
      setShowRevokeDialog(false);
      setSelectedPermission(null);
    } catch (error) {
      console.error('권한 취소 실패:', error);
    } finally {
      setIsRevoking(false);
    }
  };

  const handleEdit = (permission: TaskPermission) => {
    setSelectedPermission(permission);
    setShowEditModal(true);
  };

  const handleEditSave = async (input: UpdateTaskPermissionInput) => {
    try {
      await updatePermission(input);
      setShowEditModal(false);
      setSelectedPermission(null);
    } catch (error) {
      console.error('권한 수정 실패:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (permissions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>아직 부여된 작업 권한이 없습니다.</p>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>사용자</TableHead>
              <TableHead>역할</TableHead>
              <TableHead>부여일</TableHead>
              <TableHead>만료일</TableHead>
              <TableHead>상태</TableHead>
              {canManagePermissions && (
                <TableHead className="w-[50px]"></TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.map(permission => (
              <TableRow
                key={permission.id}
                className={cn(
                  isExpired(permission) && 'opacity-50 bg-red-50',
                  permission.role === TaskRole.ASSIGNEE && 'bg-green-50'
                )}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center',
                        permission.role === TaskRole.ASSIGNEE
                          ? 'bg-green-100'
                          : 'bg-blue-100'
                      )}
                    >
                      {/* TODO: 실제 사용자 정보 표시 */}U
                    </div>
                    <div>
                      <div className="font-medium">
                        사용자 {permission.userId}
                      </div>
                      <div className="text-sm text-gray-500">
                        user@example.com
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge className={getRoleBadgeColor(permission.role)}>
                      <div className="flex items-center gap-1">
                        {roleIcons[permission.role]}
                        {roleLabels[permission.role]}
                      </div>
                    </Badge>
                    {permission.role === TaskRole.ASSIGNEE && (
                      <Badge
                        variant="outline"
                        className="text-xs border-green-200 text-green-700"
                      >
                        주담당
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {format(permission.grantedAt, 'PPP', { locale: ko })}
                  </div>
                </TableCell>
                <TableCell>
                  {permission.expiresAt ? (
                    <div className="flex items-center gap-1">
                      {isExpiringSoon(permission) && (
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      )}
                      <div
                        className={cn(
                          'text-sm',
                          isExpired(permission) && 'text-red-600 font-medium',
                          isExpiringSoon(permission) &&
                            'text-orange-600 font-medium'
                        )}
                      >
                        {format(permission.expiresAt, 'PPP', { locale: ko })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">만료일 없음</div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {isExpired(permission) ? (
                      <Badge variant="destructive">만료됨</Badge>
                    ) : isExpiringSoon(permission) ? (
                      <Badge
                        variant="outline"
                        className="border-orange-200 text-orange-700"
                      >
                        곧 만료
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-green-200 text-green-700"
                      >
                        활성
                      </Badge>
                    )}
                  </div>
                </TableCell>
                {canManagePermissions && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleEdit(permission)}
                          className="flex items-center gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          수정
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedPermission(permission);
                            setShowRevokeDialog(true);
                          }}
                          className="flex items-center gap-2 text-red-600"
                        >
                          <UserX className="h-4 w-4" />
                          권한 취소
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 권한 취소 확인 다이얼로그 */}
      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>권한 취소 확인</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedPermission && (
                <>
                  사용자 <strong>{selectedPermission.userId}</strong>의 작업
                  권한을 취소하시겠습니까?
                  {selectedPermission.role === TaskRole.ASSIGNEE && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                      ⚠️ 담당자 권한을 취소하면 이 작업에 담당자가 없게 됩니다.
                    </div>
                  )}
                  <br />이 작업은 되돌릴 수 없습니다.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={isRevoking}
              className="bg-red-600 hover:bg-red-700"
            >
              {isRevoking ? '취소 중...' : '권한 취소'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 권한 수정 모달 */}
      {selectedPermission && (
        <TaskPermissionEditModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPermission(null);
          }}
          permission={selectedPermission}
          onSave={handleEditSave}
        />
      )}
    </>
  );
};
