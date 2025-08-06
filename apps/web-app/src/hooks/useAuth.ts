import { useState, useEffect } from 'react';
import { logger } from '../utils/logger';
import { supabase } from '../../../../lib/supabase/client';
import type { User } from '../../../../libs/shared-types/src/supabase-schema';

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

    // Add timeout protection (10 seconds max)
    timeoutId = setTimeout(() => {
      if (isMounted) {
        logger.warn('Auth initialization timeout - setting loading to false');
        setLoading(false);
      }
    }, 10000);

    const getSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          logger.error('Session error:', error);
          setError(error.message);
          return;
        }

        if (session?.user && isMounted) {
          await loadUserProfile(session.user.id);
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

    const loadUserProfile = async (_userId: string) => {
      try {
        // Supabase Auth에서 사용자 정보 가져오기
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser && isMounted) {
          // Auth 정보만 사용하여 AuthUser 객체 생성
          const user: AuthUser = {
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
          setUser(user);
        }
      } catch (err) {
        logger.error('Load user profile error:', err);
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : '사용자 정보 로딩 오류가 발생했습니다.'
          );
        }
      }
    };

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      try {
        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserProfile(session.user.id);
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
