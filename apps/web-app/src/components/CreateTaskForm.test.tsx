import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CreateTaskForm from './CreateTaskForm';
import { render, createMockTeam, createMockProject } from '../utils/test-utils';

// Mock translation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock hooks
vi.mock('../hooks/useTasks', () => ({
  useCreateTask: vi.fn(),
}));

vi.mock('../hooks/useTeams', () => ({
  useTeams: vi.fn(),
}));

vi.mock('../hooks/useProjects', () => ({
  useProjects: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../contexts/NotificationContext', () => ({
  useNotification: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

describe('CreateTaskForm', () => {
  const mockUseCreateTask = require('../hooks/useTasks').useCreateTask;
  const mockUseTeams = require('../hooks/useTeams').useTeams;
  const mockUseProjects = require('../hooks/useProjects').useProjects;
  const mockUseAuth = require('../hooks/useAuth').useAuth;

  const mockTeam = createMockTeam();
  const mockProject = createMockProject();
  const mockCreateTask = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: 'test-user-id' },
    });

    mockUseTeams.mockReturnValue({
      currentTeam: mockTeam,
    });

    mockUseProjects.mockReturnValue({
      data: [mockProject],
    });

    mockUseCreateTask.mockReturnValue({
      mutateAsync: mockCreateTask,
      isPending: false,
    });

    mockCreateTask.mockResolvedValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('폼이 올바르게 렌더링된다', () => {
    render(
      <CreateTaskForm
        isOpen={true}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('task.createTask')).toBeInTheDocument();
    expect(screen.getByLabelText('task.title')).toBeInTheDocument();
    expect(screen.getByLabelText('task.description')).toBeInTheDocument();
    expect(screen.getByLabelText('task.priority')).toBeInTheDocument();
    expect(screen.getByLabelText('task.status')).toBeInTheDocument();
  });

  it('필수 필드 검증이 작동한다', async () => {
    render(
      <CreateTaskForm
        isOpen={true}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByText('common.create');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('validation.required')).toBeInTheDocument();
    });

    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  it('유효한 데이터로 태스크를 생성한다', async () => {
    render(
      <CreateTaskForm
        isOpen={true}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    // 폼 필드 입력
    const titleInput = screen.getByLabelText('task.title');
    const descriptionInput = screen.getByLabelText('task.description');
    const prioritySelect = screen.getByLabelText('task.priority');
    const statusSelect = screen.getByLabelText('task.status');

    fireEvent.change(titleInput, { target: { value: 'New Task' } });
    fireEvent.change(descriptionInput, {
      target: { value: 'Task description' },
    });
    fireEvent.change(prioritySelect, { target: { value: 'HIGH' } });
    fireEvent.change(statusSelect, { target: { value: 'TODO' } });

    // 폼 제출
    const submitButton = screen.getByText('common.create');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith({
        title: 'New Task',
        description: 'Task description',
        priority: 'HIGH',
        status: 'TODO',
        team_id: mockTeam.id,
        created_by: 'test-user-id',
        assignee_id: 'test-user-id',
      });
    });

    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('프로젝트 선택이 올바르게 작동한다', async () => {
    render(
      <CreateTaskForm
        isOpen={true}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const projectSelect = screen.getByLabelText('task.project');
    fireEvent.change(projectSelect, { target: { value: mockProject.id } });

    const titleInput = screen.getByLabelText('task.title');
    fireEvent.change(titleInput, { target: { value: 'Project Task' } });

    const submitButton = screen.getByText('common.create');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: mockProject.id,
        })
      );
    });
  });

  it('마감일 설정이 올바르게 작동한다', async () => {
    render(
      <CreateTaskForm
        isOpen={true}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const dueDateInput = screen.getByLabelText('task.dueDate');
    const futureDate = '2024-12-31';
    fireEvent.change(dueDateInput, { target: { value: futureDate } });

    const titleInput = screen.getByLabelText('task.title');
    fireEvent.change(titleInput, { target: { value: 'Task with due date' } });

    const submitButton = screen.getByText('common.create');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          due_date: futureDate,
        })
      );
    });
  });

  it('태그 추가가 올바르게 작동한다', async () => {
    render(
      <CreateTaskForm
        isOpen={true}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const tagInput = screen.getByLabelText('task.tags');
    fireEvent.change(tagInput, { target: { value: 'frontend,urgent' } });

    const titleInput = screen.getByLabelText('task.title');
    fireEvent.change(titleInput, { target: { value: 'Tagged Task' } });

    const submitButton = screen.getByText('common.create');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['frontend', 'urgent'],
        })
      );
    });
  });

  it('로딩 상태가 올바르게 표시된다', () => {
    mockUseCreateTask.mockReturnValue({
      mutateAsync: mockCreateTask,
      isPending: true,
    });

    render(
      <CreateTaskForm
        isOpen={true}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByText('common.creating');
    expect(submitButton).toBeDisabled();
  });

  it('취소 버튼이 올바르게 작동한다', () => {
    render(
      <CreateTaskForm
        isOpen={true}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('common.cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('에러 처리가 올바르게 작동한다', async () => {
    const mockError = new Error('Failed to create task');
    mockCreateTask.mockRejectedValue(mockError);

    render(
      <CreateTaskForm
        isOpen={true}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const titleInput = screen.getByLabelText('task.title');
    fireEvent.change(titleInput, { target: { value: 'Error Task' } });

    const submitButton = screen.getByText('common.create');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalled();
    });

    // 에러 발생 시 onSuccess가 호출되지 않아야 함
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('폼이 닫혀있을 때 렌더링되지 않는다', () => {
    render(
      <CreateTaskForm
        isOpen={false}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.queryByText('task.createTask')).not.toBeInTheDocument();
  });

  it('예상 시간 설정이 올바르게 작동한다', async () => {
    render(
      <CreateTaskForm
        isOpen={true}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const estimatedHoursInput = screen.getByLabelText('task.estimatedHours');
    fireEvent.change(estimatedHoursInput, { target: { value: '8' } });

    const titleInput = screen.getByLabelText('task.title');
    fireEvent.change(titleInput, { target: { value: 'Estimated Task' } });

    const submitButton = screen.getByText('common.create');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          estimated_hours: 8,
        })
      );
    });
  });
});
