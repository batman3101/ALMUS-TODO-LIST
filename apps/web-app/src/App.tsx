import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Toaster } from 'react-hot-toast';
import { StagewiseToolbar } from '@stagewise/toolbar-react';
import ReactPlugin from '@stagewise-plugins/react';
import { QueryProvider } from './providers/QueryProvider';

import { NotificationProvider } from './contexts/NotificationContext';
import { useAuth } from './hooks/useAuth';
import { useTeams } from './hooks/useTeams';
import TaskList from './components/TaskList';
import CreateTaskForm from './components/CreateTaskForm';
import CalendarView from './components/CalendarView';
import KanbanView from './components/KanbanView';
import GanttView from './components/GanttView';
import { TeamManagement } from './components/TeamManagement';
import ViewSelector, { ViewType } from './components/ViewSelector';
import LanguageSelector from './components/LanguageSelector';
import ThemeToggle from './components/ThemeToggle';
import LogoutButton from './components/LogoutButton';
import { useTheme } from './contexts/ThemeContext';
import LoginForm from './components/LoginForm';
import { TeamRole } from './types/team';

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
        <StagewiseToolbar config={{ plugins: [ReactPlugin] }} />
        <NotificationProvider>
          <LoginForm />
        </NotificationProvider>
      </>
    );
  }

  return (
    <>
      <StagewiseToolbar config={{ plugins: [ReactPlugin] }} />
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
  const { user: authUser } = useAuth();
  const {
    currentTeam,
    getUserRole,
    isLoading: isLoadingTeams,
    teams,
    createTeam,
  } = useTeams();

  // 현재 팀 정보 디버깅
  useEffect(() => {
    console.log('MainApp render - currentTeam:', currentTeam?.name, currentTeam?.id);
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

  // 팀이 없는 경우 팀 생성 UI 표시
  if (teams.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-50 transition-colors duration-200">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto mt-20">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-900 mb-4">
                환영합니다!
              </h2>
              <p className="text-gray-600 dark:text-dark-600">
                시작하려면 첫 번째 팀을 만들어주세요.
              </p>
            </div>
            <div className="bg-white dark:bg-dark-100 rounded-lg shadow p-6">
              <div className="space-y-4">
                <div>
                  <input
                    id="team-name-input"
                    type="text"
                    placeholder="팀 이름을 입력하세요"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-dark-300 text-gray-900 dark:text-dark-50"
                    defaultValue=""
                  />
                </div>
                <button
                  onClick={async () => {
                    const input = document.getElementById('team-name-input') as HTMLInputElement;
                    const teamName = input?.value?.trim() || `${authUser?.name || '사용자'}의 팀`;
                    
                    try {
                      await createTeam({
                        name: teamName,
                        description: '새로 생성된 팀입니다',
                      });
                      window.location.reload();
                    } catch (error) {
                      console.error('팀 생성 오류:', error);
                    }
                  }}
                  className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-dark-100 transition-colors duration-200"
                >
                  팀 만들기</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
  );
}

export default App;
