import React, { useState } from 'react';
import { logger } from '../../utils/logger';
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
import { MoreVertical, UserX, Edit, AlertTriangle, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import {
  ProjectPermission,
  ProjectRole,
  UpdateProjectPermissionInput,
} from '../../types/team';
import { useProjectPermissions } from '../../hooks/useProjectPermissions';
import { ProjectPermissionEditModal } from './ProjectPermissionEditModal';

interface ProjectPermissionListProps {
  projectId: string;
  permissions: ProjectPermission[];
  loading: boolean;
  canManagePermissions: boolean;
}

export const ProjectPermissionList: React.FC<ProjectPermissionListProps> = ({
  projectId,
  permissions,
  loading,
  canManagePermissions,
}) => {
  const { revokePermission, updatePermission } =
    useProjectPermissions(projectId);
  const [selectedPermission, setSelectedPermission] =
    useState<ProjectPermission | null>(null);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  const roleLabels: Record<ProjectRole, string> = {
    [ProjectRole.PROJECT_MANAGER]: '프로젝트 매니저',
    [ProjectRole.PROJECT_LEAD]: '프로젝트 리드',
    [ProjectRole.CONTRIBUTOR]: '기여자',
    [ProjectRole.OBSERVER]: '관찰자',
  };

  const getRoleBadgeColor = (role: ProjectRole) => {
    switch (role) {
      case ProjectRole.PROJECT_MANAGER:
        return 'bg-red-100 text-red-800';
      case ProjectRole.PROJECT_LEAD:
        return 'bg-orange-100 text-orange-800';
      case ProjectRole.CONTRIBUTOR:
        return 'bg-blue-100 text-blue-800';
      case ProjectRole.OBSERVER:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isExpired = (permission: ProjectPermission) => {
    return permission.expiresAt && permission.expiresAt < new Date();
  };

  const isExpiringSoon = (permission: ProjectPermission) => {
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

    setIsRevoking(true);
    try {
      await revokePermission(selectedPermission.id);
      setShowRevokeDialog(false);
      setSelectedPermission(null);
    } catch (error) {
      logger.error('권한 취소 실패:', error);
    } finally {
      setIsRevoking(false);
    }
  };

  const handleEdit = (permission: ProjectPermission) => {
    setSelectedPermission(permission);
    setShowEditModal(true);
  };

  const handleEditSave = async (input: UpdateProjectPermissionInput) => {
    try {
      await updatePermission(input);
      setShowEditModal(false);
      setSelectedPermission(null);
    } catch (error) {
      logger.error('권한 수정 실패:', error);
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
        <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>아직 부여된 프로젝트 권한이 없습니다.</p>
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
                className={cn(isExpired(permission) && 'opacity-50 bg-red-50')}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
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
                  <Badge className={getRoleBadgeColor(permission.role)}>
                    {roleLabels[permission.role]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {format(permission.grantedAt, 'PPP')}
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
                        {format(permission.expiresAt, 'PPP')}
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
                  사용자 <strong>{selectedPermission.userId}</strong>의 프로젝트
                  권한을 취소하시겠습니까?
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
        <ProjectPermissionEditModal
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
