import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { useCollaborativeSession } from '../../hooks/useCollaborativeSession';
import { logger } from '../../utils/logger';
import { useUserPresence } from '../../hooks/useUserPresence';
import {
  OperationalTransform,
  TextOperation,
} from '../../utils/operationalTransform';
import type { EditOperation } from '../../services/websocket';
import './CollaborativeTextEditor.css';

interface CollaborativeTextEditorProps {
  resourceType: 'TASK' | 'PROJECT' | 'DOCUMENT';
  resourceId: string;
  fieldPath: string;
  initialValue: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
  onSave?: (value: string) => void;
  debounceDelay?: number;
}

interface CursorInfo {
  userId: string;
  userName: string;
  position: number;
  color: string;
}

interface SelectionInfo {
  userId: string;
  userName: string;
  start: number;
  end: number;
  color: string;
}

export const CollaborativeTextEditor: React.FC<
  CollaborativeTextEditorProps
> = ({
  resourceType,
  resourceId,
  fieldPath,
  initialValue,
  placeholder = '',
  className = '',
  disabled = false,
  onValueChange,
  onSave,
  debounceDelay = 300,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState(initialValue);
  const [isComposing, setIsComposing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 협업 세션 및 사용자 상태
  const {
    isActive: isSessionActive,
    participants,
    sendEditOperation,
    updateCursor,
    updateSelection,
    setTyping,
  } = useCollaborativeSession({
    resourceType,
    resourceId,
    onEditOperation: handleRemoteEditOperation,
    onConflictDetected: handleConflictDetected,
  });

  const { isOnline } = useUserPresence();

  // 로컬 상태 관리
  const [cursors, setCursors] = useState<CursorInfo[]>([]);
  const [selections, setSelections] = useState<SelectionInfo[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  // 사용자별 색상 매핑
  const userColors = useMemo(() => {
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#96CEB4',
      '#FFEAA7',
      '#DDA0DD',
      '#98D8C8',
      '#F7DC6F',
      '#AED6F1',
      '#A9DFBF',
    ];
    const colorMap = new Map<string, string>();

    participants.forEach((participant, index) => {
      colorMap.set(participant.userId, colors[index % colors.length]);
    });

    return colorMap;
  }, [participants]);

  // 디바운스된 저장 함수
  const debounceSave = useCallback(
    debounce((value: string) => {
      onSave?.(value);
      setHasUnsavedChanges(false);
    }, debounceDelay),
    [onSave, debounceDelay]
  );

  // 타이핑 상태 디바운스
  const debounceStopTyping = useCallback(
    debounce(() => {
      setTyping(false, fieldPath);
    }, 1000),
    [setTyping, fieldPath]
  );

  // 원격 편집 작업 처리
  function handleRemoteEditOperation(operation: EditOperation) {
    if (operation.position.fieldPath !== fieldPath) return;

    // 작업을 텍스트에 적용
    applyRemoteOperation(operation);
  }

  // 충돌 감지 처리
  function handleConflictDetected(operations: EditOperation[]) {
    logger.log('Conflict detected:', operations);

    // 타임스탬프 기반으로 충돌 해결
    const sortedOps = operations.sort((a, b) => a.timestamp - b.timestamp);

    // 각 작업을 순차적으로 적용
    sortedOps.forEach(op => {
      if (op.position.fieldPath === fieldPath) {
        applyRemoteOperation(op);
      }
    });
  }

  // 원격 작업을 텍스트에 적용
  const applyRemoteOperation = useCallback(
    (operation: EditOperation) => {
      setText(currentText => {
        try {
          // EditOperation을 TextOperation으로 변환
          const textOp = convertEditOperationToTextOperation(
            operation,
            currentText
          );

          // 작업 적용
          const newText = OperationalTransform.apply(currentText, textOp);

          // 변경사항 통지
          onValueChange?.(newText);

          return newText;
        } catch (error) {
          logger.error('Error applying remote operation:', error);
          return currentText;
        }
      });
    },
    [onValueChange]
  );

  // EditOperation을 TextOperation으로 변환
  const convertEditOperationToTextOperation = (
    operation: EditOperation,
    currentText: string
  ): TextOperation => {
    const position = operation.position.column;
    const ops = [];

    // Retain before position
    if (position > 0) {
      ops.push({ type: 'retain', length: position });
    }

    // Apply operation
    switch (operation.type) {
      case 'INSERT':
        ops.push({ type: 'insert', text: operation.content || '' });
        break;
      case 'DELETE':
        ops.push({ type: 'delete', length: operation.length || 1 });
        break;
      case 'REPLACE':
        ops.push({ type: 'delete', length: operation.length || 1 });
        ops.push({ type: 'insert', text: operation.content || '' });
        break;
    }

    // Retain after position
    const remainingLength =
      currentText.length - position - (operation.length || 0);
    if (remainingLength > 0) {
      ops.push({ type: 'retain', length: remainingLength });
    }

    return {
      ops,
      baseLength: currentText.length,
      targetLength: OperationalTransform.calculateTargetLength(
        currentText.length,
        ops
      ),
    };
  };

  // 로컬 편집 작업 생성 및 전송
  const createAndSendEditOperation = useCallback(
    (
      type: 'INSERT' | 'DELETE' | 'REPLACE',
      position: number,
      content?: string,
      length?: number
    ) => {
      if (!isSessionActive) return;

      const operation = {
        type,
        position: {
          line: 0, // 단순 텍스트 에디터에서는 항상 0
          column: position,
          fieldPath,
        },
        content,
        length,
      };

      sendEditOperation(operation);
    },
    [isSessionActive, sendEditOperation, fieldPath]
  );

  // 텍스트 변경 핸들러
  const handleTextChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (disabled || isComposing) return;

      const newValue = event.target.value;
      const oldValue = text;

      // 변경 감지 및 작업 생성
      const cursorPosition = event.target.selectionStart || 0;

      if (newValue.length > oldValue.length) {
        // 삽입
        const insertedText = newValue.slice(
          oldValue.length === 0
            ? 0
            : cursorPosition - (newValue.length - oldValue.length),
          cursorPosition
        );
        createAndSendEditOperation(
          'INSERT',
          cursorPosition - insertedText.length,
          insertedText
        );
      } else if (newValue.length < oldValue.length) {
        // 삭제
        const deleteLength = oldValue.length - newValue.length;
        createAndSendEditOperation(
          'DELETE',
          cursorPosition,
          undefined,
          deleteLength
        );
      }

      setText(newValue);
      onValueChange?.(newValue);
      setHasUnsavedChanges(true);

      // 타이핑 상태 업데이트
      setTyping(true, fieldPath);
      debounceStopTyping();

      // 저장 디바운스
      debounceSave(newValue);
    },
    [
      disabled,
      isComposing,
      text,
      createAndSendEditOperation,
      onValueChange,
      setTyping,
      fieldPath,
      debounceStopTyping,
      debounceSave,
    ]
  );

  // 커서 위치 변경 핸들러
  const handleSelectionChange = useCallback(() => {
    if (!textareaRef.current || !isSessionActive) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;

    // 커서 위치 업데이트
    updateCursor({
      line: 0,
      column: start,
      fieldPath,
    });

    // 선택 영역이 있는 경우
    if (start !== end) {
      updateSelection({
        start: { line: 0, column: start, fieldPath },
        end: { line: 0, column: end, fieldPath },
      });
    }
  }, [isSessionActive, updateCursor, updateSelection, fieldPath]);

  // 참가자 상태 업데이트
  useEffect(() => {
    const newCursors: CursorInfo[] = [];
    const newSelections: SelectionInfo[] = [];
    const newTypingUsers = new Set<string>();

    participants.forEach(participant => {
      const color = userColors.get(participant.userId) || '#999999';

      // 타이핑 상태
      if (participant.isTyping) {
        newTypingUsers.add(participant.userId);
      }

      // 커서 위치
      if (participant.cursor && participant.cursor.fieldPath === fieldPath) {
        newCursors.push({
          userId: participant.userId,
          userName: `User ${participant.userId}`, // 실제로는 사용자 이름을 가져와야 함
          position: participant.cursor.column,
          color,
        });
      }

      // 선택 영역
      if (
        participant.selection &&
        participant.selection.start.fieldPath === fieldPath &&
        participant.selection.end.fieldPath === fieldPath
      ) {
        newSelections.push({
          userId: participant.userId,
          userName: `User ${participant.userId}`,
          start: participant.selection.start.column,
          end: participant.selection.end.column,
          color,
        });
      }
    });

    setCursors(newCursors);
    setSelections(newSelections);
    setTypingUsers(newTypingUsers);
  }, [participants, userColors, fieldPath]);

  // 키보드 단축키 처리
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Ctrl+S로 저장
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        onSave?.(text);
        setHasUnsavedChanges(false);
      }
    },
    [onSave, text]
  );

  // IME 처리
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false);
  }, []);

  // 초기값 동기화
  useEffect(() => {
    setText(initialValue);
  }, [initialValue]);

  return (
    <div className={`collaborative-text-editor ${className}`}>
      {/* 협업 상태 표시 */}
      <div className="collaboration-status">
        <div className="connection-indicator">
          <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
          <span className="status-text">
            {isOnline ? (isSessionActive ? '협업 중' : '온라인') : '오프라인'}
          </span>
        </div>

        {participants.length > 0 && (
          <div className="participants-list">
            {participants.map(participant => (
              <div
                key={participant.userId}
                className="participant"
                style={{ borderColor: userColors.get(participant.userId) }}
              >
                <span className="participant-name">
                  User {participant.userId} {/* 실제로는 사용자 이름 표시 */}
                </span>
                {participant.isTyping && (
                  <span className="typing-indicator">입력 중...</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 텍스트 에디터 */}
      <div className="editor-container">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onSelect={handleSelectionChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder={placeholder}
          disabled={disabled}
          className="editor-textarea"
        />

        {/* 다른 사용자의 커서 표시 */}
        {cursors.map(cursor => (
          <div
            key={cursor.userId}
            className="remote-cursor"
            style={{
              borderColor: cursor.color,
              left: `${getCursorPixelPosition(cursor.position)}px`,
            }}
          >
            <div
              className="cursor-label"
              style={{ backgroundColor: cursor.color }}
            >
              {cursor.userName}
            </div>
          </div>
        ))}

        {/* 다른 사용자의 선택 영역 표시 */}
        {selections.map(selection => (
          <div
            key={selection.userId}
            className="remote-selection"
            style={{
              backgroundColor: `${selection.color}33`,
              left: `${getCursorPixelPosition(selection.start)}px`,
              width: `${getCursorPixelPosition(selection.end) - getCursorPixelPosition(selection.start)}px`,
            }}
          >
            <div
              className="selection-label"
              style={{ backgroundColor: selection.color }}
            >
              {selection.userName}
            </div>
          </div>
        ))}
      </div>

      {/* 상태 바 */}
      <div className="editor-status">
        <div className="status-left">
          {hasUnsavedChanges && (
            <span className="unsaved-indicator">저장되지 않은 변경사항</span>
          )}
          {typingUsers.size > 0 && (
            <span className="typing-users">
              {Array.from(typingUsers).join(', ')}님이 입력 중...
            </span>
          )}
        </div>
        <div className="status-right">
          <span className="character-count">{text.length} 글자</span>
        </div>
      </div>
    </div>
  );
};

// 유틸리티 함수들

function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | undefined;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => func(...args), wait);
  };
}

// 커서 위치를 픽셀 단위로 변환 (간단한 구현)
function getCursorPixelPosition(position: number): number {
  // 실제로는 텍스트 렌더링을 기반으로 정확한 위치를 계산해야 함
  // 여기서는 간단히 문자당 8px로 가정
  return position * 8;
}
