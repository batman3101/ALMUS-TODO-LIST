import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTasks, useDeleteTask, useUpdateTask } from '../hooks/useTasks';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { Task, TaskStatus, TaskPriority } from '@almus/shared-types';
import { createToast } from '../utils/toast';
import { useNotification } from '../contexts/NotificationContext';
import CreateTaskForm from './CreateTaskForm';

const TaskList: React.FC = function TaskList() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const toast = createToast(theme === 'dark');
  const { showConfirm } = useNotification();
  const {
    data: tasks = [],
    isLoading,
    error,
  } = useTasks({
    teamId: user?.teamId || '',
  });
  const deleteTaskMutation = useDeleteTask();
  const updateTaskMutation = useUpdateTask();
  const { t } = useTranslation();

  // 필터링 및 검색 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>(
    'all'
  );
  const [sortBy, setSortBy] = useState<
    'title' | 'dueDate' | 'priority' | 'status' | 'createdAt'
  >('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // 편집 모달 상태
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // 필터링 및 정렬된 태스크 목록
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.description || '')
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' || task.status === statusFilter;
      const matchesPriority =
        priorityFilter === 'all' || task.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });

    // 정렬
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'dueDate':
          aValue = a.dueDate || new Date(0);
          bValue = b.dueDate || new Date(0);
          break;
        case 'priority':
          const priorityOrder = {
            [TaskPriority.LOW]: 1,
            [TaskPriority.MEDIUM]: 2,
            [TaskPriority.HIGH]: 3,
            [TaskPriority.URGENT]: 4,
          };
          aValue = priorityOrder[a.priority] || 0;
          bValue = priorityOrder[b.priority] || 0;
          break;
        case 'status':
          const statusOrder = {
            [TaskStatus.TODO]: 1,
            [TaskStatus.IN_PROGRESS]: 2,
            [TaskStatus.REVIEW]: 3,
            [TaskStatus.DONE]: 4,
          };
          aValue = statusOrder[a.status] || 0;
          bValue = statusOrder[b.status] || 0;
          break;
        case 'createdAt':
        default:
          aValue = a.createdAt || new Date(0);
          bValue = b.createdAt || new Date(0);
          break;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [tasks, searchTerm, statusFilter, priorityFilter, sortBy, sortOrder]);

  // 페이지네이션
  const totalPages = Math.ceil(filteredAndSortedTasks.length / itemsPerPage);
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredAndSortedTasks.slice(start, end);
  }, [filteredAndSortedTasks, currentPage, itemsPerPage]);

  const handleDelete = async (taskId: string) => {
    const confirmed = await showConfirm({
      title: '태스크 삭제',
      message: t('task.confirmDelete'),
      confirmText: '삭제',
      cancelText: '취소',
      variant: 'danger',
    });
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

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setShowEditModal(true);
  };

  const handleEditClose = () => {
    setEditingTask(null);
    setShowEditModal(false);
  };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

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
    return (
      <div className="text-red-500 dark:text-red-400">
        {t('task.loadTasksFailed')}
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-dark-500">{t('task.noTasks')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-dark-100 rounded-lg shadow transition-colors duration-200">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-300">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-900">
              {t('task.taskList')} ({filteredAndSortedTasks.length}개)
            </h2>

            {/* 검색 및 필터 */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* 검색 */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="태스크 검색..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-400 rounded-md bg-white dark:bg-dark-100 text-gray-900 dark:text-dark-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
                <svg
                  className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              {/* 상태 필터 */}
              <select
                value={statusFilter}
                onChange={e =>
                  setStatusFilter(e.target.value as TaskStatus | 'all')
                }
                className="px-3 py-2 border border-gray-300 dark:border-dark-400 rounded-md bg-white dark:bg-dark-100 text-gray-900 dark:text-dark-900 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">모든 상태</option>
                <option value={TaskStatus.TODO}>시작 전</option>
                <option value={TaskStatus.IN_PROGRESS}>진행중</option>
                <option value={TaskStatus.REVIEW}>검토중</option>
                <option value={TaskStatus.DONE}>완료</option>
              </select>

              {/* 우선순위 필터 */}
              <select
                value={priorityFilter}
                onChange={e =>
                  setPriorityFilter(e.target.value as TaskPriority | 'all')
                }
                className="px-3 py-2 border border-gray-300 dark:border-dark-400 rounded-md bg-white dark:bg-dark-100 text-gray-900 dark:text-dark-900 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">모든 우선순위</option>
                <option value={TaskPriority.LOW}>낮음</option>
                <option value={TaskPriority.MEDIUM}>보통</option>
                <option value={TaskPriority.HIGH}>높음</option>
                <option value={TaskPriority.URGENT}>긴급</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-300">
            <thead className="bg-gray-50 dark:bg-dark-200">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-300 transition-colors"
                  onClick={() => handleSort('title')}
                >
                  <div className="flex items-center space-x-1">
                    <span>{t('task.title')}</span>
                    {sortBy === 'title' && (
                      <svg
                        className={`w-4 h-4 ${sortOrder === 'asc' ? 'rotate-180' : ''}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider">
                  {t('task.description')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider">
                  {t('task.assignee')}
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-300 transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center space-x-1">
                    <span>{t('task.status')}</span>
                    {sortBy === 'status' && (
                      <svg
                        className={`w-4 h-4 ${sortOrder === 'asc' ? 'rotate-180' : ''}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    )}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-300 transition-colors"
                  onClick={() => handleSort('priority')}
                >
                  <div className="flex items-center space-x-1">
                    <span>{t('task.priority')}</span>
                    {sortBy === 'priority' && (
                      <svg
                        className={`w-4 h-4 ${sortOrder === 'asc' ? 'rotate-180' : ''}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider">
                  {t('task.startDate')}
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-300 transition-colors"
                  onClick={() => handleSort('dueDate')}
                >
                  <div className="flex items-center space-x-1">
                    <span>{t('task.dueDate')}</span>
                    {sortBy === 'dueDate' && (
                      <svg
                        className={`w-4 h-4 ${sortOrder === 'asc' ? 'rotate-180' : ''}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-500 uppercase tracking-wider">
                  {t('task.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-100 divide-y divide-gray-200 dark:divide-dark-300">
              {paginatedTasks.map((task: Task) => (
                <tr
                  key={task.id}
                  className="hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors duration-200"
                >
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
                    <div className="text-sm text-gray-900 dark:text-dark-900">
                      {task.assigneeId}
                    </div>
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
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleEdit(task)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 transition-colors duration-200"
                      >
                        편집
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors duration-200"
                      >
                        {t('task.deleteTask')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-300 flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-dark-700">
              {currentPage * itemsPerPage - itemsPerPage + 1}-
              {Math.min(
                currentPage * itemsPerPage,
                filteredAndSortedTasks.length
              )}{' '}
              / {filteredAndSortedTasks.length}개 항목
            </div>
            <div className="flex space-x-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-dark-400 rounded-md bg-white dark:bg-dark-100 text-gray-700 dark:text-dark-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-dark-200"
              >
                처음
              </button>
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-dark-400 rounded-md bg-white dark:bg-dark-100 text-gray-700 dark:text-dark-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-dark-200"
              >
                이전
              </button>

              {/* 페이지 번호 */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum =
                  Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                if (pageNum > totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 text-sm border border-gray-300 dark:border-dark-400 rounded-md ${
                      currentPage === pageNum
                        ? 'bg-primary-500 text-white border-primary-500'
                        : 'bg-white dark:bg-dark-100 text-gray-700 dark:text-dark-700 hover:bg-gray-50 dark:hover:bg-dark-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-dark-400 rounded-md bg-white dark:bg-dark-100 text-gray-700 dark:text-dark-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-dark-200"
              >
                다음
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-dark-400 rounded-md bg-white dark:bg-dark-100 text-gray-700 dark:text-dark-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-dark-200"
              >
                마지막
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 편집 모달 */}
      {showEditModal && editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-100 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-dark-300">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-900">
                태스크 편집
              </h2>
              <button
                onClick={handleEditClose}
                className="text-gray-400 hover:text-gray-600 dark:text-dark-400 dark:hover:text-dark-600 transition-colors"
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
            <div className="p-6">
              <CreateTaskForm
                onTaskCreated={handleEditClose}
                isModal={true}
                editingTask={editingTask}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TaskList;
