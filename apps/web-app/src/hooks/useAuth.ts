import { useState, useEffect } from 'react';
import { logger } from '../utils/logger';
import { supabase } from '../lib/supabase-client';
import {
  testSupabaseConnection,
  validateSupabaseConfig,
} from '../lib/supabase-connection-test';
import type { User } from '../../../libs/shared-types/src/supabase-schema';

export interface AuthUser extends User {
  // Compatibility aliases for existing code
  uid: string; // alias for id
  displayName: string | null; // alias for name
  photoURL: string | null; // alias for avatar
  teamId: string; // legacy field, maps to current_team_id
  projectIds: string[]; // derived from user's projects
  lastLoginAt?: Date; // parsed from last_login_at
  createdAt: Date; // parsed from created_at
  updatedAt: Date; // parsed from updated_at
}

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    // Add timeout protection with exponential backoff
    const INITIAL_TIMEOUT = 3000; // 3초로 단축
    const setTimeoutWithRetry = (attempt = 0) => {
      const timeout = INITIAL_TIMEOUT * Math.pow(1.5, attempt); // 지수 백오프
      timeoutId = setTimeout(() => {
        if (isMounted && attempt < 2) {
          logger.warn(`Auth initialization timeout - retry ${attempt + 1}/2`);
          clearTimeout(timeoutId);
          setTimeoutWithRetry(attempt + 1);
          getSession(attempt + 1);
        } else if (isMounted) {
          logger.error('Auth initialization failed after retries');
          setError(
            '인증 서버 연결에 실패했습니다. 네트워크를 확인하고 페이지를 새로고침해주세요.'
          );
          setLoading(false);
        }
      }, timeout);
    };

    setTimeoutWithRetry();

    const getSession = async (retryCount = 0) => {
      try {
        logger.info('Attempting to get session...', { retryCount });

        // 첫 번째 시도에서만 연결 상태 검사
        if (retryCount === 0) {
          const configValidation = validateSupabaseConfig();
          if (!configValidation.isValid) {
            logger.error('Supabase 설정 오류:', configValidation.issues);
            setError(`설정 오류: ${configValidation.issues.join(', ')}`);
            return;
          }

          const connectionTest = await testSupabaseConnection();
          if (!connectionTest.isConnected) {
            logger.error('Supabase 연결 실패:', connectionTest.error);
            setError(
              connectionTest.error || '데이터베이스에 연결할 수 없습니다.'
            );
            return;
          }

          logger.info('Supabase 연결 테스트 성공');
        }

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          logger.error('Session error:', error);

          // 네트워크 오류인 경우 재시도
          if (
            retryCount < 2 &&
            (error.message.includes('Network') ||
              error.message.includes('Failed to fetch') ||
              error.message.includes('timeout'))
          ) {
            logger.warn(`Retrying session request (${retryCount + 1}/2)...`);
            setTimeout(
              () => getSession(retryCount + 1),
              1000 * (retryCount + 1)
            );
            return;
          }

          setError(error.message);
          return;
        }

        if (session?.user && isMounted) {
          // 헬퍼 함수로 사용자 정보 생성
          const user = createAuthUser(session.user);
          setUser(user);
        } else if (isMounted) {
          setUser(null);
        }
      } catch (err) {
        logger.error('Get session error:', err);
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : '인증 오류가 발생했습니다.'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          clearTimeout(timeoutId);
        }
      }
    };

    // loadUserProfile 함수를 제거하고 사용자 정보를 직접 생성하는 헬퍼 함수로 대체
    const createAuthUser = (authUser: any): AuthUser => {
      return {
        id: authUser.id,
        uid: authUser.id,
        email: authUser.email!,
        name:
          authUser.user_metadata?.name ||
          authUser.email?.split('@')[0] ||
          '사용자',
        displayName:
          authUser.user_metadata?.name ||
          authUser.email?.split('@')[0] ||
          '사용자',
        role: 'VIEWER' as const,
        is_active: true,
        current_team_id: null,
        avatar: null,
        photoURL: null,
        teamId: 'default-team',
        projectIds: [],
        last_login_at: new Date().toISOString(),
        created_at: authUser.created_at,
        updated_at: new Date().toISOString(),
        createdAt: new Date(authUser.created_at),
        updatedAt: new Date(),
      };
    };

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      try {
        if (event === 'SIGNED_IN' && session?.user) {
          // 헬퍼 함수로 사용자 정보 생성
          const user = createAuthUser(session.user);
          setUser(user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      } catch (err) {
        logger.error('Auth state change error:', err);
        setError(
          err instanceof Error
            ? err.message
            : '인증 상태 변경 오류가 발생했습니다.'
        );
      }
    });

    // Get initial session
    getSession();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // public.users 테이블 업데이트 제거 - Supabase Auth만 사용

      return data;
    } catch (err: any) {
      // Supabase 오류 메시지를 한국어로 변환
      let errorMessage = '로그인에 실패했습니다.';

      if (err.message) {
        if (err.message.includes('Invalid login credentials')) {
          errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
        } else if (err.message.includes('Invalid email format')) {
          errorMessage = '올바른 이메일 형식이 아닙니다.';
        } else if (err.message.includes('Too many requests')) {
          errorMessage =
            '너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
        } else if (err.message.includes('Network error')) {
          errorMessage = '네트워크 연결을 확인해주세요.';
        } else if (err.message.includes('User not confirmed')) {
          errorMessage = '이메일 인증이 필요합니다. 이메일을 확인해주세요.';
        } else if (err.message.includes('Email not confirmed')) {
          errorMessage = '이메일 인증이 필요합니다. 이메일을 확인해주세요.';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      setError(null);
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || '사용자',
          },
        },
      });

      if (error) {
        throw error;
      }

      // Supabase auth will trigger the database trigger to create user profile
      // The trigger function will handle user creation in the users table

      return data;
    } catch (err: any) {
      let errorMessage = '회원가입에 실패했습니다.';

      if (err.message) {
        if (err.message.includes('User already registered')) {
          errorMessage = '이미 사용 중인 이메일입니다.';
        } else if (err.message.includes('Password should be at least')) {
          errorMessage = '비밀번호가 너무 약합니다. 6자 이상 입력해주세요.';
        } else if (err.message.includes('Invalid email format')) {
          errorMessage = '올바른 이메일 형식이 아닙니다.';
        } else if (err.message.includes('Signup is disabled')) {
          errorMessage = '현재 회원가입이 비활성화되어 있습니다.';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '로그아웃에 실패했습니다.';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateUser = async (updates: Partial<AuthUser>): Promise<void> => {
    if (!user) throw new Error('사용자가 로그인되어 있지 않습니다');

    try {
      const supabaseUpdates: any = {
        updated_at: new Date().toISOString(),
      };

      // 업데이트할 필드들을 Supabase 스키마에 맞게 변환
      if (updates.current_team_id !== undefined) {
        supabaseUpdates.current_team_id = updates.current_team_id;
      }
      if (updates.name !== undefined) {
        supabaseUpdates.name = updates.name;
      }
      if (updates.role !== undefined) {
        supabaseUpdates.role = updates.role;
      }
      if (updates.is_active !== undefined) {
        supabaseUpdates.is_active = updates.is_active;
      }
      if (updates.avatar !== undefined) {
        supabaseUpdates.avatar = updates.avatar;
      }

      const { error } = await supabase
        .from('users')
        .update(supabaseUpdates)
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      // 로컬 상태 업데이트
      setUser(prev => (prev ? { ...prev, ...updates } : null));
    } catch (error) {
      logger.error('사용자 정보 업데이트 실패:', error);
      throw new Error('사용자 정보 업데이트에 실패했습니다.');
    }
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'ADMIN';
  const isEditor = user?.role === 'EDITOR' || user?.role === 'ADMIN';
  const isViewer =
    user?.role === 'VIEWER' ||
    user?.role === 'EDITOR' ||
    user?.role === 'ADMIN';

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    logout,
    updateUser,
    isAuthenticated,
    isAdmin,
    isEditor,
    isViewer,
  };
};
