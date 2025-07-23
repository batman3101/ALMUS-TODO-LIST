import React, { useState } from 'react';
import { X, Mail, UserPlus, Crown, Shield, Edit, Eye } from 'lucide-react';
import { Team, TeamRole, InviteTeamMemberInput } from '@almus/shared-types';
import { useTeams } from '../hooks/useTeams';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team;
}

const roleOptions = [
  {
    value: TeamRole.VIEWER,
    label: '보기 전용',
    description: '작업을 보고 댓글을 달 수 있습니다',
    icon: Eye,
    color: 'text-gray-600',
  },
  {
    value: TeamRole.EDITOR,
    label: '편집자',
    description: '작업을 생성, 수정, 삭제할 수 있습니다',
    icon: Edit,
    color: 'text-blue-600',
  },
  {
    value: TeamRole.ADMIN,
    label: '관리자',
    description: '팀 설정과 멤버를 관리할 수 있습니다',
    icon: Shield,
    color: 'text-purple-600',
  },
];

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  team,
}) => {
  const { inviteTeamMember } = useTeams();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<InviteTeamMemberInput>({
    teamId: team.id,
    email: '',
    role: team.settings.defaultMemberRole,
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력해주세요';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식을 입력해주세요';
    }

    // Message validation
    if (formData.message && formData.message.length > 500) {
      newErrors.message = '메시지는 500자 이하여야 합니다';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await inviteTeamMember(formData);
      onClose();
      // Reset form
      setFormData({
        teamId: team.id,
        email: '',
        role: team.settings.defaultMemberRole,
        message: '',
      });
      setErrors({});
    } catch (error) {
      console.error('멤버 초대 실패:', error);
      setErrors({ submit: '멤버 초대에 실패했습니다. 다시 시도해주세요.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof InviteTeamMemberInput, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <UserPlus size={20} />
            팀 멤버 초대
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 팀 정보 */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              {team.name}
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              현재 멤버 {team.memberCount}명 / 최대 {team.settings.maxMembers}명
            </p>
          </div>

          {/* 이메일 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              초대할 이메일 주소 *
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                  errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="example@company.com"
                disabled={isLoading}
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          {/* 역할 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              역할 선택
            </label>
            <div className="space-y-3">
              {roleOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.role === option.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={option.value}
                      checked={formData.role === option.value}
                      onChange={(e) => handleInputChange('role', e.target.value as TeamRole)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      disabled={isLoading}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon size={16} className={option.color} />
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {option.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {option.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 초대 메시지 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              초대 메시지 (선택사항)
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                errors.message ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="팀에 함께하게 되어 기쁩니다! 궁금한 점이 있으면 언제든지 연락해주세요."
              disabled={isLoading}
            />
            {errors.message && (
              <p className="text-red-500 text-sm mt-1">{errors.message}</p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formData.message ? formData.message.length : 0}/500자
            </p>
          </div>

          {/* 초대 제한 안내 */}
          {team.memberCount >= team.settings.maxMembers && (
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
              <p className="text-orange-800 dark:text-orange-200 text-sm">
                ⚠️ 팀 멤버 수가 최대 제한에 도달했습니다. 새 멤버를 초대하려면 팀 설정에서 최대 멤버 수를 늘리거나 기존 멤버를 제거해주세요.
              </p>
            </div>
          )}

          {/* 오류 메시지 */}
          {errors.submit && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={isLoading}
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={isLoading || team.memberCount >= team.settings.maxMembers}
            >
              {isLoading ? '초대 중...' : '초대 보내기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};