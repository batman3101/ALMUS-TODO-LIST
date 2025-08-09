import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Crown,
  Shield,
  Edit,
  Eye,
  Trash2,
  Mail,
  Search,
  Filter,
} from 'lucide-react';
import { Team, TeamMember, TeamRole } from '../types/team';
import { useTeams } from '../hooks/useTeams';
import { useTeamMembers } from '../hooks/useTeamMembers';
import { useAuth } from '../hooks/useAuth';
import { InviteMemberModal } from './InviteMemberModal';

interface ManageTeamMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team;
}

const roleColors = {
  [TeamRole.OWNER]:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  [TeamRole.ADMIN]:
    'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  [TeamRole.EDITOR]:
    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  [TeamRole.VIEWER]:
    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

const roleIcons = {
  [TeamRole.OWNER]: Crown,
  [TeamRole.ADMIN]: Shield,
  [TeamRole.EDITOR]: Edit,
  [TeamRole.VIEWER]: Eye,
};

const roleLabels = {
  [TeamRole.OWNER]: '소유자',
  [TeamRole.ADMIN]: '관리자',
  [TeamRole.EDITOR]: '편집자',
  [TeamRole.VIEWER]: '보기 전용',
};

export const ManageTeamMembersModal: React.FC<ManageTeamMembersModalProps> = ({
  isOpen,
  onClose,
  team,
}) => {
  const { user } = useAuth();
  const { canManageTeam } = useTeams();
  const teamMembersQuery = useTeamMembers(team.id);
  const members = teamMembersQuery?.members ?? [];
  const invitations = teamMembersQuery?.invitations ?? [];
  const loading = teamMembersQuery?.loading ?? false;
  const updateMemberRole = teamMembersQuery?.updateMemberRole ?? (async () => {});
  const removeMember = teamMembersQuery?.removeMember ?? (async () => {});
  const cancelInvitation = teamMembersQuery?.cancelInvitation ?? (async () => {});
  const resendInvitation = teamMembersQuery?.resendInvitation ?? (async () => {});

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<TeamRole | 'ALL'>('ALL');
  const [isChangingRole, setIsChangingRole] = useState(false);

  const canManage = canManageTeam(team.id);
  // const isOwner = team.ownerId === user?.id;

  const filteredMembers = (members || []).filter(member => {
    const matchesSearch =
      member.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.user?.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleRoleChange = async (member: TeamMember, newRole: TeamRole) => {
    if (!canManage || member.role === TeamRole.OWNER) return;

    setIsChangingRole(true);
    try {
      await updateMemberRole(member.id, newRole);
    } catch (error) {
      // Error handling should be done by the hook
    } finally {
      setIsChangingRole(false);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (!canManage || member.role === TeamRole.OWNER) return;

    const confirmMessage = `정말로 ${member.user?.name}님을 팀에서 제거하시겠습니까?`;
    if (!window.confirm(confirmMessage)) return;

    try {
      await removeMember(member.id);
    } catch (error) {
      // Error handling should be done by the hook
    }
  };

  const getRoleIcon = (role: TeamRole) => {
    const Icon = roleIcons[role];
    return <Icon size={16} />;
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                팀 멤버 관리
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {team.name} • 총 {members.length}명
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canManage && (
                <button
                  onClick={() => setIsInviteModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <UserPlus size={16} />
                  멤버 초대
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* 검색 및 필터 */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search
                  size={20}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="이름 또는 이메일로 검색..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
              <div className="relative">
                <Filter
                  size={20}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
                <select
                  value={roleFilter}
                  onChange={e =>
                    setRoleFilter(e.target.value as TeamRole | 'ALL')
                  }
                  className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="ALL">모든 역할</option>
                  <option value={TeamRole.OWNER}>소유자</option>
                  <option value={TeamRole.ADMIN}>관리자</option>
                  <option value={TeamRole.EDITOR}>편집자</option>
                  <option value={TeamRole.VIEWER}>보기 전용</option>
                </select>
              </div>
            </div>

            {/* 멤버 목록 */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    멤버 목록을 불러오는 중...
                  </p>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400">
                    {searchTerm || roleFilter !== 'ALL'
                      ? '검색 조건에 맞는 멤버가 없습니다.'
                      : '팀 멤버가 없습니다.'}
                  </p>
                </div>
              ) : (
                filteredMembers.map(member => {
                  const RoleIcon = roleIcons[member.role];
                  const canChangeRole =
                    canManage &&
                    member.role !== TeamRole.OWNER &&
                    member.userId !== user?.id;
                  const canRemove =
                    canManage &&
                    member.role !== TeamRole.OWNER &&
                    member.userId !== user?.id;

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {member.user?.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900 dark:text-gray-100">
                              {member.user?.name}
                            </h3>
                            {member.userId === user?.id && (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                                나
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {member.user?.email}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {member.joinedAt.toLocaleDateString('ko-KR')} 가입
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {canChangeRole ? (
                          <select
                            value={member.role}
                            onChange={e =>
                              handleRoleChange(
                                member,
                                e.target.value as TeamRole
                              )
                            }
                            disabled={isChangingRole}
                            className={`px-3 py-1 text-sm rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 ${roleColors[member.role]}`}
                          >
                            <option value={TeamRole.ADMIN}>관리자</option>
                            <option value={TeamRole.EDITOR}>편집자</option>
                            <option value={TeamRole.VIEWER}>보기 전용</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 text-sm rounded-full ${roleColors[member.role]}`}
                          >
                            <RoleIcon size={14} />
                            {roleLabels[member.role]}
                          </span>
                        )}

                        {canRemove && (
                          <button
                            onClick={() => handleRemoveMember(member)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="멤버 제거"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 대기 중인 초대 */}
            {invitations.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  대기 중인 초대 ({invitations.length}개)
                </h3>
                <div className="space-y-3">
                  {invitations.map(invitation => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                          <Mail
                            size={16}
                            className="text-gray-600 dark:text-gray-400"
                          />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">
                            {invitation.email}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {invitation.invitedByUser?.name}님이{' '}
                            {invitation.createdAt.toLocaleDateString('ko-KR')}에
                            초대
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {invitation.expiresAt.toLocaleDateString('ko-KR')}{' '}
                            만료
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 text-sm rounded-full ${roleColors[invitation.role]}`}
                        >
                          {getRoleIcon(invitation.role)}
                          {roleLabels[invitation.role]}
                        </span>

                        {canManage && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => resendInvitation(invitation.id)}
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                              title="초대 재전송"
                            >
                              <Mail size={16} />
                            </button>
                            <button
                              onClick={() => cancelInvitation(invitation.id)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              title="초대 취소"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 권한 설명 */}
            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                역할별 권한
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                  <Crown size={14} />
                  <span>
                    <strong>소유자:</strong> 모든 권한, 팀 삭제 가능
                  </span>
                </div>
                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                  <Shield size={14} />
                  <span>
                    <strong>관리자:</strong> 멤버 관리, 설정 변경
                  </span>
                </div>
                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                  <Edit size={14} />
                  <span>
                    <strong>편집자:</strong> 작업 생성/수정/삭제
                  </span>
                </div>
                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                  <Eye size={14} />
                  <span>
                    <strong>보기 전용:</strong> 작업 보기만 가능
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 멤버 초대 모달 */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        team={team}
      />
    </>
  );
};
