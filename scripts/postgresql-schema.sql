-- ALMUS Todo List - Complete PostgreSQL Database Schema
-- Designed to replace Firestore with enhanced relational capabilities
-- Created: 2025-01-27
-- 
-- Design Principles:
-- 1. Maintain all existing Firestore functionality
-- 2. Leverage relational database advantages (ACID, foreign keys, complex queries)
-- 3. Support real-time collaboration and notifications
-- 4. Implement proper audit trails and versioning
-- 5. Optimize for performance with strategic indexes
-- 6. Support horizontal scaling through partitioning

-- =============================================================================
-- EXTENSIONS AND CONFIGURATION
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";          -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";           -- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "btree_gin";          -- GIN indexes for arrays/JSONB
CREATE EXTENSION IF NOT EXISTS "pg_trgm";            -- Text similarity and fuzzy search
CREATE EXTENSION IF NOT EXISTS "unaccent";           -- Remove accents for search

-- Set timezone for the database
SET timezone = 'UTC';

-- =============================================================================
-- ENUMS AND CUSTOM TYPES
-- =============================================================================

-- User and authentication related enums
CREATE TYPE user_role AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');
CREATE TYPE team_role AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');
CREATE TYPE project_role AS ENUM ('PROJECT_MANAGER', 'PROJECT_LEAD', 'CONTRIBUTOR', 'OBSERVER');
CREATE TYPE task_role AS ENUM ('ASSIGNEE', 'REVIEWER', 'COLLABORATOR', 'WATCHER');

-- Status and priority enums
CREATE TYPE task_status AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE');
CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE project_status AS ENUM ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');
CREATE TYPE invitation_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- Notification related enums
CREATE TYPE notification_type AS ENUM (
    'TASK_ASSIGNED', 'TASK_DUE', 'TASK_COMPLETED', 'TASK_COMMENT', 
    'TASK_OVERDUE', 'MENTION', 'SYSTEM_ANNOUNCEMENT'
);
CREATE TYPE notification_channel AS ENUM ('EMAIL', 'PUSH', 'IN_APP', 'SLACK', 'TEAMS', 'KAKAO');
CREATE TYPE notification_frequency AS ENUM ('IMMEDIATE', 'HOURLY', 'DAILY', 'WEEKLY', 'NEVER');

-- Permission and audit related enums
CREATE TYPE resource_type AS ENUM ('TEAM', 'PROJECT', 'TASK');
CREATE TYPE permission_action AS ENUM (
    'CREATE', 'READ', 'UPDATE', 'DELETE', 'ASSIGN', 
    'COMMENT', 'COMPLETE', 'MANAGE_PERMISSIONS'
);
CREATE TYPE audit_action AS ENUM ('GRANTED', 'REVOKED', 'MODIFIED', 'EXPIRED');

-- Collaboration related enums
CREATE TYPE comment_type AS ENUM ('TASK', 'PROJECT', 'DOCUMENT');
CREATE TYPE presence_status AS ENUM ('ONLINE', 'AWAY', 'BUSY', 'OFFLINE');
CREATE TYPE edit_operation_type AS ENUM ('INSERT', 'DELETE', 'REPLACE', 'FORMAT');
CREATE TYPE dependency_type AS ENUM ('finish-to-start', 'start-to-start', 'finish-to-finish', 'start-to-finish');

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Users table - Core user information
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(320) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'VIEWER',
    avatar_url TEXT,
    current_team_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT true,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    password_hash TEXT, -- For local authentication
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Teams table - Team/Organization management
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL,
    member_count INTEGER NOT NULL DEFAULT 0,
    
    -- Settings as JSONB for flexibility
    settings JSONB NOT NULL DEFAULT '{
        "isPublic": false,
        "allowInvitations": true,
        "defaultMemberRole": "VIEWER",
        "maxMembers": 100,
        "timeZone": "UTC",
        "language": "ko",
        "features": {
            "ganttView": true,
            "timeTracking": true,
            "advancedReporting": false,
            "customFields": false,
            "integrations": false
        }
    }'::jsonb,
    
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT fk_teams_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Team members - Many-to-many relationship between users and teams
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role team_role NOT NULL DEFAULT 'VIEWER',
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    invited_by UUID,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_team_members_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_team_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_team_members_inviter FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT uq_team_members_team_user UNIQUE (team_id, user_id)
);

-- Team invitations
CREATE TABLE team_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL,
    email VARCHAR(320) NOT NULL,
    role team_role NOT NULL DEFAULT 'VIEWER',
    token VARCHAR(255) NOT NULL UNIQUE,
    invited_by UUID NOT NULL,
    message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    status invitation_status NOT NULL DEFAULT 'PENDING',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_team_invitations_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_team_invitations_inviter FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    team_id UUID NOT NULL,
    owner_id UUID NOT NULL,
    status project_status NOT NULL DEFAULT 'PLANNING',
    priority task_priority NOT NULL DEFAULT 'MEDIUM',
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15,2),
    tags TEXT[] DEFAULT '{}',
    
    -- Cached statistics for performance
    member_count INTEGER NOT NULL DEFAULT 0,
    task_count INTEGER NOT NULL DEFAULT 0,
    completed_task_count INTEGER NOT NULL DEFAULT 0,
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT fk_projects_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_projects_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Tasks table - Core task management
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    assignee_id UUID,
    status task_status NOT NULL DEFAULT 'TODO',
    priority task_priority NOT NULL DEFAULT 'MEDIUM',
    due_date TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL,
    project_id UUID NOT NULL,
    team_id UUID NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Gantt chart related fields
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    estimated_hours DECIMAL(8,2),
    actual_hours DECIMAL(8,2),
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    
    -- Additional metadata
    custom_fields JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT fk_tasks_assignee FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_tasks_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_tasks_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Task dependencies for Gantt chart functionality
CREATE TABLE task_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_task_id UUID NOT NULL,
    target_task_id UUID NOT NULL,
    dependency_type dependency_type NOT NULL DEFAULT 'finish-to-start',
    lag_days INTEGER DEFAULT 0, -- Can be negative for overlap
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_task_deps_source FOREIGN KEY (source_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_deps_target FOREIGN KEY (target_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT uq_task_deps_source_target UNIQUE (source_task_id, target_task_id),
    CONSTRAINT chk_task_deps_no_self_ref CHECK (source_task_id != target_task_id)
);

-- =============================================================================
-- PERMISSION SYSTEM TABLES
-- =============================================================================

-- Project permissions
CREATE TABLE project_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role project_role NOT NULL,
    permissions JSONB NOT NULL DEFAULT '[]', -- Array of permission objects
    granted_by UUID NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_project_perms_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_project_perms_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_project_perms_granter FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT uq_project_perms_project_user UNIQUE (project_id, user_id)
);

-- Task permissions
CREATE TABLE task_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role task_role NOT NULL,
    permissions JSONB NOT NULL DEFAULT '[]', -- Array of permission objects
    granted_by UUID NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_task_perms_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_perms_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_perms_granter FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT uq_task_perms_task_user UNIQUE (task_id, user_id)
);

-- Permission audit log
CREATE TABLE permission_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action audit_action NOT NULL,
    resource_type resource_type NOT NULL,
    resource_id UUID NOT NULL,
    user_id UUID NOT NULL,
    granted_by UUID NOT NULL,
    previous_permissions JSONB,
    new_permissions JSONB,
    reason TEXT,
    ip_address INET,
    user_agent TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_perm_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_perm_audit_granter FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================================================
-- COLLABORATION SYSTEM TABLES
-- =============================================================================

-- Comments system with threading support
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_type comment_type NOT NULL,
    resource_id UUID NOT NULL,
    parent_comment_id UUID, -- For threaded comments
    author_id UUID NOT NULL,
    content TEXT NOT NULL,
    mentions UUID[] DEFAULT '{}', -- Array of mentioned user IDs
    is_edited BOOLEAN NOT NULL DEFAULT false,
    edited_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Rich content support
    content_type VARCHAR(50) DEFAULT 'text/plain',
    formatting JSONB DEFAULT '{}',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_comments_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_parent FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- Comment reactions (emojis, likes, etc.)
CREATE TABLE comment_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL,
    user_id UUID NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_comment_reactions_comment FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_reactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_comment_reactions_comment_user_emoji UNIQUE (comment_id, user_id, emoji)
);

-- File attachments
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_type comment_type NOT NULL,
    resource_id UUID NOT NULL,
    comment_id UUID, -- Optional: if attached to a comment
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_by UUID NOT NULL,
    
    -- File metadata
    metadata JSONB DEFAULT '{}',
    is_public BOOLEAN NOT NULL DEFAULT false,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT fk_attachments_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_attachments_comment FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- Mentions tracking
CREATE TABLE mentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL,
    mentioned_user_id UUID NOT NULL,
    mentioned_by_user_id UUID NOT NULL,
    resource_type comment_type NOT NULL,
    resource_id UUID NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_mentions_comment FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    CONSTRAINT fk_mentions_mentioned_user FOREIGN KEY (mentioned_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_mentions_mentioner FOREIGN KEY (mentioned_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Collaborative sessions for real-time editing
CREATE TABLE collaborative_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_type VARCHAR(20) NOT NULL CHECK (resource_type IN ('TASK', 'PROJECT', 'DOCUMENT')),
    resource_id UUID NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Session metadata
    metadata JSONB DEFAULT '{}',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Session participants
CREATE TABLE session_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL,
    user_id UUID NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP WITH TIME ZONE,
    last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Cursor and selection data for real-time collaboration
    cursor_position JSONB,
    selection_data JSONB,
    
    CONSTRAINT fk_session_participants_session FOREIGN KEY (session_id) REFERENCES collaborative_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_session_participants_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_session_participants_session_user UNIQUE (session_id, user_id)
);

-- Edit operations for operational transform
CREATE TABLE edit_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL,
    resource_type VARCHAR(20) NOT NULL CHECK (resource_type IN ('TASK', 'PROJECT', 'DOCUMENT')),
    resource_id UUID NOT NULL,
    user_id UUID NOT NULL,
    operation_data JSONB NOT NULL, -- Contains type, position, content, etc.
    operation_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    applied BOOLEAN NOT NULL DEFAULT false,
    applied_at TIMESTAMP WITH TIME ZONE,
    conflicts_with UUID[], -- Array of conflicting operation IDs
    resolved_by UUID, -- Operation ID that resolved conflicts
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_edit_ops_session FOREIGN KEY (session_id) REFERENCES collaborative_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_edit_ops_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_edit_ops_resolver FOREIGN KEY (resolved_by) REFERENCES edit_operations(id) ON DELETE SET NULL
);

-- User presence tracking
CREATE TABLE user_presence (
    user_id UUID PRIMARY KEY,
    status presence_status NOT NULL DEFAULT 'OFFLINE',
    current_resource_type VARCHAR(20),
    current_resource_id UUID,
    current_resource_name VARCHAR(255),
    last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    session_id UUID,
    is_typing BOOLEAN NOT NULL DEFAULT false,
    typing_in_resource UUID,
    custom_status VARCHAR(100),
    
    -- Audit fields
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_user_presence_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_presence_session FOREIGN KEY (session_id) REFERENCES collaborative_sessions(id) ON DELETE SET NULL
);

-- Document versions for collaborative editing
CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_type VARCHAR(20) NOT NULL CHECK (resource_type IN ('TASK', 'PROJECT', 'DOCUMENT')),
    resource_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    content JSONB NOT NULL, -- Full content snapshot
    changes JSONB NOT NULL DEFAULT '[]', -- Array of change objects
    created_by UUID NOT NULL,
    summary TEXT,
    tags TEXT[] DEFAULT '{}',
    parent_version_id UUID,
    is_auto_save BOOLEAN NOT NULL DEFAULT false,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_doc_versions_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_doc_versions_parent FOREIGN KEY (parent_version_id) REFERENCES document_versions(id) ON DELETE SET NULL,
    CONSTRAINT uq_doc_versions_resource_version UNIQUE (resource_type, resource_id, version_number)
);

-- =============================================================================
-- NOTIFICATION SYSTEM TABLES
-- =============================================================================

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}', -- Additional metadata
    channels notification_channel[] NOT NULL DEFAULT '{}',
    is_read BOOLEAN NOT NULL DEFAULT false,
    is_sent BOOLEAN NOT NULL DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Related resource information
    resource_type resource_type,
    resource_id UUID,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notification settings per user
CREATE TABLE notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    
    -- Notification preferences by type
    task_due_reminder notification_frequency NOT NULL DEFAULT 'DAILY',
    task_status_change notification_frequency NOT NULL DEFAULT 'IMMEDIATE',
    task_assigned notification_frequency NOT NULL DEFAULT 'IMMEDIATE',
    task_comment notification_frequency NOT NULL DEFAULT 'IMMEDIATE',
    task_overdue notification_frequency NOT NULL DEFAULT 'IMMEDIATE',
    system_announcement notification_frequency NOT NULL DEFAULT 'IMMEDIATE',
    
    -- Channel preferences
    email_enabled BOOLEAN NOT NULL DEFAULT true,
    push_enabled BOOLEAN NOT NULL DEFAULT true,
    in_app_enabled BOOLEAN NOT NULL DEFAULT true,
    slack_enabled BOOLEAN NOT NULL DEFAULT false,
    teams_enabled BOOLEAN NOT NULL DEFAULT false,
    kakao_enabled BOOLEAN NOT NULL DEFAULT false,
    
    -- Channel configuration
    email_address VARCHAR(320),
    slack_webhook TEXT,
    teams_webhook TEXT,
    kakao_webhook TEXT,
    
    -- Quiet hours
    quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    quiet_hours_timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_notification_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notification templates
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type notification_type NOT NULL,
    channel notification_channel NOT NULL,
    language VARCHAR(10) NOT NULL DEFAULT 'ko',
    title_template TEXT NOT NULL,
    message_template TEXT NOT NULL,
    variables TEXT[] NOT NULL DEFAULT '{}', -- Available template variables
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_notification_templates_type_channel_lang UNIQUE (type, channel, language)
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =============================================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_team ON users(current_team_id) WHERE deleted_at IS NULL AND is_active = true;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL AND is_active = true;
CREATE INDEX idx_users_active ON users(is_active, created_at) WHERE deleted_at IS NULL;

-- Teams indexes
CREATE INDEX idx_teams_owner ON teams(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_teams_active ON teams(is_active, created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_teams_settings_gin ON teams USING gin(settings) WHERE deleted_at IS NULL;

-- Team members indexes
CREATE INDEX idx_team_members_team ON team_members(team_id, is_active);
CREATE INDEX idx_team_members_user ON team_members(user_id, is_active);
CREATE INDEX idx_team_members_role ON team_members(team_id, role, joined_at);

-- Team invitations indexes
CREATE INDEX idx_team_invitations_team ON team_invitations(team_id, status);
CREATE INDEX idx_team_invitations_email ON team_invitations(email, status);
CREATE INDEX idx_team_invitations_token ON team_invitations(token);
CREATE INDEX idx_team_invitations_expires ON team_invitations(expires_at, status);

-- Projects indexes
CREATE INDEX idx_projects_team ON projects(team_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_owner ON projects(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_status ON projects(status, created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_tags_gin ON projects USING gin(tags) WHERE deleted_at IS NULL;

-- Tasks indexes - Critical for performance
CREATE INDEX idx_tasks_team_status ON tasks(team_id, status, created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status, created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id, status, due_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_creator ON tasks(created_by, status, created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_due_date ON tasks(due_date, status) WHERE deleted_at IS NULL AND due_date IS NOT NULL;
CREATE INDEX idx_tasks_priority ON tasks(team_id, priority, created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_tags_gin ON tasks USING gin(tags) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_custom_fields_gin ON tasks USING gin(custom_fields) WHERE deleted_at IS NULL;

-- Task dependencies indexes
CREATE INDEX idx_task_deps_source ON task_dependencies(source_task_id);
CREATE INDEX idx_task_deps_target ON task_dependencies(target_task_id);

-- Permission indexes
CREATE INDEX idx_project_perms_project ON project_permissions(project_id, is_active);
CREATE INDEX idx_project_perms_user ON project_permissions(user_id, is_active);
CREATE INDEX idx_project_perms_expires ON project_permissions(expires_at, is_active) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_task_perms_task ON task_permissions(task_id, is_active);
CREATE INDEX idx_task_perms_user ON task_permissions(user_id, is_active);
CREATE INDEX idx_task_perms_expires ON task_permissions(expires_at, is_active) WHERE expires_at IS NOT NULL;

-- Audit log indexes
CREATE INDEX idx_perm_audit_user ON permission_audit_log(user_id, created_at);
CREATE INDEX idx_perm_audit_resource ON permission_audit_log(resource_type, resource_id, created_at);
CREATE INDEX idx_perm_audit_granter ON permission_audit_log(granted_by, action, created_at);

-- Comments indexes
CREATE INDEX idx_comments_resource ON comments(resource_type, resource_id, created_at) WHERE is_deleted = false;
CREATE INDEX idx_comments_author ON comments(author_id, created_at) WHERE is_deleted = false;
CREATE INDEX idx_comments_parent ON comments(parent_comment_id, created_at) WHERE parent_comment_id IS NOT NULL AND is_deleted = false;
CREATE INDEX idx_comments_mentions_gin ON comments USING gin(mentions) WHERE array_length(mentions, 1) > 0;

-- Mentions indexes
CREATE INDEX idx_mentions_user ON mentions(mentioned_user_id, is_read, created_at);
CREATE INDEX idx_mentions_comment ON mentions(comment_id);
CREATE INDEX idx_mentions_resource ON mentions(resource_type, resource_id, created_at);

-- Collaboration indexes
CREATE INDEX idx_collab_sessions_resource ON collaborative_sessions(resource_type, resource_id, is_active);
CREATE INDEX idx_collab_sessions_active ON collaborative_sessions(is_active, last_activity);
CREATE INDEX idx_session_participants_session ON session_participants(session_id, is_active);
CREATE INDEX idx_session_participants_user ON session_participants(user_id, is_active);
CREATE INDEX idx_edit_ops_session ON edit_operations(session_id, operation_timestamp);
CREATE INDEX idx_edit_ops_resource ON edit_operations(resource_type, resource_id, operation_timestamp);
CREATE INDEX idx_edit_ops_user ON edit_operations(user_id, operation_timestamp);
CREATE INDEX idx_edit_ops_applied ON edit_operations(applied, operation_timestamp);

-- Document versions indexes
CREATE INDEX idx_doc_versions_resource ON document_versions(resource_type, resource_id, version_number);
CREATE INDEX idx_doc_versions_creator ON document_versions(created_by, created_at);
CREATE INDEX idx_doc_versions_auto_save ON document_versions(is_auto_save, created_at);

-- Notifications indexes
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at);
CREATE INDEX idx_notifications_type ON notifications(user_id, type, created_at);
CREATE INDEX idx_notifications_resource ON notifications(resource_type, resource_id, created_at) WHERE resource_type IS NOT NULL;
CREATE INDEX idx_notifications_unread ON notifications(user_id, created_at) WHERE is_read = false;

-- User presence indexes
CREATE INDEX idx_user_presence_status ON user_presence(status, updated_at);
CREATE INDEX idx_user_presence_resource ON user_presence(current_resource_type, current_resource_id) WHERE current_resource_type IS NOT NULL;

-- Full-text search indexes
CREATE INDEX idx_tasks_search ON tasks USING gin(to_tsvector('english', title || ' ' || COALESCE(description, ''))) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_search ON projects USING gin(to_tsvector('english', name || ' ' || COALESCE(description, ''))) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_search ON comments USING gin(to_tsvector('english', content)) WHERE is_deleted = false;

-- =============================================================================
-- TRIGGERS AND FUNCTIONS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_invitations_updated_at BEFORE UPDATE ON team_invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_dependencies_updated_at BEFORE UPDATE ON task_dependencies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_project_permissions_updated_at BEFORE UPDATE ON project_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_permissions_updated_at BEFORE UPDATE ON task_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attachments_updated_at BEFORE UPDATE ON attachments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_collaborative_sessions_updated_at BEFORE UPDATE ON collaborative_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON notification_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update team member count
CREATE OR REPLACE FUNCTION update_team_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE teams SET member_count = member_count + 1 WHERE id = NEW.team_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE teams SET member_count = member_count - 1 WHERE id = OLD.team_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.is_active = true AND NEW.is_active = false THEN
            UPDATE teams SET member_count = member_count - 1 WHERE id = NEW.team_id;
        ELSIF OLD.is_active = false AND NEW.is_active = true THEN
            UPDATE teams SET member_count = member_count + 1 WHERE id = NEW.team_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_team_member_count
    AFTER INSERT OR UPDATE OR DELETE ON team_members
    FOR EACH ROW EXECUTE FUNCTION update_team_member_count();

-- Function to update project task counts and progress
CREATE OR REPLACE FUNCTION update_project_stats()
RETURNS TRIGGER AS $$
DECLARE
    total_tasks INTEGER;
    completed_tasks INTEGER;
    new_progress INTEGER;
BEGIN
    -- Get project ID from either NEW or OLD record
    DECLARE
        proj_id UUID := COALESCE(NEW.project_id, OLD.project_id);
    BEGIN
        -- Count total and completed tasks
        SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'DONE')
        INTO total_tasks, completed_tasks
        FROM tasks 
        WHERE project_id = proj_id AND deleted_at IS NULL;
        
        -- Calculate progress
        IF total_tasks > 0 THEN
            new_progress := (completed_tasks * 100) / total_tasks;
        ELSE
            new_progress := 0;
        END IF;
        
        -- Update project statistics
        UPDATE projects 
        SET 
            task_count = total_tasks,
            completed_task_count = completed_tasks,
            progress = new_progress,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = proj_id;
    END;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_stats
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_project_stats();

-- Function to validate task dependencies (prevent cycles)
CREATE OR REPLACE FUNCTION validate_task_dependency()
RETURNS TRIGGER AS $$
BEGIN
    -- Check for immediate cycle
    IF EXISTS (
        SELECT 1 FROM task_dependencies 
        WHERE source_task_id = NEW.target_task_id 
        AND target_task_id = NEW.source_task_id
    ) THEN
        RAISE EXCEPTION 'Circular dependency detected: immediate cycle';
    END IF;
    
    -- Check for indirect cycles using recursive CTE
    WITH RECURSIVE dependency_path AS (
        -- Base case: direct dependencies of the new target
        SELECT target_task_id as task_id, 1 as depth
        FROM task_dependencies 
        WHERE source_task_id = NEW.target_task_id
        
        UNION ALL
        
        -- Recursive case: follow the dependency chain
        SELECT td.target_task_id, dp.depth + 1
        FROM task_dependencies td
        JOIN dependency_path dp ON td.source_task_id = dp.task_id
        WHERE dp.depth < 50 -- Prevent infinite recursion
    )
    SELECT task_id INTO STRICT task_id
    FROM dependency_path 
    WHERE task_id = NEW.source_task_id
    LIMIT 1;
    
    -- If we found the source task in the dependency path, it's a cycle
    RAISE EXCEPTION 'Circular dependency detected: indirect cycle';
    
    RETURN NEW;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        -- No cycle found, dependency is valid
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_task_dependency
    BEFORE INSERT OR UPDATE ON task_dependencies
    FOR EACH ROW EXECUTE FUNCTION validate_task_dependency();

-- Function to auto-create notification settings for new users
CREATE OR REPLACE FUNCTION create_default_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_settings (user_id, email_address)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_default_notification_settings
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_default_notification_settings();

-- Function to update user presence on activity
CREATE OR REPLACE FUNCTION update_user_presence()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_presence (user_id, last_activity, status)
    VALUES (NEW.user_id, CURRENT_TIMESTAMP, 'ONLINE')
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        last_activity = CURRENT_TIMESTAMP,
        status = CASE 
            WHEN user_presence.last_activity < CURRENT_TIMESTAMP - INTERVAL '5 minutes' 
            THEN 'ONLINE'::presence_status
            ELSE user_presence.status 
        END,
        updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply presence update trigger to relevant tables
CREATE TRIGGER trigger_update_presence_comments
    AFTER INSERT OR UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_user_presence();

CREATE TRIGGER trigger_update_presence_edit_ops
    AFTER INSERT ON edit_operations
    FOR EACH ROW EXECUTE FUNCTION update_user_presence();

-- Function to handle mention notifications
CREATE OR REPLACE FUNCTION handle_mention_notifications()
RETURNS TRIGGER AS $$
DECLARE
    mentioned_user UUID;
BEGIN
    -- Create mention records and notifications for each mentioned user
    FOREACH mentioned_user IN ARRAY NEW.mentions
    LOOP
        -- Insert mention record
        INSERT INTO mentions (
            comment_id, mentioned_user_id, mentioned_by_user_id,
            resource_type, resource_id
        ) VALUES (
            NEW.id, mentioned_user, NEW.author_id,
            NEW.resource_type, NEW.resource_id
        );
        
        -- Create notification
        INSERT INTO notifications (
            user_id, type, title, message, data, channels,
            resource_type, resource_id
        ) VALUES (
            mentioned_user,
            'MENTION',
            'You were mentioned in a comment',
            LEFT(NEW.content, 200) || CASE WHEN LENGTH(NEW.content) > 200 THEN '...' ELSE '' END,
            jsonb_build_object(
                'comment_id', NEW.id,
                'author_id', NEW.author_id,
                'resource_type', NEW.resource_type,
                'resource_id', NEW.resource_id
            ),
            ARRAY['IN_APP', 'EMAIL']::notification_channel[],
            NEW.resource_type::resource_type,
            NEW.resource_id
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_handle_mention_notifications
    AFTER INSERT ON comments
    FOR EACH ROW 
    WHEN (array_length(NEW.mentions, 1) > 0)
    EXECUTE FUNCTION handle_mention_notifications();

-- =============================================================================
-- VIEWS FOR COMMON QUERIES
-- =============================================================================

-- View for active team members with user details
CREATE VIEW v_active_team_members AS
SELECT 
    tm.id,
    tm.team_id,
    tm.user_id,
    tm.role,
    tm.joined_at,
    u.name as user_name,
    u.email as user_email,
    u.avatar_url
FROM team_members tm
JOIN users u ON tm.user_id = u.id
WHERE tm.is_active = true 
AND u.is_active = true 
AND u.deleted_at IS NULL;

-- View for task assignments with user and project details
CREATE VIEW v_task_assignments AS
SELECT 
    t.id as task_id,
    t.title,
    t.description,
    t.status,
    t.priority,
    t.due_date,
    t.progress,
    t.created_at,
    t.updated_at,
    u_assignee.id as assignee_id,
    u_assignee.name as assignee_name,
    u_assignee.email as assignee_email,
    u_creator.name as creator_name,
    p.name as project_name,
    team.name as team_name
FROM tasks t
LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id
JOIN users u_creator ON t.created_by = u_creator.id
JOIN projects p ON t.project_id = p.id
JOIN teams team ON t.team_id = team.id
WHERE t.deleted_at IS NULL
AND p.deleted_at IS NULL
AND team.deleted_at IS NULL;

-- View for project statistics
CREATE VIEW v_project_statistics AS
SELECT 
    p.id,
    p.name,
    p.team_id,
    p.status,
    p.progress,
    p.task_count,
    p.completed_task_count,
    p.created_at,
    p.updated_at,
    COUNT(DISTINCT pp.user_id) as member_count,
    COUNT(DISTINCT t.assignee_id) as assignee_count,
    AVG(t.progress) as avg_task_progress,
    COUNT(t.id) FILTER (WHERE t.status = 'TODO') as todo_count,
    COUNT(t.id) FILTER (WHERE t.status = 'IN_PROGRESS') as in_progress_count,
    COUNT(t.id) FILTER (WHERE t.status = 'REVIEW') as review_count,
    COUNT(t.id) FILTER (WHERE t.status = 'DONE') as done_count,
    COUNT(t.id) FILTER (WHERE t.due_date < CURRENT_TIMESTAMP AND t.status != 'DONE') as overdue_count
FROM projects p
LEFT JOIN project_permissions pp ON p.id = pp.project_id AND pp.is_active = true
LEFT JOIN tasks t ON p.id = t.project_id AND t.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name, p.team_id, p.status, p.progress, p.task_count, p.completed_task_count, p.created_at, p.updated_at;

-- View for user dashboard data
CREATE VIEW v_user_dashboard AS
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    COUNT(DISTINCT t_assigned.id) as assigned_tasks,
    COUNT(DISTINCT t_assigned.id) FILTER (WHERE t_assigned.status = 'TODO') as todo_tasks,
    COUNT(DISTINCT t_assigned.id) FILTER (WHERE t_assigned.status = 'IN_PROGRESS') as in_progress_tasks,
    COUNT(DISTINCT t_assigned.id) FILTER (WHERE t_assigned.status = 'REVIEW') as review_tasks,
    COUNT(DISTINCT t_assigned.id) FILTER (WHERE t_assigned.due_date < CURRENT_TIMESTAMP AND t_assigned.status != 'DONE') as overdue_tasks,
    COUNT(DISTINCT t_created.id) as created_tasks,
    COUNT(DISTINCT p.id) as accessible_projects,
    COUNT(DISTINCT tm.team_id) as team_memberships,
    COUNT(DISTINCT n.id) FILTER (WHERE n.is_read = false) as unread_notifications
FROM users u
LEFT JOIN tasks t_assigned ON u.id = t_assigned.assignee_id AND t_assigned.deleted_at IS NULL
LEFT JOIN tasks t_created ON u.id = t_created.created_by AND t_created.deleted_at IS NULL
LEFT JOIN project_permissions pp ON u.id = pp.user_id AND pp.is_active = true
LEFT JOIN projects p ON pp.project_id = p.id AND p.deleted_at IS NULL
LEFT JOIN team_members tm ON u.id = tm.user_id AND tm.is_active = true
LEFT JOIN notifications n ON u.id = n.user_id
WHERE u.deleted_at IS NULL AND u.is_active = true
GROUP BY u.id, u.name, u.email;

-- =============================================================================
-- PARTITIONING STRATEGY (for high-volume tables)
-- =============================================================================

-- Partition notifications by month for better performance
-- This is especially important for high-volume notification data

-- First, let's create the partitioned notifications table
-- (This would replace the existing notifications table in a production migration)

/*
-- Example partitioning strategy for notifications (commented out for initial setup)
CREATE TABLE notifications_partitioned (
    LIKE notifications INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create partitions for current and future months
CREATE TABLE notifications_2025_01 PARTITION OF notifications_partitioned
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE notifications_2025_02 PARTITION OF notifications_partitioned
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
-- Continue creating partitions as needed...
*/

-- =============================================================================
-- SECURITY POLICIES (Row Level Security)
-- =============================================================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data or data they have explicit access to
CREATE POLICY users_policy ON users
    FOR ALL
    TO PUBLIC
    USING (id = current_setting('app.current_user_id')::uuid OR 
           current_setting('app.user_role') = 'ADMIN');

-- Team members can see team data
CREATE POLICY teams_policy ON teams
    FOR SELECT
    TO PUBLIC
    USING (
        id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = current_setting('app.current_user_id')::uuid 
            AND is_active = true
        ) OR 
        current_setting('app.user_role') = 'ADMIN'
    );

-- Similar policies for other tables...
-- (Additional RLS policies would be implemented based on business requirements)

-- =============================================================================
-- INITIAL DATA SETUP
-- =============================================================================

-- Insert default notification templates
INSERT INTO notification_templates (type, channel, language, title_template, message_template, variables) VALUES
('TASK_ASSIGNED', 'EMAIL', 'ko', '새로운 작업이 할당되었습니다: {{task_title}}', '{{assigner_name}}님이 "{{task_title}}" 작업을 할당했습니다.\n\n설명: {{task_description}}\n마감일: {{due_date}}\n\n작업 보기: {{task_url}}', ARRAY['task_title', 'task_description', 'due_date', 'assigner_name', 'task_url']),
('TASK_ASSIGNED', 'PUSH', 'ko', '새 작업 할당', '{{assigner_name}}님이 작업을 할당했습니다', ARRAY['assigner_name']),
('TASK_DUE', 'EMAIL', 'ko', '작업 마감일 알림: {{task_title}}', '"{{task_title}}" 작업의 마감일이 {{hours_remaining}}시간 남았습니다.\n\n작업 보기: {{task_url}}', ARRAY['task_title', 'hours_remaining', 'task_url']),
('TASK_COMPLETED', 'EMAIL', 'ko', '작업 완료: {{task_title}}', '{{assignee_name}}님이 "{{task_title}}" 작업을 완료했습니다.\n\n작업 보기: {{task_url}}', ARRAY['task_title', 'assignee_name', 'task_url']),
('MENTION', 'EMAIL', 'ko', '댓글에서 언급됨', '{{mentioner_name}}님이 {{resource_type}}에서 당신을 언급했습니다.\n\n"{{comment_preview}}"\n\n확인하기: {{resource_url}}', ARRAY['mentioner_name', 'resource_type', 'comment_preview', 'resource_url'])
ON CONFLICT (type, channel, language) DO NOTHING;

-- =============================================================================
-- MAINTENANCE AND CLEANUP FUNCTIONS
-- =============================================================================

-- Function to clean up old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications 
    WHERE created_at < CURRENT_TIMESTAMP - (days_to_keep || ' days')::INTERVAL
    AND is_read = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old edit operations
CREATE OR REPLACE FUNCTION cleanup_old_edit_operations(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM edit_operations 
    WHERE created_at < CURRENT_TIMESTAMP - (days_to_keep || ' days')::INTERVAL
    AND applied = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to vacuum and analyze all tables
CREATE OR REPLACE FUNCTION maintenance_vacuum_analyze()
RETURNS TEXT AS $$
DECLARE
    table_name TEXT;
    result TEXT := '';
BEGIN
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE 'VACUUM ANALYZE ' || table_name;
        result := result || table_name || ' ';
    END LOOP;
    
    RETURN 'Vacuumed and analyzed: ' || result;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SCHEMA VALIDATION AND INTEGRITY CHECKS
-- =============================================================================

-- Function to validate schema integrity
CREATE OR REPLACE FUNCTION validate_schema_integrity()
RETURNS TABLE(check_name TEXT, status TEXT, details TEXT) AS $$
BEGIN
    -- Check for orphaned records
    RETURN QUERY
    SELECT 
        'orphaned_tasks'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Found ' || COUNT(*) || ' tasks with invalid project_id'::TEXT
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE p.id IS NULL AND t.deleted_at IS NULL;
    
    RETURN QUERY
    SELECT 
        'orphaned_team_members'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Found ' || COUNT(*) || ' team members with invalid user_id'::TEXT
    FROM team_members tm
    LEFT JOIN users u ON tm.user_id = u.id
    WHERE u.id IS NULL;
    
    -- Check constraint violations
    RETURN QUERY
    SELECT 
        'task_progress_range'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Found ' || COUNT(*) || ' tasks with invalid progress values'::TEXT
    FROM tasks
    WHERE progress < 0 OR progress > 100;
    
    RETURN QUERY
    SELECT 
        'circular_dependencies'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Found ' || COUNT(*) || ' potential circular dependencies'::TEXT
    FROM task_dependencies td1
    JOIN task_dependencies td2 ON td1.source_task_id = td2.target_task_id 
                                AND td1.target_task_id = td2.source_task_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PERFORMANCE MONITORING VIEWS
-- =============================================================================

-- View for monitoring query performance
CREATE VIEW v_performance_stats AS
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation,
    most_common_vals,
    most_common_freqs
FROM pg_stats 
WHERE schemaname = 'public'
ORDER BY tablename, attname;

-- View for monitoring table sizes
CREATE VIEW v_table_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- View for monitoring index usage
CREATE VIEW v_index_usage AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- =============================================================================
-- COMMENTS AND DOCUMENTATION
-- =============================================================================

COMMENT ON DATABASE almus_todo IS 'ALMUS Todo List Application Database - PostgreSQL migration from Firestore';

-- Table comments
COMMENT ON TABLE users IS 'Core user accounts and authentication information';
COMMENT ON TABLE teams IS 'Team/organization management with configurable settings';
COMMENT ON TABLE team_members IS 'Many-to-many relationship between users and teams';
COMMENT ON TABLE team_invitations IS 'Pending team invitations with expiration and token-based acceptance';
COMMENT ON TABLE projects IS 'Project management with statistics and progress tracking';
COMMENT ON TABLE tasks IS 'Core task management with Gantt chart support and custom fields';
COMMENT ON TABLE task_dependencies IS 'Task dependencies for project scheduling and Gantt charts';
COMMENT ON TABLE project_permissions IS 'Project-level permissions with role-based access control';
COMMENT ON TABLE task_permissions IS 'Task-level permissions for fine-grained access control';
COMMENT ON TABLE permission_audit_log IS 'Audit trail for all permission changes';
COMMENT ON TABLE comments IS 'Threaded comment system with rich content support';
COMMENT ON TABLE comment_reactions IS 'Emoji reactions and engagement on comments';
COMMENT ON TABLE attachments IS 'File attachments for tasks, projects, and comments';
COMMENT ON TABLE mentions IS 'User mentions in comments with notification integration';
COMMENT ON TABLE collaborative_sessions IS 'Real-time collaboration sessions for editing';
COMMENT ON TABLE session_participants IS 'Participants in collaborative editing sessions';
COMMENT ON TABLE edit_operations IS 'Operational transform data for real-time collaboration';
COMMENT ON TABLE user_presence IS 'Real-time user presence and activity status';
COMMENT ON TABLE document_versions IS 'Version control for collaborative document editing';
COMMENT ON TABLE notifications IS 'Multi-channel notification system';
COMMENT ON TABLE notification_settings IS 'Per-user notification preferences and channel configuration';
COMMENT ON TABLE notification_templates IS 'Customizable notification templates with i18n support';

-- Column comments for critical fields
COMMENT ON COLUMN tasks.version IS 'Optimistic locking version for concurrent updates';
COMMENT ON COLUMN tasks.custom_fields IS 'JSONB field for extensible custom task properties';
COMMENT ON COLUMN projects.settings IS 'JSONB configuration including features, timezone, and team settings';
COMMENT ON COLUMN edit_operations.operation_data IS 'JSONB containing operational transform data (type, position, content, attributes)';
COMMENT ON COLUMN collaborative_sessions.metadata IS 'Session-specific metadata and configuration';
COMMENT ON COLUMN user_presence.custom_status IS 'User-defined status message (e.g., "In a meeting", "Working from home")';

-- =============================================================================
-- MIGRATION HELPERS
-- =============================================================================

-- Function to migrate data from Firestore format
CREATE OR REPLACE FUNCTION migrate_firestore_timestamp(firestore_timestamp JSONB)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
    -- Handle Firestore timestamp format: {_seconds: 1234567890, _nanoseconds: 123456789}
    IF firestore_timestamp ? '_seconds' THEN
        RETURN to_timestamp(
            (firestore_timestamp->>'_seconds')::BIGINT + 
            (firestore_timestamp->>'_nanoseconds')::BIGINT / 1000000000.0
        );
    ELSE
        -- Fallback for ISO string format
        RETURN firestore_timestamp#>>'{}'::TIMESTAMP WITH TIME ZONE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to convert Firestore arrays to PostgreSQL arrays
CREATE OR REPLACE FUNCTION migrate_firestore_array(firestore_array JSONB)
RETURNS TEXT[] AS $$
BEGIN
    IF jsonb_typeof(firestore_array) = 'array' THEN
        RETURN ARRAY(SELECT jsonb_array_elements_text(firestore_array));
    ELSE
        RETURN '{}';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FINAL SETUP AND GRANTS
-- =============================================================================

-- Create application user roles
CREATE ROLE almus_app_user LOGIN;
CREATE ROLE almus_app_admin LOGIN;
CREATE ROLE almus_readonly LOGIN;

-- Grant appropriate permissions
GRANT CONNECT ON DATABASE almus_todo TO almus_app_user, almus_app_admin, almus_readonly;

GRANT USAGE ON SCHEMA public TO almus_app_user, almus_app_admin, almus_readonly;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO almus_app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO almus_app_admin;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO almus_readonly;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO almus_app_user, almus_app_admin;

-- Grant access to views
GRANT SELECT ON ALL VIEWS IN SCHEMA public TO almus_app_user, almus_app_admin, almus_readonly;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO almus_app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO almus_app_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO almus_readonly;

COMMIT;

-- =============================================================================
-- SCHEMA COMPLETE
-- =============================================================================
-- 
-- This PostgreSQL schema provides:
-- 
-- 1. Complete data model migration from Firestore
-- 2. Enhanced relational integrity with foreign keys
-- 3. Advanced permission system with audit trails
-- 4. Real-time collaboration support with operational transforms
-- 5. Comprehensive notification system
-- 6. Performance optimizations with strategic indexing
-- 7. Extensibility through JSONB fields and configurable settings
-- 8. Audit trails and version control
-- 9. Full-text search capabilities
-- 10. Maintenance and monitoring functions
-- 
-- The schema is designed to handle enterprise-scale workloads while maintaining
-- the flexibility that was available in the Firestore document model.