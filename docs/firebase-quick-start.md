# Firebase 빠른 시작 가이드

## 5분 만에 Firebase 프로젝트 설정하기

### 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력: `almus-todo-list`
4. Google Analytics 설정 (선택사항)
5. "프로젝트 만들기" 클릭

### 2. Firebase CLI 설치 및 설정

```bash
# Firebase CLI 설치
npm install -g firebase-tools

# Google 계정으로 로그인
firebase login

# 프로젝트 초기화
firebase init

# 다음 서비스 선택:
# ✅ Firestore
# ✅ Functions
# ✅ Storage
# ✅ Hosting
# ✅ Emulators
```

### 3. 환경 변수 설정

```bash
# .env 파일 생성
touch .env

# 환경 변수 추가
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

### 4. 보안 규칙 배포

```bash
# Firestore 보안 규칙 배포
firebase deploy --only firestore:rules

# Storage 보안 규칙 배포
firebase deploy --only storage
```

### 5. Functions 배포

```bash
# Functions 빌드
cd functions
npm run build

# Functions 배포
firebase deploy --only functions
```

### 6. 웹 앱 배포

```bash
# 웹 앱 빌드
cd apps/web-app
npm run build

# Hosting 배포
firebase deploy --only hosting
```

## 개발 환경 설정

### 1. Firebase Emulators 실행

```bash
# 모든 에뮬레이터 시작
firebase emulators:start

# 특정 에뮬레이터만 시작
firebase emulators:start --only firestore,functions
```

### 2. 로컬 개발 서버 실행

```bash
# 웹 앱 개발 서버
cd apps/web-app
npm run dev

# Functions 로컬 테스트
cd functions
npm run serve
```

## 테스트 환경 설정

### 1. 테스트 데이터 생성

```bash
# Firestore 테스트 데이터 임포트
firebase firestore:import --data-file=test-data.json

# Storage 테스트 파일 업로드
firebase storage:upload test-files/ storage/test/
```

### 2. 보안 규칙 테스트

```bash
# Firestore 규칙 테스트
firebase firestore:rules:test

# Storage 규칙 테스트
firebase storage:rules:test
```

## 프로덕션 배포

### 1. 사전 체크리스트

- [ ] 모든 테스트 통과
- [ ] 보안 규칙 검증
- [ ] 환경 변수 설정
- [ ] 데이터 백업

### 2. 배포 명령어

```bash
# 전체 배포
firebase deploy

# 단계별 배포
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only storage
firebase deploy --only functions
firebase deploy --only hosting
```

### 3. 배포 후 검증

- [ ] 웹 앱 접속 확인
- [ ] 인증 기능 테스트
- [ ] 데이터베이스 연결 확인
- [ ] Functions 실행 테스트

## 문제 해결

### 일반적인 오류

#### 1. 인증 오류
```bash
# Firebase 재로그인
firebase logout
firebase login
```

#### 2. 배포 실패
```bash
# 캐시 클리어
firebase use --clear
firebase projects:list
firebase use your-project-id
```

#### 3. Functions 오류
```bash
# Functions 로그 확인
firebase functions:log

# Functions 재배포
firebase deploy --only functions
```

## 유용한 명령어

```bash
# 프로젝트 상태 확인
firebase projects:list

# 현재 프로젝트 확인
firebase use

# Functions 로그 확인
firebase functions:log

# Firestore 데이터 내보내기
firebase firestore:export

# Storage 파일 목록
firebase storage:list
```

## 다음 단계

1. [Firebase 마이그레이션 가이드](./firebase-migration-guide.md) 읽기
2. [보안 규칙 가이드](./security-rules.md) 확인
3. [GitHub Actions CI/CD 설정](../.github/workflows/) 구성
4. 모니터링 및 알림 설정

---

**참고**: 이 가이드는 기본적인 Firebase 설정을 위한 것입니다. 프로덕션 환경에서는 추가적인 보안 설정과 모니터링이 필요합니다. 