-- ===============================================
-- CRITICAL: RLS 정책 무한 재귀 해결
-- ===============================================
-- 실행 방법: Supabase Dashboard → SQL Editor → 아래 코드 실행

-- 1. 기존 문제있는 정책들 삭제
DROP POLICY IF EXISTS "Users can insert team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view their teams" ON public.teams;

-- 2. 안전한 teams 정책 생성
CREATE POLICY "Teams are viewable by owner and members" 
ON public.teams FOR SELECT 
USING (
  owner_id = auth.uid() OR 
  id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Users can create teams" 
ON public.teams FOR INSERT 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Team owners can update teams" 
ON public.teams FOR UPDATE 
USING (owner_id = auth.uid()) 
WITH CHECK (owner_id = auth.uid());

-- 3. 안전한 team_members 정책 생성 (순환 참조 제거)
CREATE POLICY "Team members can view team membership" 
ON public.team_members FOR SELECT 
USING (
  user_id = auth.uid() OR 
  team_id IN (SELECT id FROM public.teams WHERE owner_id = auth.uid())
);

CREATE POLICY "Team owners can manage members" 
ON public.team_members FOR INSERT 
WITH CHECK (
  team_id IN (SELECT id FROM public.teams WHERE owner_id = auth.uid()) OR
  user_id = auth.uid()
);

CREATE POLICY "Team owners can update member roles" 
ON public.team_members FOR UPDATE 
USING (team_id IN (SELECT id FROM public.teams WHERE owner_id = auth.uid())) 
WITH CHECK (team_id IN (SELECT id FROM public.teams WHERE owner_id = auth.uid()));

CREATE POLICY "Team owners can remove members" 
ON public.team_members FOR DELETE 
USING (team_id IN (SELECT id FROM public.teams WHERE owner_id = auth.uid()));

-- 4. users 테이블 RLS 활성화 및 정책 (필요시)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" 
ON public.users FOR SELECT 
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" 
ON public.users FOR UPDATE 
USING (id = auth.uid()) 
WITH CHECK (id = auth.uid());