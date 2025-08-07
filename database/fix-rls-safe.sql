-- ===============================================
-- 안전한 RLS 정책 수정 스크립트 (중복 체크 포함)
-- ===============================================
-- 실행 방법: Supabase Dashboard → SQL Editor → 전체 실행

-- ===============================================
-- STEP 1: 모든 기존 정책 삭제 (안전하게)
-- ===============================================

-- teams 테이블 정책 모두 삭제
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Users can view their teams" ON public.teams;
DROP POLICY IF EXISTS "Teams are viewable by owner and members" ON public.teams;
DROP POLICY IF EXISTS "Team owners can update teams" ON public.teams;
DROP POLICY IF EXISTS "Teams are viewable by team members" ON public.teams;
DROP POLICY IF EXISTS "Users can update their own teams" ON public.teams;
DROP POLICY IF EXISTS "Users can delete their own teams" ON public.teams;

-- team_members 테이블 정책 모두 삭제
DROP POLICY IF EXISTS "Users can insert team members" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view team membership" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can manage members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can update member roles" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can remove members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can leave teams" ON public.team_members;

-- users 테이블 정책 삭제
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

-- ===============================================
-- STEP 2: RLS 활성화 확인
-- ===============================================

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ===============================================
-- STEP 3: teams 테이블 새 정책 생성
-- ===============================================

-- 팀 조회: 소유자이거나 멤버인 경우
CREATE POLICY "teams_select_policy" 
ON public.teams FOR SELECT 
USING (
  owner_id = auth.uid() OR 
  id IN (
    SELECT team_id 
    FROM public.team_members 
    WHERE user_id = auth.uid() 
      AND is_active = true
  )
);

-- 팀 생성: 로그인한 사용자는 누구나 가능
CREATE POLICY "teams_insert_policy" 
ON public.teams FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  owner_id = auth.uid()
);

-- 팀 수정: 소유자만 가능
CREATE POLICY "teams_update_policy" 
ON public.teams FOR UPDATE 
USING (owner_id = auth.uid()) 
WITH CHECK (owner_id = auth.uid());

-- 팀 삭제: 소유자만 가능
CREATE POLICY "teams_delete_policy" 
ON public.teams FOR DELETE 
USING (owner_id = auth.uid());

-- ===============================================
-- STEP 4: team_members 테이블 새 정책 생성
-- ===============================================

-- 멤버 조회: 같은 팀 멤버이거나 팀 소유자
CREATE POLICY "team_members_select_policy" 
ON public.team_members FOR SELECT 
USING (
  user_id = auth.uid() OR 
  team_id IN (
    SELECT id 
    FROM public.teams 
    WHERE owner_id = auth.uid()
  ) OR
  team_id IN (
    SELECT team_id 
    FROM public.team_members AS tm2 
    WHERE tm2.user_id = auth.uid() 
      AND tm2.is_active = true
  )
);

-- 멤버 추가: 팀 소유자만 가능 (자기 자신도 추가 가능)
CREATE POLICY "team_members_insert_policy" 
ON public.team_members FOR INSERT 
WITH CHECK (
  team_id IN (
    SELECT id 
    FROM public.teams 
    WHERE owner_id = auth.uid()
  )
);

-- 멤버 수정: 팀 소유자만 가능
CREATE POLICY "team_members_update_policy" 
ON public.team_members FOR UPDATE 
USING (
  team_id IN (
    SELECT id 
    FROM public.teams 
    WHERE owner_id = auth.uid()
  )
) 
WITH CHECK (
  team_id IN (
    SELECT id 
    FROM public.teams 
    WHERE owner_id = auth.uid()
  )
);

-- 멤버 삭제: 팀 소유자만 가능
CREATE POLICY "team_members_delete_policy" 
ON public.team_members FOR DELETE 
USING (
  team_id IN (
    SELECT id 
    FROM public.teams 
    WHERE owner_id = auth.uid()
  )
);

-- ===============================================
-- STEP 5: users 테이블 새 정책 생성
-- ===============================================

-- 사용자 조회: 모든 로그인 사용자가 가능
CREATE POLICY "users_select_policy" 
ON public.users FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 사용자 추가: 자기 자신만 가능
CREATE POLICY "users_insert_policy" 
ON public.users FOR INSERT 
WITH CHECK (id = auth.uid());

-- 사용자 수정: 자기 자신만 가능
CREATE POLICY "users_update_policy" 
ON public.users FOR UPDATE 
USING (id = auth.uid()) 
WITH CHECK (id = auth.uid());

-- 사용자 삭제: 자기 자신만 가능
CREATE POLICY "users_delete_policy" 
ON public.users FOR DELETE 
USING (id = auth.uid());

-- ===============================================
-- STEP 6: 검증 쿼리 (정책이 잘 적용되었는지 확인)
-- ===============================================

-- 적용된 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('teams', 'team_members', 'users')
ORDER BY tablename, policyname;