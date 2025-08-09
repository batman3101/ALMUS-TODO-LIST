-- =====================================================
-- 통합 순환 참조 방지 시스템
-- =====================================================
-- 기존 parent_task_id 시스템과 task_dependencies 시스템을 모두 지원

-- 1. 먼저 기존 트리거 비활성화 (존재하는 경우)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'validate_task_parent' 
        AND tgrelid = 'public.tasks'::regclass
    ) THEN
        ALTER TABLE public.tasks DISABLE TRIGGER validate_task_parent;
    END IF;
END $$;

-- 2. 기존 parent_task_id 관련 함수 삭제 (충돌 방지)
DROP FUNCTION IF EXISTS check_task_cycle CASCADE;
DROP FUNCTION IF EXISTS validate_task_parent CASCADE;

-- 3. 통합된 순환 참조 검사 함수 생성
CREATE OR REPLACE FUNCTION check_task_cycle_unified(
    child_id UUID,
    potential_parent_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    current_parent_id UUID;
BEGIN
    -- parent_task_id 기반 순환 검사 (기존 로직 유지)
    current_parent_id := potential_parent_id;
    
    WHILE current_parent_id IS NOT NULL LOOP
        IF current_parent_id = child_id THEN
            RETURN TRUE; -- 순환 참조 발견
        END IF;
        
        -- parent_task_id 체인 따라가기
        SELECT parent_task_id INTO current_parent_id 
        FROM public.tasks 
        WHERE id = current_parent_id;
    END LOOP;
    
    -- task_dependencies 테이블도 확인
    IF EXISTS (
        WITH RECURSIVE dep_chain AS (
            SELECT target_task_id
            FROM public.task_dependencies
            WHERE source_task_id = potential_parent_id
            
            UNION
            
            SELECT td.target_task_id
            FROM dep_chain dc
            JOIN public.task_dependencies td ON td.source_task_id = dc.target_task_id
        )
        SELECT 1 FROM dep_chain WHERE target_task_id = child_id
    ) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 4. 통합 검증 함수 (parent_task_id 용)
CREATE OR REPLACE FUNCTION validate_task_parent_unified()
RETURNS TRIGGER AS $$
BEGIN
    -- parent_task_id가 NULL이면 검증 건너뛰기
    IF NEW.parent_task_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- 부모 태스크가 같은 팀에 있는지 확인
    IF NOT EXISTS (
        SELECT 1 FROM public.tasks 
        WHERE id = NEW.parent_task_id 
        AND team_id = NEW.team_id
    ) THEN
        RAISE EXCEPTION 'Parent task must exist and be in the same team';
    END IF;
    
    -- 순환 참조 검사
    IF check_task_cycle_unified(NEW.id, NEW.parent_task_id) THEN
        RAISE EXCEPTION 'Creating this parent-child relationship would create a cycle';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. parent_task_id 컬럼 추가 (없는 경우)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'parent_task_id'
    ) THEN
        ALTER TABLE public.tasks 
        ADD COLUMN parent_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id 
        ON public.tasks(parent_task_id);
        
        COMMENT ON COLUMN public.tasks.parent_task_id IS 'Parent task for subtask hierarchy';
    END IF;
END $$;

-- 6. 트리거 재생성
DROP TRIGGER IF EXISTS validate_task_parent ON public.tasks;
CREATE TRIGGER validate_task_parent
    BEFORE INSERT OR UPDATE OF parent_task_id ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION validate_task_parent_unified();

-- 7. task_dependencies를 위한 개선된 순환 검사 (기존 함수 대체)
CREATE OR REPLACE FUNCTION prevent_dependency_cycle()
RETURNS TRIGGER AS $$
DECLARE
    v_cycle_path TEXT;
BEGIN
    -- 자기 참조 검사
    IF NEW.source_task_id = NEW.target_task_id THEN
        RAISE EXCEPTION 'Cannot create self-referencing dependency for task %', NEW.source_task_id
            USING HINT = 'A task cannot depend on itself';
    END IF;
    
    -- task_dependencies 테이블에서 순환 검사
    IF check_dependency_cycle(NEW.source_task_id, NEW.target_task_id) THEN
        SELECT string_agg(title, ' -> ' ORDER BY level) INTO v_cycle_path
        FROM get_dependency_chain(NEW.source_task_id, NEW.target_task_id);
        
        RAISE EXCEPTION 'Creating this dependency would result in a circular reference'
            USING DETAIL = 'Dependency chain: ' || COALESCE(v_cycle_path, 'Unknown'),
                  HINT = 'Review your task dependencies to ensure they form a directed acyclic graph (DAG)';
    END IF;
    
    -- parent_task_id 체계와의 충돌 검사
    IF EXISTS (
        WITH RECURSIVE parent_chain AS (
            SELECT id, parent_task_id
            FROM public.tasks
            WHERE id = NEW.source_task_id
            
            UNION ALL
            
            SELECT t.id, t.parent_task_id
            FROM public.tasks t
            JOIN parent_chain pc ON t.id = pc.parent_task_id
        )
        SELECT 1 FROM parent_chain WHERE id = NEW.target_task_id
    ) THEN
        RAISE EXCEPTION 'This dependency conflicts with the parent-child task hierarchy'
            USING HINT = 'A task cannot depend on its parent or ancestor tasks';
    END IF;
    
    -- 날짜 검증
    IF NOT validate_dependency_dates(NEW.source_task_id, NEW.target_task_id, NEW.type) THEN
        RAISE EXCEPTION 'Dependency dates are not logically consistent with dependency type %', NEW.type
            USING HINT = 'Check that task dates align with the dependency type requirements';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 통합 뷰: 모든 태스크 관계 표시
CREATE OR REPLACE VIEW v_task_relationships AS
SELECT 
    'parent_child' as relationship_type,
    t.id as source_id,
    t.title as source_title,
    p.id as target_id,
    p.title as target_title,
    t.project_id,
    t.team_id
FROM public.tasks t
JOIN public.tasks p ON t.parent_task_id = p.id

UNION ALL

SELECT 
    'dependency' as relationship_type,
    td.source_task_id as source_id,
    s.title as source_title,
    td.target_task_id as target_id,
    t.title as target_title,
    s.project_id,
    s.team_id
FROM public.task_dependencies td
JOIN public.tasks s ON s.id = td.source_task_id
JOIN public.tasks t ON t.id = td.target_task_id;

-- 9. 도우미 함수: 태스크의 모든 자식 가져오기
CREATE OR REPLACE FUNCTION get_all_subtasks(
    p_task_id UUID
) RETURNS TABLE(task_id UUID, level INTEGER, title TEXT) AS $$
WITH RECURSIVE subtask_tree AS (
    SELECT 
        id as task_id,
        1 as level,
        title
    FROM public.tasks
    WHERE parent_task_id = p_task_id
    
    UNION ALL
    
    SELECT 
        t.id,
        st.level + 1,
        t.title
    FROM public.tasks t
    JOIN subtask_tree st ON t.parent_task_id = st.task_id
    WHERE st.level < 20  -- 무한 재귀 방지
)
SELECT * FROM subtask_tree
ORDER BY level, title;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 10. 도우미 함수: 태스크의 루트 부모 찾기
CREATE OR REPLACE FUNCTION get_root_parent(
    p_task_id UUID
) RETURNS UUID AS $$
DECLARE
    current_id UUID;
    parent_id UUID;
BEGIN
    current_id := p_task_id;
    
    LOOP
        SELECT parent_task_id INTO parent_id
        FROM public.tasks
        WHERE id = current_id;
        
        EXIT WHEN parent_id IS NULL;
        current_id := parent_id;
    END LOOP;
    
    RETURN current_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 권한 부여
GRANT EXECUTE ON FUNCTION check_task_cycle_unified TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_subtasks TO authenticated;
GRANT EXECUTE ON FUNCTION get_root_parent TO authenticated;
GRANT SELECT ON v_task_relationships TO authenticated;

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '통합 순환 참조 방지 시스템이 성공적으로 설치되었습니다.';
    RAISE NOTICE '- parent_task_id 기반 계층 구조 지원';
    RAISE NOTICE '- task_dependencies 테이블 기반 의존성 지원';
    RAISE NOTICE '- 두 시스템 간 충돌 방지';
END $$;