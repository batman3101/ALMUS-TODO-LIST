-- =====================================================
-- 기존 의존성 검증 시스템 수정
-- =====================================================
-- 기존 validate_task_dependency 함수와 누락된 함수들을 수정/추가

-- 1. 누락된 check_dependency_cycle_simple 함수 생성
CREATE OR REPLACE FUNCTION check_dependency_cycle_simple(
    p_source_task_id UUID,
    p_target_task_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_visited UUID[];
    v_queue UUID[];
    v_current UUID;
    v_next UUID;
BEGIN
    -- 자기 참조 검사
    IF p_source_task_id = p_target_task_id THEN
        RETURN TRUE;
    END IF;
    
    -- BFS를 사용한 순환 검사
    v_queue := ARRAY[p_target_task_id];
    v_visited := ARRAY[]::UUID[];
    
    WHILE array_length(v_queue, 1) > 0 LOOP
        -- 큐에서 첫 번째 요소 제거
        v_current := v_queue[1];
        v_queue := v_queue[2:];
        
        -- 소스에 도달했으면 순환 참조
        IF v_current = p_source_task_id THEN
            RETURN TRUE;
        END IF;
        
        -- 이미 방문했으면 건너뛰기
        IF v_current = ANY(v_visited) THEN
            CONTINUE;
        END IF;
        
        -- 방문 표시
        v_visited := array_append(v_visited, v_current);
        
        -- 현재 태스크의 의존성들을 큐에 추가
        FOR v_next IN
            SELECT target_task_id 
            FROM public.task_dependencies
            WHERE source_task_id = v_current
        LOOP
            IF NOT (v_next = ANY(v_visited)) THEN
                v_queue := array_append(v_queue, v_next);
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. 기존 validate_task_dependency 함수 수정 (더 안전하게)
CREATE OR REPLACE FUNCTION validate_task_dependency()
RETURNS TRIGGER AS $$
DECLARE
    v_task_id UUID;
BEGIN
    -- 자기 참조 방지
    IF NEW.source_task_id = NEW.target_task_id THEN
        RAISE EXCEPTION 'Task cannot depend on itself: %', NEW.source_task_id;
    END IF;
    
    -- 직접적인 순환 검사
    IF EXISTS (
        SELECT 1 FROM public.task_dependencies 
        WHERE source_task_id = NEW.target_task_id 
        AND target_task_id = NEW.source_task_id
    ) THEN
        RAISE EXCEPTION 'Direct circular dependency detected between tasks % and %', 
            NEW.source_task_id, NEW.target_task_id;
    END IF;
    
    -- 간접적인 순환 검사 (check_dependency_cycle_simple 함수 사용)
    IF check_dependency_cycle_simple(NEW.source_task_id, NEW.target_task_id) THEN
        RAISE EXCEPTION 'Indirect circular dependency detected: task % would create a cycle with task %', 
            NEW.source_task_id, NEW.target_task_id;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        -- 에러 발생 시 자세한 정보 제공
        RAISE EXCEPTION 'Dependency validation failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$ LANGUAGE plpgsql;

-- 3. 기존 트리거 확인하고 재생성 (필요한 경우)
DO $$
BEGIN
    -- 기존 트리거가 있는지 확인
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_validate_task_dependency' 
        AND tgrelid = 'public.task_dependencies'::regclass
    ) THEN
        DROP TRIGGER trigger_validate_task_dependency ON public.task_dependencies;
    END IF;
    
    -- 새로운 트리거 생성
    CREATE TRIGGER trigger_validate_task_dependency
        BEFORE INSERT OR UPDATE ON public.task_dependencies
        FOR EACH ROW EXECUTE FUNCTION validate_task_dependency();
        
    RAISE NOTICE 'Task dependency validation trigger updated successfully';
END $$;

-- 4. 추가 도우미 함수: 태스크의 모든 의존성 체인 가져오기
CREATE OR REPLACE FUNCTION get_dependency_chain_simple(
    p_task_id UUID
) RETURNS TABLE(task_id UUID, depth INTEGER) AS $$
WITH RECURSIVE dependency_chain AS (
    -- 기본 케이스: 직접 의존성
    SELECT target_task_id as task_id, 1 as depth
    FROM public.task_dependencies
    WHERE source_task_id = p_task_id
    
    UNION ALL
    
    -- 재귀 케이스: 간접 의존성
    SELECT td.target_task_id, dc.depth + 1
    FROM public.task_dependencies td
    JOIN dependency_chain dc ON td.source_task_id = dc.task_id
    WHERE dc.depth < 20  -- 무한 재귀 방지
)
SELECT * FROM dependency_chain
ORDER BY depth, task_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 5. 의존성 통계 뷰
CREATE OR REPLACE VIEW v_dependency_stats AS
SELECT 
    'Total Dependencies' as metric,
    COUNT(*) as value
FROM public.task_dependencies

UNION ALL

SELECT 
    'Tasks with Dependencies',
    COUNT(DISTINCT source_task_id)
FROM public.task_dependencies

UNION ALL

SELECT 
    'Tasks being Depended Upon',
    COUNT(DISTINCT target_task_id)
FROM public.task_dependencies;

-- 6. 권한 부여
GRANT EXECUTE ON FUNCTION check_dependency_cycle_simple TO authenticated;
GRANT EXECUTE ON FUNCTION get_dependency_chain_simple TO authenticated;
GRANT SELECT ON v_dependency_stats TO authenticated;

-- 7. 주석 추가
COMMENT ON FUNCTION check_dependency_cycle_simple IS 'Simple BFS-based cycle detection for task dependencies';
COMMENT ON FUNCTION validate_task_dependency IS 'Trigger function to prevent circular dependencies in task_dependencies table';
COMMENT ON FUNCTION get_dependency_chain_simple IS 'Returns the dependency chain for a given task';
COMMENT ON VIEW v_dependency_stats IS 'Basic statistics about task dependencies';

-- 8. 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '기존 의존성 검증 시스템이 성공적으로 수정되었습니다.';
    RAISE NOTICE '- check_dependency_cycle_simple 함수 추가';
    RAISE NOTICE '- validate_task_dependency 함수 개선';
    RAISE NOTICE '- 트리거 재생성 완료';
END $$;