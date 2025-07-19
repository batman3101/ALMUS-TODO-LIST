import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useTasks } from '../hooks/useTasks';
import { Task, GanttTask, ZoomLevel, GanttViewConfig } from '@almus/shared-types';
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

  const { data: tasks, isLoading, error } = useTasks({
    teamId: user?.teamId || '',
  });

  // Task를 GanttTask로 변환
  const ganttTasks = useMemo(() => {
    if (!tasks) return [];

    return tasks.map((task: Task): GanttTask => {
      const startDate = task.startDate || task.createdAt;
      const endDate = task.endDate || task.dueDate || new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      const isDelayed = task.dueDate ? new Date() > task.dueDate && task.status !== 'DONE' : false;
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
    setConfig(prev => ({ ...prev, zoomLevel }));
  };

  const handleDateRangeChange = (start: Date, end: Date) => {
    setConfig(prev => ({ ...prev, dateRange: { start, end } }));
  };

  const renderTimeline = () => {
    const { start, end } = config.dateRange;
    const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    
    return (
      <div className="flex border-b border-gray-200">
        {Array.from({ length: days }, (_, i) => {
          const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
          return (
            <div
              key={i}
              className="flex-1 text-xs text-gray-500 border-r border-gray-100 p-1 text-center"
            >
              {format(date, 'MM/dd')}
            </div>
          );
        })}
      </div>
    );
  };

  const renderTaskBar = (task: GanttTask) => {
    const { start, end } = config.dateRange;
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const taskStart = Math.max(0, (task.startDate.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const taskDuration = Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (24 * 60 * 60 * 1000));
    
    const left = (taskStart / totalDays) * 100;
    const width = (taskDuration / totalDays) * 100;

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'TODO':
          return 'bg-gray-300';
        case 'IN_PROGRESS':
          return 'bg-blue-500';
        case 'REVIEW':
          return 'bg-yellow-500';
        case 'DONE':
          return 'bg-green-500';
        default:
          return 'bg-gray-300';
      }
    };

    return (
      <div
        className={`absolute h-6 rounded ${getStatusColor(task.status)} ${
          task.isDelayed ? 'border-2 border-red-500' : ''
        }`}
        style={{
          left: `${left}%`,
          width: `${width}%`,
          top: '2px',
        }}
        title={`${task.title} (마감일: ${format(task.endDate, 'MM/dd')})`}
      >
        <div className="flex items-center justify-between px-2 h-full text-white text-xs">
          <span className="truncate">{task.title}</span>
          {task.progress > 0 && (
            <span className="ml-1">{task.progress}%</span>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <div className="p-4">로딩 중...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">오류가 발생했습니다: {error.message}</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{t('view.gantt')}</h2>
        
        <div className="flex space-x-2">
          <select
            value={config.zoomLevel}
            onChange={(e) => handleZoomChange(e.target.value as ZoomLevel)}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value={ZoomLevel.DAY}>일</option>
            <option value={ZoomLevel.WEEK}>주</option>
            <option value={ZoomLevel.MONTH}>월</option>
            <option value={ZoomLevel.QUARTER}>분기</option>
            <option value={ZoomLevel.YEAR}>년</option>
          </select>
          
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={config.showDependencies}
              onChange={(e) => setConfig(prev => ({ ...prev, showDependencies: e.target.checked }))}
              className="rounded"
            />
            <span>의존성 표시</span>
          </label>
          
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={config.showProgress}
              onChange={(e) => setConfig(prev => ({ ...prev, showProgress: e.target.checked }))}
              className="rounded"
            />
            <span>진행률 표시</span>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* 타임라인 헤더 */}
          {renderTimeline()}
          
          {/* Task 바 */}
          <div className="relative">
            {ganttTasks.map((task) => (
              <div key={task.id} className="relative h-10 border-b border-gray-100">
                <div className="absolute left-0 top-0 w-48 h-full bg-gray-50 border-r border-gray-200 p-2">
                  <div className="text-sm font-medium truncate">{task.title}</div>
                  <div className="text-xs text-gray-500">
                    {format(task.startDate, 'MM/dd')} - {format(task.endDate, 'MM/dd')}
                  </div>
                </div>
                
                <div className="ml-48 relative h-full">
                  {renderTaskBar(task)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttView; 