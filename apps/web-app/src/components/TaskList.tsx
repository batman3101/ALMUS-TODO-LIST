import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTasks, useDeleteTask } from '../hooks/useTasks';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { Task, TaskStatus, TaskPriority } from '@almus/shared-types';
import { createToast, showConfirm } from '../utils/toast';

const TaskList: React.FC = function TaskList() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const toast = createToast(theme === 'dark');
  const { data: tasks, isLoading, error } = useTasks({
    teamId: user?.teamId || '',
  });
  const deleteTaskMutation = useDeleteTask();
  const { t } = useTranslation();

  const handleDelete = async (taskId: string) => {
    const confirmed = await showConfirm(t('task.confirmDelete'));
    if (confirmed) {
      try {
        await deleteTaskMutation.mutateAsync(taskId);
        toast.success('태스크가 성공적으로 삭제되었습니다.');
      } catch (error) {
        console.error('태스크 삭제 실패:', error);
        toast.error(t('task.taskDeleteFailed'));
      }
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.TODO:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-900 dark:text-dark-900">
        {t('common.loading')}
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 dark:text-red-400">{t('task.loadTasksFailed')}</div>;
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-dark-500">{t('task.noTasks')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-100 rounded-lg shadow transition-colors duration-200">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-300">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-900">
          {t('task.taskList')}
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-300">
          <thead className="bg-gray-50 dark:bg-dark-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider">
                {t('task.title')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider">
                {t('task.description')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider">
                {t('task.assignee')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider">
                {t('task.status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider">
                {t('task.priority')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider">
                {t('task.startDate')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider">
                {t('task.dueDate')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider">
                {t('task.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-dark-100 divide-y divide-gray-200 dark:divide-dark-300">
            {tasks.map((task: Task) => (
              <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors duration-200">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-dark-900">
                    {task.title}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 dark:text-dark-900 max-w-xs truncate">
                    {task.description}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-dark-900">{task.assigneeId}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}
                  >
                    {getStatusText(task.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`text-sm font-medium ${getPriorityColor(task.priority)}`}
                  >
                    {getPriorityText(task.priority)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-dark-900">
                  {task.startDate
                    ? new Date(task.startDate).toLocaleDateString()
                    : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-dark-900">
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString()
                    : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors duration-200"
                  >
                    {t('task.deleteTask')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TaskList;
