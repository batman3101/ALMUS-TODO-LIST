import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface NotificationOptions {
  title?: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface NotificationContextType {
  // 알림 표시
  showNotification: (options: NotificationOptions) => void;

  // 확인 다이얼로그
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;

  // 간단한 알림들
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

interface NotificationState extends NotificationOptions {
  id: string;
  isVisible: boolean;
}

interface ConfirmState extends ConfirmOptions {
  isVisible: boolean;
  resolve?: (value: boolean) => void;
}

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<NotificationState[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const showNotification = (options: NotificationOptions) => {
    const id = generateId();
    const notification: NotificationState = {
      ...options,
      id,
      isVisible: true,
    };

    setNotifications(prev => [...prev, notification]);

    // 자동 제거 (기본 4초)
    const duration = options.duration ?? 4000;
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, isVisible: false }
          : notification
      )
    );

    // 애니메이션 후 완전 제거
    setTimeout(() => {
      setNotifications(prev =>
        prev.filter(notification => notification.id !== id)
      );
    }, 300);
  };

  const showConfirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>(resolve => {
      setConfirmState({
        ...options,
        isVisible: true,
        resolve,
      });
    });
  };

  const handleConfirm = (result: boolean) => {
    if (confirmState?.resolve) {
      confirmState.resolve(result);
    }
    setConfirmState(null);
  };

  // 간단한 알림 함수들
  const success = (message: string, title?: string) => {
    showNotification({ type: 'success', message, title });
  };

  const error = (message: string, title?: string) => {
    showNotification({ type: 'error', message, title });
  };

  const warning = (message: string, title?: string) => {
    showNotification({ type: 'warning', message, title });
  };

  const info = (message: string, title?: string) => {
    showNotification({ type: 'info', message, title });
  };

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        showConfirm,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}

      {/* 알림 컨테이너 */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map(notification => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onRemove={() => removeNotification(notification.id)}
          />
        ))}
      </div>

      {/* 확인 다이얼로그 */}
      {confirmState && (
        <ConfirmDialog
          {...confirmState}
          onConfirm={() => handleConfirm(true)}
          onCancel={() => handleConfirm(false)}
        />
      )}
    </NotificationContext.Provider>
  );
};

// 알림 카드 컴포넌트
interface NotificationCardProps {
  notification: NotificationState;
  onRemove: () => void;
}

const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onRemove,
}) => {
  const getTypeStyles = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200';
      default:
        return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200';
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  return (
    <div
      className={`
        min-w-80 max-w-md p-4 rounded-lg border shadow-lg
        transform transition-all duration-300 ease-in-out
        ${notification.isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${getTypeStyles()}
      `}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0">{getIcon()}</span>

        <div className="flex-1 min-w-0">
          {notification.title && (
            <h4 className="font-semibold text-sm mb-1">{notification.title}</h4>
          )}
          <p className="text-sm">{notification.message}</p>

          {notification.actions && notification.actions.length > 0 && (
            <div className="flex gap-2 mt-3">
              {notification.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`
                    px-3 py-1 text-xs rounded font-medium transition-colors
                    ${
                      action.variant === 'primary'
                        ? 'bg-current text-white opacity-90 hover:opacity-100'
                        : 'bg-white/20 hover:bg-white/30'
                    }
                  `}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onRemove}
          className="flex-shrink-0 text-current opacity-60 hover:opacity-100 transition-opacity"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

// 확인 다이얼로그 컴포넌트
interface ConfirmDialogProps extends ConfirmState {
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  variant = 'info',
  onConfirm,
  onCancel,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: '⚠️',
          confirmButton: 'bg-red-600 hover:bg-red-700 text-white',
          iconColor: 'text-red-600',
        };
      case 'warning':
        return {
          icon: '⚠️',
          confirmButton: 'bg-yellow-600 hover:bg-yellow-700 text-white',
          iconColor: 'text-yellow-600',
        };
      case 'info':
      default:
        return {
          icon: '❓',
          confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white',
          iconColor: 'text-blue-600',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-dark-100 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className={`text-2xl ${styles.iconColor}`}>{styles.icon}</div>
            <div className="flex-1">
              {title && (
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900 mb-1">
                  {title}
                </h3>
              )}
              <p className="text-gray-600 dark:text-dark-600">{message}</p>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 dark:text-dark-700 bg-gray-100 dark:bg-dark-200 hover:bg-gray-200 dark:hover:bg-dark-300 rounded-md transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-md transition-colors ${styles.confirmButton}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      'useNotification must be used within a NotificationProvider'
    );
  }
  return context;
};
