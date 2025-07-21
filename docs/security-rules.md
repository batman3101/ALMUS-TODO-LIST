# Firebase 보안 규칙 문서

## 개요

이 문서는 ALMUS ToDo List 애플리케이션의 Firebase Firestore 및 Storage 보안 규칙에 대한 설명입니다.

## 역할 기반 접근 제어 (RBAC)

### 사용자 역할

- **ADMIN**: 팀 관리자, 모든 권한 보유
- **EDITOR**: 편집자, Task 생성/수정/삭제 가능
- **VIEWER**: 뷰어, 읽기 전용 권한

## Firestore 보안 규칙

### 사용자 인증 함수

```javascript
// 사용자 인증 확인
function isAuthenticated() {
  return request.auth != null;
}

// 사용자가 자신의 데이터에 접근하는지 확인
function isOwner(userId) {
  return isAuthenticated() && request.auth.uid == userId;
}
```

### 팀 기반 권한 함수

```javascript
// 사용자가 팀 멤버인지 확인
function isTeamMember(teamId) {
  return isAuthenticated() &&
    exists(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid));
}

// 사용자가 팀 관리자인지 확인
function isTeamAdmin(teamId) {
  return isAuthenticated() &&
    get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.role == 'ADMIN';
}

// 사용자가 팀 편집자인지 확인
function isTeamEditor(teamId) {
  return isAuthenticated() &&
    get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.role == 'EDITOR';
}

// 사용자가 팀 뷰어인지 확인
function isTeamViewer(teamId) {
  return isAuthenticated() &&
    get(/databases/$(database)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.role == 'VIEWER';
}
```

### 컬렉션별 접근 규칙

#### Users 컬렉션

- **읽기**: 자신의 데이터 또는 팀 멤버
- **생성**: 인증된 사용자만 자신의 프로필 생성
- **수정**: 자신의 데이터만
- **삭제**: 팀 관리자만

#### Teams 컬렉션

- **읽기**: 팀 멤버만
- **생성**: 인증된 사용자
- **수정**: 팀 관리자만
- **삭제**: 팀 관리자만

#### Tasks 컬렉션

- **읽기**: 팀 멤버만
- **생성**: 팀 편집자/관리자만
- **수정**: 담당자, 작성자, 팀 편집자/관리자
- **삭제**: 작성자, 팀 편집자/관리자

#### Files 컬렉션

- **읽기**: 팀 멤버 또는 파일 업로더
- **생성**: 팀 편집자/관리자만
- **수정**: 업로더, 팀 편집자/관리자
- **삭제**: 업로더, 팀 편집자/관리자

## Storage 보안 규칙

### 사용자 프로필 이미지

```
/users/{userId}/profile/{fileName}
```

- **읽기**: 인증된 사용자
- **쓰기**: 해당 사용자만

### 팀 파일

```
/teams/{teamId}/{fileName}
```

- **읽기**: 팀 멤버만
- **쓰기**: 팀 멤버만

### 프로젝트 파일

```
/projects/{projectId}/{fileName}
```

- **읽기**: 프로젝트 멤버만
- **쓰기**: 프로젝트 멤버만

### Task 첨부 파일

```
/tasks/{taskId}/{fileName}
```

- **읽기**: 팀 멤버만
- **쓰기**: 팀 편집자/관리자만

### 공개 파일

```
/public/{fileName}
```

- **읽기**: 모든 사용자
- **쓰기**: 관리자만

## 파일 업로드 제한사항

### 파일 크기 제한

- 최대 파일 크기: 100MB
- 최대 파일 수: 10개 (다중 업로드 시)

### 허용된 파일 타입

- 이미지: `image/*`
- 문서: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- 스프레드시트: `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- 텍스트: `text/plain`, `text/csv`

### 차단된 파일 타입

- 실행 파일: `.exe`, `.bat`, `.sh`, `.com`
- 스크립트: `.js`, `.vbs`, `.ps1`
- 압축 파일: `.zip`, `.rar`, `.7z` (보안상)

## 보안 테스트 시나리오

### 정상 시나리오

1. 팀 관리자가 Task 생성
2. 팀 편집자가 Task 수정
3. 팀 멤버가 파일 업로드
4. 팀 멤버가 파일 다운로드

### 차단 시나리오

1. 비인증 사용자의 데이터 접근
2. 팀 뷰어의 Task 생성 시도
3. 다른 팀 멤버의 파일 접근
4. 100MB 초과 파일 업로드
5. 실행 파일 업로드

## 테스트 실행 방법

### Firestore 규칙 테스트

```bash
npm test tests/firestore-rules.test.js
```

### Storage 규칙 테스트

```bash
npm test tests/storage-rules.test.js
```

### Firebase Emulator 실행

```bash
firebase emulators:start
```

## 모니터링 및 로깅

### 보안 이벤트 로깅

- 인증 실패
- 권한 거부
- 파일 업로드 실패
- 규칙 위반 시도

### 알림 설정

- 관리자에게 보안 이벤트 알림
- 의심스러운 활동 감지 시 즉시 알림

## 업데이트 가이드라인

### 규칙 변경 시 고려사항

1. 기존 사용자 영향 최소화
2. 점진적 롤아웃
3. 테스트 환경에서 충분한 검증
4. 롤백 계획 수립

### 배포 절차

1. 개발 환경에서 테스트
2. 스테이징 환경에서 검증
3. 프로덕션 환경에 배포
4. 모니터링 및 로그 확인

## 문제 해결

### 일반적인 문제

1. **권한 거부 오류**: 사용자 역할 확인
2. **파일 업로드 실패**: 파일 크기 및 타입 확인
3. **읽기 권한 오류**: 팀 멤버십 확인

### 디버깅 방법

1. Firebase Console에서 규칙 테스트
2. 로그 분석
3. 사용자 권한 확인

## 보안 모범 사례

### 규칙 작성 원칙

1. 최소 권한 원칙 적용
2. 명시적 거부 규칙 포함
3. 정기적인 보안 검토
4. 자동화된 테스트 실행

### 데이터 보호

1. 민감한 데이터 암호화
2. 정기적인 백업
3. 접근 로그 보관
4. 데이터 보존 정책 준수
