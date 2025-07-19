import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import TaskList from './components/TaskList';
import CreateTaskForm from './components/CreateTaskForm';
import GridView from './components/GridView';
import KanbanView from './components/KanbanView';
import GanttView from './components/GanttView';
import ViewSelector, { ViewType } from './components/ViewSelector';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('list');

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ALMUS ToDo List</h1>
          <p className="text-gray-600 mt-2">팀 업무 관리 시스템</p>
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
  );
}

export default App; 