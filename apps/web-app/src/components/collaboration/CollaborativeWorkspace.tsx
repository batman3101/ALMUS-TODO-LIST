import React, { useState, useEffect, useCallback } from 'react';
import { CollaborativeTextEditor } from './CollaborativeTextEditor';
import { CommentSystem } from './CommentSystem';
import { MentionNotifications } from './MentionNotifications';
import { useCollaborativeSession } from '../../hooks/useCollaborativeSession';
import { useUserPresence } from '../../hooks/useUserPresence';
import { useWebSocket } from '../../services/websocket';
import { useAuth } from '../../hooks/useAuth';
import type { CommentType } from '@almus/shared-types';
import './CollaborativeWorkspace.css';

interface CollaborativeWorkspaceProps {
  resourceType: 'TASK' | 'PROJECT' | 'DOCUMENT';
  resourceId: string;
  title?: string;
  data: Record<string, any>;
  onDataChange?: (data: Record<string, any>) => void;
  onSave?: (data: Record<string, any>) => void;
  className?: string;
}

interface PresenceIndicatorProps {
  userId: string;
  userName: string;
  color: string;
  status: 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE';
  isTyping: boolean;
  currentField?: string;
}

const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  userId,
  userName,
  color,
  status,
  isTyping,
  currentField,
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'ONLINE':
        return '🟢';
      case 'AWAY':
        return '🟡';
      case 'BUSY':
        return '🔴';
      default:
        return '⚫';
    }
  };

  return (
    <div className="presence-indicator" style={{ borderColor: color }}>
      <div className="presence-avatar" style={{ backgroundColor: color }}>
        {userName.charAt(0).toUpperCase()}
      </div>
      <div className="presence-info">
        <div className="presence-name">
          <span className="status-icon">{getStatusIcon()}</span>
          {userName}
        </div>
        {isTyping && currentField && (
          <div className="presence-activity">
            {currentField}에서 입력 중...
          </div>
        )}
      </div>
    </div>
  );
};

export const CollaborativeWorkspace: React.FC<CollaborativeWorkspaceProps> = ({
  resourceType,
  resourceId,
  title,
  data,
  onDataChange,
  onSave,
  className = '',
}) => {
  const { user } = useAuth();
  const websocket = useWebSocket();
  
  const [localData, setLocalData] = useState(data);
  const [activeTab, setActiveTab] = useState<'edit' | 'comments'>('edit');
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // 협업 세션 관리
  const {
    sessionId,
    participants,
    isActive: isSessionActive,
    isConnecting: isSessionConnecting,
    error: sessionError,
    joinSession,
    leaveSession,
    sendEditOperation,
    updateCursor,
    updateSelection,
    setTyping,
    getTypingParticipants,
  } = useCollaborativeSession({
    resourceType,
    resourceId,
    autoJoin: true,
    onEditOperation: handleEditOperation,
    onConflictDetected: handleConflictDetected,
  });

  // 사용자 상태 관리
  const {
    currentUserPresence,
    onlineUsers,
    isOnline,
    updateStatus,
    updateCursor: updatePresenceCursor,
    updateSelection: updatePresenceSelection,
    setTyping: setPresenceTyping,
  } = useUserPresence({
    enableAutoUpdate: true,
    enableRealtime: true,
  });

  // 사용자별 색상 매핑
  const userColors = React.useMemo(() => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#AED6F1', '#A9DFBF'
    ];
    const colorMap = new Map<string, string>();
    
    participants.forEach((participant, index) => {
      colorMap.set(participant.userId, colors[index % colors.length]);
    });
    
    return colorMap;
  }, [participants]);

  // WebSocket 연결 초기화
  useEffect(() => {
    const initializeConnection = async () => {
      if (!user) return;

      setIsConnecting(true);
      setConnectionError(null);

      try {
        if (!websocket.isConnected()) {
          await websocket.connect();
        }
        
        // 상태를 온라인으로 설정
        await updateStatus('ONLINE');
        
        setIsConnecting(false);
      } catch (error) {
        console.error('Failed to initialize collaboration:', error);
        setConnectionError(error instanceof Error ? error.message : 'Connection failed');
        setIsConnecting(false);
      }
    };

    initializeConnection();

    return () => {
      // 정리
      updateStatus('OFFLINE').catch(console.error);
      websocket.disconnect();
    };
  }, [user, websocket, updateStatus]);

  // 편집 작업 처리
  function handleEditOperation(operation: any) {
    console.log('Received edit operation:', operation);
    
    // 실제 데이터 업데이트 로직
    if (operation.position.fieldPath && localData[operation.position.fieldPath] !== undefined) {
      const updatedData = { ...localData };
      
      // 작업 타입에 따른 처리
      switch (operation.type) {
        case 'INSERT':
          // 텍스트 삽입 로직
          break;
        case 'DELETE':
          // 텍스트 삭제 로직
          break;
        case 'REPLACE':
          // 텍스트 교체 로직
          break;
      }
      
      setLocalData(updatedData);
      onDataChange?.(updatedData);
    }
  }

  // 충돌 처리
  function handleConflictDetected(operations: any[]) {
    console.log('Conflict detected:', operations);
    
    // 충돌 해결 UI 표시 또는 자동 해결
    // 여기서는 간단히 타임스탬프 기반으로 해결
    const resolvedOperations = operations.sort((a, b) => a.timestamp - b.timestamp);
    
    resolvedOperations.forEach(op => {
      handleEditOperation(op);
    });
  }

  // 데이터 변경 핸들러
  const handleDataChange = useCallback((field: string, value: any) => {
    const updatedData = { ...localData, [field]: value };
    setLocalData(updatedData);
    onDataChange?.(updatedData);
    
    // 타이핑 상태 업데이트
    setTyping(true, field);
    setPresenceTyping(true, field);
  }, [localData, onDataChange, setTyping, setPresenceTyping]);

  // 저장 핸들러
  const handleSave = useCallback(async () => {
    try {
      await onSave?.(localData);
      
      // 성공 피드백 (토스트 메시지 등)
      console.log('Data saved successfully');
    } catch (error) {
      console.error('Failed to save data:', error);
      // 에러 피드백
    }
  }, [localData, onSave]);

  // 타이핑 참가자 목록
  const typingParticipants = getTypingParticipants();

  if (isConnecting) {
    return (
      <div className={`collaborative-workspace loading ${className}`}>
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>협업 환경을 초기화하는 중...</p>
        </div>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className={`collaborative-workspace error ${className}`}>
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <h3>연결 오류</h3>
          <p>{connectionError}</p>
          <button 
            className="retry-btn"
            onClick={() => {
              setConnectionError(null);
              // 재연결 시도 로직
            }}
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`collaborative-workspace ${className}`}>
      {/* 헤더 */}
      <div className="workspace-header">
        <div className="header-left">
          <h2 className="workspace-title">{title}</h2>
          <div className="collaboration-status">
            <div className={`connection-indicator ${isOnline ? 'online' : 'offline'}`}>
              <span className="status-dot"></span>
              <span className="status-text">
                {isOnline ? '온라인' : '오프라인'}
              </span>
            </div>
            {isSessionActive && (
              <div className="session-info">
                <span className="session-id">세션: {sessionId?.slice(-8)}</span>
                <span className="participant-count">
                  {participants.length + 1}명 참여
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="header-right">
          <MentionNotifications />
          <button 
            className="save-btn"
            onClick={handleSave}
            disabled={isSessionConnecting}
          >
            저장
          </button>
        </div>
      </div>

      {/* 참가자 목록 */}
      {participants.length > 0 && (
        <div className="participants-bar">
          <div className="participants-label">참가자:</div>
          <div className="participants-list">
            {participants.map(participant => (
              <PresenceIndicator
                key={participant.userId}
                userId={participant.userId}
                userName={`User ${participant.userId}`} // 실제로는 사용자 이름 표시
                color={userColors.get(participant.userId) || '#999999'}
                status={participant.status}
                isTyping={participant.isTyping}
                currentField={participant.cursor?.fieldPath}
              />
            ))}
          </div>
          
          {typingParticipants.length > 0 && (
            <div className="typing-indicator">
              {typingParticipants.map(p => `User ${p.userId}`).join(', ')}님이 입력 중...
            </div>
          )}
        </div>
      )}

      {/* 탭 네비게이션 */}
      <div className="workspace-tabs">
        <button
          className={`tab-btn ${activeTab === 'edit' ? 'active' : ''}`}
          onClick={() => setActiveTab('edit')}
        >
          편집
        </button>
        <button
          className={`tab-btn ${activeTab === 'comments' ? 'active' : ''}`}
          onClick={() => setActiveTab('comments')}
        >
          댓글
        </button>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="workspace-content">
        {activeTab === 'edit' ? (
          <div className="edit-panel">
            {/* 제목 편집 */}
            {localData.title !== undefined && (
              <div className="field-group">
                <label htmlFor="title-editor">제목</label>
                <CollaborativeTextEditor
                  resourceType={resourceType}
                  resourceId={resourceId}
                  fieldPath="title"
                  initialValue={localData.title || ''}
                  placeholder="제목을 입력하세요..."
                  onValueChange={(value) => handleDataChange('title', value)}
                  onSave={(value) => handleDataChange('title', value)}
                  className="title-editor"
                />
              </div>
            )}

            {/* 설명 편집 */}
            {localData.description !== undefined && (
              <div className="field-group">
                <label htmlFor="description-editor">설명</label>
                <CollaborativeTextEditor
                  resourceType={resourceType}
                  resourceId={resourceId}
                  fieldPath="description"
                  initialValue={localData.description || ''}
                  placeholder="설명을 입력하세요..."
                  onValueChange={(value) => handleDataChange('description', value)}
                  onSave={(value) => handleDataChange('description', value)}
                  className="description-editor"
                />
              </div>
            )}

            {/* 추가 필드들 */}
            {Object.entries(localData).map(([key, value]) => {
              if (key === 'title' || key === 'description') return null;
              if (typeof value !== 'string') return null;

              return (
                <div key={key} className="field-group">
                  <label htmlFor={`${key}-editor`}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </label>
                  <CollaborativeTextEditor
                    resourceType={resourceType}
                    resourceId={resourceId}
                    fieldPath={key}
                    initialValue={value}
                    placeholder={`${key}을(를) 입력하세요...`}
                    onValueChange={(newValue) => handleDataChange(key, newValue)}
                    onSave={(newValue) => handleDataChange(key, newValue)}
                    className="field-editor"
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="comments-panel">
            <CommentSystem
              resourceType={resourceType as CommentType}
              resourceId={resourceId}
              className="workspace-comments"
            />
          </div>
        )}
      </div>

      {/* 상태 바 */}
      <div className="workspace-footer">
        <div className="footer-left">
          {sessionError && (
            <div className="error-message">
              세션 오류: {sessionError}
            </div>
          )}
        </div>
        
        <div className="footer-right">
          <div className="workspace-stats">
            <span>온라인: {onlineUsers.length}명</span>
            <span>세션: {isSessionActive ? '활성' : '비활성'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};