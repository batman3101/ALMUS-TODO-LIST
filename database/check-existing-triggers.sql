-- =====================================================
-- Check and Manage Existing Triggers
-- =====================================================
-- This script helps identify and manage existing triggers
-- that might conflict with the dependency cycle detection

-- List all triggers on tasks table
SELECT 'Triggers on tasks table:' as info;
SELECT 
    tgname as trigger_name,
    proname as function_name,
    tgenabled as enabled,
    CASE 
        WHEN tgenabled = 'O' THEN 'ENABLED'
        WHEN tgenabled = 'D' THEN 'DISABLED'
        WHEN tgenabled = 'R' THEN 'REPLICA ONLY'
        WHEN tgenabled = 'A' THEN 'ALWAYS'
    END as status
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'public.tasks'::regclass
ORDER BY tgname;

-- List all triggers on task_dependencies table
SELECT 'Triggers on task_dependencies table:' as info;
SELECT 
    tgname as trigger_name,
    proname as function_name,
    tgenabled as enabled,
    CASE 
        WHEN tgenabled = 'O' THEN 'ENABLED'
        WHEN tgenabled = 'D' THEN 'DISABLED'
        WHEN tgenabled = 'R' THEN 'REPLICA ONLY'
        WHEN tgenabled = 'A' THEN 'ALWAYS'
    END as status
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'public.task_dependencies'::regclass
ORDER BY tgname;

-- Check if validate_task_parent function exists
SELECT 'Functions that might interfere:' as info;
SELECT 
    proname as function_name,
    prosrc as source_snippet
FROM pg_proc
WHERE proname LIKE '%validate%task%parent%'
   OR prosrc LIKE '%parent_task_id%'
LIMIT 10;

-- =====================================================
-- Optional: Disable problematic triggers
-- =====================================================
-- Uncomment these lines if you need to disable specific triggers

-- Disable validate_task_parent trigger if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'validate_task_parent' 
        AND tgrelid = 'public.tasks'::regclass
    ) THEN
        ALTER TABLE public.tasks DISABLE TRIGGER validate_task_parent;
        RAISE NOTICE 'Disabled trigger: validate_task_parent';
    END IF;
END $$;

-- =====================================================
-- Safe Application of Dependency Cycle Detection
-- =====================================================
-- This section safely applies the dependency cycle detection
-- without conflicting with existing triggers

-- First, check if our trigger already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trg_prevent_dependency_cycle'
        AND tgrelid = 'public.task_dependencies'::regclass
    ) THEN
        RAISE NOTICE 'Dependency cycle trigger not found. Please run add-dependency-cycle-check.sql first.';
    ELSE
        RAISE NOTICE 'Dependency cycle trigger exists and is ready.';
    END IF;
END $$;