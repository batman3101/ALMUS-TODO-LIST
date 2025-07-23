import React, { useState, useEffect } from 'react';
import { X, Settings, Globe, Users } from 'lucide-react';
import { Team, UpdateTeamInput, TeamRole } from '@almus/shared-types';
import { useTeams } from '../hooks/useTeams';

interface EditTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team;
}

export const EditTeamModal: React.FC<EditTeamModalProps> = ({
  isOpen,
  onClose,
  team,
}) => {
  const { updateTeam } = useTeams();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<UpdateTeamInput>({
    id: team.id,
    name: team.name,
    description: team.description,
    settings: team.settings,
    isActive: team.isActive,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when team changes
  useEffect(() => {
    setFormData({
      id: team.id,
      name: team.name,
      description: team.description,
      settings: team.settings,
      isActive: team.isActive,
    });
    setErrors({});
  }, [team]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = '팀 이름을 입력해주세요';
    } else if (formData.name.length < 2) {
      newErrors.name = '팀 이름은 2자 이상이어야 합니다';
    } else if (formData.name.length > 50) {
      newErrors.name = '팀 이름은 50자 이하여야 합니다';
    }

    if (formData.description && formData.description.length > 200) {
      newErrors.description = '설명은 200자 이하여야 합니다';
    }

    if (!formData.settings?.maxMembers || formData.settings.maxMembers < 1) {
      newErrors.maxMembers = '최대 멤버 수는 1명 이상이어야 합니다';
    } else if (formData.settings.maxMembers > 1000) {
      newErrors.maxMembers = '최대 멤버 수는 1000명 이하여야 합니다';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await updateTeam(formData);
      onClose();
    } catch (error) {
      console.error('팀 수정 실패:', error);
      setErrors({ submit: '팀 수정에 실패했습니다. 다시 시도해주세요.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof UpdateTeamInput] as any || {}),
          [child]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const hasChanges = (): boolean => {
    return (
      formData.name !== team.name ||
      formData.description !== team.description ||
      formData.isActive !== team.isActive ||
      JSON.stringify(formData.settings) !== JSON.stringify(team.settings)
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            팀 설정 편집
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 기본 정보 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              기본 정보
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                팀 이름 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                  errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="예: 마케팅팀, 개발팀"
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                팀 설명
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                  errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="팀에 대한 간단한 설명을 입력하세요"
                disabled={isLoading}
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description}</p>
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  팀 활성화
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  비활성화하면 팀 멤버들이 팀에 접근할 수 없습니다
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  className="sr-only peer"
                  disabled={isLoading}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* 팀 설정 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Settings size={18} />
              팀 설정
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  최대 멤버 수
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.settings?.maxMembers}
                  onChange={(e) => handleInputChange('settings.maxMembers', parseInt(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 ${
                    errors.maxMembers ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  disabled={isLoading}
                />
                {errors.maxMembers && (
                  <p className="text-red-500 text-sm mt-1">{errors.maxMembers}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  현재 멤버: {team.memberCount}명
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  기본 멤버 역할
                </label>
                <select
                  value={formData.settings?.defaultMemberRole}
                  onChange={(e) => handleInputChange('settings.defaultMemberRole', e.target.value as TeamRole)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  disabled={isLoading}
                >
                  <option value={TeamRole.VIEWER}>보기 전용</option>
                  <option value={TeamRole.EDITOR}>편집자</option>
                  <option value={TeamRole.ADMIN}>관리자</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe size={16} className="text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    공개 팀
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.settings?.isPublic}
                    onChange={(e) => handleInputChange('settings.isPublic', e.target.checked)}
                    className="sr-only peer"
                    disabled={isLoading}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    초대 허용
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.settings?.allowInvitations}
                    onChange={(e) => handleInputChange('settings.allowInvitations', e.target.checked)}
                    className="sr-only peer"
                    disabled={isLoading}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* 기능 설정 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              팀 기능
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { key: 'ganttView', label: '간트 차트', desc: '프로젝트 타임라인 관리' },
                { key: 'timeTracking', label: '시간 추적', desc: '작업 시간 기록' },
                { key: 'advancedReporting', label: '고급 보고서', desc: '상세한 분석 리포트' },
                { key: 'customFields', label: '커스텀 필드', desc: '사용자 정의 작업 필드' },
                { key: 'integrations', label: '외부 연동', desc: '슬랙, 지라 등 연동' },
              ].map((feature) => (
                <div key={feature.key} className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <input
                    type="checkbox"
                    id={`edit-${feature.key}`}
                    checked={formData.settings?.features?.[feature.key as keyof typeof formData.settings.features]}
                    onChange={(e) => handleInputChange(`settings.features.${feature.key}`, e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={isLoading}
                  />
                  <div className="flex-1">
                    <label htmlFor={`edit-${feature.key}`} className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                      {feature.label}
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

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
              className={`px-4 py-2 rounded-lg transition-colors ${
                hasChanges()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              disabled={isLoading || !hasChanges()}
            >
              {isLoading ? '저장 중...' : '변경사항 저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};