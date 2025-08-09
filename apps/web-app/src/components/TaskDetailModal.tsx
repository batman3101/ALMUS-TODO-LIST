import React from 'react';
import { X, Calendar, Clock, User, Tag, AlertCircle } from 'lucide-react';
import { Task } from '../types/team';
import { TaskStatus, TaskPriority } from '@almus/shared-types';

interface TaskDetailModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.TODO:
        return 'bg-pink-100 dark:bg-pink-800 text-pink-800 dark:text-pink-200';
      case TaskStatus.IN_PROGRESS:
        return 'bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200';
      case TaskStatus.REVIEW:
        return 'bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200';
      case TaskStatus.DONE:
        return 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.LOW:
        return 'text-gray-500 dark:text-gray-400';
      case TaskPriority.MEDIUM:
        return 'text-blue-500 dark:text-blue-400';
      case TaskPriority.HIGH:
        return 'text-orange-500 dark:text-orange-400';
      case TaskPriority.URGENT:
        return 'text-red-500 dark:text-red-400';
      default:
        return 'text-gray-500 dark:text-gray-400';
    }
  };

  const getStatusText = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.TODO:
        return '시작 전';
      case TaskStatus.IN_PROGRESS:
        return '진행중';
      case TaskStatus.REVIEW:
        return '검토중';
      case TaskStatus.DONE:
        return '완료';
      default:
        return '시작 전';
    }
  };

  const getPriorityText = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.LOW:
        return '낮음';
      case TaskPriority.MEDIUM:
        return '보통';
      case TaskPriority.HIGH:
        return '높음';
      case TaskPriority.URGENT:
        return '긴급';
      default:
        return '보통';
    }
  };

  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-dark-100 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex justify-between items-start p-6 border-b border-gray-200 dark:border-dark-300">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-900 mb-2">
              {task.title}
            </h2>
            <div className="flex items-center space-x-3">
              <span
                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}
              >
                {getStatusText(task.status)}
              </span>
              <span
                className={`text-sm font-medium ${getPriorityColor(task.priority)}`}
              >
                <AlertCircle className="w-4 h-4 inline mr-1" />
                {getPriorityText(task.priority)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-dark-400 dark:hover:text-dark-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6 space-y-6">
          {/* 설명 */}
          {task.description && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
                설명
              </h3>
              <p className="text-gray-900 dark:text-dark-900 whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          {/* 상세 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 담당자 */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-dark-700 mb-2 flex items-center">
                <User className="w-4 h-4 mr-1" />
                담당자
              </h3>
              <p className="text-gray-900 dark:text-dark-900">
                {task.assignee?.name || '-'}
              </p>
            </div>

            {/* 팀 */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-dark-700 mb-2 flex items-center">
                <Tag className="w-4 h-4 mr-1" />팀
              </h3>
              <p className="text-gray-900 dark:text-dark-900">
                {task.team?.name || '-'}
              </p>
            </div>

            {/* 시작일 */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-dark-700 mb-2 flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                시작일
              </h3>
              <p className="text-gray-900 dark:text-dark-900">
                {formatDate(task.start_date)}
              </p>
            </div>

            {/* 마감일 */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-dark-700 mb-2 flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                마감일
              </h3>
              <p className="text-gray-900 dark:text-dark-900">
                {formatDate(task.due_date)}
              </p>
            </div>
          </div>

          {/* 생성/수정 정보 */}
          <div className="border-t border-gray-200 dark:border-dark-300 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500 dark:text-dark-500">
              <div>
                <span className="font-medium">생성일:</span>{' '}
                {formatDate(task.created_at)}
              </div>
              {task.updated_at && task.updated_at !== task.created_at && (
                <div>
                  <span className="font-medium">수정일:</span>{' '}
                  {formatDate(task.updated_at)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-dark-300">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-dark-700 bg-gray-100 dark:bg-dark-200 hover:bg-gray-200 dark:hover:bg-dark-300 rounded-md transition-colors duration-200"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;
