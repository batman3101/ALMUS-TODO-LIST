import React, { useState } from 'react';
import { useCreateTask } from '../hooks/useTasks';
import { CreateTaskInput, TaskStatus, TaskPriority } from '@almus/shared-types';

const CreateTaskForm: React.FC = () => {
  const [formData, setFormData] = useState<CreateTaskInput>({
    title: '',
    description: '',
    assigneeId: '',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    dueDate: undefined,
  });

  const createTaskMutation = useCreateTask();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    if (!formData.assigneeId.trim()) {
      alert('담당자를 입력해주세요.');
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
      });
      alert('태스크가 성공적으로 생성되었습니다.');
    } catch (error) {
      console.error('태스크 생성 실패:', error);
      alert('태스크 생성에 실패했습니다.');
    }
  };

  const handleInputChange = (field: keyof CreateTaskInput, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">새 태스크 생성</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            제목 *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="태스크 제목을 입력하세요"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            설명
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="태스크 설명을 입력하세요"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            담당자 ID *
          </label>
          <input
            type="text"
            value={formData.assigneeId}
            onChange={(e) => handleInputChange('assigneeId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="담당자 ID를 입력하세요"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              상태
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value as TaskStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.values(TaskStatus).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              우선순위
            </label>
            <select
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value as TaskPriority)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.values(TaskPriority).map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            마감일
          </label>
          <input
            type="date"
            value={formData.dueDate ? new Date(formData.dueDate).toISOString().split('T')[0] : ''}
            onChange={(e) => handleInputChange('dueDate', e.target.value ? new Date(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={createTaskMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {createTaskMutation.isPending ? '생성 중...' : '태스크 생성'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTaskForm; 