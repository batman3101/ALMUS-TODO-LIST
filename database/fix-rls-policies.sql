-- Fix RLS Policy Infinite Recursion
-- 순환 참조 문제를 해결하기 위한 RLS 정책 수정

-- 기존 문제가 있는 정책들 삭제
DROP POLICY IF EXISTS "Team members can read team membership" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can manage members" ON public.team_members;
DROP POLICY IF EXISTS "Team members can read team info" ON public.teams;
DROP POLICY IF EXISTS "Team members can read projects" ON public.projects;
DROP POLICY IF EXISTS "Team members can create projects" ON public.projects;
DROP POLICY IF EXISTS "Team members can read tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team members can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team members can read comments" ON public.comments;

-- 수정된 안전한 RLS 정책들

-- Teams policies (순환 참조 제거)
CREATE POLICY "Users can read teams they own" ON public.teams FOR SELECT 
USING (owner_id = auth.uid());

CREATE POLICY "Users can read teams they belong to" ON public.teams FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.team_id = id 
    AND tm.user_id = auth.uid() 
    AND tm.is_active = true
));

CREATE POLICY "Team owners can update their teams" ON public.teams FOR UPDATE 
USING (owner_id = auth.uid());

CREATE POLICY "Users can create teams" ON public.teams FOR INSERT 
WITH CHECK (owner_id = auth.uid());

-- Team members policies (직접 참조만 사용)
CREATE POLICY "Users can read their own team memberships" ON public.team_members FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can read team memberships for teams they belong to" ON public.team_members FOR SELECT 
USING (team_id IN (
    SELECT tm.team_id FROM public.team_members tm 
    WHERE tm.user_id = auth.uid() AND tm.is_active = true
));

CREATE POLICY "Team owners can manage all members" ON public.team_members FOR ALL 
USING (team_id IN (
    SELECT t.id FROM public.teams t 
    WHERE t.owner_id = auth.uid()
));

CREATE POLICY "Team admins can manage members" ON public.team_members FOR ALL 
USING (team_id IN (
    SELECT tm.team_id FROM public.team_members tm 
    WHERE tm.user_id = auth.uid() 
    AND tm.role IN ('ADMIN') 
    AND tm.is_active = true
));

-- Projects policies
CREATE POLICY "Users can read projects in their teams" ON public.projects FOR SELECT 
USING (team_id IN (
    SELECT tm.team_id FROM public.team_members tm 
    WHERE tm.user_id = auth.uid() AND tm.is_active = true
));

CREATE POLICY "Project owners can update projects" ON public.projects FOR UPDATE 
USING (owner_id = auth.uid());

CREATE POLICY "Team members can create projects in their teams" ON public.projects FOR INSERT 
WITH CHECK (team_id IN (
    SELECT tm.team_id FROM public.team_members tm 
    WHERE tm.user_id = auth.uid() AND tm.is_active = true
));

-- Tasks policies
CREATE POLICY "Users can read tasks in their teams" ON public.tasks FOR SELECT 
USING (team_id IN (
    SELECT tm.team_id FROM public.team_members tm 
    WHERE tm.user_id = auth.uid() AND tm.is_active = true
));

CREATE POLICY "Task assignees and creators can update tasks" ON public.tasks FOR UPDATE 
USING (assignee_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Team members can create tasks" ON public.tasks FOR INSERT 
WITH CHECK (team_id IN (
    SELECT tm.team_id FROM public.team_members tm 
    WHERE tm.user_id = auth.uid() AND tm.is_active = true
));

-- Comments policies (단순화)
CREATE POLICY "Users can read comments in their teams" ON public.comments FOR SELECT 
USING (
    CASE 
        WHEN resource_type = 'TASK' THEN 
            resource_id IN (
                SELECT t.id FROM public.tasks t 
                JOIN public.team_members tm ON t.team_id = tm.team_id
                WHERE tm.user_id = auth.uid() AND tm.is_active = true
            )
        WHEN resource_type = 'PROJECT' THEN
            resource_id IN (
                SELECT p.id FROM public.projects p 
                JOIN public.team_members tm ON p.team_id = tm.team_id
                WHERE tm.user_id = auth.uid() AND tm.is_active = true
            )
        ELSE true
    END
);

CREATE POLICY "Team members can create comments" ON public.comments FOR INSERT 
WITH CHECK (author_id = auth.uid());

CREATE POLICY "Comment authors can update their comments" ON public.comments FOR UPDATE 
USING (author_id = auth.uid());

-- 새 사용자를 위한 트리거 함수 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'User'),
    'VIEWER'
  );
  RETURN NEW;
END;
$$;

-- auth.users 테이블에 트리거 생성 (사용자 생성 시 자동으로 public.users에 추가)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();