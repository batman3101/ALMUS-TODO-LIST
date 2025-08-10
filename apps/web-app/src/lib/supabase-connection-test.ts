import { supabase } from './supabase-client';

/**
 * Supabase 데이터베이스 연결 상태를 테스트하는 함수
 */
export async function testSupabaseConnection(): Promise<{
  isConnected: boolean;
  error?: string;
  details?: any;
}> {
  try {
    console.log('🔍 Supabase 연결 테스트를 시작합니다...');

    // 1. Auth 상태 확인
    const authTest = await supabase.auth.getSession();
    console.log('✓ Auth 세션 확인:', authTest.error ? '실패' : '성공');

    // 2. 기본 데이터베이스 연결 테스트 (RLS 정책 우회)
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (testError) {
      console.log('❌ 데이터베이스 연결 실패:', testError.message);

      // RLS 정책 문제인지 확인
      if (testError.message.includes('infinite recursion')) {
        return {
          isConnected: false,
          error:
            'RLS 정책에 순환 참조 문제가 있습니다. 데이터베이스 관리자에게 문의하세요.',
          details: testError,
        };
      }

      // 권한 문제인지 확인
      if (
        testError.message.includes('permission denied') ||
        testError.message.includes('RLS')
      ) {
        return {
          isConnected: false,
          error:
            '데이터베이스 접근 권한이 없습니다. 인증 후 다시 시도해 주세요.',
          details: testError,
        };
      }

      return {
        isConnected: false,
        error: `데이터베이스 연결 오류: ${testError.message}`,
        details: testError,
      };
    }

    console.log('✅ 데이터베이스 연결 성공');
    return {
      isConnected: true,
    };
  } catch (error: any) {
    console.log('❌ 연결 테스트 중 예외 발생:', error.message);
    return {
      isConnected: false,
      error: `연결 테스트 실패: ${error.message}`,
      details: error,
    };
  }
}

/**
 * Supabase URL과 키의 유효성을 검사하는 함수
 */
export function validateSupabaseConfig(): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url) {
    issues.push('VITE_SUPABASE_URL 환경변수가 설정되지 않았습니다.');
  } else if (url === 'https://your-project-id.supabase.co') {
    issues.push(
      'VITE_SUPABASE_URL이 기본값입니다. 실제 Supabase 프로젝트 URL로 변경하세요.'
    );
  } else if (!url.includes('supabase.co')) {
    issues.push('VITE_SUPABASE_URL 형식이 올바르지 않습니다.');
  }

  if (!key) {
    issues.push('VITE_SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다.');
  } else if (key.includes('your_supabase_anon_key')) {
    issues.push(
      'VITE_SUPABASE_ANON_KEY가 기본값입니다. 실제 Supabase anon key로 변경하세요.'
    );
  } else if (!key.startsWith('eyJ')) {
    issues.push('VITE_SUPABASE_ANON_KEY 형식이 올바르지 않습니다.');
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * 데이터베이스 마이그레이션 상태를 확인하는 함수
 */
export async function checkDatabaseMigrations(): Promise<{
  isReady: boolean;
  missingTables: string[];
}> {
  const requiredTables = [
    'users',
    'teams',
    'team_members',
    'projects',
    'tasks',
  ];
  const missingTables: string[] = [];

  for (const table of requiredTables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(0);

      if (error && error.message.includes('does not exist')) {
        missingTables.push(table);
      }
    } catch (error) {
      missingTables.push(table);
    }
  }

  return {
    isReady: missingTables.length === 0,
    missingTables,
  };
}
