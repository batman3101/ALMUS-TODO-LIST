import { createClient } from '@supabase/supabase-js'

// Supabase 설정
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 환경 변수 확인
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ 환경 변수가 설정되지 않았습니다. Mock 모드로 실행합니다.')
}

// 실제 Supabase가 설정되어 있는지 확인 (프로젝트에 접근 가능한지)
const hasValidSupabase = supabaseUrl && supabaseAnonKey && 
  supabaseUrl !== 'https://your-project-id.supabase.co' && 
  supabaseAnonKey !== 'your-anon-key-here' &&
  supabaseUrl !== 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_supabase_anon_key'

let supabase: any
let createServerClient: any

if (hasValidSupabase) {
  console.log('🔗 Supabase 연결:', supabaseUrl)
  
  // 실제 Supabase client
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  })

  createServerClient = () => {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }
} else {
  console.log('🔧 Mock 모드: Supabase가 설정되지 않아 Mock 데이터를 사용합니다.')
  console.log('📖 실제 Supabase 설정 방법: SUPABASE_SETUP_GUIDE.md 파일을 참고하세요.')
  
  // Mock 사용자 데이터
  const mockUser = {
    id: '1',
    email: 'demo@example.com',
    created_at: new Date().toISOString(),
    user_metadata: { name: 'Demo User' }
  }
  
  // Mock Supabase client
  supabase = {
    auth: {
      getSession: async () => ({ 
        data: { 
          session: { 
            user: mockUser
          } 
        }, 
        error: null 
      }),
      getUser: async () => ({
        data: { user: mockUser },
        error: null
      }),
      signInWithPassword: async ({ email, password }: any) => {
        // 간단한 데모 로그인 (모든 이메일/비밀번호 허용)
        if (email && password) {
          return { 
            data: { 
              user: { ...mockUser, email }, 
              session: { user: { ...mockUser, email } } 
            }, 
            error: null 
          }
        }
        return {
          data: null,
          error: { message: '이메일과 비밀번호를 입력해주세요.' }
        }
      },
      signUp: async ({ email, password }: any) => ({ 
        data: { 
          user: { ...mockUser, email }, 
          session: { user: { ...mockUser, email } } 
        }, 
        error: null 
      }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: (callback: any) => {
        // 초기 인증 상태 전달
        setTimeout(() => callback('SIGNED_IN', { 
          user: mockUser
        }), 100)
        return { 
          data: { subscription: { unsubscribe: () => {} } }
        }
      }
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: { code: 'PGRST116' } })
        }),
        then: async () => ({ data: [], error: null })
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({ 
            data: { 
              id: Date.now().toString(), 
              name: '데모 팀',
              owner_id: mockUser.id,
              created_at: new Date().toISOString()
            }, 
            error: null 
          })
        })
      })
    })
  } as any

  createServerClient = () => supabase
}

export { supabase, createServerClient }