import React from 'react';
import { useTranslation } from 'react-i18next';

export type ViewType = 'list' | 'calendar' | 'kanban' | 'gantt' | 'team';

interface ViewSelectorProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  className?: string;
}

const ViewSelector: React.FC<ViewSelectorProps> = ({
  currentView,
  onViewChange,
  className = '',
}) => {
  const { t } = useTranslation();

  const views = [
    {
      id: 'list' as ViewType,
      label: t('view.list'),
      icon: '✅',
      description: t('view.listDescription'),
    },
    {
      id: 'calendar' as ViewType,
      label: t('view.calendar'),
      icon: '📅',
      description: t('view.calendarDescription'),
    },
    {
      id: 'kanban' as ViewType,
      label: t('view.kanban'),
      icon: '📊',
      description: t('view.kanbanDescription'),
    },
    {
      id: 'gantt' as ViewType,
      label: t('view.gantt'),
      icon: '🧮',
      description: t('view.ganttDescription'),
    },
    {
      id: 'team' as ViewType,
      label: t('teamManagement.title'),
      icon: '👥',
      description: t('view.teamDescription'),
    },
  ];

  return (
    <div
      className={`bg-white dark:bg-dark-100 rounded-lg shadow border border-gray-200 dark:border-dark-300 transition-colors duration-200 ${className}`}
    >
      <div className="p-4 border-b border-gray-200 dark:border-dark-300">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-900">
          {t('view.switchView')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-dark-600 mt-1">
          {t('view.selectViewDescription')}
        </p>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {views.map(view => (
            <button
              key={view.id}
              onClick={() => onViewChange(view.id)}
              className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                currentView === view.id
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'border-gray-200 dark:border-dark-300 bg-white dark:bg-dark-50 text-gray-700 dark:text-dark-700 hover:border-gray-300 dark:hover:border-dark-400 hover:bg-gray-50 dark:hover:bg-dark-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl emoji">{view.icon}</span>
                <div className="text-left">
                  <div className="font-medium">{view.label}</div>
                  <div className="text-xs text-gray-500 dark:text-dark-500 mt-1">
                    {view.description}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ViewSelector;
