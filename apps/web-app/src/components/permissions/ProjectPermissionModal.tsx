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
import {
  ProjectRole,
  CreateProjectPermissionInput,
  User,
} from '../../types/team';
import { useProjectPermissions } from '../../hooks/useProjectPermissions';
import { toast } from '../../utils/toast';

interface ProjectPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

export const ProjectPermissionModal: React.FC<ProjectPermissionModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
}) => {
  const { grantPermission } = useProjectPermissions(projectId);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [selectedRole, setSelectedRole] = useState<ProjectRole>(
    ProjectRole.CONTRIBUTOR
  );
  const [expiresAt, setExpiresAt] = useState<Date | undefined>();
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
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

  // 사용자 검색 (실제로는 팀 멤버에서만 검색)
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    // TODO: 실제 팀 멤버 검색 로직 구현
    // 현재는 모의 데이터 사용
    const mockUsers: User[] = [
      {
        id: 'user1',
        email: 'john@example.com',
        name: 'John Doe',
        displayName: 'John Doe',
        photoURL: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      },
      {
        id: 'user2',
        email: 'jane@example.com',
        name: 'Jane Smith',
        displayName: 'Jane Smith',
        photoURL: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
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
      setSelectedUsers([...selectedUsers, user]);
      setUserSearch('');
      setSearchResults([]);
    }
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  const handleSubmit = async () => {
    if (selectedUsers.length === 0) {
      toast.error('권한을 부여할 사용자를 선택해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      for (const user of selectedUsers) {
        const input: CreateProjectPermissionInput = {
          projectId,
          userId: user.id,
          role: selectedRole,
          expiresAt,
        };
        await grantPermission(input);
      }

      toast.success(
        `${selectedUsers.length}명에게 프로젝트 권한이 부여되었습니다.`
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
    setSelectedRole(ProjectRole.CONTRIBUTOR);
    setExpiresAt(undefined);
    setUserSearch('');
    setSearchResults([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            프로젝트 권한 부여 - {projectName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 사용자 선택 */}
          <div className="space-y-2">
            <Label>사용자 선택</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="팀 멤버 검색 (이름 또는 이메일)"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="pl-9"
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {searchResults.map(user => (
                    <button
                      key={user.id}
                      onClick={() => handleAddUser(user)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
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
                  ))}
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
                    ? format(expiresAt, 'PPP')
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
