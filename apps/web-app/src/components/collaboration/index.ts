// Real-time Collaboration Components
export { CollaborativeWorkspace } from './CollaborativeWorkspace';
export { CollaborativeTextEditor } from './CollaborativeTextEditor';
export { CommentSystem } from './CommentSystem';
export { MentionNotifications } from './MentionNotifications';
export { CollaborationDemo } from './CollaborationDemo';

// Types
export type {
  WebSocketEvent,
  WebSocketMessage,
  EditOperation,
  UserPresence,
} from '../../services/websocket';

// Hooks
export { useCollaborativeSession } from '../../hooks/useCollaborativeSession';
export { useUserPresence } from '../../hooks/useUserPresence';
export { useComments } from '../../hooks/useComments';
export { useMentions } from '../../hooks/useMentions';

// Services
export { useWebSocket, websocketService } from '../../services/websocket';

// Utilities
export {
  OperationalTransform,
  ConflictResolver,
} from '../../utils/operationalTransform';
export type {
  Operation,
  TextOperation,
} from '../../utils/operationalTransform';
