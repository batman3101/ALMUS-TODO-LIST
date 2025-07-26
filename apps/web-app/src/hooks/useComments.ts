import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useWebSocket } from '../services/websocket';
import type { FirestoreComment, CommentType } from '@almus/shared-types';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Comment
  extends Omit<
    FirestoreComment,
    'createdAt' | 'updatedAt' | 'editedAt' | 'deletedAt'
  > {
  createdAt: Date;
  updatedAt: Date;
  editedAt?: Date;
  deletedAt?: Date;
  author?: {
    id: string;
    name: string;
    avatar?: string;
    email: string;
  };
  replies?: Comment[];
}

interface UseCommentsOptions {
  resourceType: CommentType;
  resourceId: string;
  enableRealtime?: boolean;
}

interface UseCommentsReturn {
  comments: Comment[];
  isLoading: boolean;
  error: string | null;
  addComment: (
    content: string,
    mentions?: string[],
    parentCommentId?: string
  ) => Promise<void>;
  updateComment: (commentId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  addReaction: (commentId: string, emoji: string) => Promise<void>;
  removeReaction: (commentId: string, emoji: string) => Promise<void>;
  refreshComments: () => Promise<void>;
}

export const useComments = ({
  resourceType,
  resourceId,
  enableRealtime = true,
}: UseCommentsOptions): UseCommentsReturn => {
  const { user } = useAuth();
  const websocket = useWebSocket();

  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Firestore 댓글을 Comment 타입으로 변환
  const transformFirestoreComment = useCallback((doc: any): Comment => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt:
        data.createdAt instanceof Timestamp
          ? data.createdAt.toDate()
          : new Date(data.createdAt),
      updatedAt:
        data.updatedAt instanceof Timestamp
          ? data.updatedAt.toDate()
          : new Date(data.updatedAt),
      editedAt:
        data.editedAt instanceof Timestamp ? data.editedAt.toDate() : undefined,
      deletedAt:
        data.deletedAt instanceof Timestamp
          ? data.deletedAt.toDate()
          : undefined,
      replies: [],
    };
  }, []);

  // 댓글을 트리 구조로 구성
  const buildCommentTree = useCallback((flatComments: Comment[]): Comment[] => {
    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];

    // 모든 댓글을 맵에 저장
    flatComments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // 부모-자식 관계 구성
    flatComments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id)!;

      if (comment.parentCommentId) {
        const parent = commentMap.get(comment.parentCommentId);
        if (parent) {
          parent.replies!.push(commentWithReplies);
        }
      } else {
        rootComments.push(commentWithReplies);
      }
    });

    // 각 레벨에서 생성 시간순으로 정렬
    const sortComments = (comments: Comment[]): Comment[] => {
      return comments
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map(comment => ({
          ...comment,
          replies: comment.replies ? sortComments(comment.replies) : [],
        }));
    };

    return sortComments(rootComments);
  }, []);

  // Firestore에서 댓글 로드
  const loadComments = useCallback(async () => {
    if (!resourceType || !resourceId) return;

    setIsLoading(true);
    setError(null);

    try {
      const commentsQuery = query(
        collection(db, 'comments'),
        where('resourceType', '==', resourceType),
        where('resourceId', '==', resourceId),
        where('isDeleted', '==', false),
        orderBy('createdAt', 'asc')
      );

      if (enableRealtime) {
        // 실시간 리스너 설정
        const unsubscribe = onSnapshot(
          commentsQuery,
          snapshot => {
            const flatComments = snapshot.docs.map(transformFirestoreComment);
            const treeComments = buildCommentTree(flatComments);
            setComments(treeComments);
            setIsLoading(false);
          },
          error => {
            console.error('Error loading comments:', error);
            setError('댓글을 불러오는 중 오류가 발생했습니다.');
            setIsLoading(false);
          }
        );

        return unsubscribe;
      } else {
        // 일회성 로드
        const snapshot = await getDocs(commentsQuery);
        const flatComments = snapshot.docs.map(transformFirestoreComment);
        const treeComments = buildCommentTree(flatComments);
        setComments(treeComments);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      setError('댓글을 불러오는 중 오류가 발생했습니다.');
      setIsLoading(false);
    }
  }, [
    resourceType,
    resourceId,
    enableRealtime,
    transformFirestoreComment,
    buildCommentTree,
  ]);

  // 사용자 정보 로드 (캐시)
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

  // 댓글에 작성자 정보 추가
  const enrichCommentsWithUserInfo = useCallback(
    async (comments: Comment[]): Promise<Comment[]> => {
      const enrichComment = async (comment: Comment): Promise<Comment> => {
        const authorInfo = await loadUserInfo(comment.authorId);
        const enrichedReplies = comment.replies
          ? await Promise.all(comment.replies.map(enrichComment))
          : [];

        return {
          ...comment,
          author: authorInfo,
          replies: enrichedReplies,
        };
      };

      return Promise.all(comments.map(enrichComment));
    },
    [loadUserInfo]
  );

  // 댓글 추가
  const addComment = useCallback(
    async (
      content: string,
      mentions: string[] = [],
      parentCommentId?: string
    ) => {
      if (!user || !content.trim()) {
        throw new Error('사용자 인증이 필요하거나 댓글 내용이 비어있습니다.');
      }

      try {
        const commentData: Omit<FirestoreComment, 'id'> = {
          resourceType,
          resourceId,
          parentCommentId,
          authorId: user.id,
          content: content.trim(),
          mentions,
          isEdited: false,
          isDeleted: false,
          reactions: [],
          attachments: [],
          createdAt: serverTimestamp() as any,
          updatedAt: serverTimestamp() as any,
        };

        const docRef = await addDoc(collection(db, 'comments'), commentData);

        // 실시간 알림을 위해 WebSocket으로도 전송
        if (websocket.isConnected()) {
          websocket.sendComment({
            resourceType,
            resourceId,
            content: content.trim(),
            mentions,
            parentCommentId,
          });
        }

        // 멘션된 사용자들에게 알림 생성
        if (mentions.length > 0) {
          await createMentionNotifications(docRef.id, mentions);
        }
      } catch (error) {
        console.error('Error adding comment:', error);
        throw new Error('댓글 추가 중 오류가 발생했습니다.');
      }
    },
    [user, resourceType, resourceId, websocket]
  );

  // 댓글 수정
  const updateComment = useCallback(
    async (commentId: string, content: string) => {
      if (!user || !content.trim()) {
        throw new Error('사용자 인증이 필요하거나 댓글 내용이 비어있습니다.');
      }

      try {
        const commentRef = doc(db, 'comments', commentId);
        await updateDoc(commentRef, {
          content: content.trim(),
          isEdited: true,
          editedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // WebSocket으로도 전송
        if (websocket.isConnected()) {
          websocket.updateComment(commentId, content.trim());
        }
      } catch (error) {
        console.error('Error updating comment:', error);
        throw new Error('댓글 수정 중 오류가 발생했습니다.');
      }
    },
    [user, websocket]
  );

  // 댓글 삭제 (소프트 삭제)
  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!user) {
        throw new Error('사용자 인증이 필요합니다.');
      }

      try {
        const commentRef = doc(db, 'comments', commentId);
        await updateDoc(commentRef, {
          isDeleted: true,
          deletedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          content: '[삭제된 댓글입니다]',
        });

        // WebSocket으로도 전송
        if (websocket.isConnected()) {
          websocket.deleteComment(commentId);
        }
      } catch (error) {
        console.error('Error deleting comment:', error);
        throw new Error('댓글 삭제 중 오류가 발생했습니다.');
      }
    },
    [user, websocket]
  );

  // 반응 추가
  const addReaction = useCallback(
    async (commentId: string, emoji: string) => {
      if (!user) {
        throw new Error('사용자 인증이 필요합니다.');
      }

      try {
        const commentRef = doc(db, 'comments', commentId);
        const commentDoc = await getDoc(commentRef);

        if (!commentDoc.exists()) {
          throw new Error('댓글을 찾을 수 없습니다.');
        }

        const commentData = commentDoc.data() as FirestoreComment;
        const existingReactions = commentData.reactions || [];

        // 이미 같은 이모지로 반응했는지 확인
        const existingReactionIndex = existingReactions.findIndex(
          r => r.userId === user.id && r.emoji === emoji
        );

        let newReactions;
        if (existingReactionIndex >= 0) {
          // 기존 반응 제거
          newReactions = existingReactions.filter(
            (_, index) => index !== existingReactionIndex
          );
        } else {
          // 새 반응 추가
          newReactions = [
            ...existingReactions,
            {
              userId: user.id,
              emoji,
              createdAt: serverTimestamp() as any,
            },
          ];
        }

        await updateDoc(commentRef, {
          reactions: newReactions,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error('Error adding reaction:', error);
        throw new Error('반응 추가 중 오류가 발생했습니다.');
      }
    },
    [user]
  );

  // 반응 제거
  const removeReaction = useCallback(
    async (commentId: string, emoji: string) => {
      if (!user) {
        throw new Error('사용자 인증이 필요합니다.');
      }

      try {
        const commentRef = doc(db, 'comments', commentId);
        const commentDoc = await getDoc(commentRef);

        if (!commentDoc.exists()) {
          throw new Error('댓글을 찾을 수 없습니다.');
        }

        const commentData = commentDoc.data() as FirestoreComment;
        const existingReactions = commentData.reactions || [];

        // 해당 반응 제거
        const newReactions = existingReactions.filter(
          r => !(r.userId === user.id && r.emoji === emoji)
        );

        await updateDoc(commentRef, {
          reactions: newReactions,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error('Error removing reaction:', error);
        throw new Error('반응 제거 중 오류가 발생했습니다.');
      }
    },
    [user]
  );

  // 멘션 알림 생성
  const createMentionNotifications = useCallback(
    async (commentId: string, mentionedUserIds: string[]) => {
      try {
        const mentionPromises = mentionedUserIds.map(async mentionedUserId => {
          const mentionData = {
            commentId,
            mentionedUserId,
            mentionedByUserId: user!.id,
            resourceType,
            resourceId,
            isRead: false,
            createdAt: serverTimestamp(),
          };

          return addDoc(collection(db, 'mentions'), mentionData);
        });

        await Promise.all(mentionPromises);
      } catch (error) {
        console.error('Error creating mention notifications:', error);
      }
    },
    [user, resourceType, resourceId]
  );

  // 댓글 새로고침
  const refreshComments = useCallback(async () => {
    await loadComments();
  }, [loadComments]);

  // 초기 로드 및 실시간 리스너 설정
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initializeComments = async () => {
      unsubscribe = await loadComments();
    };

    initializeComments();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [loadComments]);

  // 사용자 정보 추가
  useEffect(() => {
    const enrichComments = async () => {
      if (comments.length > 0) {
        const enriched = await enrichCommentsWithUserInfo(comments);
        setComments(enriched);
      }
    };

    enrichComments();
  }, [comments.length]); // comments 자체를 의존성으로 사용하면 무한 루프 발생

  return {
    comments,
    isLoading,
    error,
    addComment,
    updateComment,
    deleteComment,
    addReaction,
    removeReaction,
    refreshComments,
  };
};
