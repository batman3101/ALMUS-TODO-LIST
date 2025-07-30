import { vi } from 'vitest';
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../contexts/ThemeContext';
import { NotificationProvider } from '../contexts/NotificationContext';

// 테스트용 Supabase 클라이언트 모킹
export const mockSupabase = {
  auth: {
    getUser: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
    then: vi.fn(),
  })),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  })),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      download: vi.fn(),
      remove: vi.fn(),
      getPublicUrl: vi.fn(),
    })),
  },
  rpc: vi.fn(),
};

// Supabase 클라이언트 모킹
vi.mock('../../../../lib/supabase/client', () => ({
  supabase: mockSupabase,
}));

// 테스트용 QueryClient 생성
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

// 테스트용 Provider 래퍼
interface AllTheProvidersProps {
  children: React.ReactNode;
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({ children }) => {
  const queryClient = createTestQueryClient();

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <NotificationProvider>{children}</NotificationProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

// 커스텀 render 함수
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// 테스트 데이터 생성 헬퍼
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  avatar_url: 'https://example.com/avatar.jpg',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createMockTeam = (overrides = {}) => ({
  id: 'test-team-id',
  name: 'Test Team',
  description: 'Test team description',
  owner_id: 'test-user-id',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_active: true,
  settings: {},
  ...overrides,
});

export const createMockTask = (overrides = {}) => ({
  id: 'test-task-id',
  title: 'Test Task',
  description: 'Test task description',
  status: 'TODO',
  priority: 'MEDIUM',
  team_id: 'test-team-id',
  project_id: null,
  assignee_id: 'test-user-id',
  created_by: 'test-user-id',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  due_date: null,
  start_date: null,
  completed_at: null,
  estimated_hours: null,
  actual_hours: null,
  tags: [],
  metadata: {},
  ...overrides,
});

export const createMockProject = (overrides = {}) => ({
  id: 'test-project-id',
  name: 'Test Project',
  description: 'Test project description',
  team_id: 'test-team-id',
  owner_id: 'test-user-id',
  status: 'ACTIVE',
  start_date: null,
  end_date: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  settings: {},
  ...overrides,
});

export const createMockComment = (overrides = {}) => ({
  id: 'test-comment-id',
  content: 'Test comment content',
  resource_type: 'task',
  resource_id: 'test-task-id',
  author_id: 'test-user-id',
  parent_comment_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_edited: false,
  metadata: {},
  ...overrides,
});

// 비동기 작업 대기 헬퍼
export const waitForAsync = () =>
  new Promise<void>(resolve => setTimeout(resolve, 0));

// Supabase 응답 모킹 헬퍼
export const mockSupabaseResponse = (data: any, error?: any) => ({
  data,
  error,
  status: error ? 400 : 200,
  statusText: error ? 'Bad Request' : 'OK',
});

// 쿼리 캐시 초기화 헬퍼
export const clearQueryCache = (queryClient: QueryClient) => {
  queryClient.clear();
};

// 재내보내기
export * from '@testing-library/react';
export { customRender as render };
