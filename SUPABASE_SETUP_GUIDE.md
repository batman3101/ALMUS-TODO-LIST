# 🚀 Supabase 설정 가이드

이 가이드를 따라 Supabase 프로젝트를 설정하고 ALMUS Todo List와 연동하세요.

## 1. Supabase 프로젝트 생성

### 1.1 회원가입 및 프로젝트 생성
1. [Supabase 사이트](https://supabase.com)에 접속
2. "Start your project" 클릭 후 GitHub로 로그인
3. "New project" 클릭
4. 다음 정보 입력:
   - **Name**: `almus-todo-list` (원하는 이름)
   - **Database Password**: 안전한 비밀번호 생성
   - **Region**: `Northeast Asia (ap-northeast-1)` 선택 (서울)
   - **Pricing Plan**: 무료 플랜 선택
5. "Create new project" 클릭
6. 프로젝트 생성 완료까지 약 2-3분 대기

### 1.2 프로젝트 정보 확인
프로젝트가 생성되면 다음 정보를 메모해두세요:
- **Project URL**: `https://your-project-id.supabase.co`
- **Project ID**: `your-project-id`

## 2. API 키 확인

### 2.1 API 설정 페이지 이동
1. Supabase Dashboard에서 왼쪽 사이드바의 **"Settings"** 클릭
2. **"API"** 탭 클릭

### 2.2 필요한 키 복사
다음 두 개의 키를 복사하여 메모해두세요:
```
Project URL: https://xxxxxxxxxxxxx.supabase.co
anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 3. 데이터베이스 스키마 설정

### 3.1 SQL Editor 열기
1. Supabase Dashboard에서 **"SQL Editor"** 클릭
2. **"New query"** 버튼 클릭

### 3.2 스키마 생성
다음 SQL 파일들을 순서대로 실행하세요:

#### Step 1: 데이터베이스 스키마 생성
```sql
-- scripts/complete-rls-policies.sql 파일의 내용을 복사하여 실행
```

또는 Supabase Dashboard에서 직접 테이블 생성:

#### **users 테이블**
```sql
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'VIEWER',
    avatar TEXT,
    current_team_id UUID,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **teams 테이블**
```sql
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES public.users(id) NOT NULL,
    member_count INTEGER DEFAULT 1,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **기타 테이블들**
필요에 따라 `database/supabase-schema.sql` 파일의 내용을 참고하여 추가 테이블을 생성하세요.

### 3.3 RLS (Row Level Security) 정책 설정
```sql
-- scripts/complete-rls-policies.sql 파일 내용을 모두 복사하여 실행
```

## 4. 환경 변수 설정

### 4.1 .env 파일 수정
프로젝트 루트의 `.env` 파일을 열고 다음 값들을 실제 값으로 교체:

```bash
# 실제 Supabase 프로젝트 값으로 교체
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4.2 값 교체 예시
```bash
# 예시 (실제 값으로 교체하세요)
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY5NDEyMzQ1NiwiZXhwIjoyMDA5Njk5NDU2fQ.xxxxxxxxxxxxx
```

## 5. 애플리케이션 실행

### 5.1 의존성 설치
```bash
npm install
```

### 5.2 개발 서버 실행
```bash
cd apps/web-app
npm run dev
```

### 5.3 테스트
1. 브라우저에서 `http://localhost:3002` 접속
2. 회원가입 또는 로그인 시도
3. 팀 생성 및 태스크 관리 기능 테스트

## 6. 문제 해결

### 6.1 연결 오류 해결
**오류**: "환경 변수가 설정되지 않았습니다"
```bash
# 해결: .env 파일 확인 및 값 설정
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**오류**: "403 Forbidden" 또는 "RLS policy violation"
```sql
-- 해결: RLS 정책 설정 확인
-- scripts/complete-rls-policies.sql 파일 내용을 Supabase SQL Editor에서 실행
```

### 6.2 인증 문제
**문제**: 로그인이 되지 않음
1. **Authentication** → **Settings** 에서 "Enable email confirmations" 비활성화
2. **Authentication** → **URL Configuration**에서 Site URL 설정:
   ```
   Site URL: http://localhost:3002
   Redirect URLs: http://localhost:3002
   ```

### 6.3 데이터베이스 연결 확인
```sql
-- SQL Editor에서 실행하여 연결 테스트
SELECT 1 as test;
```

## 7. 보안 설정 (선택사항)

### 7.1 인증 설정
1. **Authentication** → **Settings**
2. 다음 설정 권장:
   - **Enable email confirmations**: OFF (개발용)
   - **Enable phone confirmations**: OFF
   - **Enable custom SMTP**: OFF (개발용)

### 7.2 API 설정
1. **Settings** → **API**
2. **Service Role Key**는 절대 프론트엔드에 노출하지 마세요
3. 프로덕션에서는 **Row Level Security** 정책을 반드시 활성화하세요

## 8. 완료 체크리스트

- [ ] Supabase 프로젝트 생성됨
- [ ] API 키 확인 및 복사됨
- [ ] 데이터베이스 스키마 생성됨
- [ ] RLS 정책 적용됨
- [ ] `.env` 파일에 실제 값 설정됨
- [ ] 애플리케이션이 정상 실행됨
- [ ] 회원가입/로그인 가능
- [ ] 팀 생성 및 태스크 관리 가능

---

## 🎉 설정 완료!

이제 ALMUS Todo List를 실제 Supabase 데이터베이스와 함께 사용할 수 있습니다.

추가 도움이 필요하시면:
- [Supabase 공식 문서](https://supabase.com/docs)
- [프로젝트 이슈 트래커](https://github.com/your-repo/issues)