import React from 'react';
import { useTasks, useDeleteTask } from '../hooks/useTasks';
import type { Task } from '@almus/shared-types';
import { TaskStatus, TaskPriority } from '@almus/shared-types';

const TaskList: React.FC = function TaskList() {
  const { data: tasks, isLoading, error } = useTasks();
  const deleteTaskMutation = useDeleteTask();

  const handleDelete = async (taskId: string) => {
    if (window.confirm('정말로 이 태스크를 삭제하시겠습니까?')) {
      try {
        await deleteTaskMutation.mutateAsync(taskId);
      } catch (error) {
        console.error('태스크 삭제 실패:', error);
        alert('태스크 삭제에 실패했습니다.');
      }
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.TODO:
        return 'bg-gray-100 text-gray-800';
      case TaskStatus.IN_PROGRESS:
        return 'bg-blue-100 text-blue-800';
      case TaskStatus.REVIEW:
        return 'bg-yellow-100 text-yellow-800';
      case TaskStatus.DONE:
        return 'bg-green-100 text-green-800';
      case TaskStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.LOW:
        return 'text-gray-500';
      case TaskPriority.MEDIUM:
        return 'text-blue-500';
      case TaskPriority.HIGH:
        return 'text-orange-500';
      case TaskPriority.URGENT:
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">로딩 중...</div>;
  }

  if (error) {
    return <div className="text-red-500">태스크 목록을 불러오는데 실패했습니다.</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">태스크 목록</h2>
      <div className="grid gap-4">
        {tasks?.map((task: Task) => (
          <div
            key={task.id}
            className="bg-white p-4 rounded-lg shadow border border-gray-200"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                {task.description && (
                  <p className="text-gray-600 mt-1">{task.description}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                  <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                  {task.dueDate && (
                    <span className="text-xs text-gray-500">
                      마감일: {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDelete(task.id)}
                  className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {tasks?.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          등록된 태스크가 없습니다.
        </div>
      )}
    </div>
  );
};

export default TaskList; 