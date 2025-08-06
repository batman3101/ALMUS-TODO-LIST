-- =====================================================
-- ALMUS Todo List - 전체 RLS 정책 설정
-- 모든 테이블에 대한 Row Level Security 정책
-- Supabase SQL Editor에서 실행하세요
-- =====================================================

-- =====================================================
-- 1. USERS 테이블 RLS 정책
-- =====================================================

-- RLS 활성화
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Team members can view each other" ON public.users;

-- 사용자는 자신의 프로필을 조회할 수 있음
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (
    auth.uid() = id OR
    -- 같은 팀 멤버들끼리는 서로 볼 수 있음
    EXISTS (
      SELECT 1 FROM public.team_members tm1
      JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
      WHERE tm1.user_id = auth.uid() 
      AND tm2.user_id = users.id
    )
  );

-- 사용자는 자신의 프로필을 생성할 수 있음
CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 사용자는 자신의 프로필을 업데이트할 수 있음
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- =====================================================
-- 2. TEAMS 테이블 RLS 정책
-- =====================================================

-- RLS 활성화
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view teams they belong to" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners can update their teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners can delete their teams" ON public.teams;

-- 사용자는 자신이 속한 팀을 볼 수 있음
CREATE POLICY "Users can view teams they belong to" ON public.teams
  FOR SELECT USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
    )
  );

-- 인증된 사용자는 팀을 생성할 수 있음
CREATE POLICY "Authenticated users can create teams" ON public.teams
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth.uid() = owner_id
  );

-- 팀 소유자는 자신의 팀을 업데이트할 수 있음
CREATE POLICY "Team owners can update their teams" ON public.teams
  FOR UPDATE USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('OWNER', 'ADMIN')
    )
  );

-- 팀 소유자는 자신의 팀을 삭제할 수 있음
CREATE POLICY "Team owners can delete their teams" ON public.teams
  FOR DELETE USING (auth.uid() = owner_id);

-- =====================================================
-- 3. TEAM_MEMBERS 테이블 RLS 정책
-- =====================================================

-- RLS 활성화
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Team members can view their team members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can add members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can update members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can remove members" ON public.team_members;

-- 팀 멤버는 같은 팀의 다른 멤버를 볼 수 있음
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

-- 팀 소유자와 관리자는 멤버를 추가할 수 있음
CREATE POLICY "Team owners can add members" ON public.team_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_id
      AND teams.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('OWNER', 'ADMIN')
    )
  );

-- 팀 소유자와 관리자는 멤버 정보를 업데이트할 수 있음
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

-- 팀 소유자와 관리자는 멤버를 제거할 수 있음
CREATE POLICY "Team owners can remove members" ON public.team_members
  FOR DELETE USING (
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

-- =====================================================
-- 4. TEAM_INVITATIONS 테이블 RLS 정책
-- =====================================================

-- RLS 활성화
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Team admins can view invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Team admins can create invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Invitees can view their invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Team admins can update invitations" ON public.team_invitations;

-- 팀 관리자는 초대장을 볼 수 있음
CREATE POLICY "Team admins can view invitations" ON public.team_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_invitations.team_id
      AND teams.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = team_invitations.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('OWNER', 'ADMIN')
    )
  );

-- 팀 관리자는 초대장을 생성할 수 있음
CREATE POLICY "Team admins can create invitations" ON public.team_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_id
      AND teams.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('OWNER', 'ADMIN')
    )
  );

-- 팀 관리자는 초대장을 업데이트할 수 있음
CREATE POLICY "Team admins can update invitations" ON public.team_invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_invitations.team_id
      AND teams.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = team_invitations.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('OWNER', 'ADMIN')
    )
  );

-- =====================================================
-- 5. PROJECTS 테이블 RLS 정책
-- =====================================================

-- RLS 활성화
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Team members can view projects" ON public.projects;
DROP POLICY IF EXISTS "Team members can create projects" ON public.projects;
DROP POLICY IF EXISTS "Project owners can update projects" ON public.projects;
DROP POLICY IF EXISTS "Project owners can delete projects" ON public.projects;

-- 팀 멤버는 팀의 프로젝트를 볼 수 있음
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

-- 팀 멤버는 프로젝트를 생성할 수 있음 (VIEWER 제외)
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

-- 프로젝트 소유자와 팀 관리자는 프로젝트를 업데이트할 수 있음
CREATE POLICY "Project owners can update projects" ON public.projects
  FOR UPDATE USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = projects.team_id
      AND teams.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = projects.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('OWNER', 'ADMIN')
    )
  );

-- 프로젝트 소유자와 팀 소유자는 프로젝트를 삭제할 수 있음
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
-- 6. TASKS 테이블 RLS 정책
-- =====================================================

-- RLS 활성화
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Team members can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team members can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Task assignees can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Task creators can delete tasks" ON public.tasks;

-- 팀 멤버는 팀의 태스크를 볼 수 있음
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

-- 팀 멤버는 태스크를 생성할 수 있음
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

-- 할당된 사용자, 생성자, 팀 관리자는 태스크를 업데이트할 수 있음
CREATE POLICY "Task assignees can update tasks" ON public.tasks
  FOR UPDATE USING (
    auth.uid() = assignee_id OR
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = tasks.team_id
      AND teams.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = tasks.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  );

-- 태스크 생성자와 팀 관리자는 태스크를 삭제할 수 있음
CREATE POLICY "Task creators can delete tasks" ON public.tasks
  FOR DELETE USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = tasks.team_id
      AND teams.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = tasks.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('OWNER', 'ADMIN')
    )
  );

-- =====================================================
-- 7. TASK_DEPENDENCIES 테이블 RLS 정책
-- =====================================================

-- RLS 활성화
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Team members can view dependencies" ON public.task_dependencies;
DROP POLICY IF EXISTS "Task creators can manage dependencies" ON public.task_dependencies;

-- 팀 멤버는 의존성을 볼 수 있음
CREATE POLICY "Team members can view dependencies" ON public.task_dependencies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.team_members tm ON t.team_id = tm.team_id
      WHERE (t.id = task_dependencies.source_task_id OR t.id = task_dependencies.target_task_id)
      AND tm.user_id = auth.uid()
    )
  );

-- 태스크 생성자와 관리자는 의존성을 관리할 수 있음
CREATE POLICY "Task creators can manage dependencies" ON public.task_dependencies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE (t.id = task_dependencies.source_task_id OR t.id = task_dependencies.target_task_id)
      AND (t.created_by = auth.uid() OR t.assignee_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.team_members tm ON t.team_id = tm.team_id
      WHERE (t.id = task_dependencies.source_task_id OR t.id = task_dependencies.target_task_id)
      AND tm.user_id = auth.uid()
      AND tm.role IN ('OWNER', 'ADMIN')
    )
  );

-- =====================================================
-- 8. PROJECT_PERMISSIONS 테이블 RLS 정책
-- =====================================================

-- RLS 활성화
ALTER TABLE public.project_permissions ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view their permissions" ON public.project_permissions;
DROP POLICY IF EXISTS "Project owners can manage permissions" ON public.project_permissions;

-- 사용자는 자신의 권한을 볼 수 있음
CREATE POLICY "Users can view their permissions" ON public.project_permissions
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_permissions.project_id
      AND p.owner_id = auth.uid()
    )
  );

-- 프로젝트 소유자는 권한을 관리할 수 있음
CREATE POLICY "Project owners can manage permissions" ON public.project_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_permissions.project_id
      AND p.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.team_members tm ON p.team_id = tm.team_id
      WHERE p.id = project_permissions.project_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('OWNER', 'ADMIN')
    )
  );

-- =====================================================
-- 9. TASK_PERMISSIONS 테이블 RLS 정책
-- =====================================================

-- RLS 활성화
ALTER TABLE public.task_permissions ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view their task permissions" ON public.task_permissions;
DROP POLICY IF EXISTS "Task owners can manage permissions" ON public.task_permissions;

-- 사용자는 자신의 태스크 권한을 볼 수 있음
CREATE POLICY "Users can view their task permissions" ON public.task_permissions
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_permissions.task_id
      AND (t.created_by = auth.uid() OR t.assignee_id = auth.uid())
    )
  );

-- 태스크 소유자는 권한을 관리할 수 있음
CREATE POLICY "Task owners can manage permissions" ON public.task_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_permissions.task_id
      AND t.created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.team_members tm ON t.team_id = tm.team_id
      WHERE t.id = task_permissions.task_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('OWNER', 'ADMIN')
    )
  );

-- =====================================================
-- 10. NOTIFICATIONS 테이블 RLS 정책
-- =====================================================

-- RLS 활성화 (테이블이 존재하는 경우)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
    
    -- 사용자는 자신의 알림만 볼 수 있음
    DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
    CREATE POLICY "Users can view their notifications" ON public.notifications
      FOR SELECT USING (auth.uid() = user_id);
    
    -- 시스템만 알림을 생성할 수 있음 (service role 필요)
    DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
    CREATE POLICY "System can create notifications" ON public.notifications
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    
    -- 사용자는 자신의 알림을 업데이트할 수 있음 (읽음 표시 등)
    DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
    CREATE POLICY "Users can update their notifications" ON public.notifications
      FOR UPDATE USING (auth.uid() = user_id);
    
    -- 사용자는 자신의 알림을 삭제할 수 있음
    DROP POLICY IF EXISTS "Users can delete their notifications" ON public.notifications;
    CREATE POLICY "Users can delete their notifications" ON public.notifications
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- =====================================================
-- 11. COMMENTS 테이블 RLS 정책
-- =====================================================

-- RLS 활성화 (테이블이 존재하는 경우)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comments') THEN
    ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
    
    -- 팀 멤버는 댓글을 볼 수 있음
    DROP POLICY IF EXISTS "Team members can view comments" ON public.comments;
    CREATE POLICY "Team members can view comments" ON public.comments
      FOR SELECT USING (
        -- 태스크 댓글인 경우
        (resource_type = 'TASK' AND EXISTS (
          SELECT 1 FROM public.tasks t
          JOIN public.team_members tm ON t.team_id = tm.team_id
          WHERE t.id = comments.resource_id::uuid
          AND tm.user_id = auth.uid()
        )) OR
        -- 프로젝트 댓글인 경우
        (resource_type = 'PROJECT' AND EXISTS (
          SELECT 1 FROM public.projects p
          JOIN public.team_members tm ON p.team_id = tm.team_id
          WHERE p.id = comments.resource_id::uuid
          AND tm.user_id = auth.uid()
        ))
      );
    
    -- 팀 멤버는 댓글을 작성할 수 있음
    DROP POLICY IF EXISTS "Team members can create comments" ON public.comments;
    CREATE POLICY "Team members can create comments" ON public.comments
      FOR INSERT WITH CHECK (
        auth.uid() = author_id AND (
          -- 태스크 댓글인 경우
          (resource_type = 'TASK' AND EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.team_members tm ON t.team_id = tm.team_id
            WHERE t.id = comments.resource_id::uuid
            AND tm.user_id = auth.uid()
          )) OR
          -- 프로젝트 댓글인 경우
          (resource_type = 'PROJECT' AND EXISTS (
            SELECT 1 FROM public.projects p
            JOIN public.team_members tm ON p.team_id = tm.team_id
            WHERE p.id = comments.resource_id::uuid
            AND tm.user_id = auth.uid()
          ))
        )
      );
    
    -- 작성자는 자신의 댓글을 수정할 수 있음
    DROP POLICY IF EXISTS "Authors can update their comments" ON public.comments;
    CREATE POLICY "Authors can update their comments" ON public.comments
      FOR UPDATE USING (auth.uid() = author_id);
    
    -- 작성자와 관리자는 댓글을 삭제할 수 있음
    DROP POLICY IF EXISTS "Authors can delete their comments" ON public.comments;
    CREATE POLICY "Authors can delete their comments" ON public.comments
      FOR DELETE USING (
        auth.uid() = author_id OR
        -- 태스크 댓글인 경우 팀 관리자도 삭제 가능
        (resource_type = 'TASK' AND EXISTS (
          SELECT 1 FROM public.tasks t
          JOIN public.team_members tm ON t.team_id = tm.team_id
          WHERE t.id = comments.resource_id::uuid
          AND tm.user_id = auth.uid()
          AND tm.role IN ('OWNER', 'ADMIN')
        ))
      );
  END IF;
END $$;

-- =====================================================
-- 12. MENTIONS 테이블 RLS 정책
-- =====================================================

-- RLS 활성화 (테이블이 존재하는 경우)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mentions') THEN
    ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;
    
    -- 사용자는 자신이 멘션된 내용을 볼 수 있음
    DROP POLICY IF EXISTS "Users can view their mentions" ON public.mentions;
    CREATE POLICY "Users can view their mentions" ON public.mentions
      FOR SELECT USING (auth.uid() = mentioned_user_id);
    
    -- 댓글 작성자는 멘션을 생성할 수 있음
    DROP POLICY IF EXISTS "Comment authors can create mentions" ON public.mentions;
    CREATE POLICY "Comment authors can create mentions" ON public.mentions
      FOR INSERT WITH CHECK (auth.uid() = mentioned_by_user_id);
    
    -- 멘션된 사용자는 읽음 표시를 업데이트할 수 있음
    DROP POLICY IF EXISTS "Mentioned users can update mentions" ON public.mentions;
    CREATE POLICY "Mentioned users can update mentions" ON public.mentions
      FOR UPDATE USING (auth.uid() = mentioned_user_id);
  END IF;
END $$;

-- =====================================================
-- 13. PERMISSION_AUDIT_LOG 테이블 RLS 정책
-- =====================================================

-- RLS 활성화 (테이블이 존재하는 경우)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permission_audit_log') THEN
    ALTER TABLE public.permission_audit_log ENABLE ROW LEVEL SECURITY;
    
    -- 팀 관리자만 감사 로그를 볼 수 있음
    DROP POLICY IF EXISTS "Team admins can view audit logs" ON public.permission_audit_log;
    CREATE POLICY "Team admins can view audit logs" ON public.permission_audit_log
      FOR SELECT USING (
        -- 팀 리소스의 경우
        (resource_type = 'TEAM' AND EXISTS (
          SELECT 1 FROM public.teams t
          WHERE t.id = permission_audit_log.resource_id
          AND t.owner_id = auth.uid()
        )) OR
        -- 프로젝트 리소스의 경우
        (resource_type = 'PROJECT' AND EXISTS (
          SELECT 1 FROM public.projects p
          JOIN public.teams t ON p.team_id = t.id
          WHERE p.id = permission_audit_log.resource_id
          AND t.owner_id = auth.uid()
        )) OR
        -- 태스크 리소스의 경우
        (resource_type = 'TASK' AND EXISTS (
          SELECT 1 FROM public.tasks tk
          JOIN public.teams t ON tk.team_id = t.id
          WHERE tk.id = permission_audit_log.resource_id
          AND t.owner_id = auth.uid()
        ))
      );
    
    -- 감사 로그는 시스템만 생성 가능 (service role 필요)
    DROP POLICY IF EXISTS "System can create audit logs" ON public.permission_audit_log;
    CREATE POLICY "System can create audit logs" ON public.permission_audit_log
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- =====================================================
-- 완료 메시지
-- =====================================================
DO $$ 
BEGIN
  RAISE NOTICE 'RLS 정책이 모든 테이블에 성공적으로 적용되었습니다.';
END $$;