import { io, Socket } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';

export type WebSocketEvent =
  | 'user-joined'
  | 'user-left'
  | 'user-typing'
  | 'user-stopped-typing'
  | 'edit-operation'
  | 'cursor-moved'
  | 'selection-changed'
  | 'comment-added'
  | 'comment-updated'
  | 'comment-deleted'
  | 'mention-created'
  | 'presence-updated'
  | 'session-started'
  | 'session-ended'
  | 'conflict-detected'
  | 'conflict-resolved';

export interface WebSocketMessage {
  event: WebSocketEvent;
  data: unknown;
  timestamp: number;
  userId: string;
  sessionId: string;
  resourceType: 'TASK' | 'PROJECT' | 'DOCUMENT';
  resourceId: string;
}

export interface EditOperation {
  id: string;
  type: 'INSERT' | 'DELETE' | 'REPLACE' | 'FORMAT';
  position: {
    line: number;
    column: number;
    fieldPath?: string;
  };
  content?: string;
  length?: number;
  attributes?: Record<string, unknown>;
  userId: string;
  timestamp: number;
}

export interface UserPresence {
  userId: string;
  status: 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE';
  cursor?: {
    line: number;
    column: number;
    fieldPath?: string;
  };
  selection?: {
    start: { line: number; column: number; fieldPath?: string };
    end: { line: number; column: number; fieldPath?: string };
  };
  isTyping: boolean;
  lastActivity: number;
}

class WebSocketService {
  private socket: Socket | null = null;
  private eventListeners: Map<WebSocketEvent, Set<Function>> = new Map();
  private connectionState:
    | 'DISCONNECTED'
    | 'CONNECTING'
    | 'CONNECTED'
    | 'ERROR' = 'DISCONNECTED';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private currentSession: string | null = null;
  private heartbeatInterval: number | null = null;

  constructor() {
    this.initializeEventListeners();
  }

  private initializeEventListeners() {
    // 각 이벤트 타입별로 빈 Set 초기화
    const events: WebSocketEvent[] = [
      'user-joined',
      'user-left',
      'user-typing',
      'user-stopped-typing',
      'edit-operation',
      'cursor-moved',
      'selection-changed',
      'comment-added',
      'comment-updated',
      'comment-deleted',
      'mention-created',
      'presence-updated',
      'session-started',
      'session-ended',
      'conflict-detected',
      'conflict-resolved',
    ];

    events.forEach(event => {
      this.eventListeners.set(event, new Set());
    });
  }

  async connect(userId: string, token: string): Promise<void> {
    if (this.socket?.connected) {
      // Already connected to WebSocket
      return;
    }

    this.connectionState = 'CONNECTING';

    try {
      this.socket = io(
        process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:3001',
        {
          auth: {
            userId,
            token,
          },
          transports: ['websocket', 'polling'],
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay,
        }
      );

      this.setupSocketEventHandlers();

      return new Promise((resolve, reject) => {
        this.socket!.on('connect', () => {
          // Connected to WebSocket server
          this.connectionState = 'CONNECTED';
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve();
        });

        this.socket!.on('connect_error', error => {
          // WebSocket connection error
          this.connectionState = 'ERROR';
          reject(error);
        });
      });
    } catch (error) {
      // Failed to connect to WebSocket
      this.connectionState = 'ERROR';
      throw error;
    }
  }

  private setupSocketEventHandlers() {
    if (!this.socket) return;

    // 연결 관련 이벤트
    this.socket.on('disconnect', reason => {
      // Disconnected from WebSocket
      this.connectionState = 'DISCONNECTED';
      this.stopHeartbeat();

      if (reason === 'io server disconnect') {
        // 서버에서 연결을 끊은 경우 재연결 시도
        this.reconnect();
      }
    });

    this.socket.on('reconnect', () => {
      // Reconnected to WebSocket
      this.connectionState = 'CONNECTED';
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_error', () => {
      // WebSocket reconnection error
      this.reconnectAttempts++;
    });

    this.socket.on('reconnect_failed', () => {
      // WebSocket reconnection failed after max attempts
      this.connectionState = 'ERROR';
    });

    // 커스텀 이벤트 핸들러 설정
    this.eventListeners.forEach((listeners, event) => {
      this.socket!.on(event, (data: unknown) => {
        const message: WebSocketMessage = {
          event,
          data,
          timestamp: Date.now(),
          userId: data.userId,
          sessionId: data.sessionId,
          resourceType: data.resourceType,
          resourceId: data.resourceId,
        };

        listeners.forEach(listener => {
          try {
            listener(message);
          } catch (error) {
            // Error in event listener
          }
        });
      });
    });

    // 하트비트 응답
    this.socket.on('pong', () => {
      // 서버로부터 pong 응답을 받음
    });
  }

  private startHeartbeat() {
    this.heartbeatInterval = window.setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, 30000); // 30초마다 핑 전송
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      // Max reconnection attempts reached
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    // Attempting to reconnect with exponential backoff

    setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        this.socket.connect();
      }
    }, delay);
  }

  disconnect(): void {
    if (this.socket) {
      this.stopHeartbeat();
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectionState = 'DISCONNECTED';
    this.currentSession = null;
  }

  // 이벤트 리스너 관리
  on(
    event: WebSocketEvent,
    listener: (message: WebSocketMessage) => void
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.add(listener);
    }
  }

  off(
    event: WebSocketEvent,
    listener: (message: WebSocketMessage) => void
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  // 메시지 전송
  emit(event: WebSocketEvent, data: unknown): void {
    if (!this.socket?.connected) {
      // Cannot emit message: WebSocket not connected
      return;
    }

    this.socket.emit(event, {
      ...data,
      timestamp: Date.now(),
    });
  }

  // 협업 세션 관리
  async joinSession(
    resourceType: 'TASK' | 'PROJECT' | 'DOCUMENT',
    resourceId: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const sessionData = {
        resourceType,
        resourceId,
      };

      this.socket.emit('join-session', sessionData);

      this.socket.once(
        'session-joined',
        (response: { sessionId: string; participants: UserPresence[] }) => {
          this.currentSession = response.sessionId;
          // Joined collaboration session
          resolve(response.sessionId);
        }
      );

      this.socket.once('session-error', (error: unknown) => {
        // Failed to join session
        reject(error);
      });
    });
  }

  async leaveSession(): Promise<void> {
    if (!this.socket?.connected || !this.currentSession) {
      return;
    }

    return new Promise(resolve => {
      this.socket!.emit('leave-session', { sessionId: this.currentSession });

      this.socket!.once('session-left', () => {
        // Left collaboration session
        this.currentSession = null;
        resolve();
      });
    });
  }

  // 편집 작업 전송
  sendEditOperation(operation: EditOperation): void {
    if (!this.currentSession) {
      // Cannot send edit operation: No active session
      return;
    }

    this.emit('edit-operation', {
      sessionId: this.currentSession,
      operation,
    });
  }

  // 커서 위치 업데이트
  updateCursor(position: {
    line: number;
    column: number;
    fieldPath?: string;
  }): void {
    if (!this.currentSession) return;

    this.emit('cursor-moved', {
      sessionId: this.currentSession,
      cursor: position,
    });
  }

  // 선택 영역 업데이트
  updateSelection(selection: {
    start: { line: number; column: number; fieldPath?: string };
    end: { line: number; column: number; fieldPath?: string };
  }): void {
    if (!this.currentSession) return;

    this.emit('selection-changed', {
      sessionId: this.currentSession,
      selection,
    });
  }

  // 타이핑 상태 업데이트
  setTyping(isTyping: boolean, fieldPath?: string): void {
    if (!this.currentSession) return;

    const event = isTyping ? 'user-typing' : 'user-stopped-typing';

    this.emit(event, {
      sessionId: this.currentSession,
      fieldPath,
    });
  }

  // 사용자 상태 업데이트
  updatePresence(
    status: 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE',
    customStatus?: string
  ): void {
    this.emit('presence-updated', {
      status,
      customStatus,
      lastActivity: Date.now(),
    });
  }

  // 연결 상태 확인
  isConnected(): boolean {
    return (
      this.connectionState === 'CONNECTED' && this.socket?.connected === true
    );
  }

  getConnectionState(): string {
    return this.connectionState;
  }

  getCurrentSession(): string | null {
    return this.currentSession;
  }

  // 댓글 관련 이벤트
  sendComment(commentData: {
    resourceType: string;
    resourceId: string;
    content: string;
    mentions: string[];
    parentCommentId?: string;
  }): void {
    this.emit('comment-added', commentData);
  }

  updateComment(commentId: string, content: string): void {
    this.emit('comment-updated', {
      commentId,
      content,
    });
  }

  deleteComment(commentId: string): void {
    this.emit('comment-deleted', {
      commentId,
    });
  }
}

// 싱글톤 인스턴스
export const websocketService = new WebSocketService();

// React Hook for WebSocket
export const useWebSocket = () => {
  const { user } = useAuth();

  const connect = async () => {
    if (!user) throw new Error('User not authenticated');
    // 실제로는 사용자 토큰을 가져와야 함
    await websocketService.connect(user.id, 'user-token');
  };

  const disconnect = () => {
    websocketService.disconnect();
  };

  return {
    connect,
    disconnect,
    on: websocketService.on.bind(websocketService),
    off: websocketService.off.bind(websocketService),
    emit: websocketService.emit.bind(websocketService),
    joinSession: websocketService.joinSession.bind(websocketService),
    leaveSession: websocketService.leaveSession.bind(websocketService),
    sendEditOperation:
      websocketService.sendEditOperation.bind(websocketService),
    updateCursor: websocketService.updateCursor.bind(websocketService),
    updateSelection: websocketService.updateSelection.bind(websocketService),
    setTyping: websocketService.setTyping.bind(websocketService),
    updatePresence: websocketService.updatePresence.bind(websocketService),
    sendComment: websocketService.sendComment.bind(websocketService),
    updateComment: websocketService.updateComment.bind(websocketService),
    deleteComment: websocketService.deleteComment.bind(websocketService),
    isConnected: websocketService.isConnected.bind(websocketService),
    getConnectionState:
      websocketService.getConnectionState.bind(websocketService),
    getCurrentSession:
      websocketService.getCurrentSession.bind(websocketService),
  };
};
