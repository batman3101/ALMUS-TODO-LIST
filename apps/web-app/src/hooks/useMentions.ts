import { useState, useEffect, useCallback } from 'react';
import { logger } from '../utils/logger';
import { useAuth } from './useAuth';
import { supabase } from '@lib/supabase/client';
import type { Mention as SupabaseMention } from '@almus/shared-types';

interface CommentInfo {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface Mention extends Omit<SupabaseMention, 'created_at' | 'read_at'> {
  createdAt: Date;
  readAt?: Date;
  mentionedByUser?: {
    id: string;
    name: string;
    avatar?: string;
    email: string;
  };
  comment?: {
    id: string;
    content: string;
    resourceType: string;
    resourceId: string;
  };
}

interface UseMentionsOptions {
  enableRealtime?: boolean;
  markAsReadOnView?: boolean;
}

interface UseMentionsReturn {
  mentions: Mention[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markAsRead: (mentionId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  searchMentionableUsers: (
    query: string
  ) => Promise<
    Array<{ id: string; name: string; email: string; avatar?: string }>
  >;
  refreshMentions: () => Promise<void>;
}

export const useMentions = ({
  enableRealtime = true,
  markAsReadOnView = false,
}: UseMentionsOptions = {}): UseMentionsReturn => {
  const { user } = useAuth();

  const [mentions, setMentions] = useState<Mention[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Supabase 멘션을 Mention 타입으로 변환
  const transformSupabaseMention = useCallback((data: any): Mention => {
    return {
      id: data.id,
      mentionedUserId: data.mentioned_user_id,
      mentionedByUserId: data.mentioned_by_user_id,
      commentId: data.comment_id,
      isRead: data.is_read,
      createdAt: new Date(data.created_at),
      readAt: data.read_at ? new Date(data.read_at) : undefined,
    };
  }, []);

  // 사용자 정보 캐시
  const userCache = new Map<string, CommentInfo>();

  const loadUserInfo = useCallback(async (userId: string) => {
    if (userCache.has(userId)) {
      return userCache.get(userId);
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        const userData = {
          id: data.id,
          name: data.name,
          email: data.email,
          avatar: null,
        };
        userCache.set(userId, userData);
        return userData;
      }
    } catch (error) {
      logger.error('Error loading user info:', error);
    }

    return null;
  }, []);

  // 댓글 정보 캐시
  const commentCache = new Map<string, CommentInfo>();

  const loadCommentInfo = useCallback(async (commentId: string) => {
    if (commentCache.has(commentId)) {
      return commentCache.get(commentId);
    }

    try {
      const { data, error } = await supabase
        .from('comments')
        .select('id, content, resource_type, resource_id')
        .eq('id', commentId)
        .single();

      if (error) throw error;

      if (data) {
        const commentData = {
          id: data.id,
          content: data.content,
          resourceType: data.resource_type,
          resourceId: data.resource_id,
        };
        commentCache.set(commentId, commentData);
        return commentData;
      }
    } catch (error) {
      logger.error('Error loading comment info:', error);
    }

    return null;
  }, []);

  // 멘션에 추가 정보 로드
  const enrichMentionsWithAdditionalInfo = useCallback(
    async (mentions: Mention[]): Promise<Mention[]> => {
      const enrichMention = async (mention: Mention): Promise<Mention> => {
        const [mentionedByUser, comment] = await Promise.all([
          loadUserInfo(mention.mentionedByUserId),
          loadCommentInfo(mention.commentId),
        ]);

        return {
          ...mention,
          mentionedByUser,
          comment,
        };
      };

      return Promise.all(mentions.map(enrichMention));
    },
    [loadUserInfo, loadCommentInfo]
  );

  // 멘션 로드
  const loadMentions = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('mentions')
        .select('*')
        .eq('mentioned_user_id', user.uid)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mentionDocs = data?.map(transformSupabaseMention) || [];
      const enrichedMentions =
        await enrichMentionsWithAdditionalInfo(mentionDocs);

      setMentions(enrichedMentions);
      setUnreadCount(enrichedMentions.filter(m => !m.isRead).length);
      setIsLoading(false);

      if (enableRealtime) {
        // 실시간 구독 설정
        const channel = supabase
          .channel('mentions')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'mentions',
              filter: `mentioned_user_id=eq.${user.uid}`,
            },
            () => {
              // 변경사항이 있으면 다시 로드
              loadMentions();
            }
          )
          .subscribe();

        return () => {
          channel.unsubscribe();
        };
      }
    } catch (error) {
      logger.error('Error loading mentions:', error);
      setError('멘션을 불러오는 중 오류가 발생했습니다.');
      setIsLoading(false);
    }
  }, [
    user,
    enableRealtime,
    transformSupabaseMention,
    enrichMentionsWithAdditionalInfo,
  ]);

  // 멘션을 읽음으로 표시
  const markAsRead = useCallback(
    async (mentionId: string) => {
      if (!user) {
        throw new Error('사용자 인증이 필요합니다.');
      }

      try {
        const { error } = await supabase
          .from('mentions')
          .update({
            is_read: true,
            read_at: new Date().toISOString(),
          })
          .eq('id', mentionId);

        if (error) throw error;

        // 로컬 상태 업데이트
        setMentions(prev =>
          prev.map(mention =>
            mention.id === mentionId
              ? { ...mention, isRead: true, readAt: new Date() }
              : mention
          )
        );

        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        logger.error('Error marking mention as read:', error);
        throw new Error('멘션을 읽음으로 표시하는 중 오류가 발생했습니다.');
      }
    },
    [user]
  );

  // 모든 멘션을 읽음으로 표시
  const markAllAsRead = useCallback(async () => {
    if (!user) {
      throw new Error('사용자 인증이 필요합니다.');
    }

    try {
      const { error } = await supabase
        .from('mentions')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('mentioned_user_id', user.uid)
        .eq('is_read', false);

      if (error) throw error;

      // 로컬 상태 업데이트
      setMentions(prev =>
        prev.map(mention => ({
          ...mention,
          isRead: true,
          readAt: mention.readAt || new Date(),
        }))
      );

      setUnreadCount(0);
    } catch (error) {
      logger.error('Error marking all mentions as read:', error);
      throw new Error('모든 멘션을 읽음으로 표시하는 중 오류가 발생했습니다.');
    }
  }, [user]);

  // 멘션 가능한 사용자 검색
  const searchMentionableUsers = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) return [];

      try {
        // 현재 사용자가 속한 팀의 멤버들을 검색
        const { data, error } = await supabase
          .from('users')
          .select('id, name, email')
          .ilike('name', `%${searchQuery}%`)
          .limit(10);

        if (error) throw error;

        const users =
          data?.map(user => ({
            id: user.id,
            name: user.name || '',
            email: user.email || '',
            avatar: null,
          })) || [];

        // 현재 사용자는 제외
        return users.filter(u => u.id !== user?.uid);
      } catch (error) {
        logger.error('Error searching mentionable users:', error);
        return [];
      }
    },
    [user]
  );

  // 멘션 새로고침
  const refreshMentions = useCallback(async () => {
    await loadMentions();
  }, [loadMentions]);

  // 초기 로드 및 실시간 리스너 설정
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initializeMentions = async () => {
      unsubscribe = await loadMentions();
    };

    if (user) {
      initializeMentions();
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, loadMentions]);

  // 자동으로 읽음 표시 (옵션이 활성화된 경우)
  useEffect(() => {
    if (markAsReadOnView && mentions.length > 0) {
      const unreadMentions = mentions.filter(m => !m.isRead);

      // 뷰포트에 표시되는 멘션들을 읽음으로 표시
      // 실제로는 Intersection Observer를 사용해야 함
      const timeoutId = setTimeout(() => {
        unreadMentions.forEach(mention => {
          markAsRead(mention.id).catch(logger.error);
        });
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [mentions, markAsReadOnView, markAsRead]);

  return {
    mentions,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    searchMentionableUsers,
    refreshMentions,
  };
};
