import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskList from './TaskList';

// Mock the hooks
jest.mock('../hooks/useTasks', () => ({
  useTasks: () => ({
    tasks: [],
    loading: false,
    error: null,
    createTask: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
    refetch: jest.fn(),
  }),
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user',
      email: 'test@example.com',
      name: 'Test User',
    },
    loading: false,
  }),
}));

describe('TaskList', () => {
  it('renders without crashing', () => {
    render(<TaskList />);
  });

  it('shows empty state when no tasks', () => {
    render(<TaskList />);
    // Add specific assertions based on your TaskList component implementation
    expect(screen.getByTestId('task-list')).toBeInTheDocument();
  });

  // Add more tests based on your component's functionality
});
