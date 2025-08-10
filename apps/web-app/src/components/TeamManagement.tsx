import React, { useState } from 'react';
import { Plus, Settings, Users, Edit2, Trash2, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { Team, TeamRole } from '../types/team';
import { CreateTeamModal } from './CreateTeamModal';
import { EditTeamModal } from './EditTeamModal';
import { ManageTeamMembersModal } from './ManageTeamMembersModal';
import { useTeams } from '../hooks/useTeams';
import { useNotification } from '../contexts/NotificationContext';

export const TeamManagement: React.FC = () => {
  const { t } = useTranslation();
  const { teams, currentTeam, switchTeam, deleteTeam, getUserRole } =
    useTeams();
  const { showConfirm } = useNotification();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const handleEditTeam = (team: Team) => {
    setSelectedTeam(team);
    setIsEditModalOpen(true);
  };

  const handleManageMembers = (team: Team) => {
    setSelectedTeam(team);
    setIsMembersModalOpen(true);
  };

  const handleDeleteTeam = async (team: Team) => {
    const confirmed = await showConfirm({
      title: t('team.deleteTeam'),
      message: t('team.confirmDeleteTeam', { teamName: team.name }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      variant: 'danger',
    });

    if (confirmed) {
      try {
        await deleteTeam(team.id);
      } catch (error) {
        // Error handling for team deletion - 에러는 useTeams 훅에서 토스트로 처리됨
      }
    }
  };

  const canEdit = (team: Team): boolean => {
    const role = getUserRole(team.id);
    return role === TeamRole.OWNER || role === TeamRole.ADMIN;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t('teamManagement.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('teamManagement.description')}
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          {t('team.createTeam')}
        </button>
      </div>

      {/* 현재 팀 정보 */}
      {currentTeam && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 mb-6 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <Crown className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {currentTeam.name}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {t('teamManagement.currentTeamOwner')} •{' '}
                  {currentTeam.memberCount}
                  {t('teamManagement.memberCount')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canEdit(currentTeam) && (
                <>
                  <button
                    onClick={() => handleManageMembers(currentTeam)}
                    className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                  >
                    <Users size={16} />
                    {t('team.manageMembers')}
                  </button>
                  <button
                    onClick={() => handleEditTeam(currentTeam)}
                    className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                  >
                    <Settings size={16} />
                    {t('teamManagement.settings')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 팀 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map(team => {
          const userRole = getUserRole(team.id);
          const isCurrentTeam = currentTeam?.id === team.id;

          return (
            <div
              key={team.id}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border transition-all hover:shadow-lg ${
                isCurrentTeam
                  ? 'border-blue-500 ring-2 ring-blue-500/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {team.name}
                      </h3>
                      {userRole === TeamRole.OWNER && (
                        <Crown size={16} className="text-yellow-500" />
                      )}
                      {isCurrentTeam && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                          {t('team.currentTeam')}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                      {team.description || t('team.noDescription')}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Users size={14} />
                        {team.memberCount}명
                      </div>
                      <div className="flex items-center gap-1">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            team.isActive ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        />
                        {team.isActive ? t('team.active') : t('team.inactive')}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isCurrentTeam && (
                    <button
                      onClick={() => switchTeam(team)}
                      className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg transition-colors text-sm font-medium"
                    >
                      {t('team.switchTeam')}
                    </button>
                  )}
                  {canEdit(team) && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditTeam(team)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title={t('team.editTeam')}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleManageMembers(team)}
                        className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                        title={t('team.manageMembers')}
                      >
                        <Users size={16} />
                      </button>
                      {userRole === TeamRole.OWNER && (
                        <button
                          onClick={() => handleDeleteTeam(team)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title={t('team.deleteTeam')}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {teams.length === 0 && (
        <div className="text-center py-12">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {t('team.noTeams')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('teamManagement.joinTeam')}
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            {t('team.createTeam')}
          </button>
        </div>
      )}

      {/* 모달들 */}
      <CreateTeamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {selectedTeam && (
        <>
          <EditTeamModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedTeam(null);
            }}
            team={selectedTeam}
          />

          <ManageTeamMembersModal
            isOpen={isMembersModalOpen}
            onClose={() => {
              setIsMembersModalOpen(false);
              setSelectedTeam(null);
            }}
            team={selectedTeam}
          />
        </>
      )}
    </div>
  );
};
