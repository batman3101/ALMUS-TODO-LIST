# Firebase to Supabase 데이터 마이그레이션 가이드

이 디렉토리에는 Firebase Firestore 데이터를 Supabase PostgreSQL로 마이그레이션하는 스크립트들이 포함되어 있습니다.

## 📁 파일 구조

- `migrate-firebase-to-supabase.js` - 메인 마이그레이션 스크립트
- `backup-firebase-data.js` - Firebase 데이터 백업 스크립트
- `run-migration.sh` - 마이그레이션 실행 스크립트 (Linux/macOS)
- `.env.migration.example` - 환경 변수 템플릿
- `README.md` - 이 파일

## 🚀 사용 방법

### 1. 환경 설정

```bash
# 환경 변수 파일 생성
cp scripts/.env.migration.example scripts/.env.migration

# 환경 변수 편집
nano scripts/.env.migration
```

### 2. 필요한 정보 준비

#### Supabase 정보

- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_SERVICE_KEY`: Supabase 서비스 역할 키 (service_role key)

#### Firebase 정보

- `FIREBASE_SERVICE_ACCOUNT_PATH`: Firebase 서비스 계정 JSON 파일 경로

### 3. 의존성 설치

```bash
# 필요한 패키지 설치
npm install @supabase/supabase-js firebase-admin
```

### 4. 마이그레이션 실행

#### 방법 1: 쉘 스크립트 사용 (권장)

```bash
chmod +x scripts/run-migration.sh
./scripts/run-migration.sh
```

#### 방법 2: 직접 실행

```bash
# 1. 백업 실행 (선택사항)
node scripts/backup-firebase-data.js

# 2. 마이그레이션 실행
node scripts/migrate-firebase-to-supabase.js
```

## 📊 마이그레이션 데이터

다음 Firebase 컬렉션들이 Supabase 테이블로 마이그레이션됩니다:

| Firebase 컬렉션 | Supabase 테이블 | 설명        |
| --------------- | --------------- | ----------- |
| `users`         | `users`         | 사용자 정보 |
| `teams`         | `teams`         | 팀 정보     |
| `team_members`  | `team_members`  | 팀 멤버십   |
| `projects`      | `projects`      | 프로젝트    |
| `tasks`         | `tasks`         | 태스크      |
| `comments`      | `comments`      | 댓글        |
| `notifications` | `notifications` | 알림        |

## 🔄 마이그레이션 프로세스

1. **환경 변수 검증** - 필요한 설정들이 모두 제공되었는지 확인
2. **연결 테스트** - Firebase와 Supabase 연결 상태 확인
3. **데이터 백업** - Firebase 데이터를 JSON 파일로 백업 (선택사항)
4. **의존성 순서 마이그레이션**:
   - Users → Teams → Team Members → Projects → Tasks → Comments → Notifications
5. **결과 리포트 생성** - `migration-report.json` 파일 생성

## ⚠️ 주의사항

### 실행 전 확인사항

- [ ] Supabase 데이터베이스 스키마가 올바르게 설정되어 있는지 확인
- [ ] 충분한 시간 여유 확보 (데이터량에 따라 수 시간 소요 가능)
- [ ] 네트워크 연결 상태 양호
- [ ] Firebase 프로젝트 권한 확인

### 데이터 무결성

- ID 값은 Firebase 문서 ID를 그대로 사용하여 참조 무결성 유지
- Timestamp 필드는 ISO 8601 형식으로 변환
- Firebase 특수 타입들은 JSON 또는 적절한 PostgreSQL 타입으로 변환

### 오류 처리

- 개별 문서 마이그레이션 실패는 전체 프로세스를 중단시키지 않음
- 실패한 문서들은 로그에 기록되고 최종 리포트에 포함
- 재시도 로직으로 일시적 네트워크 오류 대응

## 📈 성능 최적화

- **배치 처리**: 대량 데이터를 위한 배치 크기 조정 가능
- **속도 제한**: API 제한을 피하기 위한 지연 시간 설정
- **병렬 처리**: 독립적인 데이터의 경우 병렬 마이그레이션 지원

## 🛠️ 트러블슈팅

### 일반적인 문제들

1. **"Cannot resolve module" 오류**

   ```bash
   npm install @supabase/supabase-js firebase-admin
   ```

2. **Firebase 권한 오류**
   - 서비스 계정에 Firestore 읽기 권한이 있는지 확인
   - 프로젝트 ID가 올바른지 확인

3. **Supabase 연결 오류**
   - URL과 서비스 키가 올바른지 확인
   - RLS 정책이 서비스 역할 키 사용을 허용하는지 확인

4. **메모리 부족 오류**
   ```bash
   # Node.js 메모리 제한 증가
   node --max-old-space-size=4096 scripts/migrate-firebase-to-supabase.js
   ```

### 부분 마이그레이션

특정 컬렉션만 마이그레이션하려면 스크립트를 수정하여 필요한 함수만 호출하세요:

```javascript
// 예: 사용자와 팀만 마이그레이션
await migrateUsers();
await migrateTeams();
```

## 📞 지원

마이그레이션 과정에서 문제가 발생하면:

1. `migration-report.json` 파일의 오류 로그 확인
2. 백업 파일이 생성되었는지 확인
3. 필요시 부분 롤백 후 재시도

## 🔒 보안 고려사항

- 서비스 계정 키 파일을 안전하게 보관
- 마이그레이션 완료 후 임시 키들 비활성화
- 백업 파일에 민감한 정보가 포함되어 있으므로 적절히 보호
