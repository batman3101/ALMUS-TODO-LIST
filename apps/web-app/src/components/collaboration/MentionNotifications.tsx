import React, { useState } from 'react';
import { logger } from '../../utils/logger';
import { useMentions } from '../../hooks/useMentions';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { ko } from 'date-fns/locale';

interface MentionNotificationsProps {
  className?: string;
  maxHeight?: string;
  showMarkAllAsRead?: boolean;
}

export const MentionNotifications: React.FC<MentionNotificationsProps> = ({
  className = '',
  maxHeight = '400px',
  showMarkAllAsRead = true,
}) => {
  const { mentions, unreadCount, isLoading, error, markAsRead, markAllAsRead } =
    useMentions({ enableRealtime: true });

  const [isOpen, setIsOpen] = useState(false);

  const handleMentionClick = async (
    mentionId: string,
    resourceType: string,
    resourceId: string
  ) => {
    try {
      await markAsRead(mentionId);

      // 해당 리소스로 이동
      const baseUrl = getResourceUrl(resourceType, resourceId);
      if (baseUrl) {
        window.location.href = `${baseUrl}#comment-${mentionId}`;
      }
    } catch (error) {
      logger.error('Failed to handle mention click:', error);
    }
  };

  const getResourceUrl = (
    resourceType: string,
    resourceId: string
  ): string | null => {
    switch (resourceType) {
      case 'TASK':
        return `/tasks/${resourceId}`;
      case 'PROJECT':
        return `/projects/${resourceId}`;
      case 'DOCUMENT':
        return `/documents/${resourceId}`;
      default:
        return null;
    }
  };

  const getResourceTypeName = (resourceType: string): string => {
    switch (resourceType) {
      case 'TASK':
        return '작업';
      case 'PROJECT':
        return '프로젝트';
      case 'DOCUMENT':
        return '문서';
      default:
        return '항목';
    }
  };

  const truncateContent = (
    content: string,
    maxLength: number = 100
  ): string => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  };

  if (error) {
    return (
      <div className={`mention-notifications error ${className}`}>
        <div className="error-message">
          멘션을 불러오는 중 오류가 발생했습니다.
        </div>
      </div>
    );
  }

  return (
    <div className={`mention-notifications ${className}`}>
      {/* 알림 트리거 버튼 */}
      <button
        className={`mention-trigger ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="멘션 알림"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="mention-icon"
        >
          <path
            fillRule="evenodd"
            d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
            clipRule="evenodd"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="unread-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 알림 드롭다운 */}
      {isOpen && (
        <div className="mention-dropdown">
          <div className="mention-header">
            <h3>멘션 알림</h3>
            {showMarkAllAsRead && unreadCount > 0 && (
              <button
                className="mark-all-read-btn"
                onClick={markAllAsRead}
                title="모두 읽음으로 표시"
              >
                모두 읽음
              </button>
            )}
          </div>

          <div className="mention-list" style={{ maxHeight }}>
            {isLoading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <span>멘션을 불러오는 중...</span>
              </div>
            ) : mentions.length === 0 ? (
              <div className="empty-state">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="empty-icon"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                    clipRule="evenodd"
                  />
                </svg>
                <p>멘션이 없습니다</p>
                <span>누군가 당신을 멘션하면 여기에 표시됩니다.</span>
              </div>
            ) : (
              mentions.map(mention => (
                <div
                  key={mention.id}
                  className={`mention-item ${!mention.isRead ? 'unread' : ''}`}
                  onClick={() =>
                    handleMentionClick(
                      mention.id,
                      mention.comment?.resourceType || '',
                      mention.comment?.resourceId || ''
                    )
                  }
                >
                  {!mention.isRead && <div className="unread-indicator"></div>}

                  <div className="mention-avatar">
                    {mention.mentionedByUser?.avatar ? (
                      <img
                        src={mention.mentionedByUser.avatar}
                        alt={mention.mentionedByUser.name}
                        className="avatar-image"
                      />
                    ) : (
                      <div className="avatar-placeholder">
                        {mention.mentionedByUser?.name
                          ?.charAt(0)
                          .toUpperCase() || '?'}
                      </div>
                    )}
                  </div>

                  <div className="mention-content">
                    <div className="mention-header-info">
                      <span className="mentioned-by">
                        {mention.mentionedByUser?.name || '알 수 없는 사용자'}
                      </span>
                      <span className="mention-action">님이</span>
                      <span className="resource-type">
                        {getResourceTypeName(
                          mention.comment?.resourceType || ''
                        )}
                      </span>
                      <span className="mention-action">에서 멘션했습니다</span>
                    </div>

                    <div className="mention-comment">
                      {truncateContent(mention.comment?.content || '')}
                    </div>

                    <div className="mention-meta">
                      <span className="mention-time">
                        {formatDistanceToNow(mention.createdAt, {
                          addSuffix: true,
                          locale: ko,
                        })}
                      </span>
                      {mention.isRead && (
                        <span className="read-indicator">읽음</span>
                      )}
                    </div>
                  </div>

                  <div className="mention-actions">
                    <button
                      className="action-btn"
                      onClick={e => {
                        e.stopPropagation();
                        markAsRead(mention.id);
                      }}
                      title="읽음으로 표시"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {mentions.length > 0 && (
            <div className="mention-footer">
              <button
                className="view-all-btn"
                onClick={() => {
                  setIsOpen(false);
                  // 전체 멘션 페이지로 이동
                  window.location.href = '/mentions';
                }}
              >
                모든 멘션 보기
              </button>
            </div>
          )}
        </div>
      )}

      {/* 오버레이 */}
      {isOpen && (
        <div className="mention-overlay" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
};
