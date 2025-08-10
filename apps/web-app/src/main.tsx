import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import './i18n'; // i18n 설정 import
import App from './App';
import './index.css';
import './styles/icons.css'; // 아이콘 스타일 import
import { ThemeProvider } from './contexts/ThemeContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 2; // Max 2 retries for other errors
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff with max 5s
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always', // Always refetch when reconnecting
      staleTime: 5 * 60 * 1000, // 5분간 데이터를 신선하게 유지
      gcTime: 10 * 60 * 1000, // 10분간 캐시 유지
      networkMode: 'offlineFirst', // Better offline handling
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry mutations on client errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 1; // Max 1 retry for mutations
      },
      networkMode: 'online',
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{
          v7_relativeSplatPath: true,
          v7_startTransition: true,
        }}
      >
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </ThemeProvider>
);
