# 🗄️ ALMUS ToDo List - 데이터베이스 스키마

## 📊 ERD (Entity Relationship Diagram)

```
┌─────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    Users    │       │   Team_Members  │       │     Teams       │
├─────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)     │   ┌───┤ id (PK)         │   ┌───┤ id (PK)         │
│ email       │   │   │ team_id (FK)    │───┘   │ name            │
│ name        │   │   │ user_id (FK)    │───┐   │ description     │
│ avatar      │   │   │ role            │   │   │ owner_id (FK)   │──┐
│ created_at  │   │   │ status          │   │   │ settings        │  │
│ updated_at  │   │   │ joined_at       │   │   │ is_active       │  │
└─────────────┘   │   │ invited_by (FK) │───┘   │ created_at      │  │
        │         │   └─────────────────┘       │ updated_at      │  │
        └─────────┘                             └─────────────────┘  │
                                                         │           │
┌─────────────────┐                                     │           │
│     Tasks       │                                     │           │
├─────────────────┤                                     │           │
│ id (PK)         │                                     │           │
│ title           │                                     │           │
│ description     │    ┌─────────────────────────┐     │           │
│ status          │    │   File_Metadata         │     │           │
│ priority        │    ├─────────────────────────┤     │           │
│ assignee_id(FK) │────┼─ id (PK)               │     │           │
│ team_id (FK)    │────┘  │ file_name             │     │           │
│ project_id      │       │ file_path             │     │           │
│ created_by (FK) │───────┤ file_size             │     │           │
│ start_date      │       │ mime_type             │     │           │
│ due_date        │       │ task_id (FK)          │─────┘           │
│ end_date        │       │ project_id            │                 │
│ dependencies    │       │ team_id (FK)          │─────────────────┘
│ created_at      │       │ uploaded_by (FK)      │───┐
│ updated_at      │       │ version               │   │
└─────────────────┘       │ created_at            │   │
                         │ updated_at            │   │
                         └─────────────────────────┘   │
                                    │                  │
                                    └──────────────────┘
```

## 📋 테이블 상세 스키마

### 1. Users Table (사용자)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR NOT NULL UNIQUE,
  name VARCHAR,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_users_email ON users(email);
```

**컬럼 설명:**

- `id`: 고유 사용자 ID (UUID)
- `email`: 로그인용 이메일 주소 (유니크)
- `name`: 사용자 표시명
- `avatar`: 프로필 이미지 URL
- `created_at`: 계정 생성 시간
- `updated_at`: 마지막 업데이트 시간

### 2. Teams Table (팀)

```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id),
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_teams_owner_id ON teams(owner_id);
CREATE INDEX idx_teams_is_active ON teams(is_active);
```

**컬럼 설명:**

- `id`: 고유 팀 ID (UUID)
- `name`: 팀 이름
- `description`: 팀 설명
- `owner_id`: 팀 소유자 ID (users.id 참조)
- `settings`: 팀별 설정 (JSON 형태)
- `is_active`: 팀 활성화 상태
- `created_at`: 팀 생성 시간
- `updated_at`: 마지막 업데이트 시간

### 3. Team_Members Table (팀 멤버)

```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL DEFAULT 'MEMBER',
  status VARCHAR NOT NULL DEFAULT 'ACTIVE',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by UUID REFERENCES users(id),

  UNIQUE(team_id, user_id)
);

-- 인덱스
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_status ON team_members(status);
```

**컬럼 설명:**

- `id`: 고유 멤버 관계 ID (UUID)
- `team_id`: 팀 ID (teams.id 참조)
- `user_id`: 사용자 ID (users.id 참조)
- `role`: 팀 내 역할 (`OWNER`, `ADMIN`, `EDITOR`, `VIEWER`)
- `status`: 멤버 상태 (`ACTIVE`, `PENDING`, `INACTIVE`)
- `joined_at`: 팀 가입 시간
- `invited_by`: 초대한 사용자 ID

### 4. Tasks Table (태스크)

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR NOT NULL,
  description TEXT,
  status VARCHAR NOT NULL DEFAULT 'TODO',
  priority VARCHAR NOT NULL DEFAULT 'MEDIUM',
  assignee_id UUID REFERENCES users(id),
  team_id UUID REFERENCES teams(id),
  project_id UUID,
  created_by UUID REFERENCES users(id),
  start_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  dependencies UUID[], -- 의존성 태스크 ID 배열
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_tasks_team_id ON tasks(team_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
```

**컬럼 설명:**

- `id`: 고유 태스크 ID (UUID)
- `title`: 태스크 제목
- `description`: 태스크 상세 설명
- `status`: 태스크 상태 (`TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`, `CANCELLED`)
- `priority`: 우선순위 (`LOW`, `MEDIUM`, `HIGH`, `URGENT`)
- `assignee_id`: 담당자 ID (users.id 참조)
- `team_id`: 소속 팀 ID (teams.id 참조)
- `project_id`: 프로젝트 ID (향후 확장용)
- `created_by`: 생성자 ID (users.id 참조)
- `start_date`: 시작일
- `due_date`: 마감일
- `end_date`: 완료일
- `dependencies`: 의존성 태스크 ID 배열
- `created_at`: 생성 시간
- `updated_at`: 마지막 업데이트 시간

### 5. File_Metadata Table (파일 메타데이터)

```sql
CREATE TABLE file_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR NOT NULL,
  file_path VARCHAR NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  project_id UUID,
  team_id UUID REFERENCES teams(id),
  uploaded_by UUID REFERENCES users(id),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_file_metadata_task_id ON file_metadata(task_id);
CREATE INDEX idx_file_metadata_team_id ON file_metadata(team_id);
CREATE INDEX idx_file_metadata_uploaded_by ON file_metadata(uploaded_by);
```

**컬럼 설명:**

- `id`: 고유 파일 메타데이터 ID (UUID)
- `file_name`: 원본 파일명
- `file_path`: Supabase Storage 내 파일 경로
- `file_size`: 파일 크기 (바이트)
- `mime_type`: 파일 MIME 타입
- `task_id`: 연결된 태스크 ID (tasks.id 참조)
- `project_id`: 프로젝트 ID (향후 확장용)
- `team_id`: 소속 팀 ID (teams.id 참조)
- `uploaded_by`: 업로드한 사용자 ID (users.id 참조)
- `version`: 파일 버전 (향후 확장용)
- `created_at`: 업로드 시간
- `updated_at`: 마지막 업데이트 시간

## 🔐 Row Level Security (RLS) 정책

### Users Table 정책

```sql
-- 사용자는 자신의 정보만 조회/수정 가능
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);
```

### Teams Table 정책

```sql
-- 팀 멤버만 팀 정보 조회 가능, 소유자만 수정 가능
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view team" ON teams
  FOR SELECT USING (
    id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()::text AND status = 'ACTIVE'
    )
  );

CREATE POLICY "Team owners can update team" ON teams
  FOR UPDATE USING (owner_id = auth.uid()::text);
```

### Tasks Table 정책

```sql
-- 팀 멤버만 태스크 조회/수정 가능
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view tasks" ON tasks
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()::text AND status = 'ACTIVE'
    )
  );

CREATE POLICY "Team members can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()::text AND status = 'ACTIVE'
    )
  );
```

### File_Metadata Table 정책

```sql
-- 팀 멤버만 파일 접근 가능
ALTER TABLE file_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view files" ON file_metadata
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()::text AND status = 'ACTIVE'
    )
  );
```

## 🚀 데이터베이스 초기화 스크립트

### 전체 스키마 생성

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR NOT NULL UNIQUE,
  name VARCHAR,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id),
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members table
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL DEFAULT 'MEMBER',
  status VARCHAR NOT NULL DEFAULT 'ACTIVE',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by UUID REFERENCES users(id),
  UNIQUE(team_id, user_id)
);

-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR NOT NULL,
  description TEXT,
  status VARCHAR NOT NULL DEFAULT 'TODO',
  priority VARCHAR NOT NULL DEFAULT 'MEDIUM',
  assignee_id UUID REFERENCES users(id),
  team_id UUID REFERENCES teams(id),
  project_id UUID,
  created_by UUID REFERENCES users(id),
  start_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  dependencies UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- File metadata table
CREATE TABLE file_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR NOT NULL,
  file_path VARCHAR NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  project_id UUID,
  team_id UUID REFERENCES teams(id),
  uploaded_by UUID REFERENCES users(id),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_teams_owner_id ON teams(owner_id);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_tasks_team_id ON tasks(team_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_file_metadata_task_id ON file_metadata(task_id);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_metadata ENABLE ROW LEVEL SECURITY;
```

## 📈 성능 최적화

### 1. 인덱스 최적화

- 주요 쿼리 패턴에 맞는 복합 인덱스 생성
- `team_id`와 `status` 조합 쿼리가 많으므로 복합 인덱스 고려

### 2. 쿼리 최적화

- JOIN 최소화: 필요한 데이터만 조회
- Pagination: LIMIT/OFFSET 대신 cursor 기반 페이징

### 3. 데이터 아카이브

- 완료된 태스크 정기적 아카이브
- 파일 메타데이터 정리

---

**스키마 버전**: 1.0  
**마지막 업데이트**: 2025년 1월  
**호환성**: Supabase PostgreSQL 15+
