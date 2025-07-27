# Advanced Permission System 설계 문서

## 1. 현재 시스템 분석

### 1.1 기존 권한 구조

```
Team Level:
├── Owner (팀 소유자)
├── Admin (관리자)
├── Editor (편집자)
└── Viewer (보기 전용)
```

### 1.2 기존 시스템의 한계점

1. **단일 레벨 권한**: 팀 내 모든 프로젝트와 작업에 동일한 권한 적용
2. **세분화 부족**: 특정 프로젝트나 작업에 대한 개별적인 권한 설정 불가
3. **액션별 제어 한계**: 읽기/쓰기 권한만 구분, 세부 액션(assign, comment, delete 등) 제어 불가
4. **권한 위임 불가**: 프로젝트 리더가 하위 권한을 부여할 수 없음
5. **임시 권한 불가**: 특정 기간이나 조건부 권한 설정 불가

## 2. 새로운 권한 시스템 아키텍처

### 2.1 다층 권한 구조

```
Team Level (기존)
├── Owner: 모든 권한
├── Admin: 팀 관리 권한
├── Editor: 편집 권한
└── Viewer: 읽기 권한

Project Level (신규)
├── Project Manager: 프로젝트 전체 관리
├── Project Lead: 프로젝트 운영 관리
├── Contributor: 프로젝트 참여
└── Observer: 프로젝트 조회

Task Level (신규)
├── Assignee: 작업 담당자
├── Reviewer: 작업 검토자
├── Collaborator: 작업 협력자
└── Watcher: 작업 관찰자
```

### 2.2 권한 상속 체계

1. **하향 상속**: 상위 레벨 권한이 하위 레벨에 기본 권한 제공
2. **명시적 오버라이드**: 하위 레벨에서 명시적으로 권한 재정의 가능
3. **최소 권한 원칙**: 명시적으로 부여되지 않은 권한은 거부

### 2.3 액션별 권한 매트릭스

#### Team Level Actions

| 액션               | Owner | Admin | Editor | Viewer |
| ------------------ | ----- | ----- | ------ | ------ |
| team.create        | ✓     | ✗     | ✗      | ✗      |
| team.update        | ✓     | ✓     | ✗      | ✗      |
| team.delete        | ✓     | ✗     | ✗      | ✗      |
| team.invite        | ✓     | ✓     | ✗      | ✗      |
| team.remove_member | ✓     | ✓     | ✗      | ✗      |
| team.view          | ✓     | ✓     | ✓      | ✓      |

#### Project Level Actions

| 액션                       | P.Manager | P.Lead | Contributor | Observer |
| -------------------------- | --------- | ------ | ----------- | -------- |
| project.create             | ✓         | ✓      | ✗           | ✗        |
| project.update             | ✓         | ✓      | ✗           | ✗        |
| project.delete             | ✓         | ✗      | ✗           | ✗        |
| project.manage_permissions | ✓         | ✓      | ✗           | ✗        |
| project.assign_tasks       | ✓         | ✓      | ✓           | ✗        |
| project.view               | ✓         | ✓      | ✓           | ✓        |

#### Task Level Actions

| 액션          | Assignee | Reviewer | Collaborator | Watcher |
| ------------- | -------- | -------- | ------------ | ------- |
| task.create   | ✓        | ✓        | ✓            | ✗       |
| task.update   | ✓        | ✓        | ✓            | ✗       |
| task.delete   | ✓        | ✓        | ✗            | ✗       |
| task.assign   | ✓        | ✓        | ✗            | ✗       |
| task.complete | ✓        | ✗        | ✗            | ✗       |
| task.comment  | ✓        | ✓        | ✓            | ✓       |
| task.view     | ✓        | ✓        | ✓            | ✓       |

## 3. 권한 확인 알고리즘

### 3.1 권한 해결 순서

```
1. Team Level 권한 확인
   ↓
2. Project Level 권한 확인 (있을 경우)
   ↓
3. Task Level 권한 확인 (있을 경우)
   ↓
4. 최종 권한 결정 (OR 연산)
```

### 3.2 권한 결정 로직

```typescript
function hasPermission(
  userId: string,
  resource: Resource,
  action: Action
): boolean {
  const teamPermission = getTeamPermission(userId, resource.teamId, action);
  const projectPermission = getProjectPermission(
    userId,
    resource.projectId,
    action
  );
  const taskPermission = getTaskPermission(userId, resource.taskId, action);

  // 명시적 거부가 있으면 거부
  if (isExplicitlyDenied(teamPermission, projectPermission, taskPermission)) {
    return false;
  }

  // 하나라도 허용이면 허용 (OR 연산)
  return teamPermission || projectPermission || taskPermission;
}
```

## 4. 데이터베이스 스키마 설계

### 4.1 새로운 컬렉션

```
project_permissions/
├── {permissionId}
│   ├── projectId: string
│   ├── userId: string
│   ├── role: ProjectRole
│   ├── permissions: Permission[]
│   ├── grantedBy: string
│   ├── grantedAt: Timestamp
│   ├── expiresAt?: Timestamp
│   └── isActive: boolean

task_permissions/
├── {permissionId}
│   ├── taskId: string
│   ├── userId: string
│   ├── role: TaskRole
│   ├── permissions: Permission[]
│   ├── grantedBy: string
│   ├── grantedAt: Timestamp
│   ├── expiresAt?: Timestamp
│   └── isActive: boolean
```

### 4.2 확장된 권한 타입

```typescript
interface Permission {
  resource: string; // 'team' | 'project' | 'task'
  action: string; // 'create' | 'read' | 'update' | 'delete' | 'assign' | 'comment'
  granted: boolean; // true: 허용, false: 명시적 거부
  conditions?: {
    // 조건부 권한
    timeRange?: { start: Date; end: Date };
    ipRange?: string[];
    deviceType?: string[];
  };
}
```

## 5. 구현 단계

### Phase 1: 기반 구조

1. 새로운 권한 타입 정의
2. 데이터베이스 스키마 확장
3. 권한 검증 미들웨어 구현

### Phase 2: 프로젝트 권한

1. 프로젝트별 권한 관리 UI
2. 프로젝트 권한 할당 로직
3. 프로젝트 레벨 보안 규칙

### Phase 3: 작업 권한

1. 작업별 권한 관리 UI
2. 작업 권한 할당 로직
3. 작업 레벨 보안 규칙

### Phase 4: 고급 기능

1. 조건부 권한 시스템
2. 임시 권한 관리
3. 권한 감사 로그

## 6. 보안 고려사항

### 6.1 권한 에스컬레이션 방지

- 사용자는 자신이 가진 권한 이상의 권한을 다른 사용자에게 부여할 수 없음
- Owner만이 Admin 권한을 부여할 수 있음
- Project Manager만이 Project Lead 권한을 부여할 수 있음

### 6.2 권한 검증

- 클라이언트와 서버 양쪽에서 권한 검증
- Firestore 보안 규칙에서 최종 검증
- 중요한 작업은 Cloud Functions에서 재검증

### 6.3 감사 로그

- 모든 권한 변경 사항 로깅
- 민감한 작업에 대한 추적 가능성 확보
- 권한 남용 탐지 시스템

## 7. 성능 최적화

### 7.1 권한 캐싱

- 사용자별 권한 정보 메모리 캐싱
- 권한 변경 시 캐시 무효화
- TTL 기반 캐시 관리

### 7.2 쿼리 최적화

- 복합 인덱스를 통한 권한 쿼리 최적화
- 배치 권한 확인 API
- 불필요한 권한 검사 제거

이 설계를 바탕으로 단계별로 구현을 진행합니다.
