import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Crown,
  Shield,
  Edit,
  Eye,
  Trash2,
  Search,
  Filter,
  Download,
  Upload,
} from 'lucide-react';
import { Team, TeamMember, TeamRole } from '../types/team';
import { useTeams } from '../hooks/useTeams';
import {
  useTeamMembers,
  useUpdateMemberRole,
  useRemoveMember,
  useInviteTeamMember,
} from '../hooks/useApiService';
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

  // React Query 훅 사용
  const {
    data: members = [],
    isLoading: loading,
    error,
  } = useTeamMembers(team.id);

  // Mutations
  const updateMemberRoleMutation = useUpdateMemberRole();
  const removeMemberMutation = useRemoveMember();
  const inviteMemberMutation = useInviteTeamMember();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<TeamRole | 'ALL'>('ALL');
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const canManage = canManageTeam(team.id);

  // 디버깅용 로그 - 개발 환경에서만
  if (process.env.NODE_ENV === 'development') {
    console.log('ManageTeamMembersModal - team:', team);
    console.log('ManageTeamMembersModal - members:', members);
    console.log('ManageTeamMembersModal - loading:', loading);
    console.log('ManageTeamMembersModal - error:', error);
  }

  const filteredMembers = (members || []).filter(member => {
    const matchesSearch =
      member.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleRoleChange = async (member: TeamMember, newRole: TeamRole) => {
    if (!canManage || member.role === TeamRole.OWNER) return;

    setIsChangingRole(true);
    try {
      await updateMemberRoleMutation.mutateAsync({
        memberId: member.id,
        role: newRole,
      });
    } catch (error) {
      console.error('Error updating member role:', error);
    } finally {
      setIsChangingRole(false);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (!canManage || member.role === TeamRole.OWNER) return;

    const confirmMessage = `정말로 ${member.user?.name}님을 팀에서 제거하시겠습니까?`;
    if (!window.confirm(confirmMessage)) return;

    try {
      await removeMemberMutation.mutateAsync(member.id);
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  // CSV 템플릿 다운로드 함수
  const downloadCSVTemplate = () => {
    const csvContent = [
      ['email', 'name', 'role'],
      ['example1@email.com', '김철수', 'EDITOR'],
      ['example2@email.com', '이영희', 'VIEWER'],
      ['example3@email.com', '박민수', 'ADMIN'],
    ];

    const csvString = csvContent
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvString], {
      type: 'text/csv;charset=utf-8;',
    });

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `team_members_template_${team.name}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV 파일 업로드 및 파싱 함수
  const handleCSVUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('CSV 파일만 업로드 가능합니다.');
      return;
    }

    setIsUploading(true);
    setUploadResults(null);

    try {
      const text = await file.text();
      const lines = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line);

      if (lines.length < 2) {
        alert('CSV 파일에 데이터가 없습니다.');
        setIsUploading(false);
        return;
      }

      // 헤더 제거
      const dataLines = lines.slice(1);
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      // 각 행 처리
      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i];
        const columns = line
          .split(',')
          .map(col => col.replace(/^"|"$/g, '').trim());

        if (columns.length < 3) {
          results.failed++;
          results.errors.push(
            `행 ${i + 2}: 필수 데이터가 부족합니다 (이메일, 이름, 역할)`
          );
          continue;
        }

        const [email, name, role] = columns;

        // 유효성 검사
        if (!email || !email.includes('@')) {
          results.failed++;
          results.errors.push(`행 ${i + 2}: 유효하지 않은 이메일 주소`);
          continue;
        }

        if (!name.trim()) {
          results.failed++;
          results.errors.push(`행 ${i + 2}: 이름이 비어있습니다`);
          continue;
        }

        if (
          !['OWNER', 'ADMIN', 'EDITOR', 'VIEWER'].includes(role.toUpperCase())
        ) {
          results.failed++;
          results.errors.push(`행 ${i + 2}: 유효하지 않은 역할 (${role})`);
          continue;
        }

        try {
          // 실제 초대 API 호출
          await inviteMemberMutation.mutateAsync({
            teamId: team.id,
            email: email,
            role: role.toUpperCase() as TeamRole,
          });
          results.success++;
        } catch (error) {
          results.failed++;
          const errorMessage =
            error instanceof Error ? error.message : '초대 실패';
          results.errors.push(`행 ${i + 2}: ${email} - ${errorMessage}`);
        }
      }

      setUploadResults(results);
    } catch (error) {
      alert('CSV 파일 읽기에 실패했습니다.');
      console.error('CSV upload error:', error);
    } finally {
      setIsUploading(false);
      // 파일 입력 초기화
      event.target.value = '';
    }
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
                <>
                  <button
                    onClick={downloadCSVTemplate}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    title="CSV 템플릿 다운로드"
                  >
                    <Download size={16} />
                    템플릿 다운로드
                  </button>
                  <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <UserPlus size={16} />
                    개별 초대
                  </button>
                </>
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

            {/* CSV 업로드 섹션 */}
            {canManage && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-blue-900 dark:text-blue-100">
                    일괄 멤버 초대
                  </h3>
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    CSV 파일로 여러 멤버를 한 번에 초대
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleCSVUpload}
                        disabled={isUploading}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2">
                        {isUploading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <span className="text-blue-700 dark:text-blue-300">
                              업로드 중...
                            </span>
                          </>
                        ) : (
                          <>
                            <Upload
                              size={16}
                              className="text-blue-600 dark:text-blue-400"
                            />
                            <span className="text-blue-700 dark:text-blue-300">
                              CSV 파일 선택 또는 드래그하여 업로드
                            </span>
                          </>
                        )}
                      </div>
                    </label>
                  </div>
                </div>

                <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                  • CSV 형식: 이메일, 이름, 역할 (OWNER, ADMIN, EDITOR, VIEWER)
                  • 먼저 템플릿을 다운로드하여 형식을 확인하세요
                </div>

                {/* 업로드 결과 표시 */}
                {uploadResults && (
                  <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        업로드 결과
                      </h4>
                      <button
                        onClick={() => setUploadResults(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {uploadResults.success}
                        </div>
                        <div className="text-xs text-green-700 dark:text-green-300">
                          성공
                        </div>
                      </div>
                      <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {uploadResults.failed}
                        </div>
                        <div className="text-xs text-red-700 dark:text-red-300">
                          실패
                        </div>
                      </div>
                    </div>

                    {uploadResults.errors.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                          오류 목록:
                        </h5>
                        <div className="max-h-32 overflow-y-auto text-xs text-red-600 dark:text-red-400 space-y-1">
                          {uploadResults.errors.map((error, index) => (
                            <div key={index} className="flex items-start gap-1">
                              <span>•</span>
                              <span>{error}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

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
                    member.user_id !== user?.id;
                  const canRemove =
                    canManage &&
                    member.role !== TeamRole.OWNER &&
                    member.user_id !== user?.id;

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
                            {member.user_id === user?.id && (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                                나
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {member.user?.email}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(member.joined_at).toLocaleDateString(
                              'ko-KR'
                            )}{' '}
                            가입
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
