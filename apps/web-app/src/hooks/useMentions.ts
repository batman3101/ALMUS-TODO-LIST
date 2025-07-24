import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import type { FirestoreMention } from '@almus/shared-types';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc,
  serverTimestamp,
  Timestamp,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Mention extends Omit<FirestoreMention, 'createdAt' | 'readAt'> {
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
  searchMentionableUsers: (query: string) => Promise<Array<{ id: string; name: string; email: string; avatar?: string }>>;
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

  // Firestore 멘션을 Mention 타입으로 변환
  const transformFirestoreMention = useCallback((doc: any): Mention => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
      readAt: data.readAt instanceof Timestamp ? data.readAt.toDate() : undefined,
    };
  }, []);

  // 사용자 정보 캐시
  const userCache = new Map<string, any>();
  
  const loadUserInfo = useCallback(async (userId: string) => {
    if (userCache.has(userId)) {
      return userCache.get(userId);
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = {
          id: userDoc.id,
          name: userDoc.data().name,
          email: userDoc.data().email,
          avatar: userDoc.data().avatar,
        };
        userCache.set(userId, userData);
        return userData;
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    }
    
    return null;
  }, []);

  // 댓글 정보 캐시
  const commentCache = new Map<string, any>();
  
  const loadCommentInfo = useCallback(async (commentId: string) => {
    if (commentCache.has(commentId)) {
      return commentCache.get(commentId);
    }

    try {
      const commentDoc = await getDoc(doc(db, 'comments', commentId));
      if (commentDoc.exists()) {
        const commentData = {
          id: commentDoc.id,
          content: commentDoc.data().content,
          resourceType: commentDoc.data().resourceType,
          resourceId: commentDoc.data().resourceId,
        };
        commentCache.set(commentId, commentData);
        return commentData;
      }
    } catch (error) {
      console.error('Error loading comment info:', error);
    }
    
    return null;
  }, []);

  // 멘션에 추가 정보 로드
  const enrichMentionsWithAdditionalInfo = useCallback(async (mentions: Mention[]): Promise<Mention[]> => {
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
  }, [loadUserInfo, loadCommentInfo]);

  // 멘션 로드
  const loadMentions = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const mentionsQuery = query(
        collection(db, 'mentions'),
        where('mentionedUserId', '==', user.id),
        orderBy('createdAt', 'desc')
      );

      if (enableRealtime) {
        // 실시간 리스너 설정
        const unsubscribe = onSnapshot(
          mentionsQuery,
          async (snapshot) => {
            const mentionDocs = snapshot.docs.map(transformFirestoreMention);
            const enrichedMentions = await enrichMentionsWithAdditionalInfo(mentionDocs);
            
            setMentions(enrichedMentions);
            setUnreadCount(enrichedMentions.filter(m => !m.isRead).length);
            setIsLoading(false);
          },
          (error) => {
            console.error('Error loading mentions:', error);
            setError('멘션을 불러오는 중 오류가 발생했습니다.');
            setIsLoading(false);
          }
        );

        return unsubscribe;
      } else {
        // 일회성 로드
        const snapshot = await getDocs(mentionsQuery);
        const mentionDocs = snapshot.docs.map(transformFirestoreMention);
        const enrichedMentions = await enrichMentionsWithAdditionalInfo(mentionDocs);
        
        setMentions(enrichedMentions);
        setUnreadCount(enrichedMentions.filter(m => !m.isRead).length);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error loading mentions:', error);
      setError('멘션을 불러오는 중 오류가 발생했습니다.');
      setIsLoading(false);
    }
  }, [user, enableRealtime, transformFirestoreMention, enrichMentionsWithAdditionalInfo]);

  // 멘션을 읽음으로 표시
  const markAsRead = useCallback(async (mentionId: string) => {
    if (!user) {
      throw new Error('사용자 인증이 필요합니다.');
    }

    try {
      const mentionRef = doc(db, 'mentions', mentionId);
      await updateDoc(mentionRef, {
        isRead: true,
        readAt: serverTimestamp(),
      });

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
      console.error('Error marking mention as read:', error);
      throw new Error('멘션을 읽음으로 표시하는 중 오류가 발생했습니다.');
    }
  }, [user]);

  // 모든 멘션을 읽음으로 표시
  const markAllAsRead = useCallback(async () => {
    if (!user) {
      throw new Error('사용자 인증이 필요합니다.');
    }

    try {
      const unreadMentions = mentions.filter(m => !m.isRead);
      
      const updatePromises = unreadMentions.map(mention => {
        const mentionRef = doc(db, 'mentions', mention.id);
        return updateDoc(mentionRef, {
          isRead: true,
          readAt: serverTimestamp(),
        });
      });

      await Promise.all(updatePromises);

      // 로컬 상태 업데이트
      setMentions(prev => 
        prev.map(mention => ({ 
          ...mention, 
          isRead: true, 
          readAt: mention.readAt || new Date() 
        }))
      );
      
      setUnreadCount(0);

    } catch (error) {
      console.error('Error marking all mentions as read:', error);
      throw new Error('모든 멘션을 읽음으로 표시하는 중 오류가 발생했습니다.');
    }
  }, [user, mentions]);

  // 멘션 가능한 사용자 검색
  const searchMentionableUsers = useCallback(async (query: string) => {
    if (!query.trim()) return [];

    try {
      // 현재 사용자가 속한 팀의 멤버들을 검색
      // 실제로는 더 복잡한 쿼리가 필요할 수 있음 (팀 멤버십, 프로젝트 참여자 등)
      const usersQuery = query(
        collection(db, 'users'),
        where('name', '>=', query),
        where('name', '<=', query + '\uf8ff'),
        orderBy('name'),
        limit(10)
      );

      const snapshot = await getDocs(usersQuery);
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        email: doc.data().email,
        avatar: doc.data().avatar,
      }));

      // 현재 사용자는 제외
      return users.filter(u => u.id !== user?.id);

    } catch (error) {
      console.error('Error searching mentionable users:', error);
      return [];
    }
  }, [user]);

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
          markAsRead(mention.id).catch(console.error);
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