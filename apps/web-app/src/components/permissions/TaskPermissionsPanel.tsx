import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  UserPlus,
  Users,
  UserCheck,
  Eye,
  GitPullRequest,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { useTaskPermissions } from '../../hooks/useTaskPermissions';
import { usePermissions } from '../../hooks/usePermissions';
import { TaskPermissionModal } from './TaskPermissionModal';
import { TaskPermissionList } from './TaskPermissionList';
import { TaskRole } from '../../types/team';

interface TaskPermissionsPanelProps {
  taskId: string;
  taskTitle: string;
}

export const TaskPermissionsPanel: React.FC<TaskPermissionsPanelProps> = ({
  taskId,
  taskTitle,
}) => {
  const { 
    permissions, 
    loading, 
    getPermissionsByRole,
    getExpiredPermissions,
    getExpiringPermissions,
    getPermissionStats,
    changeAssignee,
    addReviewer,
    addCollaborator,
    addWatcher,
  } = useTaskPermissions(taskId);
  const { canManageTaskPermissions } = usePermissions();
  const [showGrantModal, setShowGrantModal] = useState(false);

  const stats = getPermissionStats();
  const expiredPermissions = getExpiredPermissions();
  const expiringPermissions = getExpiringPermissions();
  const canManage = canManageTaskPermissions(taskId);

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
        return 'bg-green-100 text-green-800';
      case TaskRole.REVIEWER:
        return 'bg-blue-100 text-blue-800';
      case TaskRole.COLLABORATOR:
        return 'bg-orange-100 text-orange-800';
      case TaskRole.WATCHER:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: number | string;
    icon: React.ReactNode;
    color?: string;
    description?: string;
  }> = ({ title, value, icon, color = 'text-blue-600', description }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`${color} p-2 rounded-lg bg-opacity-10`}>
            {icon}
          </div>
          <div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm text-gray-600">{title}</div>
            {description && (
              <div className="text-xs text-gray-500 mt-1">{description}</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const QuickActionButton: React.FC<{
    role: TaskRole;
    onClick: () => void;
    disabled?: boolean;
  }> = ({ role, onClick, disabled }) => (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="gap-2"
    >
      {roleIcons[role]}
      {roleLabels[role]} 추가
    </Button>
  );

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            작업 권한 관리
          </h2>
          <p className="text-gray-600 mt-1">{taskTitle}</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <QuickActionButton
              role={TaskRole.ASSIGNEE}
              onClick={() => {/* TODO: 담당자 변경 모달 */}}
            />
            <QuickActionButton
              role={TaskRole.REVIEWER}
              onClick={() => {/* TODO: 리뷰어 추가 모달 */}}
            />
            <Button onClick={() => setShowGrantModal(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              권한 부여
            </Button>
          </div>
        )}
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="전체 권한"
          value={stats.totalPermissions}
          icon={<Users className="h-5 w-5" />}
          color="text-blue-600"
        />
        <StatCard
          title="담당자"
          value={stats.roleStats[TaskRole.ASSIGNEE]}
          icon={<UserCheck className="h-5 w-5" />}
          color="text-green-600"
          description={stats.roleStats[TaskRole.ASSIGNEE] === 0 ? "담당자 없음" : undefined}
        />
        <StatCard
          title="리뷰어"
          value={stats.roleStats[TaskRole.REVIEWER]}
          icon={<GitPullRequest className="h-5 w-5" />}
          color="text-blue-600"
        />
        <StatCard
          title="관찰자"
          value={stats.roleStats[TaskRole.WATCHER]}
          icon={<Eye className="h-5 w-5" />}
          color="text-gray-600"
        />
      </div>

      {/* 알림 배너 */}
      {stats.roleStats[TaskRole.ASSIGNEE] === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">
              이 작업에 담당자가 지정되지 않았습니다
            </span>
          </div>
          <p className="text-yellow-700 text-sm mt-1">
            작업을 진행하려면 담당자를 지정해주세요.
          </p>
        </div>
      )}

      {(expiredPermissions.length > 0 || expiringPermissions.length > 0) && (
        <div className="space-y-2">
          {expiredPermissions.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">
                  {expiredPermissions.length}개의 권한이 만료되었습니다
                </span>
              </div>
              <p className="text-red-700 text-sm mt-1">
                만료된 권한을 가진 사용자는 작업에 접근할 수 없습니다.
              </p>
            </div>
          )}
          
          {expiringPermissions.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-orange-800">
                <Clock className="h-5 w-5" />
                <span className="font-medium">
                  {expiringPermissions.length}개의 권한이 곧 만료됩니다
                </span>
              </div>
              <p className="text-orange-700 text-sm mt-1">
                7일 이내에 만료되는 권한이 있습니다. 필요시 연장해주세요.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 역할별 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(TaskRole).map(([key, role]) => {
          const rolePermissions = getPermissionsByRole(role);
          const isAssignee = role === TaskRole.ASSIGNEE;
          
          return (
            <Card key={role} className={rolePermissions.length === 0 && isAssignee ? 'border-yellow-200' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  {roleIcons[role]}
                  {roleLabels[role]}
                  <Badge className={getRoleBadgeColor(role)}>
                    {rolePermissions.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {rolePermissions.length === 0 ? (
                  <div className="text-sm text-gray-500">
                    {isAssignee ? '담당자 없음' : `${roleLabels[role]} 없음`}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {rolePermissions.slice(0, 2).map((permission) => (
                      <div key={permission.id} className="text-sm">
                        사용자 {permission.userId}
                      </div>
                    ))}
                    {rolePermissions.length > 2 && (
                      <div className="text-sm text-gray-500">
                        외 {rolePermissions.length - 2}명
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 탭 컨텐츠 */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" className="gap-1">
            전체
            <Badge variant="secondary" className="ml-1">
              {permissions.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="assignees" className="gap-1">
            담당자
            <Badge variant="secondary" className="ml-1">
              {stats.roleStats[TaskRole.ASSIGNEE]}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="reviewers" className="gap-1">
            리뷰어
            <Badge variant="secondary" className="ml-1">
              {stats.roleStats[TaskRole.REVIEWER]}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="collaborators" className="gap-1">
            협업자
            <Badge variant="secondary" className="ml-1">
              {stats.roleStats[TaskRole.COLLABORATOR]}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="watchers" className="gap-1">
            관찰자
            <Badge variant="secondary" className="ml-1">
              {stats.roleStats[TaskRole.WATCHER]}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>모든 권한</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskPermissionList
                taskId={taskId}
                permissions={permissions}
                loading={loading}
                canManagePermissions={canManage}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {Object.entries(TaskRole).map(([key, role]) => (
          <TabsContent key={role} value={key.toLowerCase()} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {roleIcons[role]}
                  {roleLabels[role]} 권한
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TaskPermissionList
                  taskId={taskId}
                  permissions={getPermissionsByRole(role)}
                  loading={loading}
                  canManagePermissions={canManage}
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* 권한 부여 모달 */}
      <TaskPermissionModal
        isOpen={showGrantModal}
        onClose={() => setShowGrantModal(false)}
        taskId={taskId}
        taskTitle={taskTitle}
      />
    </div>
  );
};