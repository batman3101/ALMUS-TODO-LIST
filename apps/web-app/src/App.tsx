import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Toaster } from 'react-hot-toast';
import { QueryProvider } from './providers/QueryProvider';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { useAuth } from './hooks/useAuth';
import { initializeSampleTasks } from './utils/initializeData';
import TaskList from './components/TaskList';
import CreateTaskForm from './components/CreateTaskForm';
import CalendarView from './components/CalendarView';
import KanbanView from './components/KanbanView';
import GanttView from './components/GanttView';
import { TeamManagement } from './components/TeamManagement';
import ViewSelector, { ViewType } from './components/ViewSelector';
import LanguageSelector from './components/LanguageSelector';
import ThemeToggle from './components/ThemeToggle';
import LoginForm from './components/LoginForm';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('list');
  const [showCreateTask, setShowCreateTask] = useState(false);
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
      case 'calendar':
        return <CalendarView />;
      case 'kanban':
        return <KanbanView />;
      case 'gantt':
        return <GanttView />;
      case 'team':
        return <TeamManagement />;
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
      <NotificationProvider>
        <QueryProvider>
          <div className="min-h-screen bg-gray-50 dark:bg-dark-50 transition-colors duration-200">
            <div className="container mx-auto px-4 py-8">
              <header className="mb-8">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-900">
                      {t('app.title')}
                    </h1>
                    <p className="text-gray-600 dark:text-dark-600 mt-2">
                      {t('app.subtitle')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowCreateTask(true)}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-dark-100 transition-colors duration-200"
                    >
                      태스크 추가
                    </button>
                    <ThemeToggle />
                    <LanguageSelector />
                  </div>
                </div>
              </header>

              <main className="space-y-8">
                {showCreateTask && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-dark-100 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                      <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-dark-300">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-900">
                          태스크 생성
                        </h2>
                        <button
                          onClick={() => setShowCreateTask(false)}
                          className="text-gray-400 hover:text-gray-600 dark:text-dark-400 dark:hover:text-dark-600 transition-colors"
                        >
                          <svg
                            className="w-6 h-6"
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
                      <div className="p-6">
                        <CreateTaskForm
                          onTaskCreated={() => setShowCreateTask(false)}
                          isModal={true}
                        />
                      </div>
                    </div>
                  </div>
                )}
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
      </NotificationProvider>
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
