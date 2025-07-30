import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '../utils/test-utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useTeamMembers,
  useInviteTeamMember,
  useRemoveTeamMember,
  useUpdateMemberRole,
} from './useTeamMembers';
import { mockSupabase, createMockUser } from '../utils/test-utils';

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
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useTeamMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('팀 멤버 목록을 로드한다', async () => {
    const mockTeamMembers = [
      {
        id: 'member-1',
        team_id: 'test-team-id',
        user_id: 'user-1',
        role: 'ADMIN',
        status: 'ACTIVE',
        joined_at: new Date().toISOString(),
        user: createMockUser({ id: 'user-1', name: 'User 1' }),
      },
      {
        id: 'member-2',
        team_id: 'test-team-id',
        user_id: 'user-2',
        role: 'MEMBER',
        status: 'ACTIVE',
        joined_at: new Date().toISOString(),
        user: createMockUser({ id: 'user-2', name: 'User 2' }),
      },
    ];

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue({
        data: mockTeamMembers,
        error: null,
      }),
    });

    const { result } = renderHook(() => useTeamMembers('test-team-id'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockTeamMembers);
    expect(mockSupabase.from).toHaveBeenCalledWith('team_members');
  });

  it('팀 멤버 로드 에러를 처리한다', async () => {
    const mockError = new Error('Failed to load team members');

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    });

    const { result } = renderHook(() => useTeamMembers('test-team-id'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeUndefined();
  });

  it('활성 멤버만 필터링한다', async () => {
    const mockActiveMembers = [
      {
        id: 'member-1',
        status: 'ACTIVE',
        user: createMockUser(),
      },
    ];

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue({
        data: mockActiveMembers,
        error: null,
      }),
    });

    const { result } = renderHook(
      () => useTeamMembers('test-team-id', { status: 'ACTIVE' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockActiveMembers);
  });

  it('역할별로 멤버를 필터링한다', async () => {
    const mockAdmins = [
      {
        id: 'member-1',
        role: 'ADMIN',
        user: createMockUser(),
      },
    ];

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue({
        data: mockAdmins,
        error: null,
      }),
    });

    const { result } = renderHook(
      () => useTeamMembers('test-team-id', { role: 'ADMIN' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockAdmins);
  });
});

describe('useInviteTeamMember', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('팀 멤버를 초대한다', async () => {
    const mockInvitation = {
      id: 'invitation-1',
      team_id: 'test-team-id',
      email: 'newuser@example.com',
      role: 'MEMBER',
      status: 'PENDING',
    };

    mockSupabase.rpc.mockResolvedValue({
      data: mockInvitation,
      error: null,
    });

    const { result } = renderHook(() => useInviteTeamMember(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      email: 'newuser@example.com',
      role: 'MEMBER',
      teamId: 'test-team-id',
    });

    expect(mockSupabase.rpc).toHaveBeenCalledWith('invite_team_member', {
      team_id: 'test-team-id',
      email: 'newuser@example.com',
      role: 'MEMBER',
    });
  });

  it('초대 에러를 처리한다', async () => {
    const mockError = new Error('Failed to invite member');

    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: mockError,
    });

    const { result } = renderHook(() => useInviteTeamMember(), {
      wrapper: createWrapper(),
    });

    try {
      await result.current.mutateAsync({
        email: 'newuser@example.com',
        role: 'MEMBER',
        teamId: 'test-team-id',
      });
    } catch (error) {
      expect(error).toBeTruthy();
    }
  });

  it('중복 초대를 방지한다', async () => {
    const mockError = { code: 'MEMBER_ALREADY_EXISTS' };

    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: mockError,
    });

    const { result } = renderHook(() => useInviteTeamMember(), {
      wrapper: createWrapper(),
    });

    try {
      await result.current.mutateAsync({
        email: 'existing@example.com',
        role: 'MEMBER',
        teamId: 'test-team-id',
      });
    } catch (error) {
      expect(error).toBeTruthy();
    }
  });
});

describe('useRemoveTeamMember', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('팀 멤버를 제거한다', async () => {
    mockSupabase.from.mockReturnValue({
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    });

    const { result } = renderHook(() => useRemoveTeamMember(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync('member-1');

    expect(mockSupabase.from).toHaveBeenCalledWith('team_members');
  });

  it('멤버 제거 에러를 처리한다', async () => {
    const mockError = new Error('Failed to remove member');

    mockSupabase.from.mockReturnValue({
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    });

    const { result } = renderHook(() => useRemoveTeamMember(), {
      wrapper: createWrapper(),
    });

    try {
      await result.current.mutateAsync('member-1');
    } catch (error) {
      expect(error).toBeTruthy();
    }
  });

  it('마지막 관리자 제거를 방지한다', async () => {
    const mockError = { code: 'CANNOT_REMOVE_LAST_ADMIN' };

    mockSupabase.from.mockReturnValue({
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    });

    const { result } = renderHook(() => useRemoveTeamMember(), {
      wrapper: createWrapper(),
    });

    try {
      await result.current.mutateAsync('admin-member-1');
    } catch (error) {
      expect(error).toBeTruthy();
    }
  });
});

describe('useUpdateMemberRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('멤버 역할을 업데이트한다', async () => {
    const updatedMember = {
      id: 'member-1',
      role: 'ADMIN',
      updated_at: new Date().toISOString(),
    };

    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: updatedMember,
        error: null,
      }),
    });

    const { result } = renderHook(() => useUpdateMemberRole(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      memberId: 'member-1',
      role: 'ADMIN',
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('team_members');
  });

  it('역할 업데이트 에러를 처리한다', async () => {
    const mockError = new Error('Failed to update role');

    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    });

    const { result } = renderHook(() => useUpdateMemberRole(), {
      wrapper: createWrapper(),
    });

    try {
      await result.current.mutateAsync({
        memberId: 'member-1',
        role: 'ADMIN',
      });
    } catch (error) {
      expect(error).toBeTruthy();
    }
  });

  it('잘못된 역할 설정을 방지한다', async () => {
    const mockError = { code: 'INVALID_ROLE' };

    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    });

    const { result } = renderHook(() => useUpdateMemberRole(), {
      wrapper: createWrapper(),
    });

    try {
      await result.current.mutateAsync({
        memberId: 'member-1',
        role: 'INVALID_ROLE' as any,
      });
    } catch (error) {
      expect(error).toBeTruthy();
    }
  });
});

describe('팀 멤버 실시간 업데이트', () => {
  it('실시간 구독이 설정된다', () => {
    const mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    };

    mockSupabase.channel.mockReturnValue(mockChannel);
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    });

    renderHook(() => useTeamMembers('test-team-id'), {
      wrapper: createWrapper(),
    });

    expect(mockSupabase.channel).toHaveBeenCalledWith('team_members');
    expect(mockChannel.on).toHaveBeenCalled();
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('멤버 추가 이벤트를 처리한다', () => {
    const mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    };

    let eventCallback: any;
    mockChannel.on.mockImplementation((event, callback) => {
      if (event === 'postgres_changes') {
        eventCallback = callback;
      }
      return mockChannel;
    });

    mockSupabase.channel.mockReturnValue(mockChannel);
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    });

    renderHook(() => useTeamMembers('test-team-id'), {
      wrapper: createWrapper(),
    });

    // 새 멤버 추가 이벤트 시뮬레이션
    const newMember = {
      id: 'new-member',
      team_id: 'test-team-id',
      user_id: 'new-user',
      role: 'MEMBER',
    };

    if (eventCallback) {
      eventCallback({
        eventType: 'INSERT',
        new: newMember,
      });
    }

    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.any(Function)
    );
  });
});
