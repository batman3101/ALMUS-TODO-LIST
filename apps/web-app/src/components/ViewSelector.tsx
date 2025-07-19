import React from 'react';
import { useTranslation } from 'react-i18next';

export type ViewType = 'list' | 'grid' | 'kanban' | 'gantt';

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
      icon: '📋',
      description: t('view.listDescription'),
    },
    {
      id: 'grid' as ViewType,
      label: t('view.grid'),
      icon: '📊',
      description: t('view.gridDescription'),
    },
    {
      id: 'kanban' as ViewType,
      label: t('view.kanban'),
      icon: '📋',
      description: t('view.kanbanDescription'),
    },
    {
      id: 'gantt' as ViewType,
      label: t('view.gantt'),
      icon: '📅',
      description: t('view.ganttDescription'),
    },
  ];

  return (
    <div
      className={`bg-white rounded-lg shadow border border-gray-200 ${className}`}
    >
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('view.switchView')}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {t('view.selectViewDescription')}
        </p>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {views.map(view => (
            <button
              key={view.id}
              onClick={() => onViewChange(view.id)}
              className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                currentView === view.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{view.icon}</span>
                <div className="text-left">
                  <div className="font-medium">{view.label}</div>
                  <div className="text-xs text-gray-500 mt-1">
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
