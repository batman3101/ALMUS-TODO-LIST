import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useTasks } from '../hooks/useTasks';
import {
  Task,
  GanttTask,
  ZoomLevel,
  GanttViewConfig,
} from '@almus/shared-types';
import { useAuth } from '../hooks/useAuth';

const GanttView: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [config, setConfig] = useState<GanttViewConfig>({
    zoomLevel: ZoomLevel.WEEK,
    showDependencies: true,
    showProgress: true,
    showDelayedTasks: true,
    dateRange: {
      start: new Date(),
      end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30일 후
    },
  });

  const {
    data: tasks,
    isLoading,
    error,
  } = useTasks({
    teamId: user?.teamId || '',
  });

  // Task를 GanttTask로 변환
  const ganttTasks = useMemo(() => {
    if (!tasks) return [];

    return tasks.map((task: Task): GanttTask => {
      const startDate = task.startDate || task.createdAt;
      const endDate =
        task.endDate ||
        task.dueDate ||
        new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      const isDelayed = task.dueDate
        ? new Date() > task.dueDate && task.status !== 'DONE'
        : false;
      const isOverdue = task.dueDate ? new Date() > task.dueDate : false;

      return {
        id: task.id,
        title: task.title,
        startDate,
        endDate,
        progress: task.progress || 0,
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId,
        dependencies: task.dependencies || [],
        isDelayed,
        isOverdue,
      };
    });
  }, [tasks]);

  const handleZoomChange = (zoomLevel: ZoomLevel) => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);

    // 줌 레벨에 따라 적절한 날짜 범위 설정
    switch (zoomLevel) {
      case ZoomLevel.DAY:
        // 현재 월의 1일부터 말일까지
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // 다음 달 0일 = 현재 달 마지막 날
        break;
      case ZoomLevel.WEEK:
        start.setDate(now.getDate() - 21); // 3주 전부터
        end.setDate(now.getDate() + 63); // 9주 후까지 (총 12주)
        break;
      case ZoomLevel.MONTH:
        start.setMonth(now.getMonth() - 2); // 2개월 전부터
        end.setMonth(now.getMonth() + 10); // 10개월 후까지 (총 12개월)
        break;
      case ZoomLevel.QUARTER:
        start.setMonth(now.getMonth() - 6); // 6개월 전부터
        end.setMonth(now.getMonth() + 18); // 18개월 후까지 (총 2년)
        break;
      case ZoomLevel.YEAR:
        start.setFullYear(now.getFullYear() - 1); // 1년 전부터
        end.setFullYear(now.getFullYear() + 4); // 4년 후까지 (총 5년)
        break;
      default:
        start.setDate(now.getDate() - 30);
        end.setDate(now.getDate() + 60);
    }

    setConfig(prev => ({
      ...prev,
      zoomLevel,
      dateRange: { start, end }
    }));
  };

  const renderTimeline = () => {
    const { start, end } = config.dateRange;
    const getDateFormat = () => {
      switch (config.zoomLevel) {
        case ZoomLevel.DAY:
          return 'MM/dd';
        case ZoomLevel.WEEK:
          return 'MM/dd';
        case ZoomLevel.MONTH:
          return 'yyyy/MM';
        case ZoomLevel.QUARTER:
          return 'yyyy Q';
        case ZoomLevel.YEAR:
          return 'yyyy';
        default:
          return 'MM/dd';
      }
    };

    const getTimeUnits = () => {
      const totalMs = end.getTime() - start.getTime();
      let units = [];
      
      switch (config.zoomLevel) {
        case ZoomLevel.DAY:
          const days = Math.ceil(totalMs / (24 * 60 * 60 * 1000));
          for (let i = 0; i < days; i++) {
            const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
            units.push({ date, label: format(date, 'MM/dd'), type: 'day' });
          }
          break;
        case ZoomLevel.WEEK:
          const weeks = Math.ceil(totalMs / (7 * 24 * 60 * 60 * 1000));
          for (let i = 0; i < weeks; i++) {
            const date = new Date(start.getTime() + i * 7 * 24 * 60 * 60 * 1000);
            units.push({ date, label: `${format(date, 'MM/dd')}주`, type: 'week' });
          }
          break;
        case ZoomLevel.MONTH:
          const months = Math.ceil(totalMs / (30 * 24 * 60 * 60 * 1000));
          for (let i = 0; i < months; i++) {
            const date = new Date(start.getTime() + i * 30 * 24 * 60 * 60 * 1000);
            units.push({ date, label: format(date, 'yyyy/MM'), type: 'month' });
          }
          break;
        case ZoomLevel.QUARTER:
          const quarters = Math.ceil(totalMs / (90 * 24 * 60 * 60 * 1000));
          for (let i = 0; i < quarters; i++) {
            const date = new Date(start.getTime() + i * 90 * 24 * 60 * 60 * 1000);
            const quarter = Math.floor(date.getMonth() / 3) + 1;
            units.push({ date, label: `${date.getFullYear()} Q${quarter}`, type: 'quarter' });
          }
          break;
        case ZoomLevel.YEAR:
          const years = Math.ceil(totalMs / (365 * 24 * 60 * 60 * 1000));
          for (let i = 0; i < years; i++) {
            const date = new Date(start.getTime() + i * 365 * 24 * 60 * 60 * 1000);
            units.push({ date, label: format(date, 'yyyy'), type: 'year' });
          }
          break;
      }
      return units;
    };

    const timeUnits = getTimeUnits();

    return (
      <div className="border-b-2 border-gray-300 dark:border-dark-400 bg-gray-100 dark:bg-dark-200">
        <div className="flex">
          {timeUnits.map((unit, i) => (
            <div
              key={i}
              className={`flex-1 text-sm font-semibold text-gray-700 dark:text-dark-700 border-r-2 border-gray-300 dark:border-dark-400 p-3 text-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-dark-100 dark:to-dark-200 ${
                unit.type === 'day' ? 'min-w-[60px]' :
                unit.type === 'week' ? 'min-w-[100px]' :
                unit.type === 'month' ? 'min-w-[120px]' :
                unit.type === 'quarter' ? 'min-w-[150px]' :
                'min-w-[80px]'
              }`}
            >
              <div className="font-bold text-primary-600 dark:text-primary-400">
                {unit.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTaskBar = (task: GanttTask) => {
    const { start, end } = config.dateRange;
    
    // 전체 기간을 밀리초로 계산
    const totalMs = end.getTime() - start.getTime();
    
    // 태스크 시작점과 지속 시간을 밀리초로 계산
    const taskStartMs = task.startDate.getTime() - start.getTime();
    const taskDurationMs = task.endDate.getTime() - task.startDate.getTime();

    // 백분율로 변환 (정확한 위치 계산)
    const left = Math.max(0, (taskStartMs / totalMs) * 100);
    const width = Math.max(2, (taskDurationMs / totalMs) * 100); // 최소 2% 너비 보장

    // 태스크가 범위를 벗어나는 경우 처리
    if (taskStartMs > totalMs || task.endDate.getTime() < start.getTime()) {
      return null; // 범위 밖의 태스크는 표시하지 않음
    }

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'TODO':
          return 'bg-gray-400 dark:bg-gray-500';
        case 'IN_PROGRESS':
          return 'bg-blue-500 dark:bg-blue-600';
        case 'REVIEW':
          return 'bg-yellow-500 dark:bg-yellow-600';
        case 'DONE':
          return 'bg-green-500 dark:bg-green-600';
        default:
          return 'bg-gray-400 dark:bg-gray-500';
      }
    };

    const getPriorityBorder = (priority: string) => {
      switch (priority) {
        case 'LOW':
          return 'border-l-4 border-l-gray-300';
        case 'MEDIUM':
          return 'border-l-4 border-l-blue-400';
        case 'HIGH':
          return 'border-l-4 border-l-orange-400';
        case 'URGENT':
          return 'border-l-4 border-l-red-500';
        default:
          return 'border-l-4 border-l-gray-300';
      }
    };

    return (
      <div className="relative">
        <div
          className={`absolute h-7 rounded shadow-sm ${getStatusColor(task.status)} ${getPriorityBorder(task.priority)} ${
            task.isDelayed ? 'ring-2 ring-red-500 ring-opacity-50' : ''
          } transition-all duration-200 hover:shadow-md cursor-pointer group`}
          style={{
            left: `${left}%`,
            width: `${width}%`,
            top: '6px',
          }}
          title={`${task.title} (${format(task.startDate, 'MM/dd')} - ${format(task.endDate, 'MM/dd')})`}
        >
          {/* 진행률 표시 */}
          {config.showProgress && task.progress > 0 && (
            <div
              className="absolute top-0 left-0 h-full bg-white bg-opacity-30 rounded-l"
              style={{ width: `${task.progress}%` }}
            />
          )}
          
          <div className="flex items-center justify-between px-2 h-full text-white text-xs font-medium">
            <span className="truncate flex-1">{task.title}</span>
            {config.showProgress && task.progress > 0 && (
              <span className="ml-1 text-xs bg-black bg-opacity-30 px-1 rounded">
                {task.progress}%
              </span>
            )}
          </div>

          {/* 호버 시 상세 정보 */}
          <div className="absolute bottom-full left-0 mb-2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 whitespace-nowrap">
            <div>{task.title}</div>
            <div>기간: {format(task.startDate, 'MM/dd')} - {format(task.endDate, 'MM/dd')}</div>
            <div>상태: {task.status}</div>
            <div>진행률: {task.progress}%</div>
            {task.isDelayed && <div className="text-red-400">지연됨</div>}
          </div>
        </div>

        {/* 의존성 표시 */}
        {config.showDependencies && task.dependencies && task.dependencies.length > 0 && (
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            {task.dependencies.map(depId => {
              const depTask = ganttTasks.find(t => t.id === depId);
              if (!depTask) return null;
              
              // 의존 태스크의 종료 지점 계산
              const depEndMs = depTask.endDate.getTime() - start.getTime();
              const depEndLeft = (depEndMs / totalMs) * 100;
              
              return (
                <svg
                  key={depId}
                  className="absolute top-0 left-0 w-full h-full"
                  style={{ pointerEvents: 'none' }}
                >
                  <defs>
                    <marker
                      id={`arrowhead-${depId}`}
                      markerWidth="10"
                      markerHeight="7"
                      refX="9"
                      refY="3.5"
                      orient="auto"
                    >
                      <polygon
                        points="0 0, 10 3.5, 0 7"
                        fill="#ef4444"
                        className="opacity-70"
                      />
                    </marker>
                  </defs>
                  <line
                    x1={`${depEndLeft}%`}
                    y1="28"
                    x2={`${left}%`}
                    y2="28"
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeDasharray="4,2"
                    markerEnd={`url(#arrowhead-${depId})`}
                    className="opacity-70"
                  />
                </svg>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 text-gray-900 dark:text-dark-900">로딩 중...</div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 dark:text-red-400">
        오류가 발생했습니다: {error.message}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-100 rounded-lg shadow p-6 transition-colors duration-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-900">
          {t('view.gantt')}
        </h2>

        <div className="flex space-x-2">
          <select
            value={config.zoomLevel}
            onChange={e => handleZoomChange(e.target.value as ZoomLevel)}
            className="px-3 py-1 border border-gray-300 dark:border-dark-300 bg-white dark:bg-dark-50 text-gray-900 dark:text-dark-900 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors duration-200"
          >
            <option value={ZoomLevel.DAY}>일</option>
            <option value={ZoomLevel.WEEK}>주</option>
            <option value={ZoomLevel.MONTH}>월</option>
            <option value={ZoomLevel.QUARTER}>분기</option>
            <option value={ZoomLevel.YEAR}>년</option>
          </select>

          <label className="flex items-center space-x-2 text-sm text-gray-900 dark:text-dark-900">
            <input
              type="checkbox"
              checked={config.showDependencies}
              onChange={e =>
                setConfig(prev => ({
                  ...prev,
                  showDependencies: e.target.checked,
                }))
              }
              className="rounded border-gray-300 dark:border-dark-300 text-primary-600 focus:ring-primary-500"
            />
            <span>의존성 표시</span>
          </label>

          <label className="flex items-center space-x-2 text-sm text-gray-900 dark:text-dark-900">
            <input
              type="checkbox"
              checked={config.showProgress}
              onChange={e =>
                setConfig(prev => ({ ...prev, showProgress: e.target.checked }))
              }
              className="rounded border-gray-300 dark:border-dark-300 text-primary-600 focus:ring-primary-500"
            />
            <span>진행률 표시</span>
          </label>
        </div>
      </div>

      <div className="border-2 border-gray-300 dark:border-dark-400 rounded-lg">
        {/* 헤더 영역 */}
        <div className="flex bg-gray-200 dark:bg-dark-300 border-b-2 border-gray-300 dark:border-dark-400">
          <div className="w-80 flex-shrink-0 p-4 border-r-2 border-gray-300 dark:border-dark-400 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-dark-200 dark:to-dark-300">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800 dark:text-dark-800">
                📋 태스크 목록
              </h3>
              <div className="text-sm text-gray-600 dark:text-dark-600">
                총 {ganttTasks.length}개
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800 dark:text-dark-800">
                  📅 간트 차트
                </h3>
                <div className="text-sm text-gray-600 dark:text-dark-600">
                  {config.zoomLevel === ZoomLevel.DAY ? '일별 보기' :
                   config.zoomLevel === ZoomLevel.WEEK ? '주별 보기' :
                   config.zoomLevel === ZoomLevel.MONTH ? '월별 보기' :
                   config.zoomLevel === ZoomLevel.QUARTER ? '분기별 보기' :
                   '연별 보기'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 컨텐츠 영역 */}
        <div className="flex">
          {/* 왼쪽: 태스크 목록 */}
          <div className="w-80 flex-shrink-0 border-r-2 border-gray-300 dark:border-dark-400 bg-gray-50 dark:bg-dark-100">
            {ganttTasks.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-dark-500">
                태스크가 없습니다
              </div>
            ) : (
              <div>
                {ganttTasks.map((task, index) => (
                  <div
                    key={task.id}
                    className={`h-16 border-b border-gray-200 dark:border-dark-300 p-3 ${
                      index % 2 === 0 ? 'bg-white dark:bg-dark-50' : 'bg-gray-100 dark:bg-dark-100'
                    } hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-150`}
                  >
                    <div className="flex items-center justify-between h-full">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-3 h-3 rounded-full ${
                            task.status === 'TODO' ? 'bg-gray-400' :
                            task.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                            task.status === 'REVIEW' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`} />
                          <span className="text-sm font-bold text-gray-900 dark:text-dark-900 truncate">
                            {task.title}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-dark-600 mb-1">
                          📅 {format(task.startDate, 'MM/dd')} ~ {format(task.endDate, 'MM/dd')}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`px-2 py-1 rounded text-white ${
                            task.priority === 'LOW' ? 'bg-gray-400' :
                            task.priority === 'MEDIUM' ? 'bg-blue-500' :
                            task.priority === 'HIGH' ? 'bg-orange-500' :
                            'bg-red-500'
                          }`}>
                            {task.priority}
                          </span>
                          {task.isDelayed && (
                            <span className="px-2 py-1 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded">
                              지연
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
                          {task.progress}%
                        </div>
                        <div className="text-xs text-gray-500 dark:text-dark-500">
                          진행률
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 오른쪽: 간트 차트 */}
          <div className="flex-1 overflow-x-auto">
            {/* 타임라인 헤더 */}
            {renderTimeline()}
            
            {/* 태스크 바들 */}
            <div className="relative bg-white dark:bg-dark-50">
              {ganttTasks.length === 0 ? (
                <div className="p-8 text-center text-gray-400 dark:text-dark-400">
                  태스크를 추가해주세요
                </div>
              ) : (
                ganttTasks.map((task, index) => (
                  <div
                    key={task.id}
                    className={`relative h-16 border-b border-gray-200 dark:border-dark-300 ${
                      index % 2 === 0 ? 'bg-white dark:bg-dark-50' : 'bg-gray-50 dark:bg-dark-100'
                    } hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-150`}
                  >
                    {renderTaskBar(task)}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttView;
