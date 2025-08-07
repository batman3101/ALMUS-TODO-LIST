-- ===============================================
-- 팀 조회 테스트 (auth.uid() 없이)
-- ===============================================

-- 1. 모든 팀 확인
SELECT 
    id, 
    name, 
    owner_id, 
    created_at,
    settings
FROM public.teams 
ORDER BY created_at DESC;

-- 2. 특정 사용자 ID로 팀 확인 (실제 사용자 ID로 교체)
SELECT 
    id, 
    name, 
    owner_id, 
    created_at
FROM public.teams 
WHERE owner_id = 'd10a1bba-6c86-480b-9ee5-878a486eed2d'  -- 실제 사용자 ID로 교체
ORDER BY created_at DESC;

-- 3. RLS가 제대로 설정되었는지 확인
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    relowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'teams';

-- 4. 현재 활성화된 정책들 확인
SELECT 
    policyname,
    cmd,
    permissive,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'teams'
ORDER BY policyname;