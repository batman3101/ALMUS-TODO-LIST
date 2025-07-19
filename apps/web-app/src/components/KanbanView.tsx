import React, { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useTasks, useUpdateTask } from '../hooks/useTasks';
import type { Task } from '@almus/shared-types';
import { TaskStatus, TaskPriority } from '@almus/shared-types';

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
  const { data: tasks, isLoading, error } = useTasks();
  const updateTaskMutation = useUpdateTask();

  const [wipLimits, setWipLimits] = useState<Record<TaskStatus, number>>({
    [TaskStatus.TODO]: 10,
    [TaskStatus.IN_PROGRESS]: 5,
    [TaskStatus.REVIEW]: 3,
    [TaskStatus.DONE]: 20,
  });

  // 컬럼 정의
  const columns: Column[] = useMemo(() => [
    {
      id: TaskStatus.TODO,
      title: '할 일',
      color: 'bg-gray-100',
      wipLimit: wipLimits[TaskStatus.TODO],
    },
    {
      id: TaskStatus.IN_PROGRESS,
      title: '진행 중',
      color: 'bg-blue-100',
      wipLimit: wipLimits[TaskStatus.IN_PROGRESS],
    },
    {
      id: TaskStatus.REVIEW,
      title: '검토',
      color: 'bg-yellow-100',
      wipLimit: wipLimits[TaskStatus.REVIEW],
    },
    {
      id: TaskStatus.DONE,
      title: '완료',
      color: 'bg-green-100',
      wipLimit: wipLimits[TaskStatus.DONE],
    },
  ], [wipLimits]);

  // 컬럼별 태스크 그룹화
  const tasksByColumn = useMemo(() => {
    if (!tasks) return {} as Record<TaskStatus, Task[]>;
    
    return tasks.reduce((acc: Record<TaskStatus, Task[]>, task: Task) => {
      const status = task.status;
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(task);
      return acc;
    }, {} as Record<TaskStatus, Task[]>);
  }, [tasks]);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceColumn = source.droppableId as TaskStatus;
    const destinationColumn = destination.droppableId as TaskStatus;

    // WIP 제한 확인
    const destinationTasks = tasksByColumn[destinationColumn] || [];
    if (destinationColumn !== sourceColumn && wipLimits[destinationColumn]) {
      if (destinationTasks.length >= wipLimits[destinationColumn]!) {
        alert(`${columns.find(col => col.id === destinationColumn)?.title} 컬럼의 WIP 제한에 도달했습니다.`);
        return;
      }
    }

    try {
      const task = tasks?.find((t: Task) => t.id === draggableId);
      if (!task) return;

      await updateTaskMutation.mutateAsync({
        taskId: draggableId,
        updateData: {
          status: destinationColumn,
          id: draggableId,
          version: task.version || 1,
        },
      });
    } catch (error) {
      console.error('태스크 상태 업데이트 실패:', error);
      alert('태스크 상태 업데이트에 실패했습니다.');
    }
  };

  const handleWipLimitChange = (columnId: TaskStatus, limit: number) => {
    setWipLimits(prev => ({
      ...prev,
      [columnId]: limit,
    }));
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

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">로딩 중...</div>;
  }

  if (error) {
    return <div className="text-red-500">태스크 목록을 불러오는데 실패했습니다.</div>;
  }

  return (
    <div className={`${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 bg-white rounded-t-lg border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">칸반 보드</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">WIP 제한 설정:</span>
          {columns.map((column) => (
            <div key={column.id} className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{column.title}</span>
              <input
                type="number"
                min="0"
                max="50"
                value={wipLimits[column.id]}
                onChange={(e) => handleWipLimitChange(column.id, parseInt(e.target.value) || 0)}
                className="w-12 px-1 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 칸반 보드 */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 p-4 bg-gray-50 min-h-96">
          {columns.map((column) => {
            const columnTasks = tasksByColumn[column.id] || [];
            const isOverLimit = wipLimits[column.id] && columnTasks.length > wipLimits[column.id]!;

            return (
              <div key={column.id} className="flex-1 min-w-0">
                <div className={`${column.color} rounded-lg p-4 h-full`}>
                  {/* 컬럼 헤더 */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">{column.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        {columnTasks.length}
                        {wipLimits[column.id] && `/${wipLimits[column.id]}`}
                      </span>
                      {isOverLimit && (
                        <span className="text-xs text-red-600 font-medium">초과!</span>
                      )}
                    </div>
                  </div>

                  {/* 드롭 영역 */}
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-64 transition-colors ${
                          snapshot.isDraggingOver ? 'bg-blue-50' : ''
                        } ${isOverLimit ? 'bg-red-50' : ''}`}
                      >
                                                 {columnTasks.map((task: Task, index: number) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`bg-white p-3 rounded-lg shadow-sm border border-gray-200 mb-3 cursor-move transition-shadow ${
                                  snapshot.isDragging ? 'shadow-lg' : 'hover:shadow-md'
                                }`}
                              >
                                {/* 태스크 제목 */}
                                <h4 className="font-medium text-gray-900 text-sm mb-2 line-clamp-2">
                                  {task.title}
                                </h4>

                                {/* 태스크 설명 */}
                                {task.description && (
                                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                    {task.description}
                                  </p>
                                )}

                                {/* 태스크 메타데이터 */}
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-medium ${getPriorityColor(task.priority)}`}>
                                      {task.priority}
                                    </span>
                                    {task.dueDate && (
                                      <span className="text-gray-500">
                                        {formatDate(task.dueDate)}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-gray-400">
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

      {tasks?.length === 0 && (
        <div className="text-center text-gray-500 py-8 bg-white rounded-b-lg">
          등록된 태스크가 없습니다.
        </div>
      )}
    </div>
  );
};

export default KanbanView; 