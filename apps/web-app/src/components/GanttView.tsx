import React, { useState, useMemo, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { format, addDays, differenceInDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { useTasks, useUpdateTask } from '../hooks/useTasks';
import type { Task, GanttTask, ZoomLevel, GanttViewConfig } from '@almus/shared-types';
import { TaskStatus, TaskPriority } from '@almus/shared-types';

interface GanttViewProps {
  className?: string;
}

const GanttView: React.FC<GanttViewProps> = ({ className = '' }) => {
  const { data: tasks, isLoading, error } = useTasks();
  const updateTaskMutation = useUpdateTask();

  const [config, setConfig] = useState<GanttViewConfig>({
    zoomLevel: ZoomLevel.WEEK,
    showDependencies: true,
    showProgress: true,
    showDelayedTasks: true,
    dateRange: {
      start: new Date(),
      end: addDays(new Date(), 30),
    },
  });

  // Task를 GanttTask로 변환
  const ganttTasks = useMemo(() => {
    if (!tasks) return [];

    return tasks.map((task: Task): GanttTask => {
      const startDate = task.startDate || task.createdAt;
      const endDate = task.endDate || task.dueDate || addDays(startDate, 7);
      const today = startOfDay(new Date());
      
      const isDelayed = task.status !== TaskStatus.DONE && 
        task.dueDate && isAfter(today, task.dueDate);
      const isOverdue = task.status !== TaskStatus.DONE && 
        endDate && isAfter(today, endDate);

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

  // 줌 레벨에 따른 날짜 포맷팅
  const formatDate = useCallback((date: Date) => {
    switch (config.zoomLevel) {
      case ZoomLevel.DAY:
        return format(date, 'MM/dd');
      case ZoomLevel.WEEK:
        return format(date, 'MM/dd');
      case ZoomLevel.MONTH:
        return format(date, 'MMM');
      case ZoomLevel.QUARTER:
        return format(date, 'yyyy QQQ');
      case ZoomLevel.YEAR:
        return format(date, 'yyyy');
      default:
        return format(date, 'MM/dd');
    }
  }, [config.zoomLevel]);

  // 차트 데이터 생성
  const chartData = useMemo(() => {
    const data: any[] = [];
    const startDate = config.dateRange.start;
    const endDate = config.dateRange.end;
    const daysDiff = differenceInDays(endDate, startDate);

    // 줌 레벨에 따른 간격 설정
    let interval = 1;
    switch (config.zoomLevel) {
      case ZoomLevel.DAY:
        interval = 1;
        break;
      case ZoomLevel.WEEK:
        interval = 7;
        break;
      case ZoomLevel.MONTH:
        interval = 30;
        break;
      case ZoomLevel.QUARTER:
        interval = 90;
        break;
      case ZoomLevel.YEAR:
        interval = 365;
        break;
    }

    for (let i = 0; i <= daysDiff; i += interval) {
      const date = addDays(startDate, i);
      const dayTasks = ganttTasks.filter(task => {
        const taskStart = startOfDay(task.startDate);
        const taskEnd = startOfDay(task.endDate);
        const currentDate = startOfDay(date);
        return currentDate >= taskStart && currentDate <= taskEnd;
      });

      data.push({
        date: formatDate(date),
        fullDate: date,
        tasks: dayTasks.length,
        delayedTasks: dayTasks.filter(task => task.isDelayed).length,
        overdueTasks: dayTasks.filter(task => task.isOverdue).length,
        inProgressTasks: dayTasks.filter(task => task.status === TaskStatus.IN_PROGRESS).length,
        completedTasks: dayTasks.filter(task => task.status === TaskStatus.DONE).length,
      });
    }

    return data;
  }, [ganttTasks, config, formatDate]);

  // 지연된 태스크 필터링
  const delayedTasks = useMemo(() => {
    return ganttTasks.filter(task => task.isDelayed || task.isOverdue);
  }, [ganttTasks]);

  // 줌 레벨 변경 핸들러
  const handleZoomChange = (zoomLevel: ZoomLevel) => {
    setConfig(prev => ({
      ...prev,
      zoomLevel,
    }));
  };

  // 날짜 범위 변경 핸들러
  const handleDateRangeChange = (start: Date, end: Date) => {
    setConfig(prev => ({
      ...prev,
      dateRange: { start, end },
    }));
  };

  // 태스크 클릭 핸들러
  const handleTaskClick = (taskId: string) => {
    // 태스크 상세 보기 또는 편집 모달 열기
    console.log('Task clicked:', taskId);
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.TODO:
        return '#6B7280';
      case TaskStatus.IN_PROGRESS:
        return '#3B82F6';
      case TaskStatus.REVIEW:
        return '#F59E0B';
      case TaskStatus.DONE:
        return '#10B981';
      case TaskStatus.CANCELLED:
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.LOW:
        return '#6B7280';
      case TaskPriority.MEDIUM:
        return '#3B82F6';
      case TaskPriority.HIGH:
        return '#F59E0B';
      case TaskPriority.URGENT:
        return '#EF4444';
      default:
        return '#3B82F6';
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-red-500">간트 차트를 불러오는데 실패했습니다.</div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* 헤더 */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">간트 차트</h2>
          <div className="flex items-center gap-4">
            {/* 줌 컨트롤 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">줌:</span>
              <select
                value={config.zoomLevel}
                onChange={(e) => handleZoomChange(e.target.value as ZoomLevel)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={ZoomLevel.DAY}>일</option>
                <option value={ZoomLevel.WEEK}>주</option>
                <option value={ZoomLevel.MONTH}>월</option>
                <option value={ZoomLevel.QUARTER}>분기</option>
                <option value={ZoomLevel.YEAR}>년</option>
              </select>
            </div>

            {/* 설정 토글 */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.showDependencies}
                  onChange={(e) => setConfig(prev => ({ ...prev, showDependencies: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                의존성
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.showProgress}
                  onChange={(e) => setConfig(prev => ({ ...prev, showProgress: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                진행률
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.showDelayedTasks}
                  onChange={(e) => setConfig(prev => ({ ...prev, showDelayedTasks: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                지연 태스크
              </label>
            </div>
          </div>
        </div>

        {/* 지연 태스크 경고 */}
        {config.showDelayedTasks && delayedTasks.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-red-600 font-medium">⚠️ 지연된 태스크</span>
              <span className="text-red-600 text-sm">
                {delayedTasks.length}개 태스크가 지연되었습니다.
              </span>
            </div>
            <div className="mt-2 space-y-1">
              {delayedTasks.slice(0, 3).map(task => (
                <div key={task.id} className="text-sm text-red-700">
                  • {task.title} (마감일: {format(task.dueDate || task.endDate, 'MM/dd')})
                </div>
              ))}
              {delayedTasks.length > 3 && (
                <div className="text-sm text-red-600">
                  외 {delayedTasks.length - 3}개 태스크...
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 차트 */}
      <div className="p-6">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                      <p className="font-medium">{label}</p>
                      <p className="text-sm text-gray-600">
                        총 태스크: {data.tasks}개
                      </p>
                      {data.delayedTasks > 0 && (
                        <p className="text-sm text-red-600">
                          지연: {data.delayedTasks}개
                        </p>
                      )}
                      {data.overdueTasks > 0 && (
                        <p className="text-sm text-red-800">
                          초과: {data.overdueTasks}개
                        </p>
                      )}
                      <p className="text-sm text-blue-600">
                        진행 중: {data.inProgressTasks}개
                      </p>
                      <p className="text-sm text-green-600">
                        완료: {data.completedTasks}개
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="tasks" fill="#3B82F6" name="전체 태스크" />
            <Bar dataKey="delayedTasks" fill="#EF4444" name="지연 태스크" />
            <Bar dataKey="overdueTasks" fill="#DC2626" name="초과 태스크" />
            <Bar dataKey="inProgressTasks" fill="#10B981" name="진행 중" />
            <Bar dataKey="completedTasks" fill="#059669" name="완료" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 태스크 목록 */}
      <div className="p-6 border-t border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">태스크 목록</h3>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {ganttTasks.map(task => (
            <div
              key={task.id}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                task.isDelayed || task.isOverdue
                  ? 'border-red-200 bg-red-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => handleTaskClick(task.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{task.title}</h4>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                    <span>시작: {format(task.startDate, 'MM/dd')}</span>
                    <span>종료: {format(task.endDate, 'MM/dd')}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      task.status === TaskStatus.DONE ? 'bg-green-100 text-green-800' :
                      task.status === TaskStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.status}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      getPriorityColor(task.priority) === '#EF4444' ? 'bg-red-100 text-red-800' :
                      getPriorityColor(task.priority) === '#F59E0B' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {config.showProgress && (
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  )}
                  {(task.isDelayed || task.isOverdue) && (
                    <span className="text-red-600 text-sm font-medium">
                      {task.isOverdue ? '초과' : '지연'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GanttView; 