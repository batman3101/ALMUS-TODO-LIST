import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTasks, useUpdateTask } from '../hooks/useTasks';
import { useTeams } from '../hooks/useTeams';
import { Task, UpdateTaskInput, TaskPriority } from '@almus/shared-types';
import EditTaskModal from './EditTaskModal';
import CreateTaskForm from './CreateTaskForm';
import { Plus } from 'lucide-react';

interface CalendarViewProps {
  className?: string;
}

const CalendarView: React.FC<CalendarViewProps> = ({ className = '' }) => {
  const { currentTeam } = useTeams();
  const {
    data: tasks,
    isLoading,
    error,
  } = useTasks({
    teamId: currentTeam?.id || '',
  });
  const { t } = useTranslation();
  const updateTask = useUpdateTask();

  const [currentDate, setCurrentDate] = useState(new Date());

  // 모달 상태 관리
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // 드래그 및 리사이즈 상태 관리
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    isResizing: boolean;
    dragType: 'move' | 'resize-left' | 'resize-right' | null;
    taskId: string | null;
    startX: number;
    originalStartDate: Date | null;
    originalEndDate: Date | null;
  }>({
    isDragging: false,
    isResizing: false,
    dragType: null,
    taskId: null,
    startX: 0,
    originalStartDate: null,
    originalEndDate: null,
  });

  // 태스크 클릭 핸들러
  const handleTaskClick = (task: Task) => {
    setEditingTask(task);
    setShowEditModal(true);
  };

  // 모달 닫기 핸들러
  const handleEditModalClose = () => {
    setEditingTask(null);
    setShowEditModal(false);
  };

  const handleCreateModalClose = () => {
    setShowCreateModal(false);
    setSelectedDate(null);
  };

  // 날짜 클릭 핸들러 - 태스크 추가
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowCreateModal(true);
  };

  // 태스크 업데이트 핸들러
  const handleTaskSave = async (
    taskId: string,
    updateData: UpdateTaskInput
  ) => {
    await updateTask.mutateAsync({ id: taskId, updates: updateData });
  };

  // 드래그 시작 핸들러
  const handleDragStart = (
    e: React.MouseEvent,
    task: Task,
    dragType: 'move' | 'resize-left' | 'resize-right'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setDragState({
      isDragging: dragType === 'move',
      isResizing: dragType.startsWith('resize'),
      dragType,
      taskId: task.id,
      startX: e.clientX,
      originalStartDate: task.startDate ? new Date(task.startDate) : null,
      originalEndDate: task.dueDate ? new Date(task.dueDate) : null,
    });

    // 전역 마우스 이벤트 리스너 추가
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // 마우스 이동 핸들러
  const handleMouseMove = (e: MouseEvent) => {
    if ((!dragState.isDragging && !dragState.isResizing) || !dragState.taskId)
      return;

    // 마우스 이동 거리 계산
    const deltaX = e.clientX - dragState.startX;

    // 캘린더 컨테이너의 너비를 기준으로 일(day) 단위 계산
    // 일반적으로 캘린더는 주 단위(7일)로 표시되므로, 전체 너비를 7로 나누면 하루의 너비
    const calendarContainer = document.querySelector('[data-calendar-content]');
    if (!calendarContainer) return;

    const containerWidth = calendarContainer.clientWidth;
    const dayWidth = containerWidth / 7; // 한 주가 7일이므로
    const daysDelta = Math.round(deltaX / dayWidth);

    if (daysDelta === 0) return; // 변화가 없으면 리턴

    // 현재 편집 중인 태스크 찾기
    const task = tasks?.find(t => t.id === dragState.taskId);
    if (!task || !task.startDate || !task.dueDate) return;

    let newStartDate = new Date(dragState.originalStartDate!);
    let newEndDate = new Date(dragState.originalEndDate!);

    // 드래그 타입에 따른 날짜 조정
    switch (dragState.dragType) {
      case 'move':
        // 태스크 전체 이동
        newStartDate.setDate(newStartDate.getDate() + daysDelta);
        newEndDate.setDate(newEndDate.getDate() + daysDelta);
        break;

      case 'resize-left':
        // 시작일 조정 (종료일은 고정)
        newStartDate.setDate(newStartDate.getDate() + daysDelta);
        // 시작일이 종료일 이후가 되지 않도록 제한
        if (newStartDate >= newEndDate) {
          newStartDate = new Date(newEndDate);
          newStartDate.setDate(newStartDate.getDate() - 1);
        }
        break;

      case 'resize-right':
        // 종료일 조정 (시작일은 고정)
        newEndDate.setDate(newEndDate.getDate() + daysDelta);
        // 종료일이 시작일 이전이 되지 않도록 제한
        if (newEndDate <= newStartDate) {
          newEndDate = new Date(newStartDate);
          newEndDate.setDate(newEndDate.getDate() + 1);
        }
        break;
    }

    // 실시간 업데이트 (낙관적 업데이트)
    // 실제로는 마우스업에서 최종 저장하고, 여기서는 UI만 업데이트
    // React Query의 optimistic update 사용 가능
  };

  // 마우스 업 핸들러
  const handleMouseUp = async () => {
    if (dragState.taskId && (dragState.isDragging || dragState.isResizing)) {
      // 마우스 이동 거리 계산
      const calendarContainer = document.querySelector(
        '[data-calendar-content]'
      );
      if (calendarContainer) {
        const containerWidth = calendarContainer.clientWidth;
        const dayWidth = containerWidth / 7;
        const currentMouseX = event
          ? (event as MouseEvent).clientX
          : dragState.startX;
        const deltaX = currentMouseX - dragState.startX;
        const daysDelta = Math.round(deltaX / dayWidth);

        if (daysDelta !== 0) {
          // 최종 날짜 계산
          let newStartDate = new Date(dragState.originalStartDate!);
          let newEndDate = new Date(dragState.originalEndDate!);

          switch (dragState.dragType) {
            case 'move':
              newStartDate.setDate(newStartDate.getDate() + daysDelta);
              newEndDate.setDate(newEndDate.getDate() + daysDelta);
              break;

            case 'resize-left':
              newStartDate.setDate(newStartDate.getDate() + daysDelta);
              if (newStartDate >= newEndDate) {
                newStartDate = new Date(newEndDate);
                newStartDate.setDate(newStartDate.getDate() - 1);
              }
              break;

            case 'resize-right':
              newEndDate.setDate(newEndDate.getDate() + daysDelta);
              if (newEndDate <= newStartDate) {
                newEndDate = new Date(newStartDate);
                newEndDate.setDate(newEndDate.getDate() + 1);
              }
              break;
          }

          // API 호출하여 태스크 업데이트
          try {
            await handleTaskSave(dragState.taskId, {
              startDate: newStartDate,
              dueDate: newEndDate,
            });
          } catch (error) {
            // Error handled silently during drag and drop
          }
        }
      }
    }

    // 드래그 상태 리셋
    setDragState({
      isDragging: false,
      isResizing: false,
      dragType: null,
      taskId: null,
      startX: 0,
      originalStartDate: null,
      originalEndDate: null,
    });

    // 전역 이벤트 리스너 제거
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // 현재 월의 달력 데이터 생성
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 월의 첫날과 마지막날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // 달력 시작일 (이전 월의 마지막 주 포함)
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    // 달력 종료일 (다음 월의 첫 주 포함)
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

    const weeks = [];
    const currentWeekDate = new Date(startDate);

    while (currentWeekDate <= endDate) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(currentWeekDate));
        currentWeekDate.setDate(currentWeekDate.getDate() + 1);
      }
      weeks.push(week);
    }

    return { weeks, firstDay, lastDay };
  }, [currentDate]);

  // 주별로 연속된 태스크 막대를 계산
  const weeklyTaskBars = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];

    const weekBars: Array<{
      weekIndex: number;
      taskBars: Array<{
        task: Task;
        startDay: number; // 주 내에서 시작하는 요일 (0-6)
        endDay: number; // 주 내에서 끝나는 요일 (0-6)
        row: number; // 표시될 행 번호
      }>;
    }> = [];

    calendarData.weeks.forEach((week, weekIndex) => {
      const weekStartDate = week[0];
      const weekEndDate = week[6];
      const taskBars: Array<{
        task: Task;
        startDay: number;
        endDay: number;
        row: number;
      }> = [];
      let currentRow = 0;

      // 각 태스크에 대해 이번 주와 겹치는 부분 확인
      tasks.forEach((task: Task) => {
        if (task.startDate && task.dueDate) {
          const taskStart = new Date(task.startDate);
          const taskEnd = new Date(task.dueDate);

          // 태스크가 이번 주와 겹치는지 확인
          if (taskStart <= weekEndDate && taskEnd >= weekStartDate) {
            // 주 내에서의 시작/끝 요일 계산
            let startDay = 0;
            let endDay = 6;

            // 태스크 시작일이 이번 주 내에 있으면 정확한 요일 계산
            if (taskStart >= weekStartDate) {
              startDay = Math.floor(
                (taskStart.getTime() - weekStartDate.getTime()) /
                  (1000 * 60 * 60 * 24)
              );
            }

            // 태스크 끝일이 이번 주 내에 있으면 정확한 요일 계산
            if (taskEnd <= weekEndDate) {
              endDay = Math.floor(
                (taskEnd.getTime() - weekStartDate.getTime()) /
                  (1000 * 60 * 60 * 24)
              );
            }

            taskBars.push({
              task,
              startDay: Math.max(0, startDay),
              endDay: Math.min(6, endDay),
              row: currentRow++,
            });
          }
        }
      });

      weekBars.push({
        weekIndex,
        taskBars,
      });
    });

    return weekBars;
  }, [tasks, calendarData]);

  // 우선순위에 따른 색상 반환
  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.LOW:
        return 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
      case TaskPriority.MEDIUM:
        return 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200';
      case TaskPriority.HIGH:
        return 'bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200';
      case TaskPriority.URGENT:
        return 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200';
      default:
        return 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  // 월 변경 함수
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  // 오늘 날짜로 이동
  const goToToday = () => {
    setCurrentDate(new Date());
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

  return (
    <div
      className={`bg-white dark:bg-dark-100 rounded-lg shadow transition-colors duration-200 ${className}`}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-300">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-900">
            캘린더 뷰
          </h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
          >
            <Plus className="w-4 h-4 mr-1" />
            태스크 추가
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 text-gray-600 dark:text-dark-600 hover:text-gray-900 dark:hover:text-dark-900 hover:bg-gray-100 dark:hover:bg-dark-200 rounded transition-colors"
          >
            ←
          </button>

          <div className="text-lg font-medium text-gray-900 dark:text-dark-900 min-w-[200px] text-center">
            {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
          </div>

          <button
            onClick={() => navigateMonth('next')}
            className="p-2 text-gray-600 dark:text-dark-600 hover:text-gray-900 dark:hover:text-dark-900 hover:bg-gray-100 dark:hover:bg-dark-200 rounded transition-colors"
          >
            →
          </button>

          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
          >
            오늘
          </button>
        </div>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-dark-300">
        {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
          <div
            key={day}
            className={`p-3 text-center text-sm font-medium ${
              index === 0
                ? 'text-red-500'
                : index === 6
                  ? 'text-blue-500'
                  : 'text-gray-700 dark:text-dark-700'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 달력 본문 */}
      <div className="relative" data-calendar-content>
        {/* 주별로 그리기 */}
        {calendarData.weeks.map((week, weekIndex) => {
          const weekTaskBars =
            weeklyTaskBars.find(wb => wb.weekIndex === weekIndex)?.taskBars ||
            [];
          const maxRows = Math.max(3, weekTaskBars.length); // 최소 3행 보장
          const weekHeight = 120 + maxRows * 28; // 날짜 표시 공간 + 태스크 행들

          return (
            <div
              key={weekIndex}
              className="relative"
              style={{ height: `${weekHeight}px` }}
            >
              {/* 각 날짜 셀들 */}
              <div className="grid grid-cols-7 h-full">
                {week.map((date, dayIndex) => {
                  const isCurrentMonth =
                    date.getMonth() === currentDate.getMonth();
                  const isToday =
                    date.toDateString() === new Date().toDateString();

                  return (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className={`p-2 border-r border-b border-gray-200 dark:border-dark-300 ${dayIndex === 6 ? 'border-r-0' : ''} ${
                        !isCurrentMonth ? 'bg-gray-50 dark:bg-dark-200' : ''
                      } cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors`}
                      onClick={() => handleDateClick(date)}
                    >
                      {/* 날짜 */}
                      <div
                        className={`text-sm mb-2 ${
                          isToday
                            ? 'w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold'
                            : !isCurrentMonth
                              ? 'text-gray-400 dark:text-dark-400'
                              : dayIndex === 0
                                ? 'text-red-500'
                                : dayIndex === 6
                                  ? 'text-blue-500'
                                  : 'text-gray-900 dark:text-dark-900'
                        }`}
                      >
                        {date.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 연속된 태스크 막대들 */}
              <div className="absolute inset-0 pointer-events-none">
                {weekTaskBars.map((taskBar, barIndex) => {
                  const { task, startDay, endDay, row } = taskBar;
                  const barTop = 40 + row * 28; // 날짜 영역 아래부터 시작
                  const barLeft = (startDay / 7) * 100;
                  const barWidth = ((endDay - startDay + 1) / 7) * 100;

                  return (
                    <div
                      key={`${task.id}-${barIndex}`}
                      className={`absolute text-xs rounded ${getPriorityColor(task.priority)} pointer-events-auto group hover:shadow-md transition-shadow duration-200`}
                      style={{
                        top: `${barTop}px`,
                        left: `${barLeft}%`,
                        width: `${barWidth}%`,
                        height: '24px',
                        zIndex: 10,
                      }}
                      title={`${task.title} (${new Date(task.startDate!).toLocaleDateString()} - ${new Date(task.dueDate!).toLocaleDateString()})`}
                    >
                      {/* 왼쪽 리사이즈 핸들 */}
                      <div
                        className="absolute left-0 top-0 w-2 h-full bg-black bg-opacity-20 opacity-0 group-hover:opacity-100 cursor-w-resize transition-opacity duration-200 rounded-l"
                        onMouseDown={e =>
                          handleDragStart(e, task, 'resize-left')
                        }
                        onClick={e => e.stopPropagation()}
                        title="시작일 조정"
                      />

                      {/* 태스크 내용 (중앙 클릭 영역) */}
                      <div
                        className="absolute inset-x-2 inset-y-0 flex items-center cursor-grab hover:cursor-grab active:cursor-grabbing"
                        onMouseDown={e => handleDragStart(e, task, 'move')}
                        onClick={e => {
                          e.stopPropagation();
                          handleTaskClick(task);
                        }}
                      >
                        <span className="truncate block">{task.title}</span>
                      </div>

                      {/* 오른쪽 리사이즈 핸들 */}
                      <div
                        className="absolute right-0 top-0 w-2 h-full bg-black bg-opacity-20 opacity-0 group-hover:opacity-100 cursor-e-resize transition-opacity duration-200 rounded-r"
                        onMouseDown={e =>
                          handleDragStart(e, task, 'resize-right')
                        }
                        onClick={e => e.stopPropagation()}
                        title="종료일 조정"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="p-4 border-t border-gray-200 dark:border-dark-300">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600 dark:text-dark-600">우선순위:</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <span className="text-gray-600 dark:text-dark-600">낮음</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-blue-200 dark:bg-blue-800 rounded"></div>
            <span className="text-gray-600 dark:text-dark-600">보통</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-orange-200 dark:bg-orange-800 rounded"></div>
            <span className="text-gray-600 dark:text-dark-600">높음</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-200 dark:bg-red-800 rounded"></div>
            <span className="text-gray-600 dark:text-dark-600">긴급</span>
          </div>
        </div>
      </div>

      {/* 태스크 편집 모달 */}
      <EditTaskModal
        isOpen={showEditModal}
        task={editingTask}
        onClose={handleEditModalClose}
        onSave={handleTaskSave}
      />

      {/* 태스크 추가 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-100 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-dark-300">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-900">
                새 태스크 추가 {selectedDate && `- ${selectedDate.toLocaleDateString()}`}
              </h2>
              <button
                onClick={handleCreateModalClose}
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
                onTaskCreated={handleCreateModalClose}
                isModal={true}
                initialData={selectedDate ? { startDate: selectedDate, dueDate: selectedDate } : undefined}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
