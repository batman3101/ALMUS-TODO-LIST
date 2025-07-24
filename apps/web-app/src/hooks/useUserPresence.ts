import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { useWebSocket } from '../services/websocket';
import type { UserPresence } from '../services/websocket';
import type { FirestoreUserPresence, PresenceStatus } from '@almus/shared-types';
import { 
  doc, 
  setDoc, 
  getDoc,
  onSnapshot, 
  serverTimestamp,
  Timestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';

interface UseUserPresenceOptions {
  enableAutoUpdate?: boolean;
  updateInterval?: number;
  enableRealtime?: boolean;
}

interface UseUserPresenceReturn {
  currentUserPresence: UserPresence | null;
  onlineUsers: UserPresence[];
  isOnline: boolean;
  updateStatus: (status: PresenceStatus, customStatus?: string) => Promise<void>;
  updateCursor: (position: { line: number; column: number; fieldPath?: string }) => void;
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
  const websocket = useWebSocket();
  
  const [currentUserPresence, setCurrentUserPresence] = useState<UserPresence | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  
  const lastActivityRef = useRef<number>(Date.now());
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const presenceUnsubscribeRef = useRef<(() => void) | null>(null);

  // Firestore 사용자 상태를 UserPresence로 변환
  const transformFirestorePresence = useCallback((data: FirestoreUserPresence): UserPresence => {
    return {
      userId: data.userId,
      status: data.status,
      cursor: data.currentResource ? {
        line: 0,
        column: 0,
        fieldPath: data.currentResource.type,
      } : undefined,
      selection: undefined,
      isTyping: data.isTyping,
      lastActivity: data.lastActivity instanceof Timestamp 
        ? data.lastActivity.toDate().getTime()
        : Date.now(),
    };
  }, []);

  // 현재 사용자 상태 업데이트
  const updateUserPresence = useCallback(async (updates: Partial<FirestoreUserPresence>) => {
    if (!user) return;

    try {
      const presenceRef = doc(db, 'user_presence', user.id);
      const currentTime = serverTimestamp();
      
      const presenceData: Partial<FirestoreUserPresence> = {
        ...updates,
        userId: user.id,
        lastActivity: currentTime,
        updatedAt: currentTime,
      };

      await setDoc(presenceRef, presenceData, { merge: true });
      
      // WebSocket으로도 전송
      if (websocket.isConnected()) {
        websocket.updatePresence(
          updates.status || 'ONLINE',
          updates.customStatus
        );
      }

    } catch (error) {
      console.error('Error updating user presence:', error);
    }
  }, [user, websocket]);

  // 상태 업데이트
  const updateStatus = useCallback(async (status: PresenceStatus, customStatus?: string) => {
    await updateUserPresence({
      status,
      customStatus,
    });
    
    setIsOnline(status === 'ONLINE');
  }, [updateUserPresence]);

  // 커서 위치 업데이트
  const updateCursor = useCallback((position: { line: number; column: number; fieldPath?: string }) => {
    if (!websocket.isConnected()) return;
    
    websocket.updateCursor(position);
    lastActivityRef.current = Date.now();
    
    // 로컬 상태 업데이트
    setCurrentUserPresence(prev => prev ? {
      ...prev,
      cursor: position,
      lastActivity: Date.now(),
    } : null);
  }, [websocket]);

  // 선택 영역 업데이트
  const updateSelection = useCallback((selection: { 
    start: { line: number; column: number; fieldPath?: string };
    end: { line: number; column: number; fieldPath?: string };
  }) => {
    if (!websocket.isConnected()) return;
    
    websocket.updateSelection(selection);
    lastActivityRef.current = Date.now();
    
    // 로컬 상태 업데이트
    setCurrentUserPresence(prev => prev ? {
      ...prev,
      selection,
      lastActivity: Date.now(),
    } : null);
  }, [websocket]);

  // 타이핑 상태 설정
  const setTyping = useCallback((isTyping: boolean, resourceId?: string) => {
    if (!websocket.isConnected()) return;
    
    websocket.setTyping(isTyping, resourceId);
    
    // Firestore에도 업데이트
    updateUserPresence({
      isTyping,
      typingInResource: isTyping ? resourceId : undefined,
    });
    
    // 로컬 상태 업데이트
    setCurrentUserPresence(prev => prev ? {
      ...prev,
      isTyping,
      lastActivity: Date.now(),
    } : null);
  }, [websocket, updateUserPresence]);

  // 특정 사용자의 상태 조회
  const getPresenceByUserId = useCallback((userId: string): UserPresence | null => {
    return onlineUsers.find(user => user.userId === userId) || null;
  }, [onlineUsers]);

  // 온라인 사용자 목록 로드
  const loadOnlineUsers = useCallback(async () => {
    try {
      if (enableRealtime) {
        // 실시간 리스너 설정
        const presenceQuery = query(
          collection(db, 'user_presence'),
          where('status', 'in', ['ONLINE', 'AWAY', 'BUSY'])
        );

        const unsubscribe = onSnapshot(
          presenceQuery,
          (snapshot) => {
            const users: UserPresence[] = [];
            
            snapshot.docs.forEach(doc => {
              const data = doc.data() as FirestoreUserPresence;
              // 5분 이내에 활동한 사용자만 온라인으로 간주
              const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
              const lastActivity = data.lastActivity instanceof Timestamp 
                ? data.lastActivity.toDate() 
                : new Date(data.lastActivity as any);
              
              if (lastActivity > fiveMinutesAgo) {
                users.push(transformFirestorePresence(data));
              }
            });
            
            setOnlineUsers(users);
            
            // 현재 사용자 상태 업데이트
            if (user) {
              const currentUser = users.find(u => u.userId === user.id);
              setCurrentUserPresence(currentUser || null);
              setIsOnline(currentUser?.status === 'ONLINE' || false);
            }
          },
          (error) => {
            console.error('Error loading online users:', error);
          }
        );

        presenceUnsubscribeRef.current = unsubscribe;
        return unsubscribe;
      } else {
        // 일회성 로드
        const presenceQuery = query(
          collection(db, 'user_presence'),
          where('status', 'in', ['ONLINE', 'AWAY', 'BUSY'])
        );

        const snapshot = await getDocs(presenceQuery);
        const users: UserPresence[] = [];
        
        snapshot.docs.forEach(doc => {
          const data = doc.data() as FirestoreUserPresence;
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          const lastActivity = data.lastActivity instanceof Timestamp 
            ? data.lastActivity.toDate() 
            : new Date(data.lastActivity as any);
          
          if (lastActivity > fiveMinutesAgo) {
            users.push(transformFirestorePresence(data));
          }
        });
        
        setOnlineUsers(users);
      }
    } catch (error) {
      console.error('Error loading online users:', error);
    }
  }, [user, enableRealtime, transformFirestorePresence]);

  // 사용자 상태 초기화
  const initializeUserPresence = useCallback(async () => {
    if (!user) return;

    try {
      // 현재 상태 확인
      const presenceRef = doc(db, 'user_presence', user.id);
      const presenceDoc = await getDoc(presenceRef);
      
      let currentStatus: PresenceStatus = 'ONLINE';
      let customStatus: string | undefined;
      
      if (presenceDoc.exists()) {
        const data = presenceDoc.data() as FirestoreUserPresence;
        currentStatus = data.status;
        customStatus = data.customStatus;
      }

      // 온라인 상태로 업데이트
      await updateUserPresence({
        status: currentStatus,
        customStatus,
        isTyping: false,
        typingInResource: undefined,
      });

      setIsOnline(currentStatus === 'ONLINE');

    } catch (error) {
      console.error('Error initializing user presence:', error);
    }
  }, [user, updateUserPresence]);

  // 활동 감지 및 하트비트
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(async () => {
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

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, []);

  // 페이지 가시성 변경 감지
  const setupVisibilityListener = useCallback(() => {
    const handleVisibilityChange = async () => {
      if (!user) return;

      if (document.hidden) {
        // 페이지가 숨겨짐 - AWAY 상태로 변경
        await updateUserPresence({
          status: 'AWAY',
        });
        setIsOnline(false);
      } else {
        // 페이지가 다시 보임 - ONLINE 상태로 변경
        await updateUserPresence({
          status: 'ONLINE',
        });
        setIsOnline(true);
        lastActivityRef.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, updateUserPresence]);

  // 종료 시 OFFLINE 상태로 변경
  const setupBeforeUnloadListener = useCallback(() => {
    const handleBeforeUnload = async () => {
      if (!user) return;

      // 브라우저 종료 시 OFFLINE 상태로 변경
      await updateUserPresence({
        status: 'OFFLINE',
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user, updateUserPresence]);

  // 상태 새로고침
  const refreshPresence = useCallback(async () => {
    await loadOnlineUsers();
  }, [loadOnlineUsers]);

  // WebSocket 이벤트 리스너
  useEffect(() => {
    const handlePresenceUpdated = (data: any) => {
      const updatedPresence = transformFirestorePresence(data);
      
      setOnlineUsers(prev => {
        const index = prev.findIndex(u => u.userId === updatedPresence.userId);
        if (index >= 0) {
          const newUsers = [...prev];
          newUsers[index] = updatedPresence;
          return newUsers;
        } else {
          return [...prev, updatedPresence];
        }
      });

      // 현재 사용자인 경우
      if (user && updatedPresence.userId === user.id) {
        setCurrentUserPresence(updatedPresence);
        setIsOnline(updatedPresence.status === 'ONLINE');
      }
    };

    const handleUserLeft = (data: any) => {
      setOnlineUsers(prev => prev.filter(u => u.userId !== data.userId));
      
      if (user && data.userId === user.id) {
        setCurrentUserPresence(null);
        setIsOnline(false);
      }
    };

    websocket.on('presence-updated', handlePresenceUpdated);
    websocket.on('user-left', handleUserLeft);

    return () => {
      websocket.off('presence-updated', handlePresenceUpdated);
      websocket.off('user-left', handleUserLeft);
    };
  }, [websocket, user, transformFirestorePresence]);

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
        cleanupFunctions.push(setupVisibilityListener());
        cleanupFunctions.push(setupBeforeUnloadListener());
      }
    };

    initialize();

    return () => {
      // 정리
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      
      if (presenceUnsubscribeRef.current) {
        presenceUnsubscribeRef.current();
      }
      
      cleanupFunctions.forEach(cleanup => cleanup());

      // 오프라인 상태로 변경
      if (user) {
        updateUserPresence({
          status: 'OFFLINE',
        }).catch(console.error);
      }
    };
  }, [
    user,
    enableAutoUpdate,
    initializeUserPresence,
    loadOnlineUsers,
    startHeartbeat,
    setupActivityListeners,
    setupVisibilityListener,
    setupBeforeUnloadListener,
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