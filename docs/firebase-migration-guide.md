# Firebase 마이그레이션 가이드

## 목차

1. [개요](#개요)
2. [Firebase 프로젝트 설정](#firebase-프로젝트-설정)
3. [Firestore 데이터 구조](#firestore-데이터-구조)
4. [Firestore 보안 규칙](#firestore-보안-규칙)
5. [Firestore 인덱스 최적화](#firestore-인덱스-최적화)
6. [Firebase Functions](#firebase-functions)
7. [Firebase Storage](#firebase-storage)
8. [배포 및 CI/CD](#배포-및-cicd)
9. [마이그레이션 체크리스트](#마이그레이션-체크리스트)
10. [문제 해결](#문제-해결)

## 개요

ALMUS ToDo List 프로젝트는 Firebase 기반 아키텍처를 사용하여 확장 가능하고 안전한 멀티플랫폼 업무 관리 시스템을 구축합니다.

### 주요 Firebase 서비스

- **Firestore**: NoSQL 문서 데이터베이스
- **Firebase Functions**: 서버리스 백엔드 로직
- **Firebase Storage**: 파일 저장소
- **Firebase Hosting**: 정적 웹 호스팅
- **Firebase Authentication**: 사용자 인증

## Firebase 프로젝트 설정

### 1. 프로젝트 초기화

```bash
# Firebase CLI 설치
npm install -g firebase-tools

# Firebase 로그인
firebase login

# 프로젝트 초기화
firebase init

# 선택할 서비스:
# - Firestore
# - Functions
# - Storage
# - Hosting
```

### 2. 프로젝트 구조

```
/
├── firebase.json          # Firebase 프로젝트 설정
├── firestore.rules        # Firestore 보안 규칙
├── firestore.indexes.json # Firestore 인덱스
├── storage.rules          # Storage 보안 규칙
├── functions/             # Firebase Functions
│   ├── src/
│   │   ├── http/         # HTTP Functions
│   │   ├── services/     # 비즈니스 로직
│   │   ├── triggers/     # Firestore Triggers
│   │   └── utils/        # 유틸리티
│   └── package.json
└── apps/web-app/         # React 웹 앱
```

## Firestore 데이터 구조

### 컬렉션 구조

#### 1. Users 컬렉션

```typescript
interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  teamId: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  notificationSettings: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
}
```

#### 2. Teams 컬렉션

```typescript
interface Team {
  id: string;
  name: string;
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  members: {
    [userId: string]: {
      role: 'ADMIN' | 'EDITOR' | 'VIEWER';
      joinedAt: Timestamp;
    };
  };
}
```

#### 3. Projects 컬렉션

```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  teamId: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  members: {
    [userId: string]: {
      role: 'ADMIN' | 'EDITOR' | 'VIEWER';
      joinedAt: Timestamp;
    };
  };
}
```

#### 4. Tasks 컬렉션

```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  teamId: string;
  projectId?: string;
  assigneeId?: string;
  createdBy: string;
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  tags: string[];
  attachments: string[]; // Storage 파일 경로
  comments: {
    id: string;
    userId: string;
    content: string;
    createdAt: Timestamp;
    mentions: string[]; // @멘션된 사용자 ID
  }[];
}
```

#### 5. Notifications 컬렉션

```typescript
interface Notification {
  id: string;
  userId: string;
  type: 'TASK_ASSIGNED' | 'TASK_DUE' | 'TASK_COMPLETED' | 'MENTION';
  title: string;
  message: string;
  isRead: boolean;
  relatedTaskId?: string;
  createdAt: Timestamp;
}
```

### 데이터 모델링 원칙

1. **정규화 vs 비정규화**
   - 자주 조회되는 데이터는 비정규화 (예: Task에 assigneeId, teamId 포함)
   - 자주 변경되는 데이터는 정규화 (예: User 정보는 별도 컬렉션)

2. **서브컬렉션 사용**
   - 팀 멤버: `teams/{teamId}/members/{userId}`
   - 프로젝트 멤버: `projects/{projectId}/members/{userId}`

3. **인덱스 최적화**
   - 복합 쿼리를 위한 복합 인덱스 설정
   - 자주 사용되는 쿼리 패턴 고려

## Firestore 보안 규칙

### 기본 보안 원칙

1. **인증 필수**: 모든 데이터 접근은 인증된 사용자만
2. **최소 권한**: 필요한 최소 권한만 부여
3. **데이터 소유권**: 사용자는 자신의 데이터만 접근
4. **팀 기반 접근**: 팀 멤버만 팀 데이터 접근

### 권한 레벨

```javascript
// 사용자 역할 정의
- ADMIN: 팀 관리, 멤버 초대/제거, 모든 데이터 접근
- EDITOR: Task 생성/수정/삭제, 파일 업로드
- VIEWER: 읽기 전용 접근
```

### 주요 보안 규칙 함수

```javascript
// 인증 확인
function isAuthenticated() {
  return request.auth != null;
}

// 소유자 확인
function isOwner(userId) {
  return isAuthenticated() && request.auth.uid == userId;
}

// 팀 멤버 확인
function isTeamMember(teamId) {
  return isAuthenticated() &&
    exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid));
}

// 팀 관리자 확인
function isTeamAdmin(teamId) {
  return isAuthenticated() &&
    get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.role == 'ADMIN';
}
```

## Firestore 인덱스 최적화

### 복합 인덱스 전략

#### Tasks 컬렉션 인덱스

1. **팀별 상태별 정렬**

   ```javascript
   {
     "collectionGroup": "tasks",
     "fields": [
       {"fieldPath": "teamId", "order": "ASCENDING"},
       {"fieldPath": "status", "order": "ASCENDING"},
       {"fieldPath": "createdAt", "order": "DESCENDING"}
     ]
   }
   ```

2. **담당자별 필터링**

   ```javascript
   {
     "collectionGroup": "tasks",
     "fields": [
       {"fieldPath": "teamId", "order": "ASCENDING"},
       {"fieldPath": "assigneeId", "order": "ASCENDING"},
       {"fieldPath": "status", "order": "ASCENDING"}
     ]
   }
   ```

3. **마감일별 정렬**
   ```javascript
   {
     "collectionGroup": "tasks",
     "fields": [
       {"fieldPath": "teamId", "order": "ASCENDING"},
       {"fieldPath": "dueDate", "order": "ASCENDING"},
       {"fieldPath": "status", "order": "ASCENDING"}
     ]
   }
   ```

### 인덱스 최적화 팁

1. **쿼리 패턴 분석**
   - 자주 사용되는 필터 조건 파악
   - 정렬 순서 고려
   - 페이지네이션 고려

2. **인덱스 비용 관리**
   - 불필요한 인덱스 제거
   - 인덱스 크기 모니터링
   - 쿼리 성능 측정

## Firebase Functions

### 함수 구조

```
functions/
├── src/
│   ├── index.ts           # 메인 진입점
│   ├── http/              # HTTP Functions
│   │   ├── taskHttp.ts    # Task 관련 HTTP 엔드포인트
│   │   └── fcmHttp.ts     # FCM 관련 HTTP 엔드포인트
│   ├── services/          # 비즈니스 로직
│   │   ├── taskService.ts # Task 서비스
│   │   └── fcmService.ts  # FCM 서비스
│   ├── triggers/          # Firestore Triggers
│   │   └── taskTriggers.ts # Task 변경 시 트리거
│   ├── utils/             # 유틸리티
│   │   └── auth.ts        # 인증 유틸리티
│   └── types/             # 타입 정의
│       ├── index.ts       # 공통 타입
│       └── fcm.ts         # FCM 타입
```

### HTTP Functions 예제

```typescript
// functions/src/http/taskHttp.ts
import * as functions from 'firebase-functions';
import { taskService } from '../services/taskService';

export const createTask = functions.https.onCall(async (data, context) => {
  // 인증 확인
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      '인증이 필요합니다.'
    );
  }

  try {
    const task = await taskService.createTask({
      ...data,
      createdBy: context.auth.uid,
    });
    return task;
  } catch (error) {
    throw new functions.https.HttpsError(
      'internal',
      'Task 생성에 실패했습니다.'
    );
  }
});
```

### Firestore Triggers 예제

```typescript
// functions/src/triggers/taskTriggers.ts
import * as functions from 'firebase-functions';
import { fcmService } from '../services/fcmService';

export const onTaskCreated = functions.firestore
  .document('tasks/{taskId}')
  .onCreate(async (snap, context) => {
    const task = snap.data();

    // 담당자에게 알림 전송
    if (task.assigneeId) {
      await fcmService.sendNotification({
        userId: task.assigneeId,
        title: '새로운 Task가 할당되었습니다',
        message: task.title,
        data: { taskId: context.params.taskId },
      });
    }
  });
```

## Firebase Storage

### 파일 구조

```
storage/
├── teams/{teamId}/
│   ├── tasks/{taskId}/
│   │   ├── attachments/
│   │   └── thumbnails/
│   └── avatars/
└── temp/
    └── uploads/
```

### Storage 보안 규칙

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // 팀별 파일 접근 규칙
    match /teams/{teamId}/{allPaths=**} {
      allow read: if request.auth != null &&
        exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid));
      allow write: if request.auth != null &&
        exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid));
    }

    // 임시 파일 규칙
    match /temp/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 배포 및 CI/CD

### 수동 배포

```bash
# Firestore 규칙 배포
firebase deploy --only firestore:rules

# Firestore 인덱스 배포
firebase deploy --only firestore:indexes

# Storage 규칙 배포
firebase deploy --only storage

# Functions 배포
firebase deploy --only functions

# Hosting 배포
firebase deploy --only hosting

# 전체 배포
firebase deploy
```

### GitHub Actions CI/CD

```yaml
# .github/workflows/firebase-deploy.yml
name: Firebase Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build web app
        run: npm run build --prefix apps/web-app

      - name: Build functions
        run: npm run build --prefix functions

      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: your-project-id
          channelId: live
```

## 마이그레이션 체크리스트

### 사전 준비

- [ ] Firebase 프로젝트 생성
- [ ] Firebase CLI 설치 및 로그인
- [ ] 프로젝트 초기화 (`firebase init`)
- [ ] 환경 변수 설정
- [ ] 팀 멤버 초대

### 데이터 마이그레이션

- [ ] 기존 데이터 백업
- [ ] Firestore 컬렉션 구조 설정
- [ ] 초기 데이터 임포트
- [ ] 데이터 무결성 검증
- [ ] 인덱스 생성 및 최적화

### 보안 설정

- [ ] Firestore 보안 규칙 배포
- [ ] Storage 보안 규칙 배포
- [ ] 인증 설정 (Google, Microsoft OAuth)
- [ ] 권한 테스트
- [ ] 보안 감사

### Functions 배포

- [ ] Functions 코드 빌드
- [ ] 환경 변수 설정
- [ ] Functions 배포
- [ ] 트리거 테스트
- [ ] 성능 모니터링

### 프론트엔드 연동

- [ ] Firebase SDK 설정
- [ ] 인증 플로우 구현
- [ ] Firestore 연동
- [ ] Storage 연동
- [ ] Functions 호출 구현

### 테스트 및 검증

- [ ] 단위 테스트 실행
- [ ] 통합 테스트 실행
- [ ] 성능 테스트
- [ ] 보안 테스트
- [ ] 사용자 수용 테스트

### 롤백 계획

- [ ] 롤백 스크립트 준비
- [ ] 데이터 백업 확인
- [ ] 롤백 절차 문서화
- [ ] 팀원 교육

## 문제 해결

### 일반적인 문제

#### 1. 인덱스 오류

```
Error: The query requires an index that is not defined.
```

**해결 방법:**

1. Firebase Console에서 인덱스 생성 링크 클릭
2. 자동 생성된 인덱스 배포
3. 인덱스 생성 완료까지 대기 (최대 10분)

#### 2. 보안 규칙 오류

```
Error: Missing or insufficient permissions.
```

**해결 방법:**

1. 보안 규칙 문법 확인
2. 사용자 권한 확인
3. 테스트 모드에서 디버깅

#### 3. Functions 배포 오류

```
Error: Function failed to deploy.
```

**해결 방법:**

1. TypeScript 컴파일 오류 확인
2. 의존성 설치 확인
3. 환경 변수 설정 확인

#### 4. Storage 업로드 오류

```
Error: Storage permission denied.
```

**해결 방법:**

1. Storage 보안 규칙 확인
2. 파일 경로 권한 확인
3. 사용자 인증 상태 확인

### 성능 최적화

#### 1. 쿼리 최적화

- 복합 인덱스 활용
- 페이지네이션 구현
- 불필요한 필드 제외

#### 2. Functions 최적화

- 콜드 스타트 최소화
- 메모리 할당 최적화
- 타임아웃 설정

#### 3. Storage 최적화

- 이미지 압축
- CDN 활용
- 캐싱 전략

### 모니터링 및 로깅

#### 1. Firebase Console 모니터링

- Functions 실행 통계
- Firestore 사용량
- Storage 사용량
- 인증 통계

#### 2. 로깅 설정

```typescript
// Functions 로깅
functions.logger.info('Function executed', { userId, taskId });

// 클라이언트 로깅
console.log('Firestore operation', { collection, document });
```

### 지원 및 리소스

- [Firebase 공식 문서](https://firebase.google.com/docs)
- [Firestore 보안 규칙 가이드](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Functions 가이드](https://firebase.google.com/docs/functions)
- [Firebase Storage 가이드](https://firebase.google.com/docs/storage)

---

## 결론

이 가이드는 ALMUS ToDo List 프로젝트의 Firebase 마이그레이션을 위한 포괄적인 참조 문서입니다. 각 단계를 신중하게 따라가며, 문제가 발생하면 문제 해결 섹션을 참조하세요.

팀원들과 함께 이 가이드를 검토하고, 실제 마이그레이션 전에 테스트 환경에서 전체 프로세스를 연습하는 것을 권장합니다.
