# Firestore 인덱스 설정 가이드

## 🔥 Critical: 필수 인덱스 설정

현재 프로젝트는 **인덱스가 설정되지 않아** 대부분의 쿼리가 실행되지 않습니다. 이 가이드를 따라 즉시 인덱스를 설정하세요.

## 1. 현재 상태 확인

```bash
# 현재 인덱스 상태 확인
firebase firestore:indexes

# firestore.indexes.json 파일 확인
cat firestore.indexes.json
```

**현재 문제**: `firestore.indexes.json` 파일이 비어있음

```json
{
  "indexes": [],
  "fieldOverrides": []
}
```

## 2. 필수 인덱스 설정

### 2.1 firestore.indexes.json 파일 교체

현재 비어있는 파일을 다음 내용으로 교체하세요:

```json
{
  "indexes": [
    {
      "collectionGroup": "tasks",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "teamId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "tasks",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "teamId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "assigneeId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "dueDate",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "tasks",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "teamId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "projectId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "team_members",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "teamId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "isActive",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "joinedAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "projects",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "teamId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "notifications",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "userId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "isRead",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "comments",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "resourceType",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "resourceId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "mentions",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "mentionedUserId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "isRead",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "task_permissions",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "taskId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "role",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "project_permissions",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "projectId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "role",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "user_presence",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "lastActivity",
          "order": "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": [
    {
      "collectionGroup": "tasks",
      "fieldPath": "tags",
      "indexes": [
        {
          "order": "ASCENDING",
          "queryScope": "COLLECTION"
        },
        {
          "arrayConfig": "CONTAINS",
          "queryScope": "COLLECTION"
        }
      ]
    },
    {
      "collectionGroup": "comments",
      "fieldPath": "mentions",
      "indexes": [
        {
          "arrayConfig": "CONTAINS",
          "queryScope": "COLLECTION"
        }
      ]
    }
  ]
}
```

## 3. 인덱스 배포

### 3.1 즉시 배포 (Critical)

```bash
# 🔥 중요: 즉시 실행하세요!
firebase deploy --only firestore:indexes

# 배포 진행 상황 확인
firebase firestore:indexes
```

### 3.2 배포 완료 확인

```bash
# Firebase Console에서 확인
# https://console.firebase.google.com/project/[your-project]/firestore/indexes

# 또는 CLI로 확인
firebase firestore:indexes --project [your-project-id]
```

**중요**: 인덱스 생성에는 최대 **10-15분**이 소요될 수 있습니다.

## 4. 인덱스별 용도 설명

### 4.1 Tasks 컬렉션 인덱스

#### Index 1: 팀별 상태 필터링

```javascript
// 사용 쿼리 예시
firebase
  .firestore()
  .collection('tasks')
  .where('teamId', '==', teamId)
  .where('status', '==', 'TODO')
  .orderBy('createdAt', 'desc');
```

#### Index 2: 담당자별 태스크 조회

```javascript
firebase
  .firestore()
  .collection('tasks')
  .where('teamId', '==', teamId)
  .where('assigneeId', '==', userId)
  .orderBy('dueDate', 'asc');
```

#### Index 3: 프로젝트별 태스크 조회

```javascript
firebase
  .firestore()
  .collection('tasks')
  .where('teamId', '==', teamId)
  .where('projectId', '==', projectId)
  .orderBy('createdAt', 'desc');
```

### 4.2 Team Members 인덱스

```javascript
// 활성 팀 멤버 조회
firebase
  .firestore()
  .collection('team_members')
  .where('teamId', '==', teamId)
  .where('isActive', '==', true)
  .orderBy('joinedAt', 'desc');
```

### 4.3 Notifications 인덱스

```javascript
// 읽지 않은 알림 조회
firebase
  .firestore()
  .collection('notifications')
  .where('userId', '==', userId)
  .where('isRead', '==', false)
  .orderBy('createdAt', 'desc');
```

## 5. 추가 최적화 설정

### 5.1 Array 필드 인덱스

```javascript
// tags 배열 필드 검색
firebase
  .firestore()
  .collection('tasks')
  .where('tags', 'array-contains', 'urgent');

// mentions 배열 필드 검색
firebase
  .firestore()
  .collection('comments')
  .where('mentions', 'array-contains', userId);
```

### 5.2 성능 모니터링

```bash
# Firestore 사용량 확인
firebase firestore:usage

# 인덱스 사용 통계 (Firebase Console)
# Performance → Firestore → Query performance
```

## 6. 문제 해결

### 6.1 인덱스 배포 실패

```bash
# 권한 확인
firebase projects:list

# 프로젝트 재설정
firebase use [project-id]

# 인덱스 파일 문법 검증
firebase firestore:indexes --dry-run
```

### 6.2 기존 쿼리 에러

인덱스 배포 후에도 쿼리 에러가 발생하면:

1. **Firebase Console에서 자동 인덱스 생성**
   - 에러 메시지의 링크 클릭
   - "Create Index" 버튼 클릭
2. **수동 인덱스 추가**
   ```bash
   # 누락된 인덱스를 firestore.indexes.json에 추가 후
   firebase deploy --only firestore:indexes
   ```

## 7. 성능 최적화 팁

### 7.1 쿼리 최적화

```javascript
// ✅ 좋은 쿼리 (인덱스 효율적 사용)
const tasks = await firebase
  .firestore()
  .collection('tasks')
  .where('teamId', '==', teamId) // 첫 번째 필터
  .where('status', '==', 'TODO') // 두 번째 필터
  .orderBy('createdAt', 'desc') // 정렬
  .limit(20) // 제한
  .get();

// ❌ 나쁜 쿼리 (인덱스 비효율적)
const tasks = await firebase
  .firestore()
  .collection('tasks')
  .where('assigneeId', '==', userId) // 팀 필터 없음
  .get();
```

### 7.2 페이징 구현

```javascript
// 첫 번째 페이지
const first = firebase
  .firestore()
  .collection('tasks')
  .where('teamId', '==', teamId)
  .orderBy('createdAt', 'desc')
  .limit(25);

// 다음 페이지
const next = firebase
  .firestore()
  .collection('tasks')
  .where('teamId', '==', teamId)
  .orderBy('createdAt', 'desc')
  .startAfter(lastDoc)
  .limit(25);
```

## 8. 모니터링 및 유지보수

### 8.1 정기 점검 항목

- [ ] 인덱스 사용률 확인 (월 1회)
- [ ] 새로운 쿼리 패턴 인덱스 추가
- [ ] 사용하지 않는 인덱스 제거
- [ ] 성능 지표 모니터링

### 8.2 알림 설정

Firebase Console에서 다음 알림을 설정하세요:

- 인덱스 생성 완료
- 쿼리 성능 저하
- 사용량 한도 초과

---

**⚠️ 중요**: 이 인덱스 설정은 **즉시 적용**해야 합니다. 인덱스 없이는 애플리케이션의 대부분 기능이 작동하지 않습니다.

**📞 지원**: 인덱스 설정 관련 문제가 있으면 Firebase 문제 해결 가이드를 참조하거나 개발팀에 문의하세요.
