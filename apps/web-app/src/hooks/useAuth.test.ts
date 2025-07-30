import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '../utils/test-utils';
import { useAuth } from './useAuth';
import { mockSupabase } from '../utils/test-utils';

// Mock Supabase client
vi.mock('../../../../lib/supabase/client', () => ({
  supabase: mockSupabase,
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('초기 로딩 상태를 반환한다', () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBe(null);
  });

  it('로그인된 사용자 정보를 반환한다', async () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      user_metadata: {
        name: 'Test User',
      },
    };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('인증되지 않은 상태를 처리한다', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('인증 에러를 처리한다', async () => {
    const mockError = new Error('Authentication error');

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: mockError,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('로그인 함수가 올바르게 작동한다', async () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
    };

    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: mockUser, session: {} },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await result.current.signIn('test@example.com', 'password');

    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    });
  });

  it('로그아웃 함수가 올바르게 작동한다', async () => {
    mockSupabase.auth.signOut.mockResolvedValue({
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await result.current.signOut();

    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });

  it('회원가입 함수가 올바르게 작동한다', async () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
    };

    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: mockUser, session: {} },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await result.current.signUp('test@example.com', 'password', {
      name: 'Test User',
    });

    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
      options: {
        data: {
          name: 'Test User',
        },
      },
    });
  });

  it('인증 상태 변경을 감지한다', async () => {
    mockSupabase.auth.onAuthStateChange.mockImplementation(callback => {
      // 인증 상태 변경 시뮬레이션
      setTimeout(() => {
        callback('SIGNED_IN', { user: { id: 'test-user' } });
      }, 100);

      return {
        data: { subscription: { unsubscribe: jest.fn() } },
      };
    });

    renderHook(() => useAuth());

    expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
  });
});
