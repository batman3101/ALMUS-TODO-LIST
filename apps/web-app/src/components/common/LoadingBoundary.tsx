import React, { Suspense, Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../../utils/logger';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  maxRetries?: number;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

// Loading spinner component
const LoadingSpinner: React.FC<{ message?: string }> = ({
  message = '로딩 중...',
}) => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="text-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      <p className="text-muted-foreground">{message}</p>
    </div>
  </div>
);

// Enhanced error fallback component
const ErrorFallback: React.FC<{
  error: Error;
  retry: () => void;
  canRetry: boolean;
}> = ({ error, retry, canRetry }) => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="text-center space-y-6 max-w-md mx-auto p-6">
      <div className="text-6xl">⚠️</div>
      <h2 className="text-2xl font-semibold text-foreground">
        문제가 발생했습니다
      </h2>
      <p className="text-muted-foreground">
        {error.message || '알 수 없는 오류가 발생했습니다.'}
      </p>
      {canRetry && (
        <button
          onClick={retry}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          다시 시도
        </button>
      )}
      <p className="text-sm text-muted-foreground">
        문제가 계속 발생하면 페이지를 새로고침하거나 관리자에게 문의하세요.
      </p>
    </div>
  </div>
);

// Error boundary class component
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Error boundary caught an error:', error, errorInfo);

    this.setState({
      errorInfo,
    });

    // Call onError prop if provided
    this.props.onError?.(error, errorInfo);

    // Report to error tracking service if available
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false,
      });
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  retry = () => {
    const maxRetries = this.props.maxRetries ?? 3;

    if (this.state.retryCount >= maxRetries) {
      logger.warn('Max retry attempts reached');
      return;
    }

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));

    // Add exponential backoff for retries
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000);
    this.retryTimeoutId = setTimeout(() => {
      // Force re-render after delay
      this.forceUpdate();
    }, delay);
  };

  render() {
    if (this.state.hasError) {
      const maxRetries = this.props.maxRetries ?? 3;
      const canRetry = this.state.retryCount < maxRetries;

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error!}
          retry={this.retry}
          canRetry={canRetry}
        />
      );
    }

    return this.props.children;
  }
}

// Main LoadingBoundary component that combines Suspense and ErrorBoundary
interface LoadingBoundaryProps {
  children: ReactNode;
  loadingMessage?: string;
  fallback?: ReactNode;
  maxRetries?: number;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export const LoadingBoundary: React.FC<LoadingBoundaryProps> = ({
  children,
  loadingMessage,
  fallback,
  maxRetries = 3,
  onError,
}) => {
  return (
    <ErrorBoundary
      fallback={fallback}
      maxRetries={maxRetries}
      onError={onError}
    >
      <Suspense fallback={<LoadingSpinner message={loadingMessage} />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

// HOC for wrapping components with loading boundary
export const withLoadingBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    loadingMessage?: string;
    maxRetries?: number;
  }
) => {
  const WrappedComponent: React.FC<P> = props => (
    <LoadingBoundary
      loadingMessage={options?.loadingMessage}
      maxRetries={options?.maxRetries}
    >
      <Component {...props} />
    </LoadingBoundary>
  );

  WrappedComponent.displayName = `withLoadingBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

export default LoadingBoundary;
