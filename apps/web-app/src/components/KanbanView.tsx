import React, { useState, useMemo } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from 'react-beautiful-dnd';
import { useTasks, useUpdateTask } from '../hooks/useTasks';
import { useTeams } from '../hooks/useTeams';
import { useTheme } from '../contexts/ThemeContext';
import type { Task } from '@almus/shared-types';
import { TaskStatus, TaskPriority } from '@almus/shared-types';
import { createToast } from '../utils/toast';
import CreateTaskForm from './CreateTaskForm';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useDeleteTask } from '../hooks/useTasks';
import { useTaskAuth } from '../hooks/useTaskAuth';
import { useNotification } from '../contexts/NotificationContext';

interface KanbanViewProps {
  className?: string;
}

interface Column {
  id: TaskStatus;
  title: string;
  color: string;
  wipLimit?: number;
}

const KanbanView: React.FC<KanbanViewProps> = ({ className = '' }) => {
  const { currentTeam } = useTeams();
  const { theme } = useTheme();
  const toast = createToast(theme === 'dark');
  const {
    data: tasks,
    isLoading,
    error,
  } = useTasks(
    currentTeam?.id ? { team_id: currentTeam.id } : undefined,
    {
      enabled: !!currentTeam?.id,
    }
  );
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const { canUpdateTask, canDeleteTask } = useTaskAuth();
  const { showConfirm } = useNotification();

  const [wipLimits, setWipLimits] = useState<Record<TaskStatus, number>>({
    [TaskStatus.TODO]: 10,
    [TaskStatus.IN_PROGRESS]: 5,
    [TaskStatus.REVIEW]: 3,
    [TaskStatus.DONE]: 20,
  });

  // 편집 모달 상태
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // 태스크 추가 모달 상태
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | null>(null);

  // 컬럼 정의
  const columns: Column[] = useMemo(
    () => [
      {
        id: TaskStatus.TODO,
        title: '시작 전',
        color: 'bg-pink-100 dark:bg-pink-900/30',
        wipLimit: wipLimits[TaskStatus.TODO],
      },
      {
        id: TaskStatus.IN_PROGRESS,
        title: '진행 중',
        color: 'bg-blue-100 dark:bg-blue-900/30',
        wipLimit: wipLimits[TaskStatus.IN_PROGRESS],
      },
      {
        id: TaskStatus.REVIEW,
        title: '검토',
        color: 'bg-yellow-100 dark:bg-yellow-900/30',
        wipLimit: wipLimits[TaskStatus.REVIEW],
      },
      {
        id: TaskStatus.DONE,
        title: '완료',
        color: 'bg-green-100 dark:bg-green-900/30',
        wipLimit: wipLimits[TaskStatus.DONE],
      },
    ],
    [wipLimits]
  );

  // 컬럼별 태스크 그룹화
  const tasksByColumn = useMemo(() => {
    if (!tasks) return {} as Record<TaskStatus, Task[]>;

    const grouped = tasks.reduce(
      (acc: Record<TaskStatus, Task[]>, task: Task) => {
        const status = task.status;
        if (!acc[status]) {
          acc[status] = [];
        }
        acc[status].push(task);
        return acc;
      },
      {} as Record<TaskStatus, Task[]>
    );

    // 각 컬럼을 생성일 기준으로 정렬
    Object.keys(grouped).forEach(status => {
      grouped[status as TaskStatus].sort((a, b) => {
        const dateA = a.createdAt || new Date(0);
        const dateB = b.createdAt || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
    });

    return grouped;
  }, [tasks]);

  const handleDragStart = () => {
    // 드래그 시작시 haptic feedback 등을 추가할 수 있음
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // 드래그가 유효한 위치에서 끝나지 않았거나, 같은 위치에 드롭된 경우
    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceColumn = source.droppableId as TaskStatus;
    const destinationColumn = destination.droppableId as TaskStatus;

    // WIP 제한 확인 (같은 컬럼 내 이동이 아닌 경우)
    if (sourceColumn !== destinationColumn) {
      const destinationTasks = tasksByColumn[destinationColumn] || [];
      const wipLimit = wipLimits[destinationColumn];

      if (wipLimit && destinationTasks.length >= wipLimit) {
        const columnTitle = columns.find(
          col => col.id === destinationColumn
        )?.title;
        toast.warning(
          `${columnTitle} 컬럼의 WIP 제한(${wipLimit})에 도달했습니다.`
        );
        return;
      }
    }

    try {
      const task = tasks?.find((t: Task) => t.id === draggableId);
      if (!task) {
        toast.error('태스크를 찾을 수 없습니다.');
        return;
      }

      // 즉시 업데이트
      await updateTaskMutation.mutateAsync({
        id: draggableId,
        updates: {
          status: destinationColumn,
        },
      });

      // 성공 메시지
      const sourceColumnTitle = columns.find(
        col => col.id === sourceColumn
      )?.title;
      const destinationColumnTitle = columns.find(
        col => col.id === destinationColumn
      )?.title;
      toast.success(
        `태스크를 "${sourceColumnTitle}"에서 "${destinationColumnTitle}"로 이동했습니다.`
      );
    } catch (error) {
      // Error is shown to user via toast
      toast.error('태스크 상태 업데이트에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleWipLimitChange = (columnId: TaskStatus, limit: number) => {
    setWipLimits(prev => ({
      ...prev,
      [columnId]: Math.max(0, limit), // 음수 방지
    }));
  };

  const handleTaskClick = (task: Task, event: React.MouseEvent) => {
    // 드래그 중이거나 드래그 핸들 클릭이 아닌 경우에만 편집 모달 열기
    event.stopPropagation();

    setEditingTask(task);
    setShowEditModal(true);
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
    setSelectedStatus(null);
  };

  const handleAddTask = (status: TaskStatus) => {
    setSelectedStatus(status);
    setShowCreateModal(true);
  };

  const handleDelete = async (taskId: string) => {
    const confirmed = await showConfirm({
      title: '태스크 삭제',
      message: '이 태스크를 삭제하시겠습니까?',
      confirmText: '삭제',
      cancelText: '취소',
      variant: 'danger',
    });
    if (confirmed) {
      try {
        await deleteTaskMutation.mutateAsync(taskId);
        toast.success('태스크가 삭제되었습니다.');
      } catch (error) {
        toast.error('태스크 삭제에 실패했습니다.');
      }
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

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  };

  const isTaskOverdue = (task: Task) => {
    if (!task.dueDate) return false;
    return (
      new Date(task.dueDate) < new Date() && task.status !== TaskStatus.DONE
    );
  };

  // 상태 변수 정의 - 로딩이나 에러 상태에서도 칸반 구조는 표시
  const hasError = error && !isLoading;
  const isEmpty = !tasks || tasks.length === 0;

  return (
    <>
      <div className={`${className}`}>
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white dark:bg-dark-100 rounded-t-lg border-b border-gray-200 dark:border-dark-300 transition-colors duration-200 gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-900">
              칸반 보드
            </h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
            >
              <Plus className="w-4 h-4 mr-1" />
              태스크 추가
            </button>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-dark-600 whitespace-nowrap">
              WIP 제한 설정:
            </span>
            <div className="grid grid-cols-2 sm:flex gap-2">
              {columns.map(column => (
                <div
                  key={column.id}
                  className="flex items-center gap-2 min-w-0"
                >
                  <span className="text-xs text-gray-500 dark:text-dark-500 truncate">
                    {column.title}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={wipLimits[column.id]}
                    onChange={e =>
                      handleWipLimitChange(
                        column.id,
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="w-12 px-1 py-1 text-xs border border-gray-300 dark:border-dark-300 bg-white dark:bg-dark-50 text-gray-900 dark:text-dark-900 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors duration-200"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 칸반 보드 */}
        <DragDropContext
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-dark-50 min-h-96 transition-colors duration-200">
            {columns.map(column => {
              const columnTasks = tasksByColumn[column.id] || [];
              const isOverLimit =
                wipLimits[column.id] &&
                columnTasks.length > wipLimits[column.id]!;

              return (
                <div key={column.id} className="flex flex-col min-h-0">
                  <div
                    className={`${column.color} rounded-lg p-4 flex-1 min-h-0 flex flex-col`}
                  >
                    {/* 컬럼 헤더 */}
                    <div className="flex items-center justify-between mb-4 flex-shrink-0">
                      <h3 className="font-semibold text-gray-900 dark:text-dark-900 truncate">
                        {column.title}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleAddTask(column.id)}
                          className="p-1 text-gray-600 dark:text-dark-600 hover:text-gray-900 dark:hover:text-dark-900 hover:bg-gray-200 dark:hover:bg-dark-300 rounded transition-colors"
                          title={`${column.title}에 태스크 추가`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <span className="text-sm text-gray-600 dark:text-dark-600">
                          {columnTasks.length}
                          {wipLimits[column.id] && `/${wipLimits[column.id]}`}
                        </span>
                        {isOverLimit && (
                          <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                            초과!
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 드롭 영역 */}
                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 min-h-32 rounded-md transition-colors overflow-y-auto ${
                            snapshot.isDraggingOver
                              ? 'bg-blue-50 dark:bg-blue-900/20'
                              : ''
                          } ${isOverLimit ? 'bg-red-50 dark:bg-red-900/20' : ''}`}
                          style={{ scrollBehavior: 'smooth' }}
                        >
                          {isLoading && (
                            <div className="text-center text-gray-400 dark:text-dark-400 text-sm py-8 flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                              로딩 중...
                            </div>
                          )}
                          
                          {hasError && !isLoading && (
                            <div className="text-center text-red-400 dark:text-red-400 text-sm py-8">
                              <div className="mb-2">⚠️</div>
                              <div>오류 발생</div>
                            </div>
                          )}

                          {!isLoading && !hasError && columnTasks.length === 0 && !snapshot.isDraggingOver && (
                            <div className="text-center text-gray-400 dark:text-dark-400 text-sm py-8">
                              {isEmpty ? '태스크를 추가해보세요' : '태스크를 여기로 드래그하세요'}
                            </div>
                          )}

                          {!isLoading && !hasError && columnTasks.length > 0 && columnTasks.map((task: Task, index: number) => (
                            <Draggable
                              key={task.id}
                              draggableId={task.id}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`bg-white dark:bg-dark-100 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 mb-3 transition-all duration-200 group ${
                                    snapshot.isDragging
                                      ? 'shadow-lg transform rotate-2 cursor-grabbing z-10'
                                      : 'hover:shadow-md hover:border-primary-300 cursor-grab'
                                  } ${
                                    isTaskOverdue(task) && !snapshot.isDragging
                                      ? 'border-red-300 bg-red-50 dark:bg-red-900/10'
                                      : ''
                                  }`}
                                >
                                  {/* 헤더 영역 */}
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      {/* 드래그 표시 아이콘 */}
                                      <div className="w-4 h-4 flex items-center justify-center text-gray-400">
                                        <svg
                                          className="w-3 h-3"
                                          fill="currentColor"
                                          viewBox="0 0 6 10"
                                        >
                                          <circle cx="2" cy="2" r="1" />
                                          <circle cx="2" cy="5" r="1" />
                                          <circle cx="2" cy="8" r="1" />
                                          <circle cx="4" cy="2" r="1" />
                                          <circle cx="4" cy="5" r="1" />
                                          <circle cx="4" cy="8" r="1" />
                                        </svg>
                                      </div>
                                      {isTaskOverdue(task) && (
                                        <div
                                          className="flex items-center text-red-500"
                                          title="마감일 초과"
                                        >
                                          <svg
                                            className="w-3 h-3"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                          >
                                            <path
                                              fillRule="evenodd"
                                              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                              clipRule="evenodd"
                                            />
                                          </svg>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`text-xs font-medium px-2 py-1 rounded-full ${getPriorityColor(task.priority)} bg-current/10`}
                                      >
                                        {task.priority}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        {/* 편집 버튼 */}
                                        {canUpdateTask(task) && (
                                          <button
                                            onClick={e => {
                                              e.stopPropagation();
                                              handleEdit(task);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/20 cursor-pointer text-blue-600 dark:text-blue-400"
                                            title="편집"
                                          >
                                            <Pencil className="w-3 h-3" />
                                          </button>
                                        )}
                                        {/* 삭제 버튼 */}
                                        {canDeleteTask(task) && (
                                          <button
                                            onClick={e => {
                                              e.stopPropagation();
                                              handleDelete(task.id);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 cursor-pointer text-red-600 dark:text-red-400"
                                            title="삭제"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* 태스크 제목 */}
                                  <h4 className="font-medium text-gray-900 dark:text-dark-900 text-sm mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                                    {task.title}
                                  </h4>

                                  {/* 태스크 설명 */}
                                  {task.description && (
                                    <p className="text-xs text-gray-600 dark:text-dark-600 mb-3 line-clamp-2">
                                      {task.description}
                                    </p>
                                  )}

                                  {/* 태스크 메타데이터 */}
                                  <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                      {task.dueDate && (
                                        <span
                                          className={`${
                                            isTaskOverdue(task)
                                              ? 'text-red-600 font-medium'
                                              : 'text-gray-500 dark:text-dark-500'
                                          }`}
                                        >
                                          📅 {formatDate(task.dueDate)}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-gray-400 dark:text-dark-400 truncate ml-2 max-w-20">
                                      {task.assigneeId}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                            ))}
                            
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                </div>
              );
            })}
          </div>
        </DragDropContext>

        {/* 전체 빈 상태 */}
        {(!tasks || tasks.length === 0) && !isLoading && (
          <div className="text-center text-gray-500 dark:text-dark-500 py-12 bg-white dark:bg-dark-100 rounded-b-lg transition-colors duration-200">
            <div className="mb-4">
              <svg
                className="w-16 h-16 mx-auto text-gray-300 dark:text-dark-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <p className="text-lg font-medium mb-2">등록된 태스크가 없습니다</p>
            <p className="text-sm">새 태스크를 추가해보세요!</p>
          </div>
        )}
      </div>

      {/* 편집 모달 */}
      {showEditModal && editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-100 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-dark-300">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-900">
                태스크 편집
              </h2>
              <button
                onClick={handleEditClose}
                className="text-gray-400 hover:text-gray-600 dark:text-dark-400 dark:hover:text-dark-600 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-200"
                aria-label="닫기"
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
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
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
                새 태스크 추가
                {selectedStatus &&
                  ` - ${columns.find(c => c.id === selectedStatus)?.title}`}
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
                initialData={
                  selectedStatus ? { status: selectedStatus } : undefined
                }
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default KanbanView;
