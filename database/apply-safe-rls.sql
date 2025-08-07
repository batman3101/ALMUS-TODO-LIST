-- ===============================================
-- 안전한 RLS 정책 적용 (무한 재귀 없음)
-- ===============================================

-- 1. RLS 다시 활성화
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 2. teams 테이블 정책 (단순하고 안전함)
CREATE POLICY "teams_can_select" 
ON public.teams FOR SELECT 
USING (
  owner_id = auth.uid() OR
  id IN (
    SELECT team_id FROM public.team_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "teams_can_insert" 
ON public.teams FOR INSERT 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "teams_can_update" 
ON public.teams FOR UPDATE 
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "teams_can_delete" 
ON public.teams FOR DELETE 
USING (owner_id = auth.uid());

-- 3. team_members 테이블 정책 (순환 참조 없음)
CREATE POLICY "members_can_select" 
ON public.team_members FOR SELECT 
USING (
  user_id = auth.uid() OR
  team_id IN (
    SELECT id FROM public.teams WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "members_can_insert" 
ON public.team_members FOR INSERT 
WITH CHECK (
  team_id IN (
    SELECT id FROM public.teams WHERE owner_id = auth.uid()
  )
);

-- 4. 생성된 팀 확인
SELECT id, name, owner_id, created_at 
FROM public.teams 
ORDER BY created_at DESC;

-- 5. 현재 사용자의 팀 확인 (auth.uid()로)
SELECT t.* 
FROM public.teams t
WHERE t.owner_id = auth.uid();

-- 6. 정책이 제대로 적용되었는지 확인
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('teams', 'team_members')
ORDER BY tablename, policyname;