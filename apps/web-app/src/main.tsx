import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import './i18n'; // i18n 설정 import
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5분간 데이터를 신선하게 유지
      gcTime: 10 * 60 * 1000, // 10분간 캐시 유지
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </QueryClientProvider>
);
