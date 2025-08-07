# Supabase Database Migration Guide

## 문제 해결을 위한 단계별 마이그레이션 가이드

### 1. RLS 정책 수정 (필수)

**문제**: RLS 정책의 무한 재귀로 인한 데이터베이스 접근 차단

**해결**: Supabase Dashboard의 SQL Editor에서 `fix-rls-policies.sql` 실행

1. [Supabase Dashboard](https://app.supabase.com/) 로그인
2. 프로젝트 선택 (plbjsfmrneeyucqrmill)
3. **SQL Editor** 메뉴 클릭
4. `database/fix-rls-policies.sql` 파일의 내용을 복사하여 실행

### 2. 환경변수 확인

현재 환경변수가 올바르게 설정되어 있는지 확인:

```bash
# .env 파일 확인
VITE_SUPABASE_URL=https://plbjsfmrneeyucqrmill.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYmpzZm1ybmVleXVjcXJtaWxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMzY0MDcsImV4cCI6MjA2OTgxMjQwN30.kRcNQti7hsq_aKuLtNaF9UodJE9JGbW84RKOdgnmLTw
```

### 3. 테스트 사용자 생성

RLS 정책 수정 후 테스트용 사용자 생성:

```sql
-- 테스트 사용자 생성 (Supabase Dashboard > Authentication > Users에서)
-- 또는 앱에서 회원가입 기능 사용
```

### 4. 연결 테스트

애플리케이션에서 연결 상태 확인:

```javascript
// 브라우저 콘솔에서 실행
import { testSupabaseConnection } from './lib/supabase/connection-test';
testSupabaseConnection().then(console.log);
```

### 5. 문제 해결 체크리스트

- [ ] RLS 정책 수정 완료
- [ ] 환경변수 올바르게 설정
- [ ] 테스트 사용자 생성 가능
- [ ] 로그인/로그아웃 정상 동작
- [ ] 데이터베이스 읽기/쓰기 정상
- [ ] Auth 초기화 타임아웃 해결

### 6. 트러블슈팅

**문제**: 여전히 "infinite recursion" 오류가 발생하는 경우
**해결**: 
1. Supabase Dashboard에서 모든 RLS 정책 확인
2. `team_members` 테이블의 정책이 자기 참조하지 않는지 확인
3. 필요시 RLS를 임시로 비활성화한 후 정책을 다시 생성

**문제**: Mock 모드로 계속 실행되는 경우
**해결**:
1. `.env` 파일이 올바른 위치에 있는지 확인 (apps/web-app/.env)
2. 애플리케이션 재시작
3. 브라우저 캐시 클리어

**문제**: 사용자 생성 시 오류
**해결**:
1. `handle_new_user()` 트리거 함수가 올바르게 생성되었는지 확인
2. `auth.users` 트리거가 활성화되었는지 확인

### 7. 성능 최적화

RLS 정책 수정 후 성능 개선을 위한 추가 인덱스:

```sql
-- 성능 최적화를 위한 추가 인덱스
CREATE INDEX IF NOT EXISTS idx_team_members_user_active ON public.team_members(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_team_members_team_active ON public.team_members(team_id, is_active);
```

### 8. 모니터링

연결 상태를 지속적으로 모니터링하기 위해:

1. 애플리케이션 로그 확인
2. Supabase Dashboard > Logs 섹션에서 오류 로그 모니터링
3. 정기적인 연결 테스트 실행

## 완료 후 확인 사항

✅ 애플리케이션이 Mock 모드가 아닌 실제 Supabase로 연결
✅ 로그인/회원가입 정상 동작
✅ 데이터 읽기/쓰기 정상 동작
✅ Auth 초기화 타임아웃 없음
✅ RLS 정책으로 인한 권한 오류 없음