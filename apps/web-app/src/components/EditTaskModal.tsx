import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Task, UpdateTaskInput } from '@almus/shared-types';
import type {
  TaskStatus,
  TaskPriority,
} from '@almus/shared-types/src/supabase-schema';
import { useNotification } from '../contexts/NotificationContext';

interface EditTaskModalProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onSave: (taskId: string, updateData: UpdateTaskInput) => void;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen,
  task,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();
  const { success, error: showError } = useNotification();

  const [formData, setFormData] = useState<UpdateTaskInput>({
    title: '',
    description: '',
    assigneeId: '',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    startDate: undefined,
    dueDate: undefined,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 태스크 데이터로 폼 초기화
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        assigneeId: task.assigneeId || '',
        status: task.status,
        priority: task.priority,
        startDate: task.startDate ? new Date(task.startDate) : undefined,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      });
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!task || !formData.title?.trim()) {
      showError('제목을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSave(task.id, formData);
      success('태스크가 성공적으로 수정되었습니다.');
      onClose();
    } catch (error) {
      showError('태스크 수정에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    field: keyof UpdateTaskInput,
    value: string | Date | undefined | TaskStatus | TaskPriority
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const formatDateForInput = (date: Date | undefined): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const parseDateFromInput = (dateString: string): Date | undefined => {
    if (!dateString) return undefined;
    return new Date(dateString + 'T00:00:00.000Z');
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-dark-100 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-300">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-900">
            태스크 수정
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-dark-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 모달 본문 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 제목 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1">
              {t('task.title')} *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={e => handleInputChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-400 rounded-md bg-white dark:bg-dark-50 text-gray-900 dark:text-dark-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="태스크 제목을 입력하세요"
              required
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1">
              {t('task.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={e => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-400 rounded-md bg-white dark:bg-dark-50 text-gray-900 dark:text-dark-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows={3}
              placeholder="태스크 설명을 입력하세요"
            />
          </div>

          {/* 담당자 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1">
              {t('task.assignee')}
            </label>
            <input
              type="text"
              value={formData.assigneeId}
              onChange={e => handleInputChange('assigneeId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-400 rounded-md bg-white dark:bg-dark-50 text-gray-900 dark:text-dark-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="담당자를 입력하세요"
            />
          </div>

          {/* 상태 및 우선순위 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1">
                {t('task.status')}
              </label>
              <select
                value={formData.status}
                onChange={e =>
                  handleInputChange('status', e.target.value as TaskStatus)
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-400 rounded-md bg-white dark:bg-dark-50 text-gray-900 dark:text-dark-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value={TaskStatus.TODO}>시작 전</option>
                <option value={TaskStatus.IN_PROGRESS}>진행 중</option>
                <option value={TaskStatus.REVIEW}>검토</option>
                <option value={TaskStatus.DONE}>완료</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1">
                {t('task.priority')}
              </label>
              <select
                value={formData.priority}
                onChange={e =>
                  handleInputChange('priority', e.target.value as TaskPriority)
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-400 rounded-md bg-white dark:bg-dark-50 text-gray-900 dark:text-dark-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value={TaskPriority.LOW}>낮음</option>
                <option value={TaskPriority.MEDIUM}>보통</option>
                <option value={TaskPriority.HIGH}>높음</option>
                <option value={TaskPriority.URGENT}>긴급</option>
              </select>
            </div>
          </div>

          {/* 시작일 및 마감일 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1">
                {t('task.startDate')}
              </label>
              <input
                type="date"
                value={formatDateForInput(formData.startDate)}
                onChange={e =>
                  handleInputChange(
                    'startDate',
                    parseDateFromInput(e.target.value)
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-400 rounded-md bg-white dark:bg-dark-50 text-gray-900 dark:text-dark-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1">
                {t('task.dueDate')}
              </label>
              <input
                type="date"
                value={formatDateForInput(formData.dueDate)}
                onChange={e =>
                  handleInputChange(
                    'dueDate',
                    parseDateFromInput(e.target.value)
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-400 rounded-md bg-white dark:bg-dark-50 text-gray-900 dark:text-dark-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-dark-700 bg-gray-200 dark:bg-dark-200 hover:bg-gray-300 dark:hover:bg-dark-300 rounded-md transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-md transition-colors"
            >
              {isSubmitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTaskModal;
