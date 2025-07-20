import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateTask } from '../hooks/useTasks';
import {
  CreateTaskInput,
  TaskStatus,
  TaskPriority,
  FileMetadata,
} from '@almus/shared-types';
import { FileUpload } from './FileUpload';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../contexts/NotificationContext';

interface CreateTaskFormProps {
  onTaskCreated?: () => void;
  isModal?: boolean;
}

const CreateTaskForm: React.FC<CreateTaskFormProps> = ({
  onTaskCreated,
  isModal = false,
}) => {
  const { user } = useAuth();
  const { success, error: showError, warning } = useNotification();
  const [formData, setFormData] = useState<CreateTaskInput>({
    title: '',
    description: '',
    assigneeId: '',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    startDate: undefined,
    dueDate: undefined,
    teamId: user?.teamId || '',
  });

  const [uploadedFiles, setUploadedFiles] = useState<FileMetadata[]>([]);

  const createTaskMutation = useCreateTask();
  const { t } = useTranslation();

  // user가 변경되면 formData의 teamId 업데이트
  useEffect(() => {
    if (user?.teamId) {
      setFormData(prev => ({
        ...prev,
        teamId: user.teamId,
        assigneeId: user.uid, // 기본적으로 자신을 할당자로 설정
      }));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('Form submission - user:', user);
    console.log('Form submission - formData:', formData);

    if (!formData.title.trim()) {
      showError(t('task.titleRequired'));
      return;
    }

    if (!formData.assigneeId.trim()) {
      showError(t('task.assigneeRequired'));
      return;
    }

    if (!formData.teamId || !user?.teamId) {
      console.error('TeamId validation failed:', {
        formDataTeamId: formData.teamId,
        userTeamId: user?.teamId,
        user: user,
      });
      showError('팀 ID가 필요합니다. 로그인을 다시 시도해주세요.');
      return;
    }

    // 시작일과 마감일 유효성 검사
    if (formData.startDate && formData.dueDate) {
      if (formData.startDate > formData.dueDate) {
        warning('시작일은 마감일보다 이전이어야 합니다.');
        return;
      }
    }

    try {
      await createTaskMutation.mutateAsync(formData);
      setFormData({
        title: '',
        description: '',
        assigneeId: '',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        startDate: undefined,
        dueDate: undefined,
        teamId: user?.teamId || '',
      });
      success(t('task.taskCreated'));
      onTaskCreated?.();
    } catch (error) {
      console.error('태스크 생성 실패:', error);
      showError(t('task.taskCreateFailed'));
    }
  };

  const handleInputChange = (field: keyof CreateTaskInput, value: any) => {
    setFormData((prev: CreateTaskInput) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileUploadComplete = (result: any) => {
    if (result.metadata) {
      setUploadedFiles(prev => [...prev, result.metadata]);
    }
  };

  const handleFileUploadError = (error: string) => {
    console.error('파일 업로드 실패:', error);
    showError(`파일 업로드 실패: ${error}`);
  };

  const getStatusText = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.TODO:
        return t('status.todo');
      case TaskStatus.IN_PROGRESS:
        return t('status.inProgress');
      case TaskStatus.REVIEW:
        return t('status.review');
      case TaskStatus.DONE:
        return t('status.done');
      default:
        return t('status.todo');
    }
  };

  const getPriorityText = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.LOW:
        return t('priority.low');
      case TaskPriority.MEDIUM:
        return t('priority.medium');
      case TaskPriority.HIGH:
        return t('priority.high');
      case TaskPriority.URGENT:
        return t('priority.urgent');
      default:
        return t('priority.medium');
    }
  };

  // TaskStatus enum 값들을 배열로 변환
  const taskStatusOptions = [
    TaskStatus.TODO,
    TaskStatus.IN_PROGRESS,
    TaskStatus.REVIEW,
    TaskStatus.DONE,
  ] as const;

  // TaskPriority enum 값들을 배열로 변환
  const taskPriorityOptions = [
    TaskPriority.LOW,
    TaskPriority.MEDIUM,
    TaskPriority.HIGH,
    TaskPriority.URGENT,
  ] as const;

  // 공통 input 스타일
  const inputClassName = `
    w-full px-3 py-2 
    border border-gray-300 dark:border-dark-300 
    bg-white dark:bg-dark-50
    text-gray-900 dark:text-dark-900
    placeholder-gray-500 dark:placeholder-dark-500
    rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
    transition-colors duration-200
  `;

  const labelClassName =
    'block text-sm font-medium text-gray-700 dark:text-dark-700 mb-1';

  return (
    <div
      className={
        isModal
          ? ''
          : 'bg-white dark:bg-dark-100 rounded-lg shadow-md dark:shadow-lg p-6 transition-colors duration-200'
      }
    >
      {!isModal && (
        <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-900 mb-4">
          {t('task.createTask')}
        </h2>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className={labelClassName}>
            {t('task.title')} *
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={e => handleInputChange('title', e.target.value)}
            className={inputClassName}
            placeholder={t('task.title')}
          />
        </div>

        <div>
          <label htmlFor="description" className={labelClassName}>
            {t('task.description')}
          </label>
          <textarea
            id="description"
            value={formData.description || ''}
            onChange={e => handleInputChange('description', e.target.value)}
            rows={3}
            className={inputClassName}
            placeholder={t('task.description')}
          />
        </div>

        <div>
          <label htmlFor="assignee" className={labelClassName}>
            {t('task.assignee')} *
          </label>
          <input
            type="text"
            id="assignee"
            value={formData.assigneeId}
            onChange={e => handleInputChange('assigneeId', e.target.value)}
            className={inputClassName}
            placeholder={t('task.assignee')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="status" className={labelClassName}>
              {t('task.status')}
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={e =>
                handleInputChange('status', e.target.value as TaskStatus)
              }
              className={inputClassName}
            >
              {taskStatusOptions.map(status => (
                <option key={status} value={status}>
                  {getStatusText(status)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="priority" className={labelClassName}>
              {t('task.priority')}
            </label>
            <select
              id="priority"
              value={formData.priority}
              onChange={e =>
                handleInputChange('priority', e.target.value as TaskPriority)
              }
              className={inputClassName}
            >
              {taskPriorityOptions.map(priority => (
                <option key={priority} value={priority}>
                  {getPriorityText(priority)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className={labelClassName}>
              {t('task.startDate')}
            </label>
            <input
              type="date"
              id="startDate"
              value={
                formData.startDate
                  ? new Date(formData.startDate).toISOString().split('T')[0]
                  : ''
              }
              onChange={e =>
                handleInputChange(
                  'startDate',
                  e.target.value ? new Date(e.target.value) : undefined
                )
              }
              className={inputClassName}
            />
          </div>

          <div>
            <label htmlFor="dueDate" className={labelClassName}>
              {t('task.dueDate')}
            </label>
            <input
              type="date"
              id="dueDate"
              value={
                formData.dueDate
                  ? new Date(formData.dueDate).toISOString().split('T')[0]
                  : ''
              }
              onChange={e =>
                handleInputChange(
                  'dueDate',
                  e.target.value ? new Date(e.target.value) : undefined
                )
              }
              className={inputClassName}
            />
          </div>
        </div>

        {/* 파일 업로드 섹션 */}
        <div>
          <label className={labelClassName}>{t('task.attachments')}</label>
          <FileUpload
            path="tasks"
            metadata={{
              uploaderId: user?.uid || '',
              uploaderName: user?.displayName || user?.email || 'Unknown',
              teamId: user?.teamId || '',
            }}
            onUploadComplete={handleFileUploadComplete}
            onUploadError={handleFileUploadError}
            multiple={true}
            accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv"
            maxFiles={5}
            className="mt-2"
          />
        </div>

        {/* 업로드된 파일 목록 */}
        {uploadedFiles.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-dark-700 mb-2">
              업로드된 파일:
            </h4>
            <ul className="space-y-1">
              {uploadedFiles.map((file, index) => (
                <li
                  key={index}
                  className="text-sm text-gray-600 dark:text-dark-600"
                >
                  ✓ {file.name} ({Math.round(file.size / 1024)}KB)
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={createTaskMutation.isPending}
            className="
              px-4 py-2 
              bg-primary-600 hover:bg-primary-700 
              text-white rounded-md 
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
              dark:focus:ring-offset-dark-100
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
            "
          >
            {createTaskMutation.isPending
              ? t('common.loading')
              : t('task.createTask')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTaskForm;
