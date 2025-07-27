# Firebase 문제 해결 가이드

## 🚨 즉시 확인해야 할 중요 문제들

### ⚠️ 환경 변수 설정 오류

가장 흔한 연결 실패 원인입니다.

```bash
# 환경 변수 검증
echo $VITE_FIREBASE_API_KEY
echo $VITE_FIREBASE_PROJECT_ID

# 모든 필수 환경 변수 확인
npm run check-env
```

**증상:**

- Firebase 초기화 실패
- "Project not found" 오류
- Authentication 연결 실패

**해결방법:**

1. `.env` 파일에 모든 `VITE_` 접두사 확인
2. 더미 값 (`your-api-key` 등) 실제 값으로 교체
3. Firebase Console에서 정확한 config 값 복사

### 🔥 Firestore 인덱스 누락 (Critical)

**가장 중요한 문제 - 즉시 해결 필요**

```bash
# 현재 상태 확인
firebase firestore:indexes

# 인덱스 배포 (필수!)
firebase deploy --only firestore:indexes
```

**증상:**

```
Error: The query requires an index that is not defined
FAILED_PRECONDITION: The query requires an index
```

**즉시 적용해야 할 인덱스:**

1. `tasks`: teamId + status + createdAt
2. `team_members`: teamId + isActive
3. `projects`: teamId + status + createdAt
4. `notifications`: userId + isRead + createdAt

### 🛡️ Storage 규칙 불일치

현재 Storage 규칙의 경로가 실제 Firestore 구조와 맞지 않습니다.

**문제:**

```javascript
// 현재 잘못된 경로
firestore.get(/databases/(default)/documents/teams/$(teamId)/members/$(request.auth.uid))

// 올바른 경로
firestore.get(/databases/(default)/documents/team_members/$(teamId + '_' + request.auth.uid))
```

## 일반적인 문제 및 해결 방법

### 1. 인증 관련 문제

#### 문제: Firebase 로그인 실패

```
Error: Authentication failed
```

**해결 방법:**

```bash
# Firebase CLI 재설치
npm uninstall -g firebase-tools
npm install -g firebase-tools

# 브라우저에서 로그인
firebase login --no-localhost

# 또는 토큰 기반 로그인
firebase login:ci --no-localhost
```

#### 문제: 프로젝트 접근 권한 없음

```
Error: Project access denied
```

**해결 방법:**

1. Firebase Console에서 프로젝트 권한 확인
2. 팀 관리자에게 권한 요청
3. 새로운 프로젝트 생성 후 권한 설정

### 2. 배포 관련 문제

#### 문제: Functions 배포 실패

```
Error: Function failed to deploy
```

**해결 방법:**

```bash
# Functions 빌드 오류 확인
cd functions
npm run build

# TypeScript 오류 수정
npm run lint

# 의존성 재설치
rm -rf node_modules package-lock.json
npm install

# 다시 배포
firebase deploy --only functions
```

#### 문제: 보안 규칙 배포 실패

```
Error: Rules deployment failed
```

**해결 방법:**

```bash
# 규칙 문법 확인
firebase firestore:rules:test
firebase storage:rules:test

# 규칙 파일 검증
firebase deploy --only firestore:rules --dry-run
```

#### 문제: Hosting 배포 실패

```
Error: Hosting deployment failed
```

**해결 방법:**

```bash
# 빌드 파일 확인
ls -la apps/web-app/dist

# 빌드 재실행
cd apps/web-app
npm run build

# Hosting 설정 확인
cat firebase.json
```

### 3. 데이터베이스 관련 문제

#### 문제: Firestore 인덱스 오류

```
Error: The query requires an index that is not defined
```

**해결 방법:**

1. Firebase Console에서 인덱스 생성 링크 클릭
2. 자동 생성된 인덱스 배포
3. 인덱스 생성 완료까지 대기 (최대 10분)
4. 수동으로 인덱스 생성:

```bash
# 인덱스 파일 수정 후 배포
firebase deploy --only firestore:indexes
```

#### 문제: Firestore 쿼리 성능 저하

```
Error: Query performance is poor
```

**해결 방법:**

1. 복합 인덱스 추가
2. 쿼리 최적화 (필터 순서 조정)
3. 페이지네이션 구현
4. 불필요한 필드 제외

```javascript
// 최적화된 쿼리 예제
const tasks = await firebase
  .firestore()
  .collection('tasks')
  .where('teamId', '==', teamId)
  .where('status', '==', 'TODO')
  .orderBy('createdAt', 'desc')
  .limit(20)
  .get();
```

### 4. Storage 관련 문제

#### 문제: 파일 업로드 실패

```
Error: Storage permission denied
```

**해결 방법:**

1. Storage 보안 규칙 확인
2. 파일 경로 권한 확인
3. 사용자 인증 상태 확인

```javascript
// Storage 규칙 예제
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /teams/{teamId}/{allPaths=**} {
      allow read, write: if request.auth != null &&
        exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid));
    }
  }
}
```

#### 문제: 파일 다운로드 실패

```
Error: File not found
```

**해결 방법:**

1. 파일 경로 확인
2. 파일 존재 여부 확인
3. 권한 설정 확인

```javascript
// 파일 존재 확인
const fileRef = firebase.storage().ref(filePath);
const exists = await fileRef
  .getMetadata()
  .then(() => true)
  .catch(() => false);
```

### 5. Functions 관련 문제

#### 문제: Functions 콜드 스타트 지연

```
Error: Function timeout
```

**해결 방법:**

1. 메모리 할당 증가
2. 타임아웃 설정 조정
3. 함수 최적화

```typescript
// Functions 설정 예제
export const optimizedFunction = functions
  .runWith({
    timeoutSeconds: 60,
    memory: '1GB',
  })
  .https.onCall(async (data, context) => {
    // 함수 로직
  });
```

#### 문제: Functions 로그 확인 불가

```
Error: Cannot view function logs
```

**해결 방법:**

```bash
# Functions 로그 확인
firebase functions:log

# 특정 함수 로그 확인
firebase functions:log --only functionName

# 실시간 로그 확인
firebase functions:log --follow
```

### 6. 개발 환경 문제

#### 문제: Emulators 실행 실패

```
Error: Emulator startup failed
```

**해결 방법:**

```bash
# 포트 충돌 확인
netstat -an | grep :8080
netstat -an | grep :5001

# 다른 포트로 실행
firebase emulators:start --only firestore --port 8081

# 에뮬레이터 재설정
firebase emulators:start --import=./emulator-data
```

#### 문제: 로컬 개발 서버 연결 실패

```
Error: Cannot connect to emulators
```

**해결 방법:**

1. 에뮬레이터 상태 확인
2. 포트 설정 확인
3. 방화벽 설정 확인

```javascript
// 에뮬레이터 연결 설정
if (location.hostname === 'localhost') {
  firebase.firestore().useEmulator('localhost', 8080);
  firebase.functions().useEmulator('localhost', 5001);
}
```

### 7. 성능 관련 문제

#### 문제: 쿼리 응답 시간 지연

```
Error: Query timeout
```

**해결 방법:**

1. 인덱스 최적화
2. 쿼리 구조 개선
3. 캐싱 구현

```javascript
// 캐싱 예제
const cachedData = await firebase
  .firestore()
  .collection('tasks')
  .where('teamId', '==', teamId)
  .get({ source: 'cache' });
```

#### 문제: Functions 실행 시간 초과

```
Error: Function execution timeout
```

**해결 방법:**

1. 함수 분할
2. 비동기 처리 최적화
3. 배치 처리 구현

```typescript
// 배치 처리 예제
const batch = firebase.firestore().batch();
tasks.forEach(task => {
  const ref = firebase.firestore().collection('tasks').doc();
  batch.set(ref, task);
});
await batch.commit();
```

### 8. 보안 관련 문제

#### 문제: 보안 규칙 테스트 실패

```
Error: Security rules test failed
```

**해결 방법:**

```bash
# 규칙 테스트 실행
firebase firestore:rules:test

# 테스트 파일 생성
firebase firestore:rules:test --test-file=test-rules.js
```

#### 문제: 인증 토큰 만료

```
Error: Authentication token expired
```

**해결 방법:**

1. 토큰 갱신 구현
2. 자동 로그인 설정
3. 오프라인 지원

```javascript
// 토큰 갱신 예제
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    user.getIdToken(true); // 강제 갱신
  }
});
```

## 디버깅 도구

### 1. Firebase Console

- 실시간 데이터베이스 모니터링
- Functions 실행 로그
- Storage 파일 관리
- 인증 사용자 관리

### 2. Firebase CLI 도구

```bash
# 프로젝트 정보 확인
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

### 3. 개발자 도구

```javascript
// 디버깅 로그 추가
console.log('Firestore operation:', { collection, document });

// Functions 로깅
functions.logger.info('Function executed', { userId, taskId });

// 성능 측정
console.time('query');
const result = await firebase.firestore().collection('tasks').get();
console.timeEnd('query');
```

## 예방 조치

### 1. 정기적인 백업

```bash
# 데이터 백업
firebase firestore:export --backup

# Storage 백업
firebase storage:download --backup
```

### 2. 모니터링 설정

- Firebase Console 알림 설정
- Functions 오류 알림
- 사용량 모니터링

### 3. 테스트 자동화

```bash
# 자동 테스트 실행
npm run test

# 보안 규칙 테스트
npm run test:rules

# 성능 테스트
npm run test:performance
```

## 지원 및 리소스

### 공식 문서

- [Firebase 문제 해결 가이드](https://firebase.google.com/docs/support)
- [Firestore 문제 해결](https://firebase.google.com/docs/firestore/troubleshoot)
- [Functions 문제 해결](https://firebase.google.com/docs/functions/troubleshoot)

### 커뮤니티

- [Firebase 커뮤니티](https://firebase.google.com/community)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/firebase)
- [GitHub Issues](https://github.com/firebase/firebase-js-sdk/issues)

### 도구

- [Firebase CLI](https://firebase.google.com/docs/cli)
- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)

---

**참고**: 이 가이드는 일반적인 Firebase 문제를 다룹니다. 특정 문제가 지속되면 Firebase 지원팀에 문의하세요.
