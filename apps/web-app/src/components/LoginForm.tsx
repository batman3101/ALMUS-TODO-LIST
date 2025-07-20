import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../contexts/NotificationContext';
import ThemeToggle from './ThemeToggle';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, error } = useAuth();
  const { error: showError, success } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      return;
    }

    setIsLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      console.error('로그인 실패:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      showError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      await signUp(email, password);
      success('회원가입이 완료되었습니다!');
    } catch (err) {
      console.error('회원가입 실패:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-50 flex items-center justify-center transition-colors duration-200">
      <div className="max-w-md w-full space-y-8 p-8">
        {/* Theme Toggle */}
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-dark-900">
            ALMUS ToDo List
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-dark-600">
            팀 업무를 효율적으로 관리하세요
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                이메일 주소
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="
                  appearance-none rounded-none relative block w-full px-3 py-2 
                  border border-gray-300 dark:border-dark-300
                  placeholder-gray-500 dark:placeholder-dark-500
                  text-gray-900 dark:text-dark-900
                  bg-white dark:bg-dark-100
                  rounded-t-md 
                  focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 
                  sm:text-sm transition-colors duration-200
                "
                placeholder="이메일 주소"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="
                  appearance-none rounded-none relative block w-full px-3 py-2 
                  border border-gray-300 dark:border-dark-300
                  placeholder-gray-500 dark:placeholder-dark-500
                  text-gray-900 dark:text-dark-900
                  bg-white dark:bg-dark-100
                  rounded-b-md 
                  focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 
                  sm:text-sm transition-colors duration-200
                "
                placeholder="비밀번호"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 dark:text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="
                group relative w-full flex justify-center py-2 px-4 
                border border-transparent text-sm font-medium rounded-md 
                text-white bg-primary-600 hover:bg-primary-700 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                dark:focus:ring-offset-dark-50
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-200
              "
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  로그인 중...
                </div>
              ) : (
                '로그인'
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={handleSignUp}
              disabled={isLoading}
              className="
                w-full py-2 px-4 text-sm font-medium
                border border-gray-300 dark:border-dark-300 rounded-md
                text-gray-700 dark:text-dark-700 bg-white dark:bg-dark-100
                hover:bg-gray-50 dark:hover:bg-dark-200
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                dark:focus:ring-offset-dark-50
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-200
              "
            >
              회원가입
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-dark-600">
              테스트 계정: admin@almus.com / password123
            </p>
            <p className="text-xs text-gray-500 dark:text-dark-500 mt-1">
              계정이 없다면 위 정보로 회원가입하세요
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
