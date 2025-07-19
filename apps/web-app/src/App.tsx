import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QueryProvider } from './providers/QueryProvider';
import { useAuth } from './hooks/useAuth';
import TaskList from './components/TaskList';
import CreateTaskForm from './components/CreateTaskForm';
import GridView from './components/GridView';
import KanbanView from './components/KanbanView';
import GanttView from './components/GanttView';
import ViewSelector, { ViewType } from './components/ViewSelector';
import LanguageSelector from './components/LanguageSelector';
import LoginForm from './components/LoginForm';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('list');
  const { t } = useTranslation();
  const { loading, isAuthenticated } = useAuth();

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <QueryProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <header className="mb-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {t('app.title')}
                </h1>
                <p className="text-gray-600 mt-2">{t('app.subtitle')}</p>
              </div>
              <LanguageSelector />
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
  );
}

export default App;
