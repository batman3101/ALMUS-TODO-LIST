-- =====================================================
-- Task Dependency Cycle Detection and Prevention
-- =====================================================
-- This script adds functions and triggers to prevent circular dependencies
-- in the task_dependencies table, ensuring a valid DAG (Directed Acyclic Graph)

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS check_dependency_cycle CASCADE;
DROP FUNCTION IF EXISTS get_dependency_chain CASCADE;
DROP FUNCTION IF EXISTS prevent_dependency_cycle CASCADE;

-- =====================================================
-- Function: check_dependency_cycle
-- Purpose: Checks if adding a dependency would create a cycle
-- Returns: TRUE if cycle detected, FALSE otherwise
-- =====================================================
CREATE OR REPLACE FUNCTION check_dependency_cycle(
    p_source_task_id UUID,
    p_target_task_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_visited UUID[];
    v_queue UUID[];
    v_current UUID;
    v_next UUID;
BEGIN
    -- Self-reference check
    IF p_source_task_id = p_target_task_id THEN
        RETURN TRUE;
    END IF;
    
    -- Initialize queue with target task
    v_queue := ARRAY[p_target_task_id];
    v_visited := ARRAY[]::UUID[];
    
    -- BFS traversal to detect cycle
    WHILE array_length(v_queue, 1) > 0 LOOP
        -- Dequeue first element
        v_current := v_queue[1];
        v_queue := v_queue[2:];
        
        -- Check if we've reached the source (cycle detected)
        IF v_current = p_source_task_id THEN
            RETURN TRUE;
        END IF;
        
        -- Skip if already visited
        IF v_current = ANY(v_visited) THEN
            CONTINUE;
        END IF;
        
        -- Mark as visited
        v_visited := array_append(v_visited, v_current);
        
        -- Add all dependencies of current task to queue
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

-- =====================================================
-- Function: get_dependency_chain
-- Purpose: Returns the dependency chain from source to target
-- Used for debugging and error messages
-- =====================================================
CREATE OR REPLACE FUNCTION get_dependency_chain(
    p_source_task_id UUID,
    p_target_task_id UUID
) RETURNS TABLE(
    level INTEGER,
    task_id UUID,
    task_name TEXT,
    dependency_path TEXT
) AS $$
WITH RECURSIVE dependency_path AS (
    -- Base case: start from target task
    SELECT 
        1 as level,
        t.id as task_id,
        t.title as task_name,
        t.title::TEXT as path
    FROM public.tasks t
    WHERE t.id = p_target_task_id
    
    UNION ALL
    
    -- Recursive case: follow dependencies
    SELECT 
        dp.level + 1,
        t.id,
        t.title,
        dp.path || ' -> ' || t.title
    FROM dependency_path dp
    JOIN public.task_dependencies td ON td.source_task_id = dp.task_id
    JOIN public.tasks t ON t.id = td.target_task_id
    WHERE dp.level < 20  -- Prevent infinite recursion
)
SELECT * FROM dependency_path
ORDER BY level;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =====================================================
-- Function: validate_dependency_dates
-- Purpose: Ensures dependency dates are logically consistent
-- =====================================================
CREATE OR REPLACE FUNCTION validate_dependency_dates(
    p_source_task_id UUID,
    p_target_task_id UUID,
    p_dependency_type dependency_type
) RETURNS BOOLEAN AS $$
DECLARE
    v_source_start DATE;
    v_source_end DATE;
    v_target_start DATE;
    v_target_end DATE;
BEGIN
    -- Get task dates
    SELECT start_date, end_date INTO v_source_start, v_source_end
    FROM public.tasks WHERE id = p_source_task_id;
    
    SELECT start_date, end_date INTO v_target_start, v_target_end
    FROM public.tasks WHERE id = p_target_task_id;
    
    -- Skip validation if dates are not set
    IF v_source_start IS NULL OR v_target_start IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Validate based on dependency type
    CASE p_dependency_type
        WHEN 'finish-to-start' THEN
            -- Target should start after source finishes
            IF v_source_end IS NOT NULL AND v_target_start < v_source_end THEN
                RETURN FALSE;
            END IF;
            
        WHEN 'start-to-start' THEN
            -- Target should start after or with source
            IF v_target_start < v_source_start THEN
                RETURN FALSE;
            END IF;
            
        WHEN 'finish-to-finish' THEN
            -- Target should finish after or with source
            IF v_source_end IS NOT NULL AND v_target_end IS NOT NULL 
               AND v_target_end < v_source_end THEN
                RETURN FALSE;
            END IF;
            
        WHEN 'start-to-finish' THEN
            -- Target should finish after source starts
            IF v_target_end IS NOT NULL AND v_target_end < v_source_start THEN
                RETURN FALSE;
            END IF;
    END CASE;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- Function: get_all_dependent_tasks
-- Purpose: Gets all tasks that depend on a given task (recursive)
-- =====================================================
CREATE OR REPLACE FUNCTION get_all_dependent_tasks(
    p_task_id UUID
) RETURNS TABLE(task_id UUID, level INTEGER) AS $$
WITH RECURSIVE dependent_tasks AS (
    -- Base case: direct dependencies
    SELECT 
        td.source_task_id as task_id,
        1 as level
    FROM public.task_dependencies td
    WHERE td.target_task_id = p_task_id
    
    UNION
    
    -- Recursive case: indirect dependencies
    SELECT 
        td.source_task_id,
        dt.level + 1
    FROM dependent_tasks dt
    JOIN public.task_dependencies td ON td.target_task_id = dt.task_id
    WHERE dt.level < 20  -- Prevent infinite recursion
)
SELECT DISTINCT task_id, MIN(level) as level
FROM dependent_tasks
GROUP BY task_id
ORDER BY level;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =====================================================
-- Function: get_all_prerequisite_tasks
-- Purpose: Gets all tasks that must be completed before a given task
-- =====================================================
CREATE OR REPLACE FUNCTION get_all_prerequisite_tasks(
    p_task_id UUID
) RETURNS TABLE(task_id UUID, level INTEGER) AS $$
WITH RECURSIVE prerequisite_tasks AS (
    -- Base case: direct prerequisites
    SELECT 
        td.target_task_id as task_id,
        1 as level
    FROM public.task_dependencies td
    WHERE td.source_task_id = p_task_id
    
    UNION
    
    -- Recursive case: indirect prerequisites
    SELECT 
        td.target_task_id,
        pt.level + 1
    FROM prerequisite_tasks pt
    JOIN public.task_dependencies td ON td.source_task_id = pt.task_id
    WHERE pt.level < 20  -- Prevent infinite recursion
)
SELECT DISTINCT task_id, MIN(level) as level
FROM prerequisite_tasks
GROUP BY task_id
ORDER BY level;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =====================================================
-- Trigger Function: prevent_dependency_cycle
-- Purpose: Prevents insertion/update of dependencies that would create cycles
-- =====================================================
CREATE OR REPLACE FUNCTION prevent_dependency_cycle()
RETURNS TRIGGER AS $$
DECLARE
    v_cycle_path TEXT;
BEGIN
    -- Check for self-reference
    IF NEW.source_task_id = NEW.target_task_id THEN
        RAISE EXCEPTION 'Cannot create self-referencing dependency for task %', NEW.source_task_id
            USING HINT = 'A task cannot depend on itself';
    END IF;
    
    -- Check for cycle
    IF check_dependency_cycle(NEW.source_task_id, NEW.target_task_id) THEN
        -- Get the dependency chain for better error message
        SELECT string_agg(task_name, ' -> ' ORDER BY level) INTO v_cycle_path
        FROM get_dependency_chain(NEW.source_task_id, NEW.target_task_id);
        
        RAISE EXCEPTION 'Creating this dependency would result in a circular reference'
            USING DETAIL = 'Dependency chain: ' || COALESCE(v_cycle_path, 'Unknown'),
                  HINT = 'Review your task dependencies to ensure they form a directed acyclic graph (DAG)';
    END IF;
    
    -- Validate dependency dates if applicable
    IF NOT validate_dependency_dates(NEW.source_task_id, NEW.target_task_id, NEW.type) THEN
        RAISE EXCEPTION 'Dependency dates are not logically consistent with dependency type %', NEW.type
            USING HINT = 'Check that task dates align with the dependency type requirements';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Create Trigger
-- =====================================================
DROP TRIGGER IF EXISTS trg_prevent_dependency_cycle ON public.task_dependencies;

CREATE TRIGGER trg_prevent_dependency_cycle
    BEFORE INSERT OR UPDATE ON public.task_dependencies
    FOR EACH ROW
    EXECUTE FUNCTION prevent_dependency_cycle();

-- =====================================================
-- Function: cascade_task_dates
-- Purpose: Updates dependent task dates when a task's dates change
-- =====================================================
CREATE OR REPLACE FUNCTION cascade_task_dates()
RETURNS TRIGGER AS $$
DECLARE
    v_dependent RECORD;
    v_lag_days INTEGER;
BEGIN
    -- Only proceed if dates have changed
    IF (OLD.start_date IS DISTINCT FROM NEW.start_date) OR 
       (OLD.end_date IS DISTINCT FROM NEW.end_date) THEN
        
        -- Update all dependent tasks based on dependency type
        FOR v_dependent IN 
            SELECT 
                td.source_task_id,
                td.type,
                td.lag,
                t.start_date,
                t.end_date
            FROM public.task_dependencies td
            JOIN public.tasks t ON t.id = td.source_task_id
            WHERE td.target_task_id = NEW.id
        LOOP
            v_lag_days := COALESCE(v_dependent.lag, 0);
            
            -- Update dependent task dates based on dependency type
            CASE v_dependent.type
                WHEN 'finish-to-start' THEN
                    IF NEW.end_date IS NOT NULL THEN
                        UPDATE public.tasks
                        SET start_date = NEW.end_date + v_lag_days
                        WHERE id = v_dependent.source_task_id
                        AND (start_date IS NULL OR start_date < NEW.end_date + v_lag_days);
                    END IF;
                    
                WHEN 'start-to-start' THEN
                    IF NEW.start_date IS NOT NULL THEN
                        UPDATE public.tasks
                        SET start_date = NEW.start_date + v_lag_days
                        WHERE id = v_dependent.source_task_id
                        AND (start_date IS NULL OR start_date < NEW.start_date + v_lag_days);
                    END IF;
                    
                -- Add other dependency types as needed
                ELSE
                    NULL;
            END CASE;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Create Trigger for cascading date updates
-- =====================================================
DROP TRIGGER IF EXISTS trg_cascade_task_dates ON public.tasks;

CREATE TRIGGER trg_cascade_task_dates
    AFTER UPDATE OF start_date, end_date ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION cascade_task_dates();

-- =====================================================
-- Utility Views
-- =====================================================

-- View: Task dependency graph
CREATE OR REPLACE VIEW v_task_dependency_graph AS
SELECT 
    s.id as source_id,
    s.title as source_name,
    s.status as source_status,
    td.type as dependency_type,
    td.lag as lag_days,
    t.id as target_id,
    t.title as target_name,
    t.status as target_status,
    s.project_id
FROM public.task_dependencies td
JOIN public.tasks s ON s.id = td.source_task_id
JOIN public.tasks t ON t.id = td.target_task_id;

-- View: Tasks with circular dependency risk
CREATE OR REPLACE VIEW v_circular_dependency_check AS
WITH RECURSIVE dep_chain AS (
    SELECT 
        source_task_id,
        target_task_id,
        ARRAY[source_task_id, target_task_id] as path,
        1 as depth
    FROM public.task_dependencies
    
    UNION ALL
    
    SELECT 
        dc.source_task_id,
        td.target_task_id,
        dc.path || td.target_task_id,
        dc.depth + 1
    FROM dep_chain dc
    JOIN public.task_dependencies td ON td.source_task_id = dc.target_task_id
    WHERE dc.depth < 10
    AND NOT (td.target_task_id = ANY(dc.path))
)
SELECT 
    source_task_id,
    target_task_id,
    path,
    depth
FROM dep_chain
WHERE source_task_id = target_task_id;

-- =====================================================
-- Grant necessary permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION check_dependency_cycle TO authenticated;
GRANT EXECUTE ON FUNCTION get_dependency_chain TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_dependent_tasks TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_prerequisite_tasks TO authenticated;
GRANT EXECUTE ON FUNCTION validate_dependency_dates TO authenticated;

GRANT SELECT ON v_task_dependency_graph TO authenticated;
GRANT SELECT ON v_circular_dependency_check TO authenticated;

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON FUNCTION check_dependency_cycle IS 'Checks if adding a dependency would create a circular reference';
COMMENT ON FUNCTION get_dependency_chain IS 'Returns the dependency chain between two tasks for debugging';
COMMENT ON FUNCTION get_all_dependent_tasks IS 'Returns all tasks that depend on a given task (recursively)';
COMMENT ON FUNCTION get_all_prerequisite_tasks IS 'Returns all prerequisite tasks for a given task (recursively)';
COMMENT ON FUNCTION validate_dependency_dates IS 'Validates that dependency dates are logically consistent';
COMMENT ON FUNCTION prevent_dependency_cycle IS 'Trigger function to prevent circular dependencies';
COMMENT ON FUNCTION cascade_task_dates IS 'Cascades date changes to dependent tasks';

COMMENT ON VIEW v_task_dependency_graph IS 'Visual representation of task dependencies';
COMMENT ON VIEW v_circular_dependency_check IS 'Detects potential circular dependencies in the task graph';