import React from 'react';
import {
  Icon,
  TaskStatusIcon,
  PriorityIcon,
  iconRegistry,
} from './IconRegistry';
import SvgIcon from './SvgIcon';

/**
 * 아이콘 쇼케이스 컴포넌트
 * 개발 중 아이콘들을 확인하고 테스트하기 위한 컴포넌트
 */
export const IconShowcase: React.FC = () => {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">
        ALMUS 아이콘 라이브러리
      </h1>

      {/* Lucide React Icons */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">
          Lucide React 아이콘
        </h2>

        {Object.entries(iconRegistry).map(([categoryName, categoryIcons]) => (
          <div key={categoryName} className="mb-8">
            <h3 className="text-lg font-medium mb-3 text-gray-600 capitalize">
              {categoryName.replace(/([A-Z])/g, ' $1').trim()}
            </h3>
            <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-4">
              {Object.entries(categoryIcons as Record<string, any>).map(
                ([iconName, IconComponent]) => (
                  <div
                    key={iconName}
                    className="flex flex-col items-center p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
                  >
                    <Icon
                      name={iconName}
                      category={categoryName as keyof typeof iconRegistry}
                      size={24}
                      className="mb-2"
                    />
                    <span className="text-xs text-gray-500 text-center">
                      {iconName}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Status Icons */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">
          태스크 상태 아이콘
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['pending', 'in_progress', 'completed', 'overdue'] as const).map(
            status => (
              <div
                key={status}
                className="flex flex-col items-center p-4 bg-white rounded-lg shadow-sm"
              >
                <TaskStatusIcon status={status} className="mb-2" />
                <span className="text-sm text-gray-600 capitalize">
                  {status.replace('_', ' ')}
                </span>
              </div>
            )
          )}
        </div>
      </section>

      {/* Priority Icons */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">
          우선순위 아이콘
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {(['low', 'medium', 'high'] as const).map(priority => (
            <div
              key={priority}
              className="flex flex-col items-center p-4 bg-white rounded-lg shadow-sm"
            >
              <PriorityIcon priority={priority} className="mb-2" />
              <span className="text-sm text-gray-600 capitalize">
                {priority}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Custom SVG Icons */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">
          커스텀 SVG 아이콘
        </h2>

        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3 text-gray-600">
            태스크 관리
          </h3>
          <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-4">
            {['check-circle', 'add-task', 'calendar-days', 'priority-flag'].map(
              iconName => (
                <div
                  key={iconName}
                  className="flex flex-col items-center p-3 bg-white rounded-lg shadow-sm"
                >
                  <SvgIcon
                    name={iconName}
                    category="task-management"
                    size={24}
                    className="mb-2"
                  />
                  <span className="text-xs text-gray-500 text-center">
                    {iconName}
                  </span>
                </div>
              )
            )}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3 text-gray-600">네비게이션</h3>
          <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-4">
            {['menu-hamburger', 'home'].map(iconName => (
              <div
                key={iconName}
                className="flex flex-col items-center p-3 bg-white rounded-lg shadow-sm"
              >
                <SvgIcon
                  name={iconName}
                  category="navigation"
                  size={24}
                  className="mb-2"
                />
                <span className="text-xs text-gray-500 text-center">
                  {iconName}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3 text-gray-600">상태</h3>
          <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-4">
            {['in-progress'].map(iconName => (
              <div
                key={iconName}
                className="flex flex-col items-center p-3 bg-white rounded-lg shadow-sm"
              >
                <SvgIcon
                  name={iconName}
                  category="status"
                  size={24}
                  className="mb-2"
                />
                <span className="text-xs text-gray-500 text-center">
                  {iconName}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3 text-gray-600">소셜</h3>
          <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-4">
            {['team'].map(iconName => (
              <div
                key={iconName}
                className="flex flex-col items-center p-3 bg-white rounded-lg shadow-sm"
              >
                <SvgIcon
                  name={iconName}
                  category="social"
                  size={24}
                  className="mb-2"
                />
                <span className="text-xs text-gray-500 text-center">
                  {iconName}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Usage Examples */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-gray-700">사용 예시</h2>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-3">코드 예시</h3>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
            {`// Lucide React 아이콘 사용
import { Icon } from './components/icons/IconRegistry';

<Icon name="check" category="task" size={24} />
<Icon name="home" category="navigation" />

// 태스크 상태 아이콘
import { TaskStatusIcon } from './components/icons/IconRegistry';

<TaskStatusIcon status="completed" />
<TaskStatusIcon status="in_progress" />

// 우선순위 아이콘
import { PriorityIcon } from './components/icons/IconRegistry';

<PriorityIcon priority="high" />

// 커스텀 SVG 아이콘
import SvgIcon from './components/icons/SvgIcon';

<SvgIcon name="check-circle" category="task-management" size={24} />
<SvgIcon name="menu-hamburger" category="navigation" />`}
          </pre>
        </div>
      </section>
    </div>
  );
};

export default IconShowcase;
