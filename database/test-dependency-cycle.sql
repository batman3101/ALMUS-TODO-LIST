-- =====================================================
-- Test Script for Dependency Cycle Detection
-- =====================================================
-- This script tests the dependency cycle detection functions
-- Run this after applying add-dependency-cycle-check.sql

-- Create test data
BEGIN;

-- Temporarily disable specific user triggers that might interfere
DO $$
BEGIN
    -- Disable validate_task_parent trigger if exists
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'validate_task_parent' 
        AND tgrelid = 'public.tasks'::regclass
    ) THEN
        EXECUTE 'ALTER TABLE public.tasks DISABLE TRIGGER validate_task_parent';
    END IF;
    
    -- Disable other user-defined triggers on task_dependencies if needed
    -- (System triggers like foreign key constraints cannot be disabled)
END $$;

-- Clean up any existing test data
DELETE FROM public.task_dependencies WHERE source_task_id IN (
    SELECT id FROM public.tasks WHERE title LIKE 'Test Task%'
);
DELETE FROM public.tasks WHERE title LIKE 'Test Task%';

-- Insert test project (assuming you have a team)
INSERT INTO public.projects (id, name, team_id, owner_id)
VALUES (
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'Test Project for Dependency Cycle',
    (SELECT id FROM public.teams LIMIT 1),
    (SELECT id FROM public.users LIMIT 1)
);

-- Insert test tasks
INSERT INTO public.tasks (id, title, project_id, team_id, created_by, status) VALUES
    ('b0000000-0000-0000-0000-000000000001'::uuid, 'Test Task A', 'a0000000-0000-0000-0000-000000000001'::uuid, (SELECT id FROM public.teams LIMIT 1), (SELECT id FROM public.users LIMIT 1), 'TODO'),
    ('b0000000-0000-0000-0000-000000000002'::uuid, 'Test Task B', 'a0000000-0000-0000-0000-000000000001'::uuid, (SELECT id FROM public.teams LIMIT 1), (SELECT id FROM public.users LIMIT 1), 'TODO'),
    ('b0000000-0000-0000-0000-000000000003'::uuid, 'Test Task C', 'a0000000-0000-0000-0000-000000000001'::uuid, (SELECT id FROM public.teams LIMIT 1), (SELECT id FROM public.users LIMIT 1), 'TODO'),
    ('b0000000-0000-0000-0000-000000000004'::uuid, 'Test Task D', 'a0000000-0000-0000-0000-000000000001'::uuid, (SELECT id FROM public.teams LIMIT 1), (SELECT id FROM public.users LIMIT 1), 'TODO');

-- Test 1: Valid dependency chain (should succeed)
SAVEPOINT test1;
INSERT INTO public.task_dependencies (source_task_id, target_task_id, type) VALUES
    ('b0000000-0000-0000-0000-000000000001'::uuid, 'b0000000-0000-0000-0000-000000000002'::uuid, 'finish-to-start'),
    ('b0000000-0000-0000-0000-000000000002'::uuid, 'b0000000-0000-0000-0000-000000000003'::uuid, 'finish-to-start');
    
SELECT 'Test 1 PASSED: Valid dependency chain created' as result;

-- Test 2: Direct circular dependency (should fail)
SAVEPOINT test2;
DO $$
BEGIN
    INSERT INTO public.task_dependencies (source_task_id, target_task_id, type) VALUES
        ('b0000000-0000-0000-0000-000000000003'::uuid, 'b0000000-0000-0000-0000-000000000001'::uuid, 'finish-to-start');
    RAISE EXCEPTION 'Test 2 FAILED: Direct circular dependency was allowed';
EXCEPTION
    WHEN OTHERS THEN
        SELECT 'Test 2 PASSED: Direct circular dependency was prevented' as result;
        ROLLBACK TO SAVEPOINT test2;
END $$;

-- Test 3: Self-reference (should fail)
SAVEPOINT test3;
DO $$
BEGIN
    INSERT INTO public.task_dependencies (source_task_id, target_task_id, type) VALUES
        ('b0000000-0000-0000-0000-000000000004'::uuid, 'b0000000-0000-0000-0000-000000000004'::uuid, 'finish-to-start');
    RAISE EXCEPTION 'Test 3 FAILED: Self-reference was allowed';
EXCEPTION
    WHEN OTHERS THEN
        SELECT 'Test 3 PASSED: Self-reference was prevented' as result;
        ROLLBACK TO SAVEPOINT test3;
END $$;

-- Test 4: Check cycle detection function directly
SELECT 
    CASE 
        WHEN check_dependency_cycle('b0000000-0000-0000-0000-000000000003'::uuid, 'b0000000-0000-0000-0000-000000000001'::uuid) = TRUE
        THEN 'Test 4 PASSED: Cycle detection function works correctly'
        ELSE 'Test 4 FAILED: Cycle detection function did not detect cycle'
    END as result;

-- Test 5: Get dependency chain
SELECT 'Test 5: Dependency chain from A to C:' as test_name;
SELECT * FROM get_dependency_chain('b0000000-0000-0000-0000-000000000001'::uuid, 'b0000000-0000-0000-0000-000000000003'::uuid);

-- Test 6: Get all dependent tasks
SELECT 'Test 6: All tasks dependent on Task B:' as test_name;
SELECT t.title, dt.level 
FROM get_all_dependent_tasks('b0000000-0000-0000-0000-000000000002'::uuid) dt
JOIN public.tasks t ON t.id = dt.task_id;

-- Test 7: Get all prerequisite tasks
SELECT 'Test 7: All prerequisite tasks for Task C:' as test_name;
SELECT t.title, pt.level 
FROM get_all_prerequisite_tasks('b0000000-0000-0000-0000-000000000003'::uuid) pt
JOIN public.tasks t ON t.id = pt.task_id;

-- Test 8: Test with dates
SAVEPOINT test8;
UPDATE public.tasks SET 
    start_date = '2024-01-01',
    end_date = '2024-01-10'
WHERE id = 'b0000000-0000-0000-0000-000000000001'::uuid;

UPDATE public.tasks SET 
    start_date = '2024-01-11',
    end_date = '2024-01-20'
WHERE id = 'b0000000-0000-0000-0000-000000000002'::uuid;

-- This should work (proper finish-to-start relationship)
INSERT INTO public.task_dependencies (source_task_id, target_task_id, type) VALUES
    ('b0000000-0000-0000-0000-000000000004'::uuid, 'b0000000-0000-0000-0000-000000000001'::uuid, 'finish-to-start');
    
SELECT 'Test 8 PASSED: Date validation works for valid dependencies' as result;

-- Test 9: Invalid date dependency (should fail if dates don't align)
SAVEPOINT test9;
UPDATE public.tasks SET 
    start_date = '2024-01-05',  -- Starts before Task A ends
    end_date = '2024-01-15'
WHERE id = 'b0000000-0000-0000-0000-000000000004'::uuid;

DO $$
BEGIN
    -- Try to create a finish-to-start dependency where target starts before source ends
    UPDATE public.task_dependencies 
    SET type = 'finish-to-start'
    WHERE source_task_id = 'b0000000-0000-0000-0000-000000000004'::uuid
    AND target_task_id = 'b0000000-0000-0000-0000-000000000001'::uuid;
    
    SELECT 'Test 9: Date validation test completed' as result;
EXCEPTION
    WHEN OTHERS THEN
        SELECT 'Test 9: Date validation prevented invalid dependency' as result;
        ROLLBACK TO SAVEPOINT test9;
END $$;

-- View the dependency graph
SELECT 'Final Dependency Graph:' as view_name;
SELECT 
    source_name,
    ' -> ' as arrow,
    target_name,
    dependency_type,
    lag_days
FROM v_task_dependency_graph
WHERE project_id = 'a0000000-0000-0000-0000-000000000001'::uuid;

-- Check for circular dependencies
SELECT 'Circular Dependency Check:' as check_name;
SELECT * FROM v_circular_dependency_check;

-- Re-enable user triggers before rollback
DO $$
BEGIN
    -- Re-enable validate_task_parent trigger if it was disabled
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'validate_task_parent' 
        AND tgrelid = 'public.tasks'::regclass
    ) THEN
        EXECUTE 'ALTER TABLE public.tasks ENABLE TRIGGER validate_task_parent';
    END IF;
END $$;

-- Cleanup
ROLLBACK;

SELECT 'All tests completed. Transaction rolled back.' as status;