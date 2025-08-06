import React from 'react';
import { Icon, TaskStatusIcon, PriorityIcon } from './IconRegistry';
import SvgIcon from './SvgIcon';

/**
 * 아이콘 사용 예시 컴포넌트
 * 실제 사용 시나리오에서 아이콘들이 어떻게 활용되는지 보여주는 예시
 */
export const IconUsageExample: React.FC = () => {
  const sampleTasks = [
    {
      id: '1',
      title: '프로젝트 기획 문서 작성',
      status: 'completed' as const,
      priority: 'high' as const,
      dueDate: '2025-08-05',
    },
    {
      id: '2',
      title: 'UI/UX 디자인 검토',
      status: 'in_progress' as const,
      priority: 'medium' as const,
      dueDate: '2025-08-07',
    },
    {
      id: '3',
      title: '데이터베이스 스키마 설계',
      status: 'pending' as const,
      priority: 'low' as const,
      dueDate: '2025-08-10',
    },
    {
      id: '4',
      title: '보안 취약점 점검',
      status: 'overdue' as const,
      priority: 'high' as const,
      dueDate: '2025-08-01',
    },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">
        아이콘 사용 예시
      </h1>

      {/* 네비게이션 바 예시 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">네비게이션 바</h2>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button className="icon-button">
                <Icon name="menu" category="navigation" size={24} />
              </button>
              <div className="flex items-center space-x-2">
                <SvgIcon
                  name="home"
                  category="navigation"
                  size={24}
                  className="text-blue-600"
                />
                <span className="font-semibold text-gray-800">ALMUS</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button className="icon-button">
                <Icon name="notification" category="social" size={20} />
              </button>
              <button className="icon-button">
                <Icon name="profile" category="navigation" size={20} />
              </button>
              <button className="icon-button">
                <Icon name="settings" category="navigation" size={20} />
              </button>
            </div>
          </nav>
        </div>
      </section>

      {/* 태스크 리스트 예시 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">태스크 리스트</h2>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {sampleTasks.map(task => (
            <div
              key={task.id}
              className="flex items-center p-4 border-b border-gray-100 hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3 flex-1">
                <TaskStatusIcon status={task.status} />
                <div className="flex-1">
                  <h3
                    className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'}`}
                  >
                    {task.title}
                  </h3>
                  <div className="flex items-center space-x-4 mt-1">
                    <div className="flex items-center space-x-1">
                      <PriorityIcon priority={task.priority} />
                      <span className="text-sm text-gray-500 capitalize">
                        {task.priority}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <SvgIcon
                        name="calendar-days"
                        category="task-management"
                        size={16}
                        className="text-gray-400"
                      />
                      <span className="text-sm text-gray-500">
                        {task.dueDate}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="icon-button icon-button-sm">
                  <Icon name="edit" category="task" size={16} />
                </button>
                <button className="icon-button icon-button-sm">
                  <Icon name="delete" category="task" size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 액션 버튼들 예시 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">액션 버튼</h2>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              <SvgIcon
                name="add-task"
                category="task-management"
                size={20}
                className="text-white"
              />
              <span>새 태스크</span>
            </button>
            <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
              <Icon name="save" category="actions" size={20} />
              <span>저장</span>
            </button>
            <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
              <Icon name="share" category="actions" size={20} />
              <span>공유</span>
            </button>
            <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
              <Icon name="cancel" category="actions" size={20} />
              <span>취소</span>
            </button>
          </div>
        </div>
      </section>

      {/* 상태 표시 예시 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">상태 표시</h2>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
              <TaskStatusIcon status="pending" />
              <span className="text-sm text-gray-600">대기중 (3)</span>
            </div>
            <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
              <TaskStatusIcon status="in_progress" />
              <span className="text-sm text-blue-600">진행중 (5)</span>
            </div>
            <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
              <TaskStatusIcon status="completed" />
              <span className="text-sm text-green-600">완료 (12)</span>
            </div>
            <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg">
              <TaskStatusIcon status="overdue" />
              <span className="text-sm text-red-600">지연 (2)</span>
            </div>
          </div>
        </div>
      </section>

      {/* 팀 협업 예시 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">팀 협업</h2>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <SvgIcon
                name="team"
                category="social"
                size={24}
                className="text-blue-600"
              />
              <h3 className="text-lg font-medium">프론트엔드 개발팀</h3>
            </div>
            <div className="flex items-center space-x-2">
              <button className="icon-button primary">
                <Icon name="invite" category="social" size={20} />
              </button>
              <button className="icon-button">
                <Icon name="settings" category="navigation" size={20} />
              </button>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  김
                </div>
                <div>
                  <p className="font-medium">김개발</p>
                  <p className="text-sm text-gray-500">Frontend Developer</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Icon
                  name="owner"
                  category="team"
                  size={16}
                  className="text-amber-500"
                />
                <span className="text-sm text-gray-500">팀 리더</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  이
                </div>
                <div>
                  <p className="font-medium">이디자인</p>
                  <p className="text-sm text-gray-500">UI/UX Designer</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Icon
                  name="admin"
                  category="team"
                  size={16}
                  className="text-blue-500"
                />
                <span className="text-sm text-gray-500">관리자</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 플로팅 액션 버튼 */}
      <button className="fab">
        <SvgIcon
          name="add-task"
          category="task-management"
          size={24}
          className="text-white"
        />
      </button>
    </div>
  );
};

export default IconUsageExample;
