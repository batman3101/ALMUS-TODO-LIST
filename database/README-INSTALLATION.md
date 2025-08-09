# 순환 참조 방지 시스템 설치 가이드

## 개요
이 시스템은 task_dependencies 테이블에서 순환 참조를 방지하고, 기존 parent_task_id 시스템과도 호환되는 통합 솔루션입니다.

## 설치 순서

### 1단계: 기존 시스템 확인
```bash
psql -d your_database -f database/check-existing-triggers.sql
```
이 명령으로 현재 데이터베이스의 트리거와 함수 상태를 확인합니다.

### 2단계: 기존 검증 시스템 수정
```bash
psql -d your_database -f database/fix-existing-dependency-validation.sql
```
- 누락된 `check_dependency_cycle_simple` 함수 추가
- 기존 `validate_task_dependency` 함수 개선
- 트리거 재생성

### 3단계: 통합 순환 방지 시스템 설치
```bash
psql -d your_database -f database/fix-dependency-cycle-integration.sql
```
- parent_task_id와 task_dependencies 통합 지원
- 고급 순환 검사 함수들 추가

### 4단계: 추가 기능 설치
```bash
psql -d your_database -f database/add-dependency-cycle-check.sql
```
- 상세한 의존성 체인 분석
- 날짜 검증
- 뷰와 도우미 함수들

### 5단계: 테스트 실행
```bash
psql -d your_database -f database/test-dependency-cycle-safe.sql
```
포괄적인 테스트 스위트 실행으로 모든 기능 검증

## 주요 기능

### 순환 참조 방지
- **자기 참조 방지**: 태스크가 자신에게 의존하는 것 차단
- **직접 순환 방지**: A→B, B→A 형태의 직접 순환 차단  
- **간접 순환 방지**: A→B→C→A 형태의 복잡한 순환 차단

### 통합 시스템 지원
- **parent_task_id**: 기존 계층 구조 시스템 호환
- **task_dependencies**: 새로운 의존성 시스템
- **충돌 방지**: 두 시스템 간 모순 자동 감지

### 고급 기능
- **의존성 체인 분석**: 태스크 간 의존 경로 추적
- **날짜 검증**: 의존성 타입에 따른 날짜 일관성 확인
- **자동 날짜 조정**: 상위 태스크 날짜 변경 시 하위 태스크 자동 업데이트

## 사용 가능한 함수들

### 순환 검사 함수
- `check_dependency_cycle(source_id, target_id)`: 고급 순환 검사
- `check_dependency_cycle_simple(source_id, target_id)`: 단순 순환 검사  
- `check_task_cycle_unified(child_id, parent_id)`: parent_task_id용 통합 검사

### 분석 함수
- `get_dependency_chain(source_id, target_id)`: 의존성 경로 반환
- `get_all_dependent_tasks(task_id)`: 모든 의존 태스크 조회
- `get_all_prerequisite_tasks(task_id)`: 모든 선행 태스크 조회
- `get_all_subtasks(task_id)`: 모든 하위 태스크 조회 (parent_task_id)

### 뷰
- `v_task_dependency_graph`: 의존성 그래프 시각화
- `v_task_relationships`: 모든 태스크 관계 통합
- `v_circular_dependency_check`: 순환 참조 감지
- `v_dependency_stats`: 의존성 통계

## 트러블슈팅

### 권한 에러
```sql
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
```

### 트리거 충돌
기존 트리거와 충돌하는 경우:
```sql
-- 문제 트리거 비활성화
ALTER TABLE public.task_dependencies DISABLE TRIGGER problematic_trigger_name;
```

### 성능 이슈
대량 데이터에서 성능 문제가 있는 경우:
```sql
-- 의존성 테이블 인덱스 확인
CREATE INDEX IF NOT EXISTS idx_task_dependencies_source ON public.task_dependencies(source_task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_target ON public.task_dependencies(target_task_id);
```

## 검증

설치 후 다음 쿼리로 시스템이 정상 작동하는지 확인:

```sql
-- 1. 함수 존재 확인
SELECT proname FROM pg_proc WHERE proname LIKE '%dependency%cycle%';

-- 2. 트리거 확인  
SELECT tgname, tgenabled FROM pg_trigger WHERE tgrelid = 'public.task_dependencies'::regclass;

-- 3. 간단한 순환 검사 테스트
SELECT check_dependency_cycle_simple(gen_random_uuid(), gen_random_uuid());
```

모든 설치가 완료되면 순환 참조 없는 안전한 태스크 의존성 시스템을 사용할 수 있습니다.