import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../utils/logger';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from './useAuth';
import type { PresenceStatus } from '@almus/shared-types';

interface UserPresence {
  userId: string;
  status: PresenceStatus;
  customStatus?: string;
  isTyping?: boolean;
  lastActivity: number;
  cursor?: {
    line: number;
    column: number;
    fieldPath?: string;
  };
  selection?: {
    start: { line: number; column: number; fieldPath?: string };
    end: { line: number; column: number; fieldPath?: string };
  };
}

interface UseUserPresenceOptions {
  enableAutoUpdate?: boolean;
  updateInterval?: number;
  enableRealtime?: boolean;
}

interface UseUserPresenceReturn {
  currentUserPresence: UserPresence | null;
  onlineUsers: UserPresence[];
  isOnline: boolean;
  updateStatus: (
    status: PresenceStatus,
    customStatus?: string
  ) => Promise<void>;
  updateCursor: (position: {
    line: number;
    column: number;
    fieldPath?: string;
  }) => void;
  updateSelection: (selection: {
    start: { line: number; column: number; fieldPath?: string };
    end: { line: number; column: number; fieldPath?: string };
  }) => void;
  setTyping: (isTyping: boolean, resourceId?: string) => void;
  getPresenceByUserId: (userId: string) => UserPresence | null;
  refreshPresence: () => Promise<void>;
}

export const useUserPresence = ({
  enableAutoUpdate = true,
  updateInterval = 30000, // 30초
  enableRealtime = true,
}: UseUserPresenceOptions = {}): UseUserPresenceReturn => {
  const { user } = useAuth();

  const [currentUserPresence, setCurrentUserPresence] =
    useState<UserPresence | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [isOnline, setIsOnline] = useState(false);

  const lastActivityRef = useRef<number>(Date.now());
  const heartbeatIntervalRef = useRef<number | null>(null);
  const channelRef = useRef<any>(null);

  // 현재 사용자 상태 업데이트
  const updateUserPresence = useCallback(
    async (updates: Partial<UserPresence>) => {
      if (!user) return;

      try {
        const presenceData = {
          user_id: user.uid,
          status: updates.status || 'ONLINE',
          custom_status: updates.customStatus,
          is_typing: updates.isTyping || false,
          last_activity: new Date().toISOString(),
          cursor_position: updates.cursor
            ? JSON.stringify(updates.cursor)
            : null,
          selection_range: updates.selection
            ? JSON.stringify(updates.selection)
            : null,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('user_presence')
          .upsert(presenceData, {
            onConflict: 'user_id',
          });

        if (error) throw error;
      } catch (error) {
        logger.error('Error updating user presence:', error);
      }
    },
    [user]
  );

  // 상태 업데이트
  const updateStatus = useCallback(
    async (status: PresenceStatus, customStatus?: string) => {
      await updateUserPresence({
        status,
        customStatus,
      });

      setIsOnline(status === 'ONLINE');
    },
    [updateUserPresence]
  );

  // 커서 위치 업데이트
  const updateCursor = useCallback(
    (position: { line: number; column: number; fieldPath?: string }) => {
      lastActivityRef.current = Date.now();

      // 로컬 상태 업데이트
      setCurrentUserPresence(prev =>
        prev
          ? {
              ...prev,
              cursor: position,
              lastActivity: Date.now(),
            }
          : null
      );

      // Supabase 업데이트는 debounce하여 성능 최적화
      updateUserPresence({ cursor: position });
    },
    [updateUserPresence]
  );

  // 선택 영역 업데이트
  const updateSelection = useCallback(
    (selection: {
      start: { line: number; column: number; fieldPath?: string };
      end: { line: number; column: number; fieldPath?: string };
    }) => {
      lastActivityRef.current = Date.now();

      // 로컬 상태 업데이트
      setCurrentUserPresence(prev =>
        prev
          ? {
              ...prev,
              selection,
              lastActivity: Date.now(),
            }
          : null
      );

      updateUserPresence({ selection });
    },
    [updateUserPresence]
  );

  // 타이핑 상태 설정
  const setTyping = useCallback(
    (isTyping: boolean) => {
      // Firestore에도 업데이트
      updateUserPresence({
        isTyping,
      });

      // 로컬 상태 업데이트
      setCurrentUserPresence(prev =>
        prev
          ? {
              ...prev,
              isTyping,
              lastActivity: Date.now(),
            }
          : null
      );
    },
    [updateUserPresence]
  );

  // 특정 사용자의 상태 조회
  const getPresenceByUserId = useCallback(
    (userId: string): UserPresence | null => {
      return onlineUsers.find(user => user.userId === userId) || null;
    },
    [onlineUsers]
  );

  // 온라인 사용자 목록 로드
  const loadOnlineUsers = useCallback(async () => {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const { data, error } = await supabase
        .from('user_presence')
        .select('*')
        .in('status', ['ONLINE', 'AWAY', 'BUSY'])
        .gte('last_activity', fiveMinutesAgo.toISOString());

      if (error) throw error;

      const users: UserPresence[] =
        data?.map(record => ({
          userId: record.user_id,
          status: record.status as PresenceStatus,
          customStatus: record.custom_status,
          isTyping: record.is_typing,
          lastActivity: new Date(record.last_activity).getTime(),
          cursor: record.cursor_position
            ? JSON.parse(record.cursor_position)
            : undefined,
          selection: record.selection_range
            ? JSON.parse(record.selection_range)
            : undefined,
        })) || [];

      setOnlineUsers(users);

      // 현재 사용자 상태 업데이트
      if (user) {
        const currentUser = users.find(u => u.userId === user.uid);
        setCurrentUserPresence(currentUser || null);
        setIsOnline(currentUser?.status === 'ONLINE' || false);
      }
    } catch (error) {
      logger.error('Error loading online users:', error);
    }
  }, [user]);

  // 사용자 상태 초기화
  const initializeUserPresence = useCallback(async () => {
    if (!user) return;

    try {
      // 온라인 상태로 업데이트
      await updateUserPresence({
        status: 'ONLINE',
        isTyping: false,
      });

      setIsOnline(true);
    } catch (error) {
      logger.error('Error initializing user presence:', error);
    }
  }, [user, updateUserPresence]);

  // 활동 감지 및 하트비트
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = window.setInterval(async () => {
      if (!user) return;

      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;

      // 5분 이상 비활성 상태면 AWAY로 변경
      let newStatus: PresenceStatus = 'ONLINE';
      if (timeSinceLastActivity > 5 * 60 * 1000) {
        newStatus = 'AWAY';
      }

      await updateUserPresence({
        status: newStatus,
      });

      setIsOnline(newStatus === 'ONLINE');
    }, updateInterval);
  }, [user, updateInterval, updateUserPresence]);

  // 활동 감지 이벤트 리스너
  const setupActivityListeners = useCallback(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, []);

  // 상태 새로고침
  const refreshPresence = useCallback(async () => {
    await loadOnlineUsers();
  }, [loadOnlineUsers]);

  // 실시간 구독 설정
  useEffect(() => {
    if (!user || !enableRealtime) return;

    const channel = supabase
      .channel('user-presence')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
        },
        () => {
          // 사용자 상태가 변경되면 목록 새로고침
          loadOnlineUsers();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [user, enableRealtime, loadOnlineUsers]);

  // 초기화
  useEffect(() => {
    let cleanupFunctions: (() => void)[] = [];

    const initialize = async () => {
      if (!user) return;

      // 사용자 상태 초기화
      await initializeUserPresence();

      // 온라인 사용자 목록 로드
      await loadOnlineUsers();

      if (enableAutoUpdate) {
        // 하트비트 시작
        startHeartbeat();

        // 활동 감지 설정
        cleanupFunctions.push(setupActivityListeners());
      }
    };

    initialize();

    return () => {
      // 정리
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      cleanupFunctions.forEach(cleanup => cleanup());

      // 오프라인 상태로 변경
      if (user) {
        updateUserPresence({
          status: 'OFFLINE',
        }).catch(logger.error);
      }
    };
  }, [
    user,
    enableAutoUpdate,
    initializeUserPresence,
    loadOnlineUsers,
    startHeartbeat,
    setupActivityListeners,
    updateUserPresence,
  ]);

  return {
    currentUserPresence,
    onlineUsers,
    isOnline,
    updateStatus,
    updateCursor,
    updateSelection,
    setTyping,
    getPresenceByUserId,
    refreshPresence,
  };
};
