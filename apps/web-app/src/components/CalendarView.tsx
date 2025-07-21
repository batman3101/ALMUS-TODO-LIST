import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTasks } from '../hooks/useTasks';
import { useAuth } from '../hooks/useAuth';
import { Task, TaskPriority } from '@almus/shared-types';

interface CalendarViewProps {
  className?: string;
}

const CalendarView: React.FC<CalendarViewProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const {
    data: tasks,
    isLoading,
    error,
  } = useTasks({
    teamId: user?.teamId || '',
  });
  const { t } = useTranslation();

  const [currentDate, setCurrentDate] = useState(new Date());

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

  // 각 날짜별로 표시될 태스크들을 계산
  const dateTasksMap = useMemo(() => {
    if (!tasks || tasks.length === 0) return new Map();

    const dateMap = new Map<
      string,
      Array<{
        task: Task;
        isStart: boolean;
        isEnd: boolean;
        isContinuation: boolean;
        totalDuration: number;
        dayIndex: number;
      }>
    >();

    // 달력의 모든 날짜에 대해 초기화
    calendarData.weeks.forEach(week => {
      week.forEach(date => {
        dateMap.set(date.toDateString(), []);
      });
    });

    tasks.forEach((task: Task) => {
      if (task.startDate && task.dueDate) {
        const startDate = new Date(task.startDate);
        const endDate = new Date(task.dueDate);

        // 시작일부터 마감일까지의 모든 날짜에 태스크 정보 추가
        const currentDate = new Date(startDate);
        let dayIndex = 0;
        const totalDuration =
          Math.ceil(
            (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
          ) + 1;

        while (currentDate <= endDate) {
          const dateStr = currentDate.toDateString();
          const tasksForDate = dateMap.get(dateStr);

          if (tasksForDate) {
            tasksForDate.push({
              task,
              isStart: currentDate.toDateString() === startDate.toDateString(),
              isEnd: currentDate.toDateString() === endDate.toDateString(),
              isContinuation:
                currentDate.toDateString() !== startDate.toDateString(),
              totalDuration,
              dayIndex,
            });
          }

          currentDate.setDate(currentDate.getDate() + 1);
          dayIndex++;
        }
      }
    });

    return dateMap;
  }, [tasks, calendarData]);

  // 특정 날짜의 태스크들 반환
  const getTasksForDate = (date: Date) => {
    return dateTasksMap.get(date.toDateString()) || [];
  };

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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-900">
          캘린더 뷰
        </h2>

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
      <div className="grid grid-cols-7">
        {calendarData.weeks.map((week, weekIndex) =>
          week.map((date, dayIndex) => {
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const isToday = date.toDateString() === new Date().toDateString();
            const tasksForDate = getTasksForDate(date);

            // 태스크 개수에 따라 동적 높이 설정
            const minHeight = Math.max(120, 40 + tasksForDate.length * 28);

            return (
              <div
                key={`${weekIndex}-${dayIndex}`}
                className={`p-2 border-r border-b border-gray-200 dark:border-dark-300 last:border-r-0 ${
                  !isCurrentMonth ? 'bg-gray-50 dark:bg-dark-200' : ''
                }`}
                style={{ minHeight: `${minHeight}px` }}
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

                {/* 태스크 막대들 */}
                <div className="space-y-1">
                  {tasksForDate.map((taskInfo: any, index: number) => {
                    const { task, isStart, isEnd, isContinuation } = taskInfo;

                    return (
                      <div
                        key={`${task.id}-${index}`}
                        className={`text-xs px-2 py-1 flex items-center ${getPriorityColor(task.priority)} ${
                          isStart ? 'rounded-l' : ''
                        } ${isEnd ? 'rounded-r' : ''} ${
                          !isStart && !isEnd ? 'rounded-none' : ''
                        }`}
                        title={`${task.title} (${new Date(task.startDate!).toLocaleDateString()} - ${new Date(task.dueDate!).toLocaleDateString()})`}
                      >
                        {/* 시작일에만 제목 표시, 연속일에는 빈 막대 */}
                        <span
                          className={`truncate ${isContinuation ? 'opacity-0' : ''}`}
                        >
                          {task.title}
                        </span>

                        {/* 연속 표시용 점선 */}
                        {isContinuation && !isEnd && (
                          <div className="flex-1 border-b-2 border-dashed border-current opacity-50"></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
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
    </div>
  );
};

export default CalendarView;
