-- Supabase PostgreSQL Database Schema
-- Migration from Firestore to PostgreSQL

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Custom types (enums)
CREATE TYPE user_role AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');
CREATE TYPE team_role AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');
CREATE TYPE invitation_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');
CREATE TYPE task_status AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE');
CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE project_status AS ENUM ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');
CREATE TYPE project_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE project_role AS ENUM ('PROJECT_MANAGER', 'PROJECT_LEAD', 'CONTRIBUTOR', 'OBSERVER');
CREATE TYPE task_role AS ENUM ('ASSIGNEE', 'REVIEWER', 'COLLABORATOR', 'WATCHER');
CREATE TYPE permission_action AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'ASSIGN', 'COMMENT', 'COMPLETE', 'MANAGE_PERMISSIONS');
CREATE TYPE resource_type AS ENUM ('TEAM', 'PROJECT', 'TASK');
CREATE TYPE notification_type AS ENUM ('TASK_ASSIGNED', 'TASK_DUE', 'TASK_COMPLETED', 'TASK_COMMENT', 'TASK_OVERDUE', 'MENTION', 'SYSTEM_ANNOUNCEMENT');
CREATE TYPE notification_channel AS ENUM ('EMAIL', 'PUSH', 'IN_APP', 'SLACK', 'TEAMS', 'KAKAO');
CREATE TYPE notification_frequency AS ENUM ('IMMEDIATE', 'HOURLY', 'DAILY', 'WEEKLY', 'NEVER');
CREATE TYPE comment_type AS ENUM ('TASK', 'PROJECT', 'DOCUMENT');
CREATE TYPE presence_status AS ENUM ('ONLINE', 'AWAY', 'BUSY', 'OFFLINE');
CREATE TYPE edit_operation_type AS ENUM ('INSERT', 'DELETE', 'REPLACE', 'FORMAT');
CREATE TYPE dependency_type AS ENUM ('finish-to-start', 'start-to-start', 'finish-to-finish', 'start-to-finish');

-- =================================
-- CORE TABLES
-- =================================

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role user_role DEFAULT 'VIEWER',
    avatar TEXT,
    current_team_id UUID,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams table
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES public.users(id) NOT NULL,
    member_count INTEGER DEFAULT 1,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members table
CREATE TABLE public.team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    role team_role NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    invited_by UUID REFERENCES public.users(id),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(team_id, user_id)
);

-- Team invitations table
CREATE TABLE public.team_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    role team_role NOT NULL,
    token TEXT UNIQUE NOT NULL,
    invited_by UUID REFERENCES public.users(id) NOT NULL,
    message TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    status invitation_status DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    owner_id UUID REFERENCES public.users(id) NOT NULL,
    status project_status DEFAULT 'PLANNING',
    priority project_priority DEFAULT 'MEDIUM',
    start_date DATE,
    end_date DATE,
    budget DECIMAL(12,2),
    tags TEXT[] DEFAULT '{}',
    member_count INTEGER DEFAULT 0,
    task_count INTEGER DEFAULT 0,
    completed_task_count INTEGER DEFAULT 0,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    assignee_id UUID REFERENCES public.users(id),
    status task_status DEFAULT 'TODO',
    priority task_priority DEFAULT 'MEDIUM',
    due_date TIMESTAMPTZ,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_by UUID REFERENCES public.users(id) NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    dependencies UUID[],
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task dependencies table (normalized from array)
CREATE TABLE public.task_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    target_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    type dependency_type DEFAULT 'finish-to-start',
    lag INTEGER DEFAULT 0, -- delay in days
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_task_id, target_task_id)
);

-- =================================
-- PERMISSION SYSTEM TABLES
-- =================================

-- Project permissions table
CREATE TABLE public.project_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    role project_role NOT NULL,
    permissions JSONB DEFAULT '[]',
    granted_by UUID REFERENCES public.users(id) NOT NULL,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Task permissions table
CREATE TABLE public.task_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    role task_role NOT NULL,
    permissions JSONB DEFAULT '[]',
    granted_by UUID REFERENCES public.users(id) NOT NULL,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(task_id, user_id)
);

-- Permission audit log table
CREATE TABLE public.permission_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL CHECK (action IN ('GRANTED', 'REVOKED', 'MODIFIED', 'EXPIRED')),
    resource_type resource_type NOT NULL,
    resource_id UUID NOT NULL,
    user_id UUID REFERENCES public.users(id) NOT NULL,
    granted_by UUID REFERENCES public.users(id) NOT NULL,
    previous_permissions JSONB,
    new_permissions JSONB,
    reason TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =================================
-- NOTIFICATION SYSTEM TABLES
-- =================================

-- Notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    channels notification_channel[] DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification settings table
CREATE TABLE public.notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    task_due_reminder notification_frequency DEFAULT 'IMMEDIATE',
    task_status_change notification_frequency DEFAULT 'IMMEDIATE',
    task_assigned notification_frequency DEFAULT 'IMMEDIATE',
    task_comment notification_frequency DEFAULT 'IMMEDIATE',
    task_overdue notification_frequency DEFAULT 'IMMEDIATE',
    system_announcement notification_frequency DEFAULT 'IMMEDIATE',
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    in_app_enabled BOOLEAN DEFAULT true,
    slack_enabled BOOLEAN DEFAULT false,
    teams_enabled BOOLEAN DEFAULT false,
    kakao_enabled BOOLEAN DEFAULT false,
    email_address TEXT,
    slack_webhook TEXT,
    teams_webhook TEXT,
    kakao_webhook TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification templates table
CREATE TABLE public.notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type notification_type UNIQUE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    variables TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =================================
-- COLLABORATION SYSTEM TABLES
-- =================================

-- Comments table
CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_type comment_type NOT NULL,
    resource_id UUID NOT NULL,
    parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.users(id) NOT NULL,
    content TEXT NOT NULL,
    mentions UUID[] DEFAULT '{}',
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    reactions JSONB DEFAULT '[]',
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mentions table
CREATE TABLE public.mentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL,
    mentioned_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    mentioned_by_user_id UUID REFERENCES public.users(id) NOT NULL,
    resource_type comment_type NOT NULL,
    resource_id UUID NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collaborative sessions table
CREATE TABLE public.collaborative_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_type TEXT NOT NULL CHECK (resource_type IN ('TASK', 'PROJECT', 'DOCUMENT')),
    resource_id UUID NOT NULL,
    participants JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Edit operations table
CREATE TABLE public.edit_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES public.collaborative_sessions(id) ON DELETE CASCADE NOT NULL,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('TASK', 'PROJECT', 'DOCUMENT')),
    resource_id UUID NOT NULL,
    user_id UUID REFERENCES public.users(id) NOT NULL,
    operation JSONB NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    applied BOOLEAN DEFAULT false,
    applied_at TIMESTAMPTZ,
    conflicts_with UUID[],
    resolved_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User presence table
CREATE TABLE public.user_presence (
    id UUID REFERENCES public.users(id) PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    status presence_status DEFAULT 'OFFLINE',
    current_resource JSONB,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    session_id UUID,
    is_typing BOOLEAN DEFAULT false,
    typing_in_resource UUID,
    custom_status TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document versions table
CREATE TABLE public.document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_type TEXT NOT NULL CHECK (resource_type IN ('TASK', 'PROJECT', 'DOCUMENT')),
    resource_id UUID NOT NULL,
    version INTEGER NOT NULL,
    content JSONB NOT NULL,
    changes JSONB DEFAULT '[]',
    created_by UUID REFERENCES public.users(id) NOT NULL,
    summary TEXT,
    tags TEXT[] DEFAULT '{}',
    parent_version_id UUID REFERENCES public.document_versions(id),
    is_auto_save BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(resource_type, resource_id, version)
);

-- =================================
-- INDEXES FOR PERFORMANCE
-- =================================

-- User indexes
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_current_team_id ON public.users(current_team_id);
CREATE INDEX idx_users_is_active ON public.users(is_active);

-- Team indexes
CREATE INDEX idx_teams_owner_id ON public.teams(owner_id);
CREATE INDEX idx_teams_is_active ON public.teams(is_active);
CREATE INDEX idx_teams_created_at ON public.teams(created_at);

-- Team member indexes
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_team_members_team_user ON public.team_members(team_id, user_id);
CREATE INDEX idx_team_members_role ON public.team_members(role);

-- Team invitation indexes
CREATE INDEX idx_team_invitations_team_id ON public.team_invitations(team_id);
CREATE INDEX idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX idx_team_invitations_token ON public.team_invitations(token);
CREATE INDEX idx_team_invitations_status ON public.team_invitations(status);
CREATE INDEX idx_team_invitations_expires_at ON public.team_invitations(expires_at);

-- Project indexes
CREATE INDEX idx_projects_team_id ON public.projects(team_id);
CREATE INDEX idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_is_active ON public.projects(is_active);
CREATE INDEX idx_projects_created_at ON public.projects(created_at);

-- Task indexes
CREATE INDEX idx_tasks_team_id ON public.tasks(team_id);
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_priority ON public.tasks(priority);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_created_at ON public.tasks(created_at);
CREATE INDEX idx_tasks_team_status ON public.tasks(team_id, status);
CREATE INDEX idx_tasks_assignee_status ON public.tasks(assignee_id, status);

-- Task dependency indexes
CREATE INDEX idx_task_dependencies_source ON public.task_dependencies(source_task_id);
CREATE INDEX idx_task_dependencies_target ON public.task_dependencies(target_task_id);

-- Permission indexes
CREATE INDEX idx_project_permissions_project_id ON public.project_permissions(project_id);
CREATE INDEX idx_project_permissions_user_id ON public.project_permissions(user_id);
CREATE INDEX idx_project_permissions_is_active ON public.project_permissions(is_active);
CREATE INDEX idx_task_permissions_task_id ON public.task_permissions(task_id);
CREATE INDEX idx_task_permissions_user_id ON public.task_permissions(user_id);
CREATE INDEX idx_task_permissions_is_active ON public.task_permissions(is_active);

-- Notification indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, is_read);

-- Comment indexes
CREATE INDEX idx_comments_resource ON public.comments(resource_type, resource_id);
CREATE INDEX idx_comments_author_id ON public.comments(author_id);
CREATE INDEX idx_comments_parent_id ON public.comments(parent_comment_id);
CREATE INDEX idx_comments_created_at ON public.comments(created_at);

-- Mention indexes
CREATE INDEX idx_mentions_mentioned_user ON public.mentions(mentioned_user_id);
CREATE INDEX idx_mentions_comment_id ON public.mentions(comment_id);
CREATE INDEX idx_mentions_is_read ON public.mentions(is_read);

-- Collaboration indexes
CREATE INDEX idx_collaborative_sessions_resource ON public.collaborative_sessions(resource_type, resource_id);
CREATE INDEX idx_edit_operations_session_id ON public.edit_operations(session_id);
CREATE INDEX idx_edit_operations_resource ON public.edit_operations(resource_type, resource_id);
CREATE INDEX idx_edit_operations_timestamp ON public.edit_operations(timestamp);

-- =================================
-- TRIGGERS FOR AUTO UPDATES
-- =================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at column
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_invitations_updated_at BEFORE UPDATE ON public.team_invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_dependencies_updated_at BEFORE UPDATE ON public.task_dependencies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_permissions_updated_at BEFORE UPDATE ON public.project_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_permissions_updated_at BEFORE UPDATE ON public.task_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON public.notification_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON public.notification_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_collaborative_sessions_updated_at BEFORE UPDATE ON public.collaborative_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_presence_updated_at BEFORE UPDATE ON public.user_presence FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborative_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edit_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read all user profiles" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Teams policies
CREATE POLICY "Team members can read team info" ON public.teams FOR SELECT USING (
    id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND is_active = true)
);
CREATE POLICY "Team owners can update their teams" ON public.teams FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can create teams" ON public.teams FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Team members policies
CREATE POLICY "Team members can read team membership" ON public.team_members FOR SELECT USING (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND is_active = true)
);
CREATE POLICY "Team admins can manage members" ON public.team_members FOR ALL USING (
    team_id IN (
        SELECT team_id FROM public.team_members 
        WHERE user_id = auth.uid() 
        AND role IN ('OWNER', 'ADMIN') 
        AND is_active = true
    )
);

-- Projects policies
CREATE POLICY "Team members can read projects" ON public.projects FOR SELECT USING (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND is_active = true)
);
CREATE POLICY "Project owners can update projects" ON public.projects FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Team members can create projects" ON public.projects FOR INSERT WITH CHECK (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND is_active = true)
);

-- Tasks policies
CREATE POLICY "Team members can read tasks" ON public.tasks FOR SELECT USING (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND is_active = true)
);
CREATE POLICY "Task assignees and creators can update tasks" ON public.tasks FOR UPDATE USING (
    assignee_id = auth.uid() OR created_by = auth.uid()
);
CREATE POLICY "Team members can create tasks" ON public.tasks FOR INSERT WITH CHECK (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND is_active = true)
);

-- Notifications policies
CREATE POLICY "Users can read their own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());

-- Comments policies
CREATE POLICY "Team members can read comments" ON public.comments FOR SELECT USING (
    CASE 
        WHEN resource_type = 'TASK' THEN 
            resource_id IN (SELECT id FROM public.tasks WHERE team_id IN (
                SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND is_active = true
            ))
        WHEN resource_type = 'PROJECT' THEN
            resource_id IN (SELECT id FROM public.projects WHERE team_id IN (
                SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND is_active = true
            ))
        ELSE true
    END
);
CREATE POLICY "Team members can create comments" ON public.comments FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY "Comment authors can update their comments" ON public.comments FOR UPDATE USING (author_id = auth.uid());

-- =================================
-- FUNCTIONS AND STORED PROCEDURES
-- =================================

-- Function to get user's team membership
CREATE OR REPLACE FUNCTION get_user_teams(user_uuid UUID)
RETURNS TABLE(team_id UUID, team_name TEXT, role team_role) AS $$
BEGIN
    RETURN QUERY
    SELECT tm.team_id, t.name, tm.role
    FROM public.team_members tm
    JOIN public.teams t ON tm.team_id = t.id
    WHERE tm.user_id = user_uuid AND tm.is_active = true AND t.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has permission for resource
CREATE OR REPLACE FUNCTION check_permission(
    user_uuid UUID,
    resource_type_param resource_type,
    resource_uuid UUID,
    action_param permission_action
) RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := false;
    team_uuid UUID;
BEGIN
    -- Get team_id based on resource type
    IF resource_type_param = 'TASK' THEN
        SELECT team_id INTO team_uuid FROM public.tasks WHERE id = resource_uuid;
    ELSIF resource_type_param = 'PROJECT' THEN
        SELECT team_id INTO team_uuid FROM public.projects WHERE id = resource_uuid;
    ELSIF resource_type_param = 'TEAM' THEN
        team_uuid := resource_uuid;
    END IF;

    -- Check if user is team member
    SELECT EXISTS(
        SELECT 1 FROM public.team_members 
        WHERE user_id = user_uuid AND team_id = team_uuid AND is_active = true
    ) INTO has_permission;

    RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update task progress based on status
CREATE OR REPLACE FUNCTION update_task_progress()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'TODO' THEN
        NEW.progress = 0;
    ELSIF NEW.status = 'IN_PROGRESS' THEN
        IF NEW.progress = 0 THEN
            NEW.progress = 25;
        END IF;
    ELSIF NEW.status = 'REVIEW' THEN
        IF NEW.progress < 75 THEN
            NEW.progress = 75;
        END IF;
    ELSIF NEW.status = 'DONE' THEN
        NEW.progress = 100;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_progress_trigger
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_task_progress();

-- Function to update project statistics
CREATE OR REPLACE FUNCTION update_project_stats()
RETURNS TRIGGER AS $$
DECLARE
    proj_id UUID;
    total_tasks INTEGER;
    completed_tasks INTEGER;
    project_progress INTEGER;
BEGIN
    -- Get project_id from the affected task
    IF TG_OP = 'DELETE' THEN
        proj_id := OLD.project_id;
    ELSE
        proj_id := NEW.project_id;
    END IF;

    -- Calculate task counts and progress
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'DONE'),
        CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND((COUNT(*) FILTER (WHERE status = 'DONE')::DECIMAL / COUNT(*)) * 100)
        END
    INTO total_tasks, completed_tasks, project_progress
    FROM public.tasks 
    WHERE project_id = proj_id;

    -- Update project statistics
    UPDATE public.projects 
    SET 
        task_count = total_tasks,
        completed_task_count = completed_tasks,
        progress = project_progress,
        updated_at = NOW()
    WHERE id = proj_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_project_stats();

-- Function to update team member count
CREATE OR REPLACE FUNCTION update_team_member_count()
RETURNS TRIGGER AS $$
DECLARE
    team_uuid UUID;
    member_count INTEGER;
BEGIN
    -- Get team_id from the affected record
    IF TG_OP = 'DELETE' THEN
        team_uuid := OLD.team_id;
    ELSE
        team_uuid := NEW.team_id;
    END IF;

    -- Calculate active member count
    SELECT COUNT(*) INTO member_count
    FROM public.team_members 
    WHERE team_id = team_uuid AND is_active = true;

    -- Update team member count
    UPDATE public.teams 
    SET 
        member_count = member_count,
        updated_at = NOW()
    WHERE id = team_uuid;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER team_member_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.team_members
    FOR EACH ROW
    EXECUTE FUNCTION update_team_member_count();