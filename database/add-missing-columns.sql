-- ===============================================
-- team_members 테이블 누락 컬럼 추가
-- ===============================================

-- 1. team_members 테이블 현재 구조 확인
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'team_members'
ORDER BY ordinal_position;

-- 2. status 컬럼 추가
ALTER TABLE public.team_members 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';

-- 3. 기존 데이터에 기본값 설정
UPDATE public.team_members 
SET status = 'ACTIVE' 
WHERE status IS NULL;

-- 4. 추가된 컬럼 확인
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'team_members'
    AND column_name = 'status';