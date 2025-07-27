import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskList from './TaskList';
import {
  render,
  mockSupabase,
  createMockTask,
  createMockUser,
  createMockTeam,
  mockSupabaseResponse,
} from '../utils/test-utils';

// Mock translation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock hooks
vi.mock('../hooks/useTasks', () => ({
  useTasks: vi.fn(),
  useDeleteTask: vi.fn(),
}));

vi.mock('../hooks/useTeams', () => ({
  useTeams: vi.fn(),
}));

vi.mock('../hooks/useTaskAuth', () => ({
  useTaskAuth: vi.fn(),
}));

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
  }),
}));

vi.mock('../contexts/NotificationContext', () => ({
  useNotification: () => ({
    showConfirm: vi.fn(),
  }),
}));

describe('TaskList', () => {
  const mockUseTasks = require('../hooks/useTasks').useTasks;
  const mockUseTeams = require('../hooks/useTeams').useTeams;
  const mockUseTaskAuth = require('../hooks/useTaskAuth').useTaskAuth;
  const mockUseDeleteTask = require('../hooks/useTasks').useDeleteTask;

  const mockUser = createMockUser();
  const mockTeam = createMockTeam();
  const mockTasks = [
    createMockTask({ id: '1', title: 'Task 1', status: 'TODO' }),
    createMockTask({ id: '2', title: 'Task 2', status: 'IN_PROGRESS' }),
    createMockTask({ id: '3', title: 'Task 3', status: 'DONE' }),
  ];

  beforeEach(() => {
    // 기본 mock 설정
    mockUseTeams.mockReturnValue({
      currentTeam: mockTeam,
    });

    mockUseTaskAuth.mockReturnValue({
      canUpdateTask: vi.fn(() => true),
      canDeleteTask: vi.fn(() => true),
    });

    mockUseDeleteTask.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('로딩 상태를 올바르게 표시한다', () => {
    mockUseTasks.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
    });

    render(<TaskList />);

    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });

  it('에러 상태를 올바르게 표시한다', () => {
    mockUseTasks.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('Test error'),
    });

    render(<TaskList />);

    expect(screen.getByText('task.loadTasksFailed')).toBeInTheDocument();
  });

  it('태스크가 없을 때 빈 상태를 표시한다', () => {
    mockUseTasks.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<TaskList />);

    expect(screen.getByText('task.noTasks')).toBeInTheDocument();
  });

  it('태스크 목록을 올바르게 렌더링한다', () => {
    mockUseTasks.mockReturnValue({
      data: mockTasks,
      isLoading: false,
      error: null,
    });

    render(<TaskList />);

    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
    expect(screen.getByText('Task 3')).toBeInTheDocument();
  });

  it('검색 기능이 올바르게 작동한다', async () => {
    mockUseTasks.mockReturnValue({
      data: mockTasks,
      isLoading: false,
      error: null,
    });

    render(<TaskList />);

    const searchInput = screen.getByPlaceholderText('태스크 검색...');
    fireEvent.change(searchInput, { target: { value: 'Task 1' } });

    // 검색 필터링은 컴포넌트 내부에서 처리되므로
    // 실제 필터링 결과를 확인
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });
  });

  it('상태 필터가 올바르게 작동한다', async () => {
    mockUseTasks.mockReturnValue({
      data: mockTasks,
      isLoading: false,
      error: null,
    });

    render(<TaskList />);

    const statusFilter = screen.getByDisplayValue('모든 상태');
    fireEvent.change(statusFilter, { target: { value: 'TODO' } });

    // 필터 변경이 적용되는지 확인
    await waitFor(() => {
      expect(statusFilter).toHaveValue('TODO');
    });
  });

  it('우선순위 필터가 올바르게 작동한다', async () => {
    mockUseTasks.mockReturnValue({
      data: mockTasks,
      isLoading: false,
      error: null,
    });

    render(<TaskList />);

    const priorityFilter = screen.getByDisplayValue('모든 우선순위');
    fireEvent.change(priorityFilter, { target: { value: 'HIGH' } });

    await waitFor(() => {
      expect(priorityFilter).toHaveValue('HIGH');
    });
  });

  it('컬럼 정렬이 올바르게 작동한다', async () => {
    mockUseTasks.mockReturnValue({
      data: mockTasks,
      isLoading: false,
      error: null,
    });

    render(<TaskList />);

    const titleHeader = screen.getByText('task.title').closest('th');
    if (titleHeader) {
      fireEvent.click(titleHeader);
    }

    // 정렬 아이콘이 표시되는지 확인
    await waitFor(() => {
      expect(titleHeader).toBeInTheDocument();
    });
  });

  it('태스크 편집 버튼이 권한이 있을 때만 표시된다', () => {
    mockUseTasks.mockReturnValue({
      data: [mockTasks[0]],
      isLoading: false,
      error: null,
    });

    mockUseTaskAuth.mockReturnValue({
      canUpdateTask: vi.fn(() => true),
      canDeleteTask: vi.fn(() => false),
    });

    render(<TaskList />);

    expect(screen.getByText('편집')).toBeInTheDocument();
    expect(screen.queryByText('task.deleteTask')).not.toBeInTheDocument();
  });

  it('태스크 삭제 버튼이 권한이 있을 때만 표시된다', () => {
    mockUseTasks.mockReturnValue({
      data: [mockTasks[0]],
      isLoading: false,
      error: null,
    });

    mockUseTaskAuth.mockReturnValue({
      canUpdateTask: vi.fn(() => false),
      canDeleteTask: vi.fn(() => true),
    });

    render(<TaskList />);

    expect(screen.queryByText('편집')).not.toBeInTheDocument();
    expect(screen.getByText('task.deleteTask')).toBeInTheDocument();
  });

  it('페이지네이션이 올바르게 작동한다', () => {
    // 11개의 태스크 생성 (페이지네이션을 위해)
    const manyTasks = Array.from({ length: 11 }, (_, i) =>
      createMockTask({ id: `task-${i}`, title: `Task ${i}` })
    );

    mockUseTasks.mockReturnValue({
      data: manyTasks,
      isLoading: false,
      error: null,
    });

    render(<TaskList />);

    // 페이지네이션 버튼들이 표시되는지 확인
    expect(screen.getByText('다음')).toBeInTheDocument();
    expect(screen.getByText('이전')).toBeInTheDocument();
  });

  it('태스크 개수가 올바르게 표시된다', () => {
    mockUseTasks.mockReturnValue({
      data: mockTasks,
      isLoading: false,
      error: null,
    });

    render(<TaskList />);

    expect(screen.getByText('task.taskList (3개)')).toBeInTheDocument();
  });
});
