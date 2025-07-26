import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '../services/websocket';
import { useAuth } from './useAuth';
import type {
  WebSocketMessage,
  UserPresence,
  EditOperation,
} from '../services/websocket';

interface CollaborativeSessionState {
  sessionId: string | null;
  participants: UserPresence[];
  isActive: boolean;
  lastActivity: Date | null;
}

interface UseCollaborativeSessionOptions {
  resourceType: 'TASK' | 'PROJECT' | 'DOCUMENT';
  resourceId: string;
  autoJoin?: boolean;
  onParticipantJoined?: (participant: UserPresence) => void;
  onParticipantLeft?: (userId: string) => void;
  onEditOperation?: (operation: EditOperation) => void;
  onConflictDetected?: (operations: EditOperation[]) => void;
}

export const useCollaborativeSession = ({
  resourceType,
  resourceId,
  autoJoin = true,
  onParticipantJoined,
  onParticipantLeft,
  onEditOperation,
  onConflictDetected,
}: UseCollaborativeSessionOptions) => {
  const { user } = useAuth();
  const websocket = useWebSocket();

  const [sessionState, setSessionState] = useState<CollaborativeSessionState>({
    sessionId: null,
    participants: [],
    isActive: false,
    lastActivity: null,
  });

  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 편집 작업 큐 (충돌 해결을 위해)
  const pendingOperations = useRef<EditOperation[]>([]);
  const appliedOperations = useRef<Set<string>>(new Set());

  // WebSocket 이벤트 핸들러들
  const handleUserJoined = useCallback(
    (message: WebSocketMessage) => {
      if (message.resourceId !== resourceId) return;

      const participant = message.data as UserPresence;

      setSessionState(prev => ({
        ...prev,
        participants: prev.participants.some(
          p => p.userId === participant.userId
        )
          ? prev.participants.map(p =>
              p.userId === participant.userId ? participant : p
            )
          : [...prev.participants, participant],
        lastActivity: new Date(),
      }));

      onParticipantJoined?.(participant);
    },
    [resourceId, onParticipantJoined]
  );

  const handleUserLeft = useCallback(
    (message: WebSocketMessage) => {
      if (message.resourceId !== resourceId) return;

      const userId = message.data.userId as string;

      setSessionState(prev => ({
        ...prev,
        participants: prev.participants.filter(p => p.userId !== userId),
        lastActivity: new Date(),
      }));

      onParticipantLeft?.(userId);
    },
    [resourceId, onParticipantLeft]
  );

  const handleEditOperation = useCallback(
    (message: WebSocketMessage) => {
      if (message.resourceId !== resourceId) return;

      const operation = message.data.operation as EditOperation;

      // 중복 적용 방지
      if (appliedOperations.current.has(operation.id)) {
        return;
      }

      // 자신의 작업인 경우 스킵 (이미 로컬에 적용됨)
      if (operation.userId === user?.id) {
        appliedOperations.current.add(operation.id);
        return;
      }

      // 충돌 감지
      const conflicts = detectConflicts(operation, pendingOperations.current);
      if (conflicts.length > 0) {
        onConflictDetected?.([operation, ...conflicts]);
        return;
      }

      // 작업 적용
      pendingOperations.current.push(operation);
      appliedOperations.current.add(operation.id);
      onEditOperation?.(operation);

      setSessionState(prev => ({
        ...prev,
        lastActivity: new Date(),
      }));
    },
    [resourceId, user?.id, onEditOperation, onConflictDetected]
  );

  const handlePresenceUpdated = useCallback(
    (message: WebSocketMessage) => {
      if (message.resourceId !== resourceId) return;

      const { userId, ...presenceData } = message.data;

      setSessionState(prev => ({
        ...prev,
        participants: prev.participants.map(p =>
          p.userId === userId
            ? { ...p, ...presenceData, lastActivity: Date.now() }
            : p
        ),
        lastActivity: new Date(),
      }));
    },
    [resourceId]
  );

  const handleUserTyping = useCallback(
    (message: WebSocketMessage) => {
      if (message.resourceId !== resourceId) return;

      const { userId, fieldPath } = message.data;

      setSessionState(prev => ({
        ...prev,
        participants: prev.participants.map(p =>
          p.userId === userId
            ? { ...p, isTyping: true, lastActivity: Date.now() }
            : p
        ),
      }));

      // 3초 후 타이핑 상태 해제
      setTimeout(() => {
        setSessionState(prev => ({
          ...prev,
          participants: prev.participants.map(p =>
            p.userId === userId ? { ...p, isTyping: false } : p
          ),
        }));
      }, 3000);
    },
    [resourceId]
  );

  const handleUserStoppedTyping = useCallback(
    (message: WebSocketMessage) => {
      if (message.resourceId !== resourceId) return;

      const { userId } = message.data;

      setSessionState(prev => ({
        ...prev,
        participants: prev.participants.map(p =>
          p.userId === userId ? { ...p, isTyping: false } : p
        ),
      }));
    },
    [resourceId]
  );

  // 충돌 감지 로직
  const detectConflicts = (
    newOperation: EditOperation,
    existingOperations: EditOperation[]
  ): EditOperation[] => {
    const conflicts: EditOperation[] = [];

    for (const existing of existingOperations) {
      // 같은 위치에서 작업하는 경우
      if (
        existing.position.line === newOperation.position.line &&
        existing.position.column === newOperation.position.column &&
        existing.position.fieldPath === newOperation.position.fieldPath
      ) {
        // 시간 차이가 1초 이내인 경우 충돌로 간주
        if (Math.abs(existing.timestamp - newOperation.timestamp) < 1000) {
          conflicts.push(existing);
        }
      }

      // 겹치는 영역에서 작업하는 경우 (DELETE와 INSERT 등)
      if (existing.position.fieldPath === newOperation.position.fieldPath) {
        const existingEnd = existing.position.column + (existing.length || 0);
        const newEnd =
          newOperation.position.column + (newOperation.length || 0);

        if (
          (existing.position.column <= newOperation.position.column &&
            existingEnd > newOperation.position.column) ||
          (newOperation.position.column <= existing.position.column &&
            newEnd > existing.position.column)
        ) {
          conflicts.push(existing);
        }
      }
    }

    return conflicts;
  };

  // 세션 참여
  const joinSession = useCallback(async () => {
    if (!websocket.isConnected() || sessionState.isActive) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const sessionId = await websocket.joinSession(resourceType, resourceId);

      setSessionState(prev => ({
        ...prev,
        sessionId,
        isActive: true,
        lastActivity: new Date(),
      }));

      console.log(`Joined collaborative session: ${sessionId}`);
    } catch (err) {
      console.error('Failed to join collaborative session:', err);
      setError(err instanceof Error ? err.message : 'Failed to join session');
    } finally {
      setIsConnecting(false);
    }
  }, [websocket, resourceType, resourceId, sessionState.isActive]);

  // 세션 나가기
  const leaveSession = useCallback(async () => {
    if (!sessionState.isActive) {
      return;
    }

    try {
      await websocket.leaveSession();

      setSessionState({
        sessionId: null,
        participants: [],
        isActive: false,
        lastActivity: null,
      });

      // 대기 중인 작업들 초기화
      pendingOperations.current = [];
      appliedOperations.current.clear();

      console.log('Left collaborative session');
    } catch (err) {
      console.error('Failed to leave collaborative session:', err);
      setError(err instanceof Error ? err.message : 'Failed to leave session');
    }
  }, [websocket, sessionState.isActive]);

  // 편집 작업 전송
  const sendEditOperation = useCallback(
    (operation: Omit<EditOperation, 'id' | 'userId' | 'timestamp'>) => {
      if (!sessionState.isActive || !user) {
        return;
      }

      const fullOperation: EditOperation = {
        ...operation,
        id: `${user.id}_${Date.now()}_${Math.random()}`,
        userId: user.id,
        timestamp: Date.now(),
      };

      // 로컬에 즉시 적용 (낙관적 업데이트)
      appliedOperations.current.add(fullOperation.id);
      onEditOperation?.(fullOperation);

      // 서버로 전송
      websocket.sendEditOperation(fullOperation);
    },
    [sessionState.isActive, user, websocket, onEditOperation]
  );

  // 커서 위치 업데이트
  const updateCursor = useCallback(
    (position: { line: number; column: number; fieldPath?: string }) => {
      if (!sessionState.isActive) return;
      websocket.updateCursor(position);
    },
    [sessionState.isActive, websocket]
  );

  // 선택 영역 업데이트
  const updateSelection = useCallback(
    (selection: {
      start: { line: number; column: number; fieldPath?: string };
      end: { line: number; column: number; fieldPath?: string };
    }) => {
      if (!sessionState.isActive) return;
      websocket.updateSelection(selection);
    },
    [sessionState.isActive, websocket]
  );

  // 타이핑 상태 설정
  const setTyping = useCallback(
    (isTyping: boolean, fieldPath?: string) => {
      if (!sessionState.isActive) return;
      websocket.setTyping(isTyping, fieldPath);
    },
    [sessionState.isActive, websocket]
  );

  // WebSocket 이벤트 리스너 등록
  useEffect(() => {
    websocket.on('user-joined', handleUserJoined);
    websocket.on('user-left', handleUserLeft);
    websocket.on('edit-operation', handleEditOperation);
    websocket.on('presence-updated', handlePresenceUpdated);
    websocket.on('user-typing', handleUserTyping);
    websocket.on('user-stopped-typing', handleUserStoppedTyping);

    return () => {
      websocket.off('user-joined', handleUserJoined);
      websocket.off('user-left', handleUserLeft);
      websocket.off('edit-operation', handleEditOperation);
      websocket.off('presence-updated', handlePresenceUpdated);
      websocket.off('user-typing', handleUserTyping);
      websocket.off('user-stopped-typing', handleUserStoppedTyping);
    };
  }, [
    websocket,
    handleUserJoined,
    handleUserLeft,
    handleEditOperation,
    handlePresenceUpdated,
    handleUserTyping,
    handleUserStoppedTyping,
  ]);

  // 자동 참여
  useEffect(() => {
    if (
      autoJoin &&
      websocket.isConnected() &&
      !sessionState.isActive &&
      !isConnecting
    ) {
      joinSession();
    }
  }, [autoJoin, websocket, sessionState.isActive, isConnecting, joinSession]);

  // 컴포넌트 언마운트 시 세션 나가기
  useEffect(() => {
    return () => {
      if (sessionState.isActive) {
        leaveSession();
      }
    };
  }, []);

  // 현재 사용자 정보를 포함한 참가자 목록
  const allParticipants = sessionState.participants.filter(
    p => p.userId !== user?.id
  );
  const currentUserPresence = sessionState.participants.find(
    p => p.userId === user?.id
  );

  return {
    // 상태
    sessionId: sessionState.sessionId,
    participants: allParticipants,
    currentUserPresence,
    isActive: sessionState.isActive,
    isConnecting,
    error,
    lastActivity: sessionState.lastActivity,

    // 액션
    joinSession,
    leaveSession,
    sendEditOperation,
    updateCursor,
    updateSelection,
    setTyping,

    // 유틸리티
    getParticipantById: (userId: string) =>
      sessionState.participants.find(p => p.userId === userId),
    getTypingParticipants: () =>
      sessionState.participants.filter(
        p => p.isTyping && p.userId !== user?.id
      ),
    isParticipantOnline: (userId: string) => {
      const participant = sessionState.participants.find(
        p => p.userId === userId
      );
      return participant?.status === 'ONLINE';
    },
  };
};
