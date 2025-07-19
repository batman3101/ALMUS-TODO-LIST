import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Task, CreateTaskInput, UpdateTaskInput, TaskFilterInput } from '@almus/shared-types';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3002/api';

// API 함수들
const fetchTasks = async (filter?: TaskFilterInput): Promise<Task[]> => {
  const params = new URLSearchParams();
  if (filter) {
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });
  }

  const response = await fetch(`${API_BASE_URL}/tasks?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch tasks');
  }
  return response.json();
};

const createTask = async (taskData: CreateTaskInput): Promise<Task> => {
  const response = await fetch(`${API_BASE_URL}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    },
    body: JSON.stringify(taskData),
  });
  if (!response.ok) {
    throw new Error('Failed to create task');
  }
  return response.json();
};

const updateTask = async ({ id, ...taskData }: UpdateTaskInput): Promise<Task> => {
  const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    },
    body: JSON.stringify(taskData),
  });
  if (!response.ok) {
    throw new Error('Failed to update task');
  }
  return response.json();
};

const deleteTask = async (id: string): Promise<boolean> => {
  const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to delete task');
  }
  return response.json();
};

// React Query 훅들
export const useTasks = (filter?: TaskFilterInput) => {
  return useQuery({
    queryKey: ['tasks', filter],
    queryFn: () => fetchTasks(filter),
    staleTime: 5 * 60 * 1000, // 5분
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateTask,
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.setQueryData(['task', updatedTask.id], updatedTask);
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteTask,
    onSuccess: (_, deletedTaskId) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.removeQueries({ queryKey: ['task', deletedTaskId] });
    },
  });
}; 