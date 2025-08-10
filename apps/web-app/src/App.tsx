import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { Toaster } from 'react-hot-toast';
import { QueryProvider } from './providers/QueryProvider';

import { NotificationProvider } from './contexts/NotificationContext';
import { useAuth } from './hooks/useAuth';
import { useTeams } from './hooks/useTeams';
import ViewSelector, { ViewType } from './components/ViewSelector';
import LanguageSelector from './components/LanguageSelector';
import ThemeToggle from './components/ThemeToggle';
import LogoutButton from './components/LogoutButton';
import { useTheme } from './contexts/ThemeContext';
import LoginForm from './components/LoginForm';
import { TeamRole } from './types/team';

// Lazy load heavy components
const TaskList = lazy(() => import('./components/TaskList'));
const CreateTaskForm = lazy(() => import('./components/CreateTaskForm'));
const CalendarView = lazy(() => import('./components/CalendarView'));
const KanbanView = lazy(() => import('./components/KanbanView'));
const GanttView = lazy(() => import('./components/GanttView'));
const TeamManagement = lazy(() =>
  import('./components/TeamManagement').then(module => ({
    default: module.TeamManagement,
  }))
);

// Loading component
const ViewLoading = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-600 dark:text-gray-300">로딩 중...</span>
  </div>
);

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('list');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const { loading, isAuthenticated } = useAuth();

  // 사용자가 로그인했을 때 샘플 데이터 초기화 - Supabase 마이그레이션으로 주석 처리
  // useEffect(() => {
  //   if (user && user.teamId) {
  //     initializeSampleTasks(user.teamId, user.uid);
  //   }
  // }, [user]);

  const renderCurrentView = () => {
    return (
      <Suspense fallback={<ViewLoading />}>
        {(() => {
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
        })()}
      </Suspense>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors duration-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            인증 확인 중...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <NotificationProvider>
          <LoginForm />
        </NotificationProvider>
      </>
    );
  }

  return (
    <>
      <NotificationProvider>
        <QueryProvider>
          <MainApp
            currentView={currentView}
            setCurrentView={setCurrentView}
            showCreateTask={showCreateTask}
            setShowCreateTask={setShowCreateTask}
            renderCurrentView={renderCurrentView}
          />
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
    </>
  );
}

// 내부 컴포넌트 - QueryProvider 내부에서 useTeams 사용 가능
function MainApp({
  currentView,
  setCurrentView,
  showCreateTask,
  setShowCreateTask,
  renderCurrentView,
}: {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  showCreateTask: boolean;
  setShowCreateTask: (show: boolean) => void;
  renderCurrentView: () => React.ReactNode;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { currentTeam, getUserRole, isLoading: isLoadingTeams } = useTeams();

  // 현재 팀 정보 디버깅 - 개발 환경에서만
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        'MainApp render - currentTeam:',
        currentTeam?.name,
        currentTeam?.id
      );
    }
  }, [currentTeam]);

  // Debug logs - remove in production
  // console.log('MainApp - user:', user);
  // console.log('MainApp - teams:', teams);

  const getRoleLabel = (role: TeamRole | null) => {
    switch (role) {
      case TeamRole.OWNER:
        return '소유자';
      case TeamRole.ADMIN:
        return '관리자';
      case TeamRole.EDITOR:
        return '편집자';
      case TeamRole.VIEWER:
        return '보기 전용';
      default:
        return '';
    }
  };

  // 팀 로딩 중 표시
  if (isLoadingTeams) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors duration-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            팀 정보 로딩 중...
          </p>
        </div>
      </div>
    );
  }

  // 팀이 없어도 메인 인터페이스 표시 (깜빡임 방지)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-50 transition-colors duration-200">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
              {/* 심볼/로고 자리 */}
              <div className="w-12 h-12 rounded-lg overflow-hidden">
                <img
                  id="logo-image"
                  src={
                    theme === 'dark'
                      ? '/assets/logos/A symbol BLUE-02.png'
                      : '/assets/logos/A symbol black-02.png'
                  }
                  alt="ALMUS Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-900">
                  {t('app.title')}
                </h1>
                <p className="text-gray-600 dark:text-dark-600 mt-2">
                  {currentTeam ? (
                    <span>
                      현재 팀: <strong>{currentTeam.name}</strong>
                      {currentTeam && (
                        <span className="ml-2 text-sm">
                          ({getRoleLabel(getUserRole(currentTeam.id))})
                        </span>
                      )}
                    </span>
                  ) : (
                    t('app.subtitle')
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <LanguageSelector />
              <LogoutButton />
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
                  <Suspense fallback={<ViewLoading />}>
                    <CreateTaskForm
                      onTaskCreated={() => setShowCreateTask(false)}
                      isModal={true}
                    />
                  </Suspense>
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
  );
}

export default App;
