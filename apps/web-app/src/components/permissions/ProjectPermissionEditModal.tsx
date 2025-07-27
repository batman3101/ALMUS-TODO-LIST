import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import {
  ProjectRole,
  ProjectPermission,
  UpdateProjectPermissionInput,
} from '../../types/team';

interface ProjectPermissionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  permission: ProjectPermission;
  onSave: (input: UpdateProjectPermissionInput) => Promise<void>;
}

export const ProjectPermissionEditModal: React.FC<
  ProjectPermissionEditModalProps
> = ({ isOpen, onClose, permission, onSave }) => {
  const [selectedRole, setSelectedRole] = useState<ProjectRole>(
    permission.role
  );
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(
    permission.expiresAt || undefined
  );
  const [isLoading, setIsLoading] = useState(false);

  const roleLabels: Record<ProjectRole, string> = {
    [ProjectRole.PROJECT_MANAGER]: '프로젝트 매니저',
    [ProjectRole.PROJECT_LEAD]: '프로젝트 리드',
    [ProjectRole.CONTRIBUTOR]: '기여자',
    [ProjectRole.OBSERVER]: '관찰자',
  };

  const roleDescriptions: Record<ProjectRole, string> = {
    [ProjectRole.PROJECT_MANAGER]: '프로젝트 전체 관리 및 권한 부여 가능',
    [ProjectRole.PROJECT_LEAD]: '프로젝트 운영 관리 및 작업 배정 가능',
    [ProjectRole.CONTRIBUTOR]: '프로젝트 참여 및 작업 수행 가능',
    [ProjectRole.OBSERVER]: '프로젝트 조회 및 댓글만 가능',
  };

  // 모달이 열릴 때마다 초기값 설정
  useEffect(() => {
    if (isOpen) {
      setSelectedRole(permission.role);
      setExpiresAt(permission.expiresAt || undefined);
    }
  }, [isOpen, permission]);

  const handleSubmit = async () => {
    const hasChanges =
      selectedRole !== permission.role || expiresAt !== permission.expiresAt;

    if (!hasChanges) {
      onClose();
      return;
    }

    setIsLoading(true);
    try {
      const input: UpdateProjectPermissionInput = {
        id: permission.id,
        role: selectedRole,
        expiresAt,
      };
      await onSave(input);
    } catch (error) {
      console.error('권한 수정 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isExpired = permission.expiresAt && permission.expiresAt < new Date();
  const isExpiringSoon =
    permission.expiresAt &&
    permission.expiresAt <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) &&
    permission.expiresAt > new Date();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            프로젝트 권한 수정
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 사용자 정보 (읽기 전용) */}
          <div className="space-y-2">
            <Label>사용자</Label>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                U
              </div>
              <div>
                <div className="font-medium">사용자 {permission.userId}</div>
                <div className="text-sm text-gray-500">user@example.com</div>
              </div>
            </div>
          </div>

          {/* 현재 상태 표시 */}
          {(isExpired || isExpiringSoon) && (
            <div
              className={cn(
                'p-3 rounded-md border',
                isExpired
                  ? 'bg-red-50 border-red-200'
                  : 'bg-orange-50 border-orange-200'
              )}
            >
              <div
                className={cn(
                  'text-sm font-medium',
                  isExpired ? 'text-red-800' : 'text-orange-800'
                )}
              >
                {isExpired
                  ? '⚠️ 이 권한은 만료되었습니다'
                  : '🔔 이 권한이 곧 만료됩니다'}
              </div>
              {permission.expiresAt && (
                <div
                  className={cn(
                    'text-sm mt-1',
                    isExpired ? 'text-red-600' : 'text-orange-600'
                  )}
                >
                  만료일: {format(permission.expiresAt, 'PPP')}
                </div>
              )}
            </div>
          )}

          {/* 역할 선택 */}
          <div className="space-y-2">
            <Label>역할</Label>
            <Select
              value={selectedRole}
              onValueChange={value => setSelectedRole(value as ProjectRole)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(roleLabels).map(([role, label]) => (
                  <SelectItem key={role} value={role}>
                    <div>
                      <div className="font-medium">{label}</div>
                      <div className="text-sm text-gray-500">
                        {roleDescriptions[role as ProjectRole]}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 만료일 수정 */}
          <div className="space-y-2">
            <Label>만료일</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !expiresAt && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expiresAt ? format(expiresAt, 'PPP') : '만료일 없음'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expiresAt}
                  onSelect={setExpiresAt}
                  disabled={date => date < new Date()}
                  initialFocus
                />
                <div className="p-3 border-t space-y-2">
                  {expiresAt && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpiresAt(undefined)}
                      className="w-full"
                    >
                      만료일 제거
                    </Button>
                  )}
                  {isExpired && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const oneMonthFromNow = new Date();
                        oneMonthFromNow.setMonth(
                          oneMonthFromNow.getMonth() + 1
                        );
                        setExpiresAt(oneMonthFromNow);
                      }}
                      className="w-full"
                    >
                      1개월 연장
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* 변경 사항 요약 */}
          <div className="bg-blue-50 p-3 rounded-md">
            <div className="text-sm font-medium text-blue-800 mb-1">
              변경 사항
            </div>
            <div className="text-sm text-blue-700 space-y-1">
              {selectedRole !== permission.role && (
                <div>
                  역할: {roleLabels[permission.role]} →{' '}
                  {roleLabels[selectedRole]}
                </div>
              )}
              {expiresAt !== permission.expiresAt && (
                <div>
                  만료일:{' '}
                  {permission.expiresAt
                    ? format(permission.expiresAt, 'PPP')
                    : '없음'}{' '}
                  → {expiresAt ? format(expiresAt, 'PPP') : '없음'}
                </div>
              )}
              {selectedRole === permission.role &&
                expiresAt === permission.expiresAt && (
                  <div className="text-gray-500">변경 사항이 없습니다</div>
                )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
