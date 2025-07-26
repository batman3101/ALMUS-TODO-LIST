import toastLib from 'react-hot-toast';

// Export the main toast object for direct usage
export const toast = {
  success: (message: string) => toastLib.success(message),
  error: (message: string) => toastLib.error(message),
  loading: (message: string) => toastLib.loading(message),
  dismiss: (toastId?: string) => toastLib.dismiss(toastId),
};

// Toast 유틸리티 함수들
export const showToast = {
  success: (message: string) => {
    toastLib.success(message, {
      style: {
        background: '#10b981',
        color: 'white',
        fontWeight: '500',
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
      },
      iconTheme: {
        primary: 'white',
        secondary: '#10b981',
      },
    });
  },

  error: (message: string) => {
    toastLib.error(message, {
      style: {
        background: '#ef4444',
        color: 'white',
        fontWeight: '500',
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)',
      },
      iconTheme: {
        primary: 'white',
        secondary: '#ef4444',
      },
    });
  },

  warning: (message: string) => {
    toastLib(message, {
      icon: '⚠️',
      style: {
        background: '#f59e0b',
        color: 'white',
        fontWeight: '500',
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)',
      },
    });
  },

  info: (message: string) => {
    toastLib(message, {
      icon: 'ℹ️',
      style: {
        background: '#3b82f6',
        color: 'white',
        fontWeight: '500',
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
      },
    });
  },

  // 다크모드 지원 토스트
  dark: {
    success: (message: string) => {
      toastLib.success(message, {
        style: {
          background: '#1f2937',
          color: '#10b981',
          fontWeight: '500',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #10b981',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)',
        },
        iconTheme: {
          primary: '#10b981',
          secondary: '#1f2937',
        },
      });
    },

    error: (message: string) => {
      toastLib.error(message, {
        style: {
          background: '#1f2937',
          color: '#ef4444',
          fontWeight: '500',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #ef4444',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)',
        },
        iconTheme: {
          primary: '#ef4444',
          secondary: '#1f2937',
        },
      });
    },

    warning: (message: string) => {
      toastLib(message, {
        icon: '⚠️',
        style: {
          background: '#1f2937',
          color: '#f59e0b',
          fontWeight: '500',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #f59e0b',
          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.1)',
        },
      });
    },

    info: (message: string) => {
      toastLib(message, {
        icon: 'ℹ️',
        style: {
          background: '#1f2937',
          color: '#3b82f6',
          fontWeight: '500',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #3b82f6',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)',
        },
      });
    },
  },
};

// 확인 대화상자를 위한 Promise 기반 함수 (간소화 버전)
export const showConfirm = (message: string): Promise<boolean> => {
  return new Promise(resolve => {
    // 브라우저 기본 confirm을 사용하되, 스타일링된 toast로 대체할 예정
    const result = window.confirm(message);
    resolve(result);
  });
};

// 테마를 고려한 자동 토스트 함수
export const createToast = (isDark: boolean = false) => {
  return isDark ? showToast.dark : showToast;
};
