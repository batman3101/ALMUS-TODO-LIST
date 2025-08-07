-- ===============================================
-- 긴급: 무한 재귀 RLS 정책 해결
-- ===============================================
-- Supabase Dashboard → SQL Editor에서 전체 실행

-- 1. 모든 teams 정책 강제 삭제
DROP POLICY IF EXISTS "allow_select_teams" ON public.teams;
DROP POLICY IF EXISTS "allow_insert_teams" ON public.teams;
DROP POLICY IF EXISTS "allow_update_teams" ON public.teams;
DROP POLICY IF EXISTS "allow_delete_teams" ON public.teams;
DROP POLICY IF EXISTS "teams_select_policy" ON public.teams;
DROP POLICY IF EXISTS "teams_insert_policy" ON public.teams;
DROP POLICY IF EXISTS "teams_update_policy" ON public.teams;
DROP POLICY IF EXISTS "teams_delete_policy" ON public.teams;
DROP POLICY IF EXISTS "Teams are viewable by owner and members" ON public.teams;
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners can update teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners can delete teams" ON public.teams;

-- 2. 모든 team_members 정책 삭제
DROP POLICY IF EXISTS "team_members_select_policy" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert_policy" ON public.team_members;
DROP POLICY IF EXISTS "team_members_update_policy" ON public.team_members;
DROP POLICY IF EXISTS "team_members_delete_policy" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view team membership" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can manage members" ON public.team_members;

-- 3. RLS 임시 비활성화 (테스트용)
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members DISABLE ROW LEVEL SECURITY;

-- 4. 테스트: 이제 팀 생성이 작동해야 함
-- 브라우저에서 팀 생성 시도

-- 5. 테스트 성공 후 아래 실행 (안전한 RLS 정책)
/*
-- RLS 다시 활성화
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 매우 단순한 정책만 적용 (무한 재귀 없음)
CREATE POLICY "teams_simple_select" 
ON public.teams FOR SELECT 
USING (
  owner_id = auth.uid() OR
  auth.uid() IN (
    SELECT user_id FROM public.team_members tm 
    WHERE tm.team_id = teams.id
  )
);

CREATE POLICY "teams_simple_insert" 
ON public.teams FOR INSERT 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "teams_simple_update" 
ON public.teams FOR UPDATE 
USING (owner_id = auth.uid());

CREATE POLICY "teams_simple_delete" 
ON public.teams FOR DELETE 
USING (owner_id = auth.uid());

-- team_members 정책 (teams 테이블 참조 없이)
CREATE POLICY "members_simple_select" 
ON public.team_members FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "members_simple_insert" 
ON public.team_members FOR INSERT 
WITH CHECK (true); -- 일단 모든 INSERT 허용 (나중에 제한)

CREATE POLICY "members_simple_update" 
ON public.team_members FOR UPDATE 
USING (false); -- 업데이트 금지

CREATE POLICY "members_simple_delete" 
ON public.team_members FOR DELETE 
USING (false); -- 삭제 금지
*/