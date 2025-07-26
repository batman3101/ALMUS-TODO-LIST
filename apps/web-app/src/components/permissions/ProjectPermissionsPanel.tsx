import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  UserPlus,
  Shield,
  AlertTriangle,
  TrendingUp,
  Users,
  Clock,
  BarChart3,
} from 'lucide-react';
import { useProjectPermissions } from '../../hooks/useProjectPermissions';
import { usePermissions } from '../../hooks/usePermissions';
import { ProjectPermissionModal } from './ProjectPermissionModal';
import { ProjectPermissionList } from './ProjectPermissionList';
import { ProjectRole } from '../../types/team';

interface ProjectPermissionsPanelProps {
  projectId: string;
  projectName: string;
}

export const ProjectPermissionsPanel: React.FC<
  ProjectPermissionsPanelProps
> = ({ projectId, projectName }) => {
  const {
    permissions,
    loading,
    getPermissionsByRole,
    getExpiredPermissions,
    getExpiringPermissions,
    getPermissionStats,
  } = useProjectPermissions(projectId);
  const { canManageProjectPermissions } = usePermissions();
  const [showGrantModal, setShowGrantModal] = useState(false);

  const stats = getPermissionStats();
  const expiredPermissions = getExpiredPermissions();
  const expiringPermissions = getExpiringPermissions();
  const canManage = canManageProjectPermissions(projectId);

  const roleLabels: Record<ProjectRole, string> = {
    [ProjectRole.PROJECT_MANAGER]: '프로젝트 매니저',
    [ProjectRole.PROJECT_LEAD]: '프로젝트 리드',
    [ProjectRole.CONTRIBUTOR]: '기여자',
    [ProjectRole.OBSERVER]: '관찰자',
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
          <div className={`${color} p-2 rounded-lg bg-opacity-10`}>{icon}</div>
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

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            프로젝트 권한 관리
          </h2>
          <p className="text-gray-600 mt-1">{projectName}</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowGrantModal(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            권한 부여
          </Button>
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
          title="곧 만료"
          value={stats.expiringCount}
          icon={<Clock className="h-5 w-5" />}
          color="text-orange-600"
          description={stats.expiringCount > 0 ? '7일 내 만료' : undefined}
        />
        <StatCard
          title="만료됨"
          value={stats.expiredCount}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="text-red-600"
          description={stats.expiredCount > 0 ? '즉시 갱신 필요' : undefined}
        />
        <StatCard
          title="매니저"
          value={stats.roleStats[ProjectRole.PROJECT_MANAGER]}
          icon={<BarChart3 className="h-5 w-5" />}
          color="text-purple-600"
        />
      </div>

      {/* 알림 배너 */}
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
                만료된 권한을 가진 사용자는 프로젝트에 접근할 수 없습니다.
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

      {/* 탭 컨텐츠 */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" className="gap-1">
            전체
            <Badge variant="secondary" className="ml-1">
              {permissions.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="managers" className="gap-1">
            매니저
            <Badge variant="secondary" className="ml-1">
              {stats.roleStats[ProjectRole.PROJECT_MANAGER]}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-1">
            리드
            <Badge variant="secondary" className="ml-1">
              {stats.roleStats[ProjectRole.PROJECT_LEAD]}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="contributors" className="gap-1">
            기여자
            <Badge variant="secondary" className="ml-1">
              {stats.roleStats[ProjectRole.CONTRIBUTOR]}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="observers" className="gap-1">
            관찰자
            <Badge variant="secondary" className="ml-1">
              {stats.roleStats[ProjectRole.OBSERVER]}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>모든 권한</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectPermissionList
                projectId={projectId}
                permissions={permissions}
                loading={loading}
                canManagePermissions={canManage}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {Object.entries(ProjectRole).map(([key, role]) => (
          <TabsContent key={role} value={key.toLowerCase()} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{roleLabels[role]} 권한</CardTitle>
              </CardHeader>
              <CardContent>
                <ProjectPermissionList
                  projectId={projectId}
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
      <ProjectPermissionModal
        isOpen={showGrantModal}
        onClose={() => setShowGrantModal(false)}
        projectId={projectId}
        projectName={projectName}
      />
    </div>
  );
};
