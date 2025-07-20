import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Toaster } from 'react-hot-toast';
import { QueryProvider } from './providers/QueryProvider';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuth } from './hooks/useAuth';
import { initializeSampleTasks } from './utils/initializeData';
import TaskList from './components/TaskList';
import CreateTaskForm from './components/CreateTaskForm';
import GridView from './components/GridView';
import KanbanView from './components/KanbanView';
import GanttView from './components/GanttView';
import ViewSelector, { ViewType } from './components/ViewSelector';
import LanguageSelector from './components/LanguageSelector';
import ThemeToggle from './components/ThemeToggle';
import LoginForm from './components/LoginForm';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('list');
  const { t } = useTranslation();
  const { loading, isAuthenticated, user } = useAuth();

  // 사용자가 로그인했을 때 샘플 데이터 초기화
  useEffect(() => {
    if (user && user.teamId) {
      initializeSampleTasks(user.teamId, user.uid);
    }
  }, [user]);

  const renderCurrentView = () => {
    switch (currentView) {
      case 'grid':
        return <GridView />;
      case 'kanban':
        return <KanbanView />;
      case 'gantt':
        return <GanttView />;
      case 'list':
      default:
        return <TaskList />;
    }
  };

  if (loading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-dark-50 flex items-center justify-center transition-colors duration-200">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-dark-600">로딩 중...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  if (!isAuthenticated) {
    return (
      <ThemeProvider>
        <LoginForm />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <QueryProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-dark-50 transition-colors duration-200">
          <div className="container mx-auto px-4 py-8">
            <header className="mb-8">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-900">
                    {t('app.title')}
                  </h1>
                  <p className="text-gray-600 dark:text-dark-600 mt-2">{t('app.subtitle')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <ThemeToggle />
                  <LanguageSelector />
                </div>
              </div>
            </header>

            <main className="space-y-8">
              <CreateTaskForm />
              <ViewSelector
                currentView={currentView}
                onViewChange={setCurrentView}
                className="mb-6"
              />
              {renderCurrentView()}
            </main>
          </div>
        </div>
      </QueryProvider>
      <Toaster
        position="top-center"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          // Default options for all toasts
          className: '',
          duration: 4000,
          style: {
            background: 'white',
            color: '#363636',
          },
          // Dark mode support
          success: {
            duration: 3000,
            style: {
              background: '#10b981',
              color: 'white',
            },
          },
          error: {
            duration: 5000,
            style: {
              background: '#ef4444',
              color: 'white',
            },
          },
        }}
      />
    </ThemeProvider>
  );
}

export default App;
