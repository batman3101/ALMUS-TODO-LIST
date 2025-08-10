import React from 'react';

interface LoadingOptimizedProps {
  message?: string;
  variant?: 'spinner' | 'skeleton' | 'pulse';
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingOptimized: React.FC<LoadingOptimizedProps> = ({
  message = '로딩 중...',
  variant = 'spinner',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  if (variant === 'skeleton') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors duration-200">
        <div className="space-y-4 w-full max-w-md mx-auto p-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors duration-200">
        <div
          className={`${sizeClasses[size]} bg-blue-600 rounded-full animate-pulse`}
        ></div>
      </div>
    );
  }

  // Default spinner
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors duration-200">
      <div className="text-center">
        <div
          className={`animate-spin rounded-full ${sizeClasses[size]} border-b-2 border-blue-600 mx-auto`}
          style={{
            animation: 'spin 0.8s linear infinite', // Faster animation
          }}
        ></div>
        {message && (
          <p className="mt-4 text-gray-600 dark:text-gray-300 text-sm">
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingOptimized;
