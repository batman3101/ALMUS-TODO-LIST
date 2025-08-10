# 🔧 환경설정 파일 관리 가이드

## 📁 파일 구조 및 역할

### 환경설정 파일들
```
apps/web-app/
├── .env.local              # 👤 개발용 (실제 키, Git 무시)
├── .env.example           # 📝 개발용 템플릿 (Git 포함)
├── .env.vercel.example    # 🚀 배포용 템플릿 (Git 포함)
└── .gitignore             # 🔒 보안 파일 목록
```

## 🔐 보안 원칙

### ✅ Git에 포함되는 파일 (안전)
- `.env.example` - 개발용 템플릿 (샘플 값만)
- `.env.vercel.example` - 배포용 템플릿 (샘플 값만)
- `.gitignore` - 무시할 파일 목록

### ❌ Git에서 제외되는 파일 (실제 키 포함)
- `.env.local` - 개발환경 실제 설정
- `.env` - 모든 환경의 실제 설정
- `.env.production` - 프로덕션 실제 설정

## 📋 설정 방법

### 1. 개발환경 설정
```bash
# 1. 템플릿 파일을 실제 설정 파일로 복사
cp .env.example .env.local

# 2. .env.local 파일 편집하여 실제 값 입력
# (Supabase URL, API 키 등)
```

### 2. Vercel 배포 설정
1. **Vercel Dashboard** 접속
2. **프로젝트** → **Settings** → **Environment Variables**
3. `.env.vercel.example`의 변수들을 참고하여 실제 값 입력

## 🎯 환경별 변수 예시

### 개발환경 (.env.local)
```bash
# 개발용 Supabase 프로젝트
VITE_SUPABASE_URL=https://dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=dev_key_here
VITE_APP_ENV=development
VITE_ENABLE_DEV_TOOLS=true
```

### 프로덕션 (Vercel Dashboard)
```bash
# 프로덕션 Supabase 프로젝트
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=prod_key_here
VITE_APP_ENV=production
VITE_ENABLE_DEV_TOOLS=false
```

## 🚨 보안 체크리스트

### 배포 전 필수 확인
- [ ] `.env.local` 파일이 `.gitignore`에 포함되어 있는가?
- [ ] 실제 API 키가 Git 히스토리에 없는가?
- [ ] 템플릿 파일들만 Git에 포함되어 있는가?
- [ ] Vercel에서 프로덕션용 변수가 올바르게 설정되었는가?

### Git 히스토리 정리 (필요시)
```bash
# 만약 이전에 실제 키가 커밋되었다면
git filter-branch --force --index-filter \
'git rm --cached --ignore-unmatch .env' \
--prune-empty --tag-name-filter cat -- --all

# 원격 저장소에 강제 푸시 (주의!)
git push origin --force --all
```

## 🔄 팀 협업 워크플로우

### 새 팀원 온보딩
1. **저장소 클론**
   ```bash
   git clone <repository-url>
   cd almus-todo-list/apps/web-app
   ```

2. **개발 환경 설정**
   ```bash
   cp .env.example .env.local
   # .env.local 파일에서 실제 값 입력
   ```

3. **의존성 설치 및 실행**
   ```bash
   npm install
   npm run dev
   ```

### 환경별 Supabase 프로젝트 분리 (권장)

#### 개발환경
- **프로젝트명**: almus-todo-dev
- **URL**: https://dev-xyz.supabase.co
- **용도**: 로컬 개발, 테스트 데이터

#### 프로덕션
- **프로젝트명**: almus-todo-prod  
- **URL**: https://prod-abc.supabase.co
- **용도**: 실제 서비스, 실사용자 데이터

## 🛠️ 트러블슈팅

### 문제: "환경 변수를 찾을 수 없음"
```bash
# 해결 방법
1. .env.local 파일 존재 확인
2. VITE_ 접두사 확인
3. 개발 서버 재시작
```

### 문제: "Supabase 연결 실패"
```bash
# 해결 방법
1. URL 끝에 슬래시(/) 제거 확인
2. API 키 공백 문자 제거 확인
3. Supabase 프로젝트 일시정지 상태 확인
```

### 문제: "빌드 시 환경 변수 누락"
```bash
# Vercel 배포 시 확인사항
1. Environment Variables 섹션에서 설정 확인
2. Production/Preview/Development 모든 환경에 설정
3. 변수명 오타 확인 (VITE_ 접두사 필수)
```

## 📞 지원 및 문의

환경 설정 관련 문제가 있으면:
1. 이 문서의 트러블슈팅 섹션 확인
2. `.gitignore` 설정이 올바른지 확인  
3. 팀 내 개발환경 담당자에게 문의

---
**문서 버전**: 1.0  
**마지막 업데이트**: 2025년 1월  
**보안 검토**: 완료