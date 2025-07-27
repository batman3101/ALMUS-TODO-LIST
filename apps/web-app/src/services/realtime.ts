import { supabase } from '../../../../lib/supabase/client';
import {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

// 실시간 이벤트 타입
export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimePayload<T = any> {
  eventType: RealtimeEvent;
  new?: T;
  old?: T;
  table: string;
  schema: string;
  commit_timestamp: string;
}

export type RealtimeCallback<T = any> = (payload: RealtimePayload<T>) => void;

// 구독 가능한 테이블 타입
export type SubscribableTable =
  | 'tasks'
  | 'teams'
  | 'team_members'
  | 'projects'
  | 'comments'
  | 'notifications'
  | 'user_presence';

// 필터 타입
export interface TableFilter {
  column: string;
  value: string | number;
  operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in';
}

export interface SubscriptionConfig {
  table: SubscribableTable;
  event?: RealtimeEvent | '*';
  schema?: string;
  filter?: TableFilter;
}

// 실시간 서비스 클래스
class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscriptions: Map<string, SubscriptionConfig> = new Map();
  private isConnected = false;

  constructor() {
    this.setupGlobalHandlers();
  }

  private setupGlobalHandlers() {
    // 전역 실시간 연결 상태 모니터링
    supabase.realtime.onOpen(() => {
      this.isConnected = true;
      console.log('🔴 Realtime connection opened');
    });

    supabase.realtime.onClose(() => {
      this.isConnected = false;
      console.log('🔴 Realtime connection closed');
    });

    supabase.realtime.onError(error => {
      this.isConnected = false;
      console.error('🔴 Realtime connection error:', error);
    });
  }

  /**
   * 테이블 변경사항 구독
   */
  subscribe<T = any>(
    channelName: string,
    config: SubscriptionConfig,
    callback: RealtimeCallback<T>
  ): () => void {
    // 기존 채널이 있으면 제거
    if (this.channels.has(channelName)) {
      this.unsubscribe(channelName);
    }

    // 새 채널 생성
    const channel = supabase.channel(channelName);

    // 테이블 변경사항 리스너 추가
    let changeListener = channel.on(
      'postgres_changes',
      {
        event: config.event || '*',
        schema: config.schema || 'public',
        table: config.table,
        ...(config.filter && {
          filter: `${config.filter.column}=${config.filter.operator || 'eq'}.${config.filter.value}`,
        }),
      },
      (payload: RealtimePostgresChangesPayload<T>) => {
        const realtimePayload: RealtimePayload<T> = {
          eventType: payload.eventType as RealtimeEvent,
          new: payload.new,
          old: payload.old,
          table: payload.table,
          schema: payload.schema,
          commit_timestamp: payload.commit_timestamp,
        };

        try {
          callback(realtimePayload);
        } catch (error) {
          console.error(`실시간 콜백 에러 (${channelName}):`, error);
        }
      }
    );

    // 채널 구독 시작
    channel.subscribe(status => {
      if (status === 'SUBSCRIBED') {
        console.log(`✅ Subscribed to ${channelName} (${config.table})`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`❌ Failed to subscribe to ${channelName}`);
      } else if (status === 'TIMED_OUT') {
        console.error(`⏰ Subscription to ${channelName} timed out`);
      }
    });

    // 채널과 구독 정보 저장
    this.channels.set(channelName, channel);
    this.subscriptions.set(channelName, config);

    // 구독 해제 함수 반환
    return () => this.unsubscribe(channelName);
  }

  /**
   * 특정 채널 구독 해제
   */
  unsubscribe(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
      this.subscriptions.delete(channelName);
      console.log(`🔌 Unsubscribed from ${channelName}`);
    }
  }

  /**
   * 모든 구독 해제
   */
  unsubscribeAll(): void {
    this.channels.forEach((_, channelName) => {
      this.unsubscribe(channelName);
    });
  }

  /**
   * Presence 채널 구독 (사용자 온라인 상태)
   */
  subscribeToPresence(
    channelName: string,
    userId: string,
    userMetadata: Record<string, any> = {}
  ) {
    const channel = supabase.channel(channelName);

    // Presence 상태 추적
    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        console.log('Presence sync:', presenceState);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          // 자신의 presence 상태 등록
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
            ...userMetadata,
          });
        }
      });

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  /**
   * 브로드캐스트 메시지 전송
   */
  broadcast(channelName: string, event: string, payload: any): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      channel.send({
        type: 'broadcast',
        event,
        payload,
      });
    } else {
      console.warn(`채널 ${channelName}이 존재하지 않습니다.`);
    }
  }

  /**
   * 브로드캐스트 메시지 구독
   */
  subscribeToBroadcast(
    channelName: string,
    event: string,
    callback: (payload: any) => void
  ): () => void {
    let channel = this.channels.get(channelName);

    if (!channel) {
      channel = supabase.channel(channelName);
      this.channels.set(channelName, channel);
    }

    channel.on('broadcast', { event }, callback).subscribe();

    return () => this.unsubscribe(channelName);
  }

  /**
   * 연결 상태 확인
   */
  isRealtimeConnected(): boolean {
    return this.isConnected;
  }

  /**
   * 활성 구독 목록
   */
  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * 특정 구독 정보 조회
   */
  getSubscriptionInfo(channelName: string): SubscriptionConfig | undefined {
    return this.subscriptions.get(channelName);
  }
}

// 사전 정의된 구독 헬퍼 함수들
export class RealtimeHelpers {
  constructor(private realtimeService: RealtimeService) {}

  /**
   * 팀의 태스크 변경사항 구독
   */
  subscribeToTeamTasks(teamId: string, callback: RealtimeCallback): () => void {
    return this.realtimeService.subscribe(
      `team-tasks-${teamId}`,
      {
        table: 'tasks',
        filter: { column: 'team_id', value: teamId },
      },
      callback
    );
  }

  /**
   * 특정 태스크 변경사항 구독
   */
  subscribeToTask(taskId: string, callback: RealtimeCallback): () => void {
    return this.realtimeService.subscribe(
      `task-${taskId}`,
      {
        table: 'tasks',
        filter: { column: 'id', value: taskId },
      },
      callback
    );
  }

  /**
   * 팀 멤버 변경사항 구독
   */
  subscribeToTeamMembers(
    teamId: string,
    callback: RealtimeCallback
  ): () => void {
    return this.realtimeService.subscribe(
      `team-members-${teamId}`,
      {
        table: 'team_members',
        filter: { column: 'team_id', value: teamId },
      },
      callback
    );
  }

  /**
   * 댓글 변경사항 구독
   */
  subscribeToComments(
    resourceType: string,
    resourceId: string,
    callback: RealtimeCallback
  ): () => void {
    return this.realtimeService.subscribe(
      `comments-${resourceType}-${resourceId}`,
      {
        table: 'comments',
        filter: { column: 'resource_id', value: resourceId },
      },
      callback
    );
  }

  /**
   * 사용자 알림 구독
   */
  subscribeToUserNotifications(
    userId: string,
    callback: RealtimeCallback
  ): () => void {
    return this.realtimeService.subscribe(
      `notifications-${userId}`,
      {
        table: 'notifications',
        filter: { column: 'user_id', value: userId },
      },
      callback
    );
  }

  /**
   * 팀 협업 세션 구독 (Presence + Broadcast)
   */
  subscribeToCollaboration(
    teamId: string,
    userId: string,
    userMetadata: Record<string, any> = {}
  ) {
    const channelName = `collaboration-${teamId}`;

    // Presence 구독
    const unsubscribePresence = this.realtimeService.subscribeToPresence(
      channelName,
      userId,
      userMetadata
    );

    // 커서 움직임 구독
    const unsubscribeCursor = this.realtimeService.subscribeToBroadcast(
      channelName,
      'cursor-move',
      payload => {
        console.log('Cursor moved:', payload);
      }
    );

    // 타이핑 상태 구독
    const unsubscribeTyping = this.realtimeService.subscribeToBroadcast(
      channelName,
      'typing',
      payload => {
        console.log('Typing status:', payload);
      }
    );

    // 전체 구독 해제 함수 반환
    return () => {
      unsubscribePresence();
      unsubscribeCursor();
      unsubscribeTyping();
    };
  }

  /**
   * 협업 이벤트 전송
   */
  sendCollaborationEvent(
    teamId: string,
    event: 'cursor-move' | 'typing' | 'selection',
    payload: any
  ): void {
    this.realtimeService.broadcast(`collaboration-${teamId}`, event, payload);
  }
}

// 싱글톤 인스턴스
export const realtimeService = new RealtimeService();
export const realtimeHelpers = new RealtimeHelpers(realtimeService);

// React Hook for Realtime
export const useRealtime = () => {
  return {
    subscribe: realtimeService.subscribe.bind(realtimeService),
    unsubscribe: realtimeService.unsubscribe.bind(realtimeService),
    unsubscribeAll: realtimeService.unsubscribeAll.bind(realtimeService),
    subscribeToPresence:
      realtimeService.subscribeToPresence.bind(realtimeService),
    broadcast: realtimeService.broadcast.bind(realtimeService),
    subscribeToBroadcast:
      realtimeService.subscribeToBroadcast.bind(realtimeService),
    isConnected: realtimeService.isRealtimeConnected.bind(realtimeService),
    getActiveSubscriptions:
      realtimeService.getActiveSubscriptions.bind(realtimeService),

    // 헬퍼 메서드들
    helpers: realtimeHelpers,
  };
};
