# ALMUS ToDo List - Vercel 배포 가이드

## 🚀 배포 준비

### 1. 환경 변수 설정

#### Vercel Dashboard에서 설정해야 할 환경 변수:

```bash
# Supabase 설정
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# 앱 설정
VITE_APP_NAME=ALMUS ToDo List
VITE_APP_VERSION=1.0.0
VITE_APP_ENV=production

# 파일 업로드 설정 (선택사항)
VITE_MAX_FILE_SIZE_MB=10
VITE_ALLOWED_FILE_TYPES=pdf,doc,docx,xls,xlsx,jpg,jpeg,png,gif
```

#### 환경 변수 설정 방법:
1. Vercel Dashboard → 프로젝트 선택
2. **Settings** 탭 → **Environment Variables**
3. 위의 환경 변수들을 **Production**, **Preview**, **Development** 환경 모두에 추가

### 2. Supabase 설정

#### Database 스키마 설정:
1. Supabase Dashboard → **SQL Editor**에서 다음 SQL 실행:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR NOT NULL UNIQUE,
  name VARCHAR,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams table  
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id),
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members table
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL DEFAULT 'MEMBER',
  status VARCHAR NOT NULL DEFAULT 'ACTIVE',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by UUID REFERENCES users(id)
);

-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR NOT NULL,
  description TEXT,
  status VARCHAR NOT NULL DEFAULT 'TODO',
  priority VARCHAR NOT NULL DEFAULT 'MEDIUM',
  assignee_id UUID REFERENCES users(id),
  team_id UUID REFERENCES teams(id),
  project_id UUID,
  created_by UUID REFERENCES users(id),
  start_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  dependencies UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- File metadata table
CREATE TABLE file_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR NOT NULL,
  file_path VARCHAR NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  project_id UUID,
  team_id UUID REFERENCES teams(id),
  uploaded_by UUID REFERENCES users(id),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Supabase Storage 설정:
1. **Storage** → **Create Bucket** → 이름: `files`
2. **Policies** 설정:
   - **INSERT**: 인증된 사용자만
   - **SELECT**: 팀 멤버만
   - **UPDATE**: 파일 업로더만
   - **DELETE**: 파일 업로더만

#### Authentication 설정:
1. **Authentication** → **Settings**
2. **Site URL**: `https://your-app-domain.vercel.app`
3. **Redirect URLs** 추가:
   - `https://your-app-domain.vercel.app`
   - `https://your-app-domain.vercel.app/auth/callback`

### 3. Vercel 배포

#### 방법 1: GitHub 연동 (권장)

1. **GitHub Repository 연동**:
   ```bash
   # Repository를 GitHub에 Push
   git add .
   git commit -m "배포 준비 완료"
   git push origin main
   ```

2. **Vercel 프로젝트 생성**:
   - [Vercel Dashboard](https://vercel.com/dashboard) 접속
   - **New Project** → GitHub Repository 선택
   - **Framework Preset**: `Vite`
   - **Root Directory**: `apps/web-app`

3. **빌드 설정**:
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "installCommand": "npm install",
     "devCommand": "npm run dev"
   }
   ```

#### 방법 2: Vercel CLI 사용

```bash
# Vercel CLI 설치
npm i -g vercel

# 프로젝트 디렉토리로 이동
cd "C:\WORK\app_management\ALMUS ToDo List\apps\web-app"

# 배포 실행
vercel

# 프로덕션 배포
vercel --prod
```

### 4. 도메인 설정 (선택사항)

1. **Vercel Dashboard** → **Domains**
2. **Add Domain** → 사용할 도메인 입력
3. DNS 설정:
   - A Record: 76.76.19.61
   - CNAME Record: cname.vercel-dns.com

### 5. 성능 최적화 설정

#### `vercel.json` 설정:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options", 
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

## 🔧 배포 후 확인사항

### 1. 기능 테스트
- [ ] 사용자 로그인/로그아웃
- [ ] 팀 생성 및 멤버 초대
- [ ] 태스크 CRUD 기능
- [ ] 파일 업로드/다운로드
- [ ] 다국어 지원 (한국어/베트남어)
- [ ] 다크모드/라이트모드

### 2. 성능 확인
- [ ] 초기 로딩 속도 (3초 이내)
- [ ] Lighthouse 스코어 (Performance 80+ 권장)
- [ ] 번들 크기 확인 (메인 청크 600KB 이하)

### 3. 보안 확인
- [ ] HTTPS 연결 확인
- [ ] CSP 헤더 설정 확인
- [ ] API 키 노출 여부 확인

## 📊 모니터링 및 유지보수

### 1. Vercel Analytics
```bash
# Vercel Analytics 설치
npm install @vercel/analytics
```

### 2. 에러 모니터링
- Vercel Functions → Error Logs 확인
- Supabase Dashboard → Logs 모니터링

### 3. 정기 업데이트
- 월 1회: 의존성 업데이트
- 주 1회: Supabase 백업 확인
- 일 1회: 서비스 상태 확인

## 🆘 트러블슈팅

### 빌드 실패
```bash
# 로컬에서 빌드 테스트
npm run build

# 의존성 재설치
rm -rf node_modules package-lock.json
npm install
```

### 환경 변수 오류
1. Vercel Dashboard에서 환경 변수 재확인
2. 변수명 오타 확인 (`VITE_` 접두사 필수)
3. 특수문자가 포함된 값은 따옴표로 감싸기

### Supabase 연결 오류
1. Supabase 프로젝트 일시정지 상태 확인
2. API 키 만료 여부 확인
3. RLS(Row Level Security) 정책 확인

## 📞 지원

문제가 발생하면 다음 순서로 확인:
1. 이 가이드의 트러블슈팅 섹션
2. Vercel 공식 문서: https://vercel.com/docs
3. Supabase 공식 문서: https://supabase.com/docs

---
**마지막 업데이트**: 2025년 1월
**작성자**: Claude Code Assistant