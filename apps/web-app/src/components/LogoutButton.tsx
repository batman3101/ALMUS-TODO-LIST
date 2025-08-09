import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../contexts/NotificationContext';

const LogoutButton: React.FC = () => {
  const { logout } = useAuth();
  const { success } = useNotification();

  const handleLogout = async () => {
    try {
      await logout();
      success('로그아웃되었습니다.');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="
        flex items-center gap-2 px-3 py-2
        bg-gray-100 hover:bg-gray-200 
        dark:bg-dark-300 dark:hover:bg-dark-400
        text-gray-700 dark:text-dark-700
        rounded-lg transition-colors duration-200
        text-sm font-medium
      "
      title="로그아웃"
    >
      <LogOut className="w-4 h-4" />
      <span>로그아웃</span>
    </button>
  );
};

export default LogoutButton;