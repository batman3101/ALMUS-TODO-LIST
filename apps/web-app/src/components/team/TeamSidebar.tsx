import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import {
  Users,
  Settings,
  UserPlus,
  Shield,
  BarChart3,
  FileText,
  Bell,
  Plus,
  Home,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { 
  Team, 
  PermissionAction, 
  ResourceType,
  TeamRole 
} from '../../types/team';
import { 
  TeamPermissionGate, 
  PermissionGate, 
  RoleGate 
} from '../common/PermissionGate';

interface TeamSidebarProps {
  team: Team;
  activeSection?: string;
  onSectionChange?: (section: string) => void;
  memberCount?: number;
  projectCount?: number;
  taskCount?: number;
}

export const TeamSidebar: React.FC<TeamSidebarProps> = ({
  team,
  activeSection = 'dashboard',
  onSectionChange,
  memberCount = 0,
  projectCount = 0,
  taskCount = 0,
}) => {
  const navigationItems = [
    {
      id: 'dashboard',
      label: '대시보드',
      icon: Home,
      requiredPermission: PermissionAction.READ,
      count: null,
    },
    {
      id: 'projects',
      label: '프로젝트',
      icon: FileText,
      requiredPermission: PermissionAction.READ,
      count: projectCount,
    },
    {
      id: 'tasks',
      label: '작업',
      icon: FileText,
      requiredPermission: PermissionAction.READ,
      count: taskCount,
    },
    {
      id: 'members',
      label: '팀 멤버',
      icon: Users,
      requiredPermission: PermissionAction.READ,
      count: memberCount,
    },
    {
      id: 'analytics',
      label: '분석',
      icon: BarChart3,
      requiredPermission: PermissionAction.READ,
      count: null,
    },
  ];

  const adminItems = [
    {
      id: 'permissions',
      label: '권한 관리',
      icon: Shield,
      requiredPermission: PermissionAction.MANAGE_PERMISSIONS,
      requiredRoles: [TeamRole.OWNER, TeamRole.ADMIN],
    },
    {
      id: 'settings',
      label: '팀 설정',
      icon: Settings,
      requiredPermission: PermissionAction.UPDATE,
      requiredRoles: [TeamRole.OWNER, TeamRole.ADMIN],
    },
    {
      id: 'notifications',
      label: '알림 설정',
      icon: Bell,
      requiredPermission: PermissionAction.UPDATE,
      requiredRoles: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR],
    },
  ];

  const handleSectionClick = (sectionId: string) => {
    onSectionChange?.(sectionId);
  };

  const NavItem: React.FC<{
    item: typeof navigationItems[0];
    isActive: boolean;
  }> = ({ item, isActive }) => (
    <TeamPermissionGate
      teamId={team.id}
      action={item.requiredPermission}
      fallback={null}
      showFallback={false}
    >
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start gap-3 h-10",
          isActive && "bg-blue-50 text-blue-700 border-blue-200"
        )}
        onClick={() => handleSectionClick(item.id)}
      >
        <item.icon className="h-4 w-4" />
        <span className="flex-1 text-left">{item.label}</span>
        {item.count !== null && (
          <Badge variant="secondary" className="text-xs">
            {item.count}
          </Badge>
        )}
      </Button>
    </TeamPermissionGate>
  );

  const AdminNavItem: React.FC<{
    item: typeof adminItems[0];
    isActive: boolean;
  }> = ({ item, isActive }) => (
    <RoleGate
      resourceType={ResourceType.TEAM}
      resourceId={team.id}
      allowedRoles={item.requiredRoles}
      fallback={null}
      showFallback={false}
    >
      <TeamPermissionGate
        teamId={team.id}
        action={item.requiredPermission}
        fallback={null}
        showFallback={false}
      >
        <Button
          variant={isActive ? "secondary" : "ghost"}
          className={cn(
            "w-full justify-start gap-3 h-10",
            isActive && "bg-blue-50 text-blue-700 border-blue-200"
          )}
          onClick={() => handleSectionClick(item.id)}
        >
          <item.icon className="h-4 w-4" />
          <span className="flex-1 text-left">{item.label}</span>
        </Button>
      </TeamPermissionGate>
    </RoleGate>
  );

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full flex flex-col">
      {/* 팀 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-900 truncate">
              {team.name}
            </h2>
            <p className="text-xs text-gray-500 truncate">
              {team.description || '팀 설명이 없습니다'}
            </p>
          </div>
        </div>

        {/* 빠른 액션 버튼 */}
        <div className="mt-3 space-y-2">
          {/* 프로젝트 생성 - CREATE 권한 */}
          <TeamPermissionGate
            teamId={team.id}
            action={PermissionAction.CREATE}
            fallback={null}
            showFallback={false}
          >
            <Button
              size="sm"
              className="w-full gap-2"
              onClick={() => handleSectionClick('create-project')}
            >
              <Plus className="h-4 w-4" />
              새 프로젝트
            </Button>
          </TeamPermissionGate>

          {/* 팀원 초대 - MANAGE_PERMISSIONS 권한 */}
          <RoleGate
            resourceType={ResourceType.TEAM}
            resourceId={team.id}
            allowedRoles={[TeamRole.OWNER, TeamRole.ADMIN]}
            fallback={null}
            showFallback={false}
          >
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => handleSectionClick('invite-member')}
            >
              <UserPlus className="h-4 w-4" />
              팀원 초대
            </Button>
          </RoleGate>
        </div>
      </div>

      {/* 네비게이션 메뉴 */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-1">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            메인 메뉴
          </div>
          
          {navigationItems.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              isActive={activeSection === item.id}
            />
          ))}
        </div>

        {/* 관리 메뉴 */}
        <div className="px-4">
          <Separator className="my-2" />
          
          {/* 관리 메뉴는 권한이 있는 사용자에게만 표시 */}
          <RoleGate
            resourceType={ResourceType.TEAM}
            resourceId={team.id}
            allowedRoles={[TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR]}
            fallback={null}
            showFallback={false}
          >
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                관리
              </div>
              
              {adminItems.map((item) => (
                <AdminNavItem
                  key={item.id}
                  item={item}
                  isActive={activeSection === item.id}
                />
              ))}
            </div>
          </RoleGate>
        </div>
      </div>

      {/* 팀 정보 푸터 */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>멤버</span>
            <span>{memberCount}명</span>
          </div>
          <div className="flex justify-between">
            <span>프로젝트</span>
            <span>{projectCount}개</span>
          </div>
          <div className="flex justify-between">
            <span>작업</span>
            <span>{taskCount}개</span>
          </div>
        </div>

        {/* 권한 표시 */}
        <div className="mt-2">
          <RoleGate
            resourceType={ResourceType.TEAM}
            resourceId={team.id}
            allowedRoles={[TeamRole.OWNER]}
            fallback={
              <RoleGate
                resourceType={ResourceType.TEAM}
                resourceId={team.id}
                allowedRoles={[TeamRole.ADMIN]}
                fallback={
                  <RoleGate
                    resourceType={ResourceType.TEAM}
                    resourceId={team.id}
                    allowedRoles={[TeamRole.EDITOR]}
                    fallback={
                      <Badge variant="outline" className="text-xs w-full justify-center">
                        조회자
                      </Badge>
                    }
                  >
                    <Badge variant="secondary" className="text-xs w-full justify-center">
                      편집자
                    </Badge>
                  </RoleGate>
                }
              >
                <Badge className="text-xs w-full justify-center bg-orange-100 text-orange-800">
                  관리자
                </Badge>
              </RoleGate>
            }
          >
            <Badge className="text-xs w-full justify-center bg-blue-100 text-blue-800">
              소유자
            </Badge>
          </RoleGate>
        </div>

        {/* 권한 제한 안내 */}
        <PermissionGate
          resourceType={ResourceType.TEAM}
          resourceId={team.id}
          action={PermissionAction.READ}
          inverse={true}
          fallback={
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              ⚠️ 일부 기능에 대한 접근이 제한되어 있습니다.
            </div>
          }
        />
      </div>
    </div>
  );
};