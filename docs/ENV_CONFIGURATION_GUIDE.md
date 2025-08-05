# 환경변수 설정 가이드

## 목차
1. [Supabase 설정 (필수)](#supabase-설정-필수)
2. [Application 설정](#application-설정)
3. [선택사항 기능들](#선택사항-기능들)
4. [모니터링 & 분석](#모니터링--분석)
5. [프로덕션 설정](#프로덕션-설정)

---

## Supabase 설정 (필수)

### 1. VITE_SUPABASE_URL / SUPABASE_URL
**현재 값**: `https://your-project-id.supabase.co`  
**어디서 가져오나?**

1. [Supabase Dashboard](https://app.supabase.com) 접속
2. 프로젝트 선택
3. 좌측 메뉴 → **Settings** → **API**
4. **Project URL** 섹션에서 URL 복사

```
예시: https://plbjsfmrneeyucqrmill.supabase.co
```

### 2. VITE_SUPABASE_ANON_KEY / SUPABASE_ANON_KEY
**현재 값**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ...`  
**어디서 가져오나?**

1. Supabase Dashboard → Settings → API
2. **Project API keys** 섹션
3. **anon** 키의 **public** 키 복사

```
예시: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSI...
```

⚠️ **중요**: anon 키는 브라우저에 노출되어도 안전합니다.

### 3. SUPABASE_SERVICE_ROLE_KEY
**현재 값**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ...`  
**어디서 가져오나?**

1. Supabase Dashboard → Settings → API
2. **Project API keys** 섹션
3. **service_role** 키의 **secret** 키 복사

```
예시: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSI...
```

🚨 **경고**: Service Role 키는 절대 브라우저에 노출하면 안 됩니다! (`VITE_` 접두사 사용 금지)

### 4. DATABASE_URL (선택사항)
**현재 값**: `postgresql://postgres.plbjsfmrneeyucqrmill:password@aws-0-[region].pooler.supabase.com:5432/postgres`  
**어디서 가져오나?**

1. Supabase Dashboard → Settings → **Database**
2. **Connection string** 섹션
3. **URI** 탭에서 연결 문자열 복사
4. `[YOUR-PASSWORD]`를 실제 데이터베이스 비밀번호로 교체

```
예시: postgresql://postgres.abc123:your_password@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

---

## Application 설정

### 5. NODE_ENV
**현재 값**: `development`  
**설정 방법**: 수동 설정

- **개발**: `development`
- **테스트**: `test`  
- **프로덕션**: `production`

### 6. VITE_API_BASE_URL
**현재 값**: `http://localhost:3001/api`  
**설정 방법**: 환경에 따라 설정

- **개발**: `http://localhost:3001/api`
- **프로덕션**: `https://api.your-domain.com/api`

### 7. VITE_WEBSOCKET_URL
**현재 값**: `ws://localhost:3001`  
**설정 방법**: 환경에 따라 설정

- **개발**: `ws://localhost:3001`
- **프로덕션**: `wss://ws.your-domain.com`

---

## 선택사항 기능들 (현재 사용하지 않음)

### 8. VITE_GOOGLE_TRANSLATE_API_KEY (다국어 지원)
**현재 상태**: ❌ 사용하지 않음 (translation.ts 파일 제거됨)

### 9. VITE_ANALYTICS_ID (Google Analytics)
**현재 상태**: ❌ 사용하지 않음 (코드에서 사용되지 않음)

---

## Development Tools

### 11. VITE_ENABLE_DEVTOOLS
**현재 값**: `true`  
**설정 방법**: 수동 설정

- **개발**: `true` (React Query Devtools 활성화)
- **프로덕션**: `false` (성능상 비활성화)

---

## Security & Performance

### 12. RATE_LIMIT_MAX / RATE_LIMIT_WINDOW
**현재 값**: `100` / `900000`  
**설정 방법**: 수동 설정

- **RATE_LIMIT_MAX**: 시간 창당 최대 요청 수
- **RATE_LIMIT_WINDOW**: 시간 창 (밀리초)

```
예시: 15분간 100회 요청 제한
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000  # 15분 = 15 * 60 * 1000ms
```

---

## 프로덕션 설정 예시

```env
# 프로덕션 환경 설정
NODE_ENV=production
VITE_API_BASE_URL=https://api.almus-todo.com
VITE_WEBSOCKET_URL=wss://ws.almus-todo.com
VITE_ENABLE_DEVTOOLS=false

# Supabase (실제 값 사용)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=실제_anon_키
SUPABASE_SERVICE_ROLE_KEY=실제_service_role_키

# 선택사항 (현재 사용하지 않음)
# VITE_GOOGLE_TRANSLATE_API_KEY=실제_구글_API_키
# VITE_ANALYTICS_ID=실제_GA_ID
```

---

## 보안 주의사항

### ✅ 브라우저에 노출되어도 안전한 변수 (`VITE_` 접두사)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` 
- `VITE_API_BASE_URL`
- `VITE_WEBSOCKET_URL`
- `VITE_ENABLE_DEVTOOLS`

### 🚨 절대 브라우저에 노출하면 안 되는 변수
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` (비밀번호 포함)

### 파일 보안
- `.env` 파일은 **절대 Git에 커밋하지 마세요**
- `.gitignore`에 `.env` 포함 확인
- 팀원과 공유할 때는 보안 채널 사용

---

## 문제 해결

### Supabase 연결 실패
1. URL과 키가 정확한지 확인
2. Supabase 프로젝트가 활성화되어 있는지 확인
3. 브라우저 콘솔에서 네트워크 오류 확인

### 환경변수가 적용되지 않을 때
1. 서버 재시작 (`npm run dev`)
2. `VITE_` 접두사 확인
3. `.env` 파일 위치 확인 (프로젝트 루트)

### API 키 관련 오류
1. API 키 활성화 상태 확인
2. 할당량 초과 여부 확인
3. 권한 설정 확인

---

## 빠른 설정 체크리스트

- [ ] Supabase 프로젝트 생성
- [ ] VITE_SUPABASE_URL 복사
- [ ] VITE_SUPABASE_ANON_KEY 복사  
- [ ] SUPABASE_SERVICE_ROLE_KEY 복사
- [ ] .env.example을 .env로 복사
- [ ] 실제 값들로 교체
- [ ] 서버 재시작
- [ ] 로그인 테스트