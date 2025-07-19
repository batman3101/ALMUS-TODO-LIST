import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateTask } from '../hooks/useTasks';
import { CreateTaskInput, TaskStatus, TaskPriority, FileMetadata } from '@almus/shared-types';
import { FileUpload } from './FileUpload';
import { useAuth } from '../hooks/useAuth';

const CreateTaskForm: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<CreateTaskInput>({
    title: '',
    description: '',
    assigneeId: '',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    dueDate: undefined,
    teamId: user?.teamId || '',
  });

  const [uploadedFiles, setUploadedFiles] = useState<FileMetadata[]>([]);

  const createTaskMutation = useCreateTask();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert(t('task.titleRequired'));
      return;
    }

    if (!formData.assigneeId.trim()) {
      alert(t('task.assigneeRequired'));
      return;
    }

    if (!formData.teamId) {
      alert('팀 ID가 필요합니다.');
      return;
    }

    try {
      await createTaskMutation.mutateAsync(formData);
      setFormData({
        title: '',
        description: '',
        assigneeId: '',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        dueDate: undefined,
        teamId: user?.teamId || '',
      });
      alert(t('task.taskCreated'));
    } catch (error) {
      console.error('태스크 생성 실패:', error);
      alert(t('task.taskCreateFailed'));
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
    alert(`파일 업로드 실패: ${error}`);
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

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('task.createTask')}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            {t('task.title')} *
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t('task.title')}
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            {t('task.description')}
          </label>
          <textarea
            id="description"
            value={formData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t('task.description')}
          />
        </div>

        <div>
          <label htmlFor="assignee" className="block text-sm font-medium text-gray-700 mb-1">
            {t('task.assignee')} *
          </label>
          <input
            type="text"
            id="assignee"
            value={formData.assigneeId}
            onChange={(e) => handleInputChange('assigneeId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t('task.assignee')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              {t('task.status')}
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value as TaskStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {taskStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {getStatusText(status)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
              {t('task.priority')}
            </label>
            <select
              id="priority"
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value as TaskPriority)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {taskPriorityOptions.map((priority) => (
                <option key={priority} value={priority}>
                  {getPriorityText(priority)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
              {t('task.dueDate')}
            </label>
            <input
              type="date"
              id="dueDate"
              value={formData.dueDate ? new Date(formData.dueDate).toISOString().split('T')[0] : ''}
              onChange={(e) => handleInputChange('dueDate', e.target.value ? new Date(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 파일 업로드 섹션 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('task.attachments')}
          </label>
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
            <h4 className="text-sm font-medium text-gray-700 mb-2">업로드된 파일:</h4>
            <ul className="space-y-1">
              {uploadedFiles.map((file, index) => (
                <li key={index} className="text-sm text-gray-600">
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
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {createTaskMutation.isPending ? t('common.loading') : t('task.createTask')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTaskForm; 