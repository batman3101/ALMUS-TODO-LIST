import React, { useState, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useTasks, useUpdateTask, useDeleteTask } from '../hooks/useTasks';
import type { Task } from '@almus/shared-types';
import { TaskStatus, TaskPriority } from '@almus/shared-types';

interface GridViewProps {
  className?: string;
}

interface EditableCellProps {
  value: string;
  onSave: (value: string) => void;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
}

const EditableCell: React.FC<EditableCellProps> = ({
  value,
  onSave,
  isEditing,
  onEdit,
  onCancel,
}) => {
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    if (editValue.trim() !== value) {
      onSave(editValue.trim());
    }
    onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      onCancel();
    }
  };

  if (isEditing) {
    return (
      <input
        type="text"
        value={editValue}
        onChange={e => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        autoFocus
      />
    );
  }

  return (
    <div
      className="px-2 py-1 text-sm cursor-pointer hover:bg-gray-50"
      onDoubleClick={onEdit}
    >
      {value}
    </div>
  );
};

const GridView: React.FC<GridViewProps> = ({ className = '' }) => {
  const { data: tasks, isLoading, error } = useTasks();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{
    taskId: string;
    field: keyof Task;
  } | null>(null);

  // 컬럼 정의
  const columns = useMemo(
    () => [
      { key: 'title', label: '제목', width: 200 },
      { key: 'description', label: '설명', width: 300 },
      { key: 'status', label: '상태', width: 120 },
      { key: 'priority', label: '우선순위', width: 120 },
      { key: 'assigneeId', label: '담당자', width: 120 },
      { key: 'dueDate', label: '마감일', width: 120 },
      { key: 'actions', label: '작업', width: 100 },
    ],
    []
  );

  const handleSelectTask = (taskId: string, checked: boolean) => {
    const newSelected = new Set(selectedTasks);
    if (checked) {
      newSelected.add(taskId);
    } else {
      newSelected.delete(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && tasks) {
      setSelectedTasks(new Set(tasks.map((task: Task) => task.id)));
    } else {
      setSelectedTasks(new Set());
    }
  };

  const handleEditCell = (taskId: string, field: keyof Task) => {
    setEditingCell({ taskId, field });
  };

  const handleSaveCell = async (
    taskId: string,
    field: keyof Task,
    value: string
  ) => {
    try {
      const task = tasks?.find((t: Task) => t.id === taskId);
      if (!task) return;

      const updateData: Partial<Task> = {};
      if (field === 'title' || field === 'description') {
        updateData[field] = value;
      } else if (field === 'status') {
        updateData.status = value as TaskStatus;
      } else if (field === 'priority') {
        updateData.priority = value as TaskPriority;
      } else if (field === 'dueDate') {
        updateData.dueDate = new Date(value);
      } else if (field === 'assigneeId') {
        updateData.assigneeId = value;
      }

      await updateTaskMutation.mutateAsync({
        taskId,
        updateData: {
          ...updateData,
          id: taskId,
          version: task.version || 1, // version 필드 추가
        },
      });
    } catch (error) {
      console.error('태스크 업데이트 실패:', error);
      alert('태스크 업데이트에 실패했습니다.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('정말로 이 태스크를 삭제하시겠습니까?')) {
      try {
        await deleteTaskMutation.mutateAsync(taskId);
      } catch (error) {
        console.error('태스크 삭제 실패:', error);
        alert('태스크 삭제에 실패했습니다.');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.size === 0) return;

    if (
      window.confirm(
        `선택된 ${selectedTasks.size}개의 태스크를 삭제하시겠습니까?`
      )
    ) {
      try {
        await Promise.all(
          Array.from(selectedTasks).map(taskId =>
            deleteTaskMutation.mutateAsync(taskId)
          )
        );
        setSelectedTasks(new Set());
      } catch (error) {
        console.error('일괄 삭제 실패:', error);
        alert('일괄 삭제에 실패했습니다.');
      }
    }
  };

  const renderCell = (task: Task, column: (typeof columns)[0]) => {
    const isEditing =
      editingCell?.taskId === task.id && editingCell?.field === column.key;

    switch (column.key) {
      case 'title':
      case 'description':
        return (
          <EditableCell
            value={(task[column.key] as string) || ''}
            onSave={value =>
              handleSaveCell(task.id, column.key as keyof Task, value)
            }
            isEditing={isEditing}
            onEdit={() => handleEditCell(task.id, column.key as keyof Task)}
            onCancel={() => setEditingCell(null)}
          />
        );

      case 'status':
        return (
          <EditableCell
            value={task.status}
            onSave={value => handleSaveCell(task.id, 'status', value)}
            isEditing={isEditing}
            onEdit={() => handleEditCell(task.id, 'status')}
            onCancel={() => setEditingCell(null)}
          />
        );

      case 'priority':
        return (
          <EditableCell
            value={task.priority}
            onSave={value => handleSaveCell(task.id, 'priority', value)}
            isEditing={isEditing}
            onEdit={() => handleEditCell(task.id, 'priority')}
            onCancel={() => setEditingCell(null)}
          />
        );

      case 'assigneeId':
        return (
          <EditableCell
            value={task.assigneeId}
            onSave={value => handleSaveCell(task.id, 'assigneeId', value)}
            isEditing={isEditing}
            onEdit={() => handleEditCell(task.id, 'assigneeId')}
            onCancel={() => setEditingCell(null)}
          />
        );

      case 'dueDate':
        return (
          <EditableCell
            value={
              task.dueDate
                ? new Date(task.dueDate).toISOString().split('T')[0]
                : ''
            }
            onSave={value => handleSaveCell(task.id, 'dueDate', value)}
            isEditing={isEditing}
            onEdit={() => handleEditCell(task.id, 'dueDate')}
            onCancel={() => setEditingCell(null)}
          />
        );

      case 'actions':
        return (
          <div className="flex gap-1">
            <button
              onClick={() => handleDeleteTask(task.id)}
              className="px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
            >
              삭제
            </button>
          </div>
        );

      default:
        return (
          <div className="px-2 py-1 text-sm">
            {task[column.key as keyof Task] as string}
          </div>
        );
    }
  };

  const Row = ({
    index,
    style,
  }: {
    index: number;
    style: React.CSSProperties;
  }) => {
    const task = tasks?.[index];
    if (!task) return null;

    const isSelected = selectedTasks.has(task.id);

    return (
      <div
        style={style}
        className={`flex items-center border-b border-gray-200 hover:bg-gray-50 ${
          isSelected ? 'bg-blue-50' : ''
        }`}
      >
        <div className="w-12 p-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={e => handleSelectTask(task.id, e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        </div>
        {columns.map(column => (
          <div
            key={column.key}
            className="border-r border-gray-200 last:border-r-0"
            style={{ width: column.width }}
          >
            {renderCell(task, column)}
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">로딩 중...</div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500">태스크 목록을 불러오는데 실패했습니다.</div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">그리드 뷰</h2>
        {selectedTasks.size > 0 && (
          <button
            onClick={handleBulkDelete}
            className="px-4 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
          >
            선택 삭제 ({selectedTasks.size})
          </button>
        )}
      </div>

      {/* 테이블 헤더 */}
      <div className="flex items-center border-b border-gray-200 bg-gray-50">
        <div className="w-12 p-2">
          <input
            type="checkbox"
            checked={
              selectedTasks.size === (tasks?.length || 0) &&
              selectedTasks.size > 0
            }
            onChange={e => handleSelectAll(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        </div>
        {columns.map(column => (
          <div
            key={column.key}
            className="px-2 py-3 text-sm font-medium text-gray-700 border-r border-gray-200 last:border-r-0"
            style={{ width: column.width }}
          >
            {column.label}
          </div>
        ))}
      </div>

      {/* 테이블 본문 */}
      <div className="h-96">
        <AutoSizer>
          {({ height, width }) => (
            <List
              height={height}
              itemCount={tasks?.length || 0}
              itemSize={50}
              width={width}
            >
              {Row}
            </List>
          )}
        </AutoSizer>
      </div>

      {tasks?.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          등록된 태스크가 없습니다.
        </div>
      )}
    </div>
  );
};

export default GridView;
