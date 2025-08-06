-- Teams 및 Team Members 테이블에 대한 RLS 정책 설정
-- 이 스크립트를 Supabase SQL Editor에서 실행하세요

-- =====================================================
-- TEAMS 테이블 RLS 정책
-- =====================================================

-- RLS 활성화
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있을 경우)
DROP POLICY IF EXISTS "Users can view teams they belong to" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners can update their teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners can delete their teams" ON public.teams;

-- 1. 인증된 사용자는 자신이 속한 팀을 볼 수 있음
CREATE POLICY "Users can view teams they belong to" ON public.teams
  FOR SELECT USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
    )
  );

-- 2. 인증된 사용자는 팀을 생성할 수 있음
CREATE POLICY "Authenticated users can create teams" ON public.teams
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth.uid() = owner_id
  );

-- 3. 팀 소유자는 자신의 팀을 업데이트할 수 있음
CREATE POLICY "Team owners can update their teams" ON public.teams
  FOR UPDATE USING (
    auth.uid() = owner_id
  );

-- 4. 팀 소유자는 자신의 팀을 삭제할 수 있음
CREATE POLICY "Team owners can delete their teams" ON public.teams
  FOR DELETE USING (
    auth.uid() = owner_id
  );

-- =====================================================
-- TEAM_MEMBERS 테이블 RLS 정책
-- =====================================================

-- RLS 활성화
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있을 경우)
DROP POLICY IF EXISTS "Team members can view their team members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can add members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can update members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can remove members" ON public.team_members;

-- 1. 팀 멤버는 같은 팀의 다른 멤버를 볼 수 있음
CREATE POLICY "Team members can view their team members" ON public.team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.team_members as tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_members.team_id
      AND teams.owner_id = auth.uid()
    )
  );

-- 2. 팀 소유자는 멤버를 추가할 수 있음
CREATE POLICY "Team owners can add members" ON public.team_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_members.team_id
      AND teams.owner_id = auth.uid()
    )
  );

-- 3. 팀 소유자와 관리자는 멤버 정보를 업데이트할 수 있음
CREATE POLICY "Team owners can update members" ON public.team_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_members.team_id
      AND teams.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.team_members as tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('OWNER', 'ADMIN')
    )
  );

-- 4. 팀 소유자는 멤버를 제거할 수 있음
CREATE POLICY "Team owners can remove members" ON public.team_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_members.team_id
      AND teams.owner_id = auth.uid()
    )
  );

-- =====================================================
-- PROJECTS 테이블 RLS 정책 (보너스)
-- =====================================================

-- RLS 활성화
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Team members can view projects" ON public.projects;
DROP POLICY IF EXISTS "Team members can create projects" ON public.projects;
DROP POLICY IF EXISTS "Project owners can update projects" ON public.projects;
DROP POLICY IF EXISTS "Project owners can delete projects" ON public.projects;

-- 1. 팀 멤버는 팀의 프로젝트를 볼 수 있음
CREATE POLICY "Team members can view projects" ON public.projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = projects.team_id
      AND team_members.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = projects.team_id
      AND teams.owner_id = auth.uid()
    )
  );

-- 2. 팀 멤버는 프로젝트를 생성할 수 있음
CREATE POLICY "Team members can create projects" ON public.projects
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = projects.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('OWNER', 'ADMIN', 'EDITOR')
    ) OR
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = projects.team_id
      AND teams.owner_id = auth.uid()
    )
  );

-- 3. 프로젝트 소유자는 프로젝트를 업데이트할 수 있음
CREATE POLICY "Project owners can update projects" ON public.projects
  FOR UPDATE USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = projects.team_id
      AND teams.owner_id = auth.uid()
    )
  );

-- 4. 프로젝트 소유자는 프로젝트를 삭제할 수 있음
CREATE POLICY "Project owners can delete projects" ON public.projects
  FOR DELETE USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = projects.team_id
      AND teams.owner_id = auth.uid()
    )
  );

-- =====================================================
-- TASKS 테이블 RLS 정책
-- =====================================================

-- RLS 활성화
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Team members can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team members can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Task assignees can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Task creators can delete tasks" ON public.tasks;

-- 1. 팀 멤버는 팀의 태스크를 볼 수 있음
CREATE POLICY "Team members can view tasks" ON public.tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = tasks.team_id
      AND team_members.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = tasks.team_id
      AND teams.owner_id = auth.uid()
    )
  );

-- 2. 팀 멤버는 태스크를 생성할 수 있음
CREATE POLICY "Team members can create tasks" ON public.tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = tasks.team_id
      AND team_members.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = tasks.team_id
      AND teams.owner_id = auth.uid()
    )
  );

-- 3. 할당된 사용자와 생성자는 태스크를 업데이트할 수 있음
CREATE POLICY "Task assignees can update tasks" ON public.tasks
  FOR UPDATE USING (
    auth.uid() = assignee_id OR
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = tasks.team_id
      AND teams.owner_id = auth.uid()
    )
  );

-- 4. 태스크 생성자와 팀 소유자는 태스크를 삭제할 수 있음
CREATE POLICY "Task creators can delete tasks" ON public.tasks
  FOR DELETE USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = tasks.team_id
      AND teams.owner_id = auth.uid()
    )
  );