import React from 'react';

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
  const views = [
    {
      id: 'list' as ViewType,
      label: '리스트',
      icon: '📋',
      description: '간단한 리스트 형태',
    },
    {
      id: 'grid' as ViewType,
      label: '그리드',
      icon: '📊',
      description: '엑셀 유사 테이블 형태',
    },
    {
      id: 'kanban' as ViewType,
      label: '칸반',
      icon: '📋',
      description: '드래그 앤 드롭 보드',
    },
    {
      id: 'gantt' as ViewType,
      label: '간트',
      icon: '📅',
      description: '타임라인 시각화',
    },
  ];

  return (
    <div className={`bg-white rounded-lg shadow border border-gray-200 ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">뷰 선택</h3>
        <p className="text-sm text-gray-600 mt-1">원하는 형태로 태스크를 확인하세요</p>
      </div>
      
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {views.map((view) => (
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
                  <div className="text-xs text-gray-500 mt-1">{view.description}</div>
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