import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTasks, useDeleteTask } from '../hooks/useTasks';
import { useTeams } from '../hooks/useTeams';
import { useTaskAuth } from '../hooks/useTaskAuth';
import { useTheme } from '../contexts/ThemeContext';
import { TaskStatus, TaskPriority } from '@almus/shared-types';
import type {
  TaskStatus as TaskStatusType,
  TaskPriority as TaskPriorityType,
} from '@almus/shared-types';
import { Task } from '../types/team';
import { createToast } from '../utils/toast';
import { useNotification } from '../contexts/NotificationContext';
import CreateTaskForm from './CreateTaskForm';
import TaskDetailModal from './TaskDetailModal';
import { Pencil, Trash2, Plus, Eye, Download, Paperclip } from 'lucide-react';
// XLSX를 지연 로딩으로 변경

const TaskList: React.FC = function TaskList() {
  const { currentTeam, teams, isLoading: isLoadingTeams } = useTeams();
  const { canUpdateTask, canDeleteTask } = useTaskAuth();
  const { theme } = useTheme();
  const toast = createToast(theme === 'dark');
  const { showConfirm } = useNotification();
  // 현재 팀이 없으면 쿼리를 비활성화
  const {
    data: tasks = [],
    isLoading,
    error,
  } = useTasks(currentTeam?.id ? { team_id: currentTeam.id } : undefined, {
    enabled: !!currentTeam?.id, // currentTeam이 있을 때만 쿼리 실행
  });
  const deleteTaskMutation = useDeleteTask();
  const { t } = useTranslation();

  // 필터링 및 검색 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatusType | 'all'>(
    'all'
  );
  const [priorityFilter, setPriorityFilter] = useState<
    TaskPriorityType | 'all'
  >('all');
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

  // 태스크 추가 모달 상태
  const [showCreateModal, setShowCreateModal] = useState(false);

  // 태스크 상세보기 모달 상태
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);

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
      let aValue: string | Date | number;
      let bValue: string | Date | number;

      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'dueDate':
          aValue = a.due_date || new Date(0);
          bValue = b.due_date || new Date(0);
          break;
        case 'priority': {
          const priorityOrder = {
            [TaskPriority.LOW]: 1,
            [TaskPriority.MEDIUM]: 2,
            [TaskPriority.HIGH]: 3,
            [TaskPriority.URGENT]: 4,
          };
          aValue = priorityOrder[a.priority] || 0;
          bValue = priorityOrder[b.priority] || 0;
          break;
        }
        case 'status': {
          const statusOrder = {
            [TaskStatus.TODO]: 1,
            [TaskStatus.IN_PROGRESS]: 2,
            [TaskStatus.REVIEW]: 3,
            [TaskStatus.DONE]: 4,
          };
          aValue = statusOrder[a.status] || 0;
          bValue = statusOrder[b.status] || 0;
          break;
        }
        case 'createdAt':
        default:
          aValue = a.created_at || new Date(0);
          bValue = b.created_at || new Date(0);
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
        // Error is shown to user via toast
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

  const handleCreateClose = () => {
    setShowCreateModal(false);
  };

  const handleView = (task: Task) => {
    setViewingTask(task);
    setShowDetailModal(true);
  };

  const handleDetailClose = () => {
    setViewingTask(null);
    setShowDetailModal(false);
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

  const getStatusText = (status: TaskStatusType) => {
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

  const getPriorityText = (priority: TaskPriorityType) => {
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

  // Excel 내보내기 함수
  const exportToExcel = async () => {
    try {
      // XLSX 라이브러리를 동적으로 로드
      const XLSX = await import('xlsx');
      // Excel용 데이터 변환
      const excelData = filteredAndSortedTasks.map((task, index) => ({
        순번: index + 1,
        제목: task.title,
        설명: task.description || '',
        담당자: task.assignee?.name || task.assignee?.email || '',
        상태: getStatusText(task.status),
        우선순위: getPriorityText(task.priority),
        시작일: task.start_date
          ? new Date(task.start_date).toLocaleDateString('ko-KR')
          : '',
        마감일: task.due_date
          ? new Date(task.due_date).toLocaleDateString('ko-KR')
          : '',
        생성일: task.created_at
          ? new Date(task.created_at).toLocaleDateString('ko-KR')
          : '',
        수정일: task.updated_at
          ? new Date(task.updated_at).toLocaleDateString('ko-KR')
          : '',
      }));

      // 워크북 생성
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // 열 너비 자동 조정
      const colWidths = [
        { wch: 5 }, // 순번
        { wch: 20 }, // 제목
        { wch: 30 }, // 설명
        { wch: 15 }, // 담당자
        { wch: 10 }, // 상태
        { wch: 10 }, // 우선순위
        { wch: 12 }, // 시작일
        { wch: 12 }, // 마감일
        { wch: 12 }, // 생성일
        { wch: 12 }, // 수정일
      ];
      ws['!cols'] = colWidths;

      // 워크시트 추가
      XLSX.utils.book_append_sheet(wb, ws, '태스크 목록');

      // 파일명 생성 (현재 날짜 포함)
      const now = new Date();
      const dateStr = now
        .toLocaleDateString('ko-KR')
        .replace(/\./g, '-')
        .replace(/ /g, '');
      const teamName = currentTeam?.name || '전체';
      const fileName = `${teamName}_태스크목록_${dateStr}.xlsx`;

      // Excel 파일 다운로드
      XLSX.writeFile(wb, fileName);

      toast.success(`Excel 파일이 다운로드되었습니다: ${fileName}`);
    } catch (error) {
      console.error('Excel 내보내기 오류:', error);
      toast.error('Excel 파일 내보내기에 실패했습니다.');
    }
  };

  // 팀 로딩이 완료되었고 실제로 팀이 없을 때만 안내 표시
  if (!isLoadingTeams && !currentTeam && teams.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-100 rounded-lg shadow transition-colors duration-200 p-8">
        <div className="text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-primary-100 dark:bg-primary-800 rounded-full flex items-center justify-center">
              <Plus className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900 mb-2">
            {t('team.noTeams')}
          </h3>
          <p className="text-gray-600 dark:text-dark-600 mb-6">
            팀에 가입하거나 새 팀을 만들어 시작하세요.
          </p>
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-dark-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 dark:text-dark-700">
                우상단 메뉴에서 <strong>팀 관리</strong>를 통해 팀을 생성하거나
                초대받은 팀에 가입할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 팀은 있지만 currentTeam이 아직 설정되지 않은 경우 (초기화 중) 아무것도 렌더링하지 않음
  if (!currentTeam) {
    return null;
  }

  return (
    <>
      <div className="bg-white dark:bg-dark-100 rounded-lg shadow transition-colors duration-200">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-300">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-900">
                {t('task.taskList')} ({filteredAndSortedTasks.length}개)
              </h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
              >
                <Plus className="w-4 h-4 mr-1" />
                {t('button.addTask')}
              </button>
              <button
                onClick={exportToExcel}
                disabled={filteredAndSortedTasks.length === 0}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-100 hover:bg-gray-50 dark:hover:bg-dark-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title={t('export.excel')}
              >
                <Download className="w-4 h-4 mr-1" />
                {t('export.excel')}
              </button>
            </div>

            {/* 검색 및 필터 */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* 검색 */}
              <div className="relative">
                <input
                  type="text"
                  placeholder={t('filter.taskSearch')}
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
                <option value="all">{t('filter.allStatus')}</option>
                <option value={TaskStatus.TODO}>
                  {getStatusText(TaskStatus.TODO)}
                </option>
                <option value={TaskStatus.IN_PROGRESS}>
                  {getStatusText(TaskStatus.IN_PROGRESS)}
                </option>
                <option value={TaskStatus.REVIEW}>
                  {getStatusText(TaskStatus.REVIEW)}
                </option>
                <option value={TaskStatus.DONE}>
                  {getStatusText(TaskStatus.DONE)}
                </option>
              </select>

              {/* 우선순위 필터 */}
              <select
                value={priorityFilter}
                onChange={e =>
                  setPriorityFilter(e.target.value as TaskPriority | 'all')
                }
                className="px-3 py-2 border border-gray-300 dark:border-dark-400 rounded-md bg-white dark:bg-dark-100 text-gray-900 dark:text-dark-900 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">{t('filter.allPriority')}</option>
                <option value={TaskPriority.LOW}>
                  {getPriorityText(TaskPriority.LOW)}
                </option>
                <option value={TaskPriority.MEDIUM}>
                  {getPriorityText(TaskPriority.MEDIUM)}
                </option>
                <option value={TaskPriority.HIGH}>
                  {getPriorityText(TaskPriority.HIGH)}
                </option>
                <option value={TaskPriority.URGENT}>
                  {getPriorityText(TaskPriority.URGENT)}
                </option>
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
                  파일
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
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center">
                    <div className="flex justify-center items-center text-gray-900 dark:text-dark-900">
                      {t('common.loading')}
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center">
                    <div className="text-red-500 dark:text-red-400">
                      {t('task.loadTasksFailed')}
                    </div>
                  </td>
                </tr>
              ) : paginatedTasks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center">
                    <div className="text-gray-500 dark:text-dark-500">
                      {!tasks || tasks.length === 0
                        ? t('task.noTasks')
                        : '필터링된 태스크가 없습니다.'}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((task: Task) => (
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
                        {task.assignee?.name || task.assignee?.email || '-'}
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {task.file_count && task.file_count > 0 ? (
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <Paperclip className="w-4 h-4 mr-1" />
                            <span>{task.file_count}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-600">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-dark-900">
                      {task.start_date
                        ? new Date(task.start_date).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-dark-900">
                      {task.due_date
                        ? new Date(task.due_date).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleView(task)}
                          className="inline-flex items-center p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/20 rounded transition-all duration-200"
                          title="상세보기"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canUpdateTask(task) && (
                          <button
                            onClick={() => handleEdit(task)}
                            className="inline-flex items-center p-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-all duration-200"
                            title="편집"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canDeleteTask(task) && (
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="inline-flex items-center p-1.5 text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all duration-200"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
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

      {/* 태스크 추가 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-100 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-dark-300">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-900">
                {t('button.addTask')}
              </h2>
              <button
                onClick={handleCreateClose}
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
                onTaskCreated={handleCreateClose}
                isModal={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* 태스크 상세보기 모달 */}
      {showDetailModal && viewingTask && (
        <TaskDetailModal
          task={viewingTask}
          isOpen={showDetailModal}
          onClose={handleDetailClose}
        />
      )}
    </>
  );
};

export default TaskList;
