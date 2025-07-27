import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '../utils/test-utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from './useTasks';
import { mockSupabase, createMockTask } from '../utils/test-utils';
import React from 'react';

// Mock Supabase client
vi.mock('../../../../lib/supabase/client', () => ({
  supabase: mockSupabase,
}));

// Mock useTeams hook
vi.mock('./useTeams', () => ({
  useTeams: () => ({
    currentTeam: { id: 'test-team-id' },
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('팀의 태스크 목록을 로드한다', async () => {
    const mockTasks = [
      createMockTask({ id: '1', title: 'Task 1' }),
      createMockTask({ id: '2', title: 'Task 2' }),
    ];

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue({
        data: mockTasks,
        error: null,
      }),
    });

    const { result } = renderHook(() => useTasks(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockTasks);
    expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
  });

  it('태스크 로드 에러를 처리한다', async () => {
    const mockError = new Error('Failed to load tasks');

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    });

    const { result } = renderHook(() => useTasks(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeUndefined();
  });

  it('필터 조건으로 태스크를 검색한다', async () => {
    const mockTasks = [createMockTask({ status: 'TODO' })];

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue({
        data: mockTasks,
        error: null,
      }),
    });

    const { result } = renderHook(
      () => useTasks({ status: 'TODO', priority: 'HIGH' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockTasks);
  });
});

describe('useCreateTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('새 태스크를 생성한다', async () => {
    const newTask = createMockTask({ title: 'New Task' });

    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: newTask,
        error: null,
      }),
    });

    const { result } = renderHook(() => useCreateTask(), {
      wrapper: createWrapper(),
    });

    const taskData = {
      title: 'New Task',
      description: 'Task description',
      status: 'TODO' as const,
      priority: 'MEDIUM' as const,
      team_id: 'test-team-id',
    };

    await result.current.mutateAsync(taskData);

    expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
  });

  it('태스크 생성 에러를 처리한다', async () => {
    const mockError = new Error('Failed to create task');

    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    });

    const { result } = renderHook(() => useCreateTask(), {
      wrapper: createWrapper(),
    });

    const taskData = {
      title: 'New Task',
      team_id: 'test-team-id',
    };

    try {
      await result.current.mutateAsync(taskData);
    } catch (error) {
      expect(error).toBeTruthy();
    }
  });
});

describe('useUpdateTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('태스크를 업데이트한다', async () => {
    const updatedTask = createMockTask({ 
      id: 'task-1', 
      title: 'Updated Task' 
    });

    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: updatedTask,
        error: null,
      }),
    });

    const { result } = renderHook(() => useUpdateTask(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      id: 'task-1',
      updates: { title: 'Updated Task' },
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
  });

  it('태스크 업데이트 에러를 처리한다', async () => {
    const mockError = new Error('Failed to update task');

    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    });

    const { result } = renderHook(() => useUpdateTask(), {
      wrapper: createWrapper(),
    });

    try {
      await result.current.mutateAsync({
        id: 'task-1',
        updates: { title: 'Updated Task' },
      });
    } catch (error) {
      expect(error).toBeTruthy();
    }
  });
});

describe('useDeleteTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('태스크를 삭제한다', async () => {
    mockSupabase.from.mockReturnValue({
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    });

    const { result } = renderHook(() => useDeleteTask(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync('task-1');

    expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
  });

  it('태스크 삭제 에러를 처리한다', async () => {
    const mockError = new Error('Failed to delete task');

    mockSupabase.from.mockReturnValue({
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    });

    const { result } = renderHook(() => useDeleteTask(), {
      wrapper: createWrapper(),
    });

    try {
      await result.current.mutateAsync('task-1');
    } catch (error) {
      expect(error).toBeTruthy();
    }
  });
});

describe('태스크 실시간 업데이트', () => {
  it('실시간 구독이 설정된다', () => {
    const mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    };

    mockSupabase.channel.mockReturnValue(mockChannel);
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    });

    renderHook(() => useTasks(), {
      wrapper: createWrapper(),
    });

    expect(mockSupabase.channel).toHaveBeenCalledWith('tasks');
    expect(mockChannel.on).toHaveBeenCalled();
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });
});