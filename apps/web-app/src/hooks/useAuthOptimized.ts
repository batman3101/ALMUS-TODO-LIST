import { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '../utils/logger';
import { supabase } from '@/lib/supabase-client.ts';
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

// Cache for session data
let sessionCache: { user: AuthUser | null; timestamp: number } | null = null;
const CACHE_DURATION = 60000; // 1 minute cache

export const useAuthOptimized = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Optimized user profile creation
  const createAuthUser = useCallback((authUser: any): AuthUser => {
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
      avatar: authUser.user_metadata?.avatar_url || null,
      photoURL: authUser.user_metadata?.avatar_url || null,
      teamId: 'default-team',
      projectIds: [],
      last_login_at: new Date().toISOString(),
      created_at: authUser.created_at,
      updated_at: new Date().toISOString(),
      createdAt: new Date(authUser.created_at),
      updatedAt: new Date(),
    };
  }, []);

  // Check cache first, then make API call
  const getCachedSession = useCallback(async () => {
    const now = Date.now();

    // Return cached data if still valid
    if (sessionCache && now - sessionCache.timestamp < CACHE_DURATION) {
      logger.info('Using cached session data');
      return sessionCache.user;
    }

    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        logger.error('Session error:', error);
        setError(error.message);
        return null;
      }

      if (session?.user) {
        const user = createAuthUser(session.user);
        sessionCache = { user, timestamp: now };
        return user;
      }

      sessionCache = { user: null, timestamp: now };
      return null;
    } catch (err) {
      logger.error('Get session error:', err);
      throw err;
    }
  }, [createAuthUser]);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;
    let authListener: any;

    // Aggressive timeout for 3-second target
    timeoutId = setTimeout(() => {
      if (isMounted) {
        logger.warn('Auth initialization timeout - proceeding with null user');
        setUser(null);
        setLoading(false);
      }
    }, 2500); // 2.5 seconds to leave buffer for UI updates

    const initializeAuth = async () => {
      try {
        const cachedUser = await getCachedSession();

        if (isMounted) {
          setUser(cachedUser);
          setLoading(false);
          clearTimeout(timeoutId);
        }
      } catch (err) {
        logger.error('Auth initialization error:', err);
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : '인증 오류가 발생했습니다.'
          );
          setLoading(false);
          clearTimeout(timeoutId);
        }
      }
    };

    // Set up optimized auth state listener
    authListener = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      try {
        logger.info('Auth state changed:', event);

        if (event === 'SIGNED_IN' && session?.user) {
          const user = createAuthUser(session.user);
          // Update cache
          sessionCache = { user, timestamp: Date.now() };
          setUser(user);
        } else if (event === 'SIGNED_OUT') {
          // Clear cache
          sessionCache = null;
          setUser(null);
        }

        // Clear timeout on any auth state change
        clearTimeout(timeoutId);
        setLoading(false);
      } catch (err) {
        logger.error('Auth state change error:', err);
        setError(
          err instanceof Error
            ? err.message
            : '인증 상태 변경 오류가 발생했습니다.'
        );
      }
    });

    // Initialize
    initializeAuth();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (authListener?.data?.subscription) {
        authListener.data.subscription.unsubscribe();
      }
    };
  }, [getCachedSession, createAuthUser]);

  const signIn = useCallback(async (email: string, password: string) => {
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

      // Clear cache to force refresh
      sessionCache = null;

      return data;
    } catch (err: any) {
      // Optimized error handling
      const errorMap: Record<string, string> = {
        'Invalid login credentials':
          '이메일 또는 비밀번호가 올바르지 않습니다.',
        'Invalid email format': '올바른 이메일 형식이 아닙니다.',
        'Too many requests':
          '너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.',
        'Network error': '네트워크 연결을 확인해주세요.',
        'User not confirmed':
          '이메일 인증이 필요합니다. 이메일을 확인해주세요.',
        'Email not confirmed':
          '이메일 인증이 필요합니다. 이메일을 확인해주세요.',
      };

      const errorMessage =
        errorMap[err.message] || err.message || '로그인에 실패했습니다.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, name?: string) => {
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

        return data;
      } catch (err: any) {
        const errorMap: Record<string, string> = {
          'User already registered': '이미 사용 중인 이메일입니다.',
          'Password should be at least':
            '비밀번호가 너무 약합니다. 6자 이상 입력해주세요.',
          'Invalid email format': '올바른 이메일 형식이 아닙니다.',
          'Signup is disabled': '현재 회원가입이 비활성화되어 있습니다.',
        };

        const errorMessage =
          errorMap[err.message] || err.message || '회원가입에 실패했습니다.';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      setError(null);
      sessionCache = null; // Clear cache
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
  }, []);

  const updateUser = useCallback(
    async (updates: Partial<AuthUser>): Promise<void> => {
      if (!user) throw new Error('사용자가 로그인되어 있지 않습니다');

      try {
        const supabaseUpdates: any = {
          updated_at: new Date().toISOString(),
        };

        // Map fields to Supabase schema
        Object.entries(updates).forEach(([key, value]) => {
          if (
            value !== undefined &&
            ['current_team_id', 'name', 'role', 'is_active', 'avatar'].includes(
              key
            )
          ) {
            supabaseUpdates[key] = value;
          }
        });

        const { error } = await supabase
          .from('users')
          .update(supabaseUpdates)
          .eq('id', user.id);

        if (error) {
          throw error;
        }

        // Update local state and cache
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        if (sessionCache) {
          sessionCache.user = updatedUser;
        }
      } catch (error) {
        logger.error('사용자 정보 업데이트 실패:', error);
        throw new Error('사용자 정보 업데이트에 실패했습니다.');
      }
    },
    [user]
  );

  // Memoized computed values
  const authState = useMemo(
    () => ({
      isAuthenticated: !!user,
      isAdmin: user?.role === 'ADMIN',
      isEditor: user?.role === 'EDITOR' || user?.role === 'ADMIN',
      isViewer:
        user?.role === 'VIEWER' ||
        user?.role === 'EDITOR' ||
        user?.role === 'ADMIN',
    }),
    [user]
  );

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    logout,
    updateUser,
    ...authState,
  };
};

// Clear cache utility
export const clearAuthCache = () => {
  sessionCache = null;
};
