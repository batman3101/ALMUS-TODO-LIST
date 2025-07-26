import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Badge } from '../ui/badge';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon, UserPlus, X, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import { TaskRole, CreateTaskPermissionInput, User } from '../../types/team';
import { useTaskPermissions } from '../../hooks/useTaskPermissions';
import { toast } from '../../utils/toast';

interface TaskPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  taskTitle: string;
}

export const TaskPermissionModal: React.FC<TaskPermissionModalProps> = ({
  isOpen,
  onClose,
  taskId,
  taskTitle,
}) => {
  const { grantPermission, getPermissionsByRole } = useTaskPermissions(taskId);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [selectedRole, setSelectedRole] = useState<TaskRole>(
    TaskRole.COLLABORATOR
  );
  const [expiresAt, setExpiresAt] = useState<Date | undefined>();
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const roleLabels: Record<TaskRole, string> = {
    [TaskRole.ASSIGNEE]: '담당자',
    [TaskRole.REVIEWER]: '리뷰어',
    [TaskRole.COLLABORATOR]: '협업자',
    [TaskRole.WATCHER]: '관찰자',
  };

  const roleDescriptions: Record<TaskRole, string> = {
    [TaskRole.ASSIGNEE]: '작업 수행 및 완료 권한 (단일 사용자만 가능)',
    [TaskRole.REVIEWER]: '작업 검토 및 승인 권한',
    [TaskRole.COLLABORATOR]: '작업 편집 및 협업 권한',
    [TaskRole.WATCHER]: '작업 조회 및 댓글만 가능',
  };

  // 사용자 검색 (실제로는 프로젝트 멤버에서만 검색)
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    // TODO: 실제 프로젝트 멤버 검색 로직 구현
    // 현재는 모의 데이터 사용
    const mockUsers: User[] = [
      {
        id: 'user1',
        email: 'john@example.com',
        displayName: 'John Doe',
        photoURL: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'user2',
        email: 'jane@example.com',
        displayName: 'Jane Smith',
        photoURL: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'user3',
        email: 'mike@example.com',
        displayName: 'Mike Johnson',
        photoURL: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const filtered = mockUsers.filter(
      user =>
        user.displayName?.toLowerCase().includes(query.toLowerCase()) ||
        user.email.toLowerCase().includes(query.toLowerCase())
    );

    setSearchResults(filtered);
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchUsers(userSearch);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [userSearch]);

  const handleAddUser = (user: User) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      // 담당자 역할의 경우 단일 사용자만 선택 가능
      if (selectedRole === TaskRole.ASSIGNEE) {
        setSelectedUsers([user]);
      } else {
        setSelectedUsers([...selectedUsers, user]);
      }
      setUserSearch('');
      setSearchResults([]);
    }
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  const handleRoleChange = (newRole: TaskRole) => {
    setSelectedRole(newRole);

    // 담당자 역할로 변경시 첫 번째 사용자만 유지
    if (newRole === TaskRole.ASSIGNEE && selectedUsers.length > 1) {
      setSelectedUsers(selectedUsers.slice(0, 1));
    }
  };

  const handleSubmit = async () => {
    if (selectedUsers.length === 0) {
      toast.error('권한을 부여할 사용자를 선택해주세요.');
      return;
    }

    // 담당자 역할의 경우 기존 담당자 확인
    if (selectedRole === TaskRole.ASSIGNEE) {
      const existingAssignees = getPermissionsByRole(TaskRole.ASSIGNEE);
      if (existingAssignees.length > 0) {
        const confirmReplace = window.confirm(
          '이미 담당자가 지정되어 있습니다. 기존 담당자를 새로운 담당자로 교체하시겠습니까?'
        );
        if (!confirmReplace) return;
      }
    }

    setIsLoading(true);
    try {
      for (const user of selectedUsers) {
        const input: CreateTaskPermissionInput = {
          taskId,
          userId: user.id,
          role: selectedRole,
          expiresAt,
        };
        await grantPermission(input);
      }

      const roleLabel = roleLabels[selectedRole];
      toast.success(
        `${selectedUsers.length}명에게 ${roleLabel} 권한이 부여되었습니다.`
      );
      onClose();
      resetForm();
    } catch (error) {
      console.error('권한 부여 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedUsers([]);
    setSelectedRole(TaskRole.COLLABORATOR);
    setExpiresAt(undefined);
    setUserSearch('');
    setSearchResults([]);
  };

  const isAssigneeRole = selectedRole === TaskRole.ASSIGNEE;
  const maxUsers = isAssigneeRole ? 1 : undefined;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            작업 권한 부여 - {taskTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 역할 선택 */}
          <div className="space-y-2">
            <Label>역할</Label>
            <Select
              value={selectedRole}
              onValueChange={value => handleRoleChange(value as TaskRole)}
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
                        {roleDescriptions[role as TaskRole]}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAssigneeRole && (
              <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                ⚠️ 담당자는 한 명만 지정할 수 있습니다. 기존 담당자가 있다면
                교체됩니다.
              </div>
            )}
          </div>

          {/* 사용자 선택 */}
          <div className="space-y-2">
            <Label>
              사용자 선택
              {maxUsers && (
                <span className="text-sm text-gray-500 ml-1">
                  (최대 {maxUsers}명)
                </span>
              )}
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="프로젝트 멤버 검색 (이름 또는 이메일)"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="pl-9"
                disabled={maxUsers && selectedUsers.length >= maxUsers}
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {searchResults.map(user => {
                    const isDisabled =
                      maxUsers && selectedUsers.length >= maxUsers;
                    return (
                      <button
                        key={user.id}
                        onClick={() => handleAddUser(user)}
                        disabled={isDisabled}
                        className={cn(
                          'w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2',
                          isDisabled && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          {user.displayName?.[0] || user.email[0]}
                        </div>
                        <div>
                          <div className="font-medium">
                            {user.displayName || user.email}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 선택된 사용자들 */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedUsers.map(user => (
                  <Badge key={user.id} variant="secondary" className="gap-1">
                    {user.displayName || user.email}
                    <button
                      onClick={() => handleRemoveUser(user.id)}
                      className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* 만료일 선택 */}
          <div className="space-y-2">
            <Label>만료일 (선택사항)</Label>
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
                  {expiresAt
                    ? format(expiresAt, 'PPP', { locale: ko })
                    : '만료일 없음'}
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
                {expiresAt && (
                  <div className="p-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpiresAt(undefined)}
                      className="w-full"
                    >
                      만료일 제거
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* 역할별 추가 안내 */}
          {selectedRole === TaskRole.ASSIGNEE && (
            <div className="bg-blue-50 p-3 rounded-md">
              <div className="text-sm font-medium text-blue-800 mb-1">
                담당자 권한
              </div>
              <div className="text-sm text-blue-700">
                • 작업을 완료할 수 있습니다
                <br />
                • 작업 상태를 변경할 수 있습니다
                <br />
                • 작업 내용을 편집할 수 있습니다
                <br />• 한 번에 한 명만 지정 가능합니다
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedUsers.length === 0 || isLoading}
          >
            {isLoading ? '권한 부여 중...' : '권한 부여'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
