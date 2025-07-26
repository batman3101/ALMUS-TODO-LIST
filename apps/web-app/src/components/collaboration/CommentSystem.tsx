import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../services/websocket';
import type {
  FirestoreComment,
  FirestoreCommentReaction,
  CommentType,
} from '@almus/shared-types';
import { Timestamp } from 'firebase/firestore';

interface CommentSystemProps {
  resourceType: CommentType;
  resourceId: string;
  className?: string;
}

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
  };
  replies?: Comment[];
}

export const CommentSystem: React.FC<CommentSystemProps> = ({
  resourceType,
  resourceId,
  className = '',
}) => {
  const { user } = useAuth();
  const websocket = useWebSocket();

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mentionUsers, setMentionUsers] = useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);

  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const mentionDropdownRef = useRef<HTMLDivElement>(null);

  // 댓글 목록 로드
  useEffect(() => {
    loadComments();

    // WebSocket 연결 및 세션 참여
    const initializeCollaboration = async () => {
      if (websocket.isConnected()) {
        try {
          await websocket.joinSession(resourceType, resourceId);
        } catch (error) {
          console.error('Failed to join comment session:', error);
        }
      }
    };

    initializeCollaboration();

    return () => {
      websocket.leaveSession().catch(console.error);
    };
  }, [resourceType, resourceId, websocket]);

  // WebSocket 이벤트 리스너
  useEffect(() => {
    const handleCommentAdded = (data: { resourceType: string; resourceId: string; comment: FirestoreComment }) => {
      if (
        data.resourceType === resourceType &&
        data.resourceId === resourceId
      ) {
        const newComment = transformFirestoreComment(data.comment);
        setComments(prev => addCommentToTree(prev, newComment));
      }
    };

    const handleCommentUpdated = (data: { resourceType: string; resourceId: string; comment: FirestoreComment }) => {
      if (
        data.resourceType === resourceType &&
        data.resourceId === resourceId
      ) {
        const updatedComment = transformFirestoreComment(data.comment);
        setComments(prev => updateCommentInTree(prev, updatedComment));
      }
    };

    const handleCommentDeleted = (data: { resourceType: string; resourceId: string; commentId: string }) => {
      if (
        data.resourceType === resourceType &&
        data.resourceId === resourceId
      ) {
        setComments(prev => deleteCommentFromTree(prev, data.commentId));
      }
    };

    websocket.on('comment-added', handleCommentAdded);
    websocket.on('comment-updated', handleCommentUpdated);
    websocket.on('comment-deleted', handleCommentDeleted);

    return () => {
      websocket.off('comment-added', handleCommentAdded);
      websocket.off('comment-updated', handleCommentUpdated);
      websocket.off('comment-deleted', handleCommentDeleted);
    };
  }, [websocket, resourceType, resourceId]);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      // useComments 훅을 사용하여 실제 댓글 로드
      // 임시로 빈 배열로 설정 (실제 구현에서는 Firebase에서 로드)
      const mockComments: Comment[] = [
        {
          id: '1',
          resourceType,
          resourceId,
          authorId: 'user1',
          content: '첫 번째 댓글입니다.',
          mentions: [],
          isEdited: false,
          isDeleted: false,
          reactions: [],
          attachments: [],
          createdAt: new Date(Date.now() - 3600000),
          updatedAt: new Date(Date.now() - 3600000),
          author: {
            id: 'user1',
            name: 'John Doe',
            avatar: undefined,
          },
          replies: [],
        },
        {
          id: '2',
          resourceType,
          resourceId,
          authorId: 'user2',
          content: '두 번째 댓글입니다. @John 확인해주세요!',
          mentions: ['user1'],
          isEdited: false,
          isDeleted: false,
          reactions: [{ userId: 'user1', emoji: '👍', createdAt: new Date() }],
          attachments: [],
          createdAt: new Date(Date.now() - 1800000),
          updatedAt: new Date(Date.now() - 1800000),
          author: {
            id: 'user2',
            name: 'Jane Smith',
            avatar: undefined,
          },
          replies: [],
        },
      ];

      setComments(mockComments);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const transformFirestoreComment = (
    firestoreComment: FirestoreComment
  ): Comment => {
    return {
      ...firestoreComment,
      createdAt:
        firestoreComment.createdAt instanceof Timestamp
          ? firestoreComment.createdAt.toDate()
          : new Date(firestoreComment.createdAt as string | number),
      updatedAt:
        firestoreComment.updatedAt instanceof Timestamp
          ? firestoreComment.updatedAt.toDate()
          : new Date(firestoreComment.updatedAt as string | number),
      editedAt:
        firestoreComment.editedAt instanceof Timestamp
          ? firestoreComment.editedAt.toDate()
          : firestoreComment.editedAt
            ? new Date(firestoreComment.editedAt as string | number)
            : undefined,
      deletedAt:
        firestoreComment.deletedAt instanceof Timestamp
          ? firestoreComment.deletedAt.toDate()
          : firestoreComment.deletedAt
            ? new Date(firestoreComment.deletedAt as string | number)
            : undefined,
      replies: [],
    };
  };

  const addCommentToTree = (
    comments: Comment[],
    newComment: Comment
  ): Comment[] => {
    if (!newComment.parentCommentId) {
      return [...comments, newComment];
    }

    return comments.map(comment => {
      if (comment.id === newComment.parentCommentId) {
        return {
          ...comment,
          replies: [...(comment.replies || []), newComment],
        };
      }
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: addCommentToTree(comment.replies, newComment),
        };
      }
      return comment;
    });
  };

  const updateCommentInTree = (
    comments: Comment[],
    updatedComment: Comment
  ): Comment[] => {
    return comments.map(comment => {
      if (comment.id === updatedComment.id) {
        return { ...comment, ...updatedComment };
      }
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: updateCommentInTree(comment.replies, updatedComment),
        };
      }
      return comment;
    });
  };

  const deleteCommentFromTree = (
    comments: Comment[],
    commentId: string
  ): Comment[] => {
    return comments.reduce((acc, comment) => {
      if (comment.id === commentId) {
        // 댓글을 삭제된 상태로 표시
        acc.push({
          ...comment,
          isDeleted: true,
          deletedAt: new Date(),
          content: '[삭제된 댓글입니다]',
        });
      } else {
        if (comment.replies && comment.replies.length > 0) {
          acc.push({
            ...comment,
            replies: deleteCommentFromTree(comment.replies, commentId),
          });
        } else {
          acc.push(comment);
        }
      }
      return acc;
    }, [] as Comment[]);
  };

  // 멘션 기능
  const handleInputChange = (value: string) => {
    setNewComment(value);

    // @ 멘션 감지
    const cursorPos = commentInputRef.current?.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowMentionDropdown(true);
      setCursorPosition(cursorPos);
      // 실제로는 사용자 검색 API 호출
      searchUsers(mentionMatch[1]);
    } else {
      setShowMentionDropdown(false);
      setMentionQuery('');
    }
  };

  const searchUsers = async (query: string) => {
    // 임시 사용자 목록 (실제로는 API에서 가져와야 함)
    const mockUsers = [
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
      { id: '3', name: 'Mike Johnson', email: 'mike@example.com' },
    ];

    const filtered = mockUsers.filter(user =>
      user.name.toLowerCase().includes(query.toLowerCase())
    );
    setMentionUsers(filtered);
  };

  const insertMention = (user: { id: string; name: string; email: string }) => {
    if (!commentInputRef.current) return;

    const cursorPos = commentInputRef.current.selectionStart || 0;
    const textBeforeCursor = newComment.slice(0, cursorPos);
    const textAfterCursor = newComment.slice(cursorPos);

    // @ 이후의 텍스트를 멘션으로 교체
    const beforeMention = textBeforeCursor.replace(/@\w*$/, '');
    const mentionText = `@${user.name} `;
    const newText = beforeMention + mentionText + textAfterCursor;

    setNewComment(newText);
    setShowMentionDropdown(false);
    setMentionQuery('');

    // 커서 위치를 멘션 다음으로 이동
    setTimeout(() => {
      if (commentInputRef.current) {
        const newCursorPos = beforeMention.length + mentionText.length;
        commentInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        commentInputRef.current.focus();
      }
    }, 0);
  };

  const extractMentions = (content: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }

    return mentions;
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return;

    const mentions = extractMentions(newComment);

    const commentData = {
      resourceType,
      resourceId,
      content: newComment.trim(),
      mentions,
      parentCommentId: replyingTo,
    };

    try {
      websocket.sendComment(commentData);
      setNewComment('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to send comment:', error);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      websocket.updateComment(commentId, editContent.trim());
      setEditingComment(null);
      setEditContent('');
    } catch (error) {
      console.error('Failed to edit comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;

    try {
      websocket.deleteComment(commentId);
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const handleReaction = async (commentId: string, emoji: string) => {
    // 실제로는 reaction API 호출
    console.log('Reaction:', commentId, emoji);
  };

  const renderComment = (comment: Comment, level: number = 0) => {
    const isEditing = editingComment === comment.id;
    const canEdit = comment.authorId === user?.id && !comment.isDeleted;
    const canDelete = comment.authorId === user?.id && !comment.isDeleted;

    return (
      <div
        key={comment.id}
        className={`comment ${level > 0 ? 'reply' : ''}`}
        style={{ marginLeft: level * 20 }}
      >
        <div className="comment-header">
          <div className="comment-author">
            {comment.author?.avatar && (
              <img src={comment.author.avatar} alt="" className="avatar" />
            )}
            <span className="author-name">
              {comment.author?.name || 'Unknown User'}
            </span>
            <span className="comment-time">
              {comment.createdAt.toLocaleString()}
              {comment.isEdited && (
                <span className="edited-indicator"> (편집됨)</span>
              )}
            </span>
          </div>

          {!comment.isDeleted && (
            <div className="comment-actions">
              <button
                onClick={() => setReplyingTo(comment.id)}
                className="reply-btn"
              >
                답글
              </button>
              {canEdit && (
                <button
                  onClick={() => {
                    setEditingComment(comment.id);
                    setEditContent(comment.content);
                  }}
                  className="edit-btn"
                >
                  편집
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => handleDeleteComment(comment.id)}
                  className="delete-btn"
                >
                  삭제
                </button>
              )}
            </div>
          )}
        </div>

        <div className="comment-content">
          {isEditing ? (
            <div className="edit-form">
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                className="edit-textarea"
              />
              <div className="edit-actions">
                <button
                  onClick={() => handleEditComment(comment.id)}
                  className="save-btn"
                >
                  저장
                </button>
                <button
                  onClick={() => {
                    setEditingComment(null);
                    setEditContent('');
                  }}
                  className="cancel-btn"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="comment-text">
                {renderCommentWithMentions(comment.content)}
              </div>

              {!comment.isDeleted && (
                <div className="comment-reactions">
                  {comment.reactions.map((reaction, index) => (
                    <button
                      key={index}
                      className={`reaction ${reaction.userId === user?.id ? 'active' : ''}`}
                      onClick={() => handleReaction(comment.id, reaction.emoji)}
                    >
                      {reaction.emoji}
                    </button>
                  ))}
                  <button
                    className="add-reaction"
                    onClick={() => handleReaction(comment.id, '👍')}
                  >
                    +
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {comment.replies &&
          comment.replies.map(reply => renderComment(reply, level + 1))}

        {replyingTo === comment.id && (
          <div className="reply-form" style={{ marginLeft: 20 }}>
            <textarea
              value={newComment}
              onChange={e => handleInputChange(e.target.value)}
              placeholder="답글을 입력하세요..."
              className="reply-textarea"
              ref={commentInputRef}
            />
            {showMentionDropdown && (
              <div className="mention-dropdown" ref={mentionDropdownRef}>
                {mentionUsers.map(user => (
                  <div
                    key={user.id}
                    className="mention-item"
                    onClick={() => insertMention(user)}
                  >
                    <span className="mention-name">{user.name}</span>
                    <span className="mention-email">{user.email}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="reply-actions">
              <button onClick={handleSubmitComment} className="submit-btn">
                답글 작성
              </button>
              <button
                onClick={() => {
                  setReplyingTo(null);
                  setNewComment('');
                }}
                className="cancel-btn"
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCommentWithMentions = (content: string) => {
    const mentionRegex = /@(\w+)/g;
    const parts = content.split(mentionRegex);

    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // 멘션 부분
        return (
          <span key={index} className="mention">
            @{part}
          </span>
        );
      }
      return part;
    });
  };

  if (isLoading) {
    return <div className="loading">댓글을 불러오는 중...</div>;
  }

  return (
    <div className={`comment-system ${className}`}>
      <div className="comment-header">
        <h3>댓글 ({comments.length})</h3>
      </div>

      <div className="new-comment-form">
        <textarea
          ref={commentInputRef}
          value={newComment}
          onChange={e => handleInputChange(e.target.value)}
          placeholder="댓글을 입력하세요... (@를 입력하여 사용자를 멘션할 수 있습니다)"
          className="comment-textarea"
          rows={3}
        />

        {showMentionDropdown && (
          <div className="mention-dropdown" ref={mentionDropdownRef}>
            {mentionUsers.map(user => (
              <div
                key={user.id}
                className="mention-item"
                onClick={() => insertMention(user)}
              >
                <span className="mention-name">{user.name}</span>
                <span className="mention-email">{user.email}</span>
              </div>
            ))}
          </div>
        )}

        <div className="comment-actions">
          <button
            onClick={handleSubmitComment}
            disabled={!newComment.trim()}
            className="submit-btn"
          >
            댓글 작성
          </button>
        </div>
      </div>

      <div className="comments-list">
        {comments.length === 0 ? (
          <div className="no-comments">첫 번째 댓글을 작성해보세요!</div>
        ) : (
          comments.map(comment => renderComment(comment))
        )}
      </div>
    </div>
  );
};
