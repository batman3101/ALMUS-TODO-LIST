-- ===============================================
-- STEP 1: 테이블 존재 확인
-- ===============================================
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'teams'
) as teams_table_exists;

-- ===============================================
-- STEP 2: teams 테이블 구조 확인
-- ===============================================
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'teams'
ORDER BY ordinal_position;

-- ===============================================
-- STEP 3: 누락된 컬럼 추가 (각각 개별 실행)
-- ===============================================

-- 3-1. settings 컬럼 확인 및 추가
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'teams' 
    AND column_name = 'settings';

-- settings 컬럼이 없으면 이 명령어 실행:
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- 3-2. member_count 컬럼 확인 및 추가
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'teams' 
    AND column_name = 'member_count';

-- member_count 컬럼이 없으면 이 명령어 실행:
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 1;

-- 3-3. is_active 컬럼 확인 및 추가
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'teams' 
    AND column_name = 'is_active';

-- is_active 컬럼이 없으면 이 명령어 실행:
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- ===============================================
-- STEP 4: UUID 확장 확인 및 설치
-- ===============================================
SELECT EXISTS (
    SELECT 1 FROM pg_extension 
    WHERE extname = 'uuid-ossp'
) as uuid_extension_exists;

-- 위 결과가 false면 실행:
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===============================================
-- STEP 5: 간단한 INSERT 테스트 (RLS 비활성화 상태)
-- ===============================================
-- RLS 임시 비활성화
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;

-- 테스트 데이터 삽입
INSERT INTO public.teams (
    id,
    name,
    description,
    owner_id,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Debug Test Team',
    'Testing 500 error',
    'd10a1bba-6c86-480b-9ee5-878a486eed2d',  -- 사용자 ID로 교체
    NOW(),
    NOW()
);

-- 결과 확인
SELECT * FROM public.teams WHERE name = 'Debug Test Team';

-- 테스트 데이터 삭제
DELETE FROM public.teams WHERE name = 'Debug Test Team';

-- RLS 다시 활성화
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- ===============================================
-- STEP 6: RLS 정책 재설정 (모두 삭제 후 다시 생성)
-- ===============================================
-- 모든 기존 정책 삭제
DROP POLICY IF EXISTS "teams_select_policy" ON public.teams;
DROP POLICY IF EXISTS "teams_insert_policy" ON public.teams;
DROP POLICY IF EXISTS "teams_update_policy" ON public.teams;
DROP POLICY IF EXISTS "teams_delete_policy" ON public.teams;
DROP POLICY IF EXISTS "simple_teams_select" ON public.teams;
DROP POLICY IF EXISTS "simple_teams_insert" ON public.teams;
DROP POLICY IF EXISTS "anyone_can_select_teams" ON public.teams;
DROP POLICY IF EXISTS "authenticated_can_insert_teams" ON public.teams;
DROP POLICY IF EXISTS "owner_can_update_teams" ON public.teams;
DROP POLICY IF EXISTS "owner_can_delete_teams" ON public.teams;

-- 새로운 정책 생성 (간단한 버전)
CREATE POLICY "allow_select_teams" 
ON public.teams FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "allow_insert_teams" 
ON public.teams FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "allow_update_teams" 
ON public.teams FOR UPDATE 
USING (auth.uid() = owner_id);

CREATE POLICY "allow_delete_teams" 
ON public.teams FOR DELETE 
USING (auth.uid() = owner_id);

-- ===============================================
-- STEP 7: 최종 검증
-- ===============================================
SELECT 
    'Teams table structure is valid' as check_item,
    CASE 
        WHEN COUNT(*) >= 5 THEN 'OK'
        ELSE 'Missing columns'
    END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'teams'
    AND column_name IN ('id', 'name', 'owner_id', 'created_at', 'updated_at');

-- RLS 상태 확인
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
    AND tablename = 'teams';

-- 정책 목록 확인
SELECT 
    policyname,
    cmd,
    permissive
FROM pg_policies
WHERE schemaname = 'public' 
    AND tablename = 'teams';