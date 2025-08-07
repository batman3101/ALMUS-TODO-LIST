-- ===============================================
-- 모든 RLS 정책 완전 정리 후 새로 시작
-- ===============================================

-- 1. teams 테이블 모든 정책 강제 삭제
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners can delete their teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners can update their teams" ON public.teams;
DROP POLICY IF EXISTS "Users can view teams they belong to" ON public.teams;
DROP POLICY IF EXISTS "teams_can_delete" ON public.teams;
DROP POLICY IF EXISTS "teams_can_insert" ON public.teams;
DROP POLICY IF EXISTS "teams_can_select" ON public.teams;
DROP POLICY IF EXISTS "teams_can_update" ON public.teams;

-- 2. team_members 테이블 모든 정책 삭제
DROP POLICY IF EXISTS "Team members can view their team members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can add members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can update members" ON public.team_members;
DROP POLICY IF EXISTS "members_can_insert" ON public.team_members;
DROP POLICY IF EXISTS "members_can_select" ON public.team_members;

-- 3. 정책 삭제 확인
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('teams', 'team_members');

-- 4. RLS 비활성화 (개발 단계용)
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members DISABLE ROW LEVEL SECURITY;

-- 5. 이제 애플리케이션 테스트
-- 브라우저 새로고침 후 팀이 제대로 보이는지 확인

-- 6. 테스트: 팀 조회가 잘 되는지 확인
SELECT 
    id,
    name,
    owner_id,
    created_at
FROM public.teams
ORDER BY created_at DESC;

-- ===============================================
-- 선택사항: 나중에 RLS 다시 활성화하고 싶다면
-- ===============================================
/*
-- RLS 재활성화
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 매우 단순한 정책 (무한 재귀 불가능)
CREATE POLICY "simple_teams_all" 
ON public.teams FOR ALL 
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "simple_members_all" 
ON public.team_members FOR ALL 
USING (true)  -- 모든 멤버 접근 허용 (단순화)
WITH CHECK (true);
*/