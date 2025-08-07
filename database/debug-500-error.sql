-- ===============================================
-- 500 에러 디버깅 SQL 스크립트
-- ===============================================
-- Supabase Dashboard → SQL Editor에서 순서대로 실행

-- ===============================================
-- STEP 1: 테이블 구조 확인
-- ===============================================
-- teams 테이블이 존재하는지 확인
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'teams'
) as teams_table_exists;

-- teams 테이블 구조 확인
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
-- STEP 2: 컬럼 타입 확인 및 수정
-- ===============================================
-- settings 컬럼이 JSONB 타입인지 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'teams' 
    AND column_name = 'settings';

-- 만약 settings 컬럼이 없거나 타입이 다르면 추가/수정
DO $$ 
BEGIN
    -- settings 컬럼이 없으면 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'teams' 
        AND column_name = 'settings'
    ) THEN
        ALTER TABLE public.teams ADD COLUMN settings JSONB DEFAULT '{}';
    END IF;
    
    -- member_count 컬럼이 없으면 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'teams' 
        AND column_name = 'member_count'
    ) THEN
        ALTER TABLE public.teams ADD COLUMN member_count INTEGER DEFAULT 1;
    END IF;

    -- is_active 컬럼이 없으면 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'teams' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.teams ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- ===============================================
-- STEP 3: 트리거 확인 및 비활성화
-- ===============================================
-- teams 테이블의 모든 트리거 확인
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public' 
    AND event_object_table = 'teams';

-- 문제가 있을 수 있는 트리거 임시 비활성화
ALTER TABLE public.teams DISABLE TRIGGER ALL;

-- ===============================================
-- STEP 4: 간단한 INSERT 테스트
-- ===============================================
-- 직접 INSERT 테스트 (RLS 무시)
INSERT INTO public.teams (
    name,
    description,
    owner_id,
    created_at,
    updated_at
) VALUES (
    'Test Team Debug',
    'Testing 500 error',
    auth.uid(),
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;

-- 결과 확인
SELECT * FROM public.teams WHERE name = 'Test Team Debug';

-- ===============================================
-- STEP 5: RLS 정책 간소화
-- ===============================================
-- 모든 정책 삭제 후 최소한의 정책만 생성
DROP POLICY IF EXISTS "teams_select_policy" ON public.teams;
DROP POLICY IF EXISTS "teams_insert_policy" ON public.teams;
DROP POLICY IF EXISTS "teams_update_policy" ON public.teams;
DROP POLICY IF EXISTS "teams_delete_policy" ON public.teams;

-- 매우 간단한 정책으로 테스트
CREATE POLICY "simple_teams_select" 
ON public.teams FOR SELECT 
USING (true);  -- 모든 사용자가 조회 가능 (테스트용)

CREATE POLICY "simple_teams_insert" 
ON public.teams FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);  -- 로그인한 사용자만 생성 가능

-- ===============================================
-- STEP 6: 함수 충돌 확인
-- ===============================================
-- UUID 생성 함수 확인
SELECT EXISTS (
    SELECT 1 FROM pg_extension 
    WHERE extname = 'uuid-ossp'
) as uuid_extension_exists;

-- UUID 확장이 없으면 설치
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===============================================
-- STEP 7: 트리거 재활성화 (테스트 후)
-- ===============================================
-- 문제가 해결되면 트리거 재활성화
-- ALTER TABLE public.teams ENABLE TRIGGER ALL;

-- ===============================================
-- STEP 8: 최종 검증
-- ===============================================
SELECT 
    'Teams table exists' as check_item,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'teams'
    ) as status
UNION ALL
SELECT 
    'Owner_id column exists',
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'teams' 
        AND column_name = 'owner_id'
    )
UNION ALL
SELECT 
    'RLS is enabled',
    EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'teams' 
        AND rowsecurity = true
    )
UNION ALL
SELECT 
    'UUID extension installed',
    EXISTS (
        SELECT 1 FROM pg_extension 
        WHERE extname = 'uuid-ossp'
    );