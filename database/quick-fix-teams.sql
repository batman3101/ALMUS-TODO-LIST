-- ===============================================
-- 빠른 해결: teams 테이블 재생성
-- ===============================================
-- 주의: 기존 데이터가 삭제됩니다!

-- 1. 기존 테이블 백업 (선택사항)
CREATE TABLE IF NOT EXISTS teams_backup AS SELECT * FROM teams;

-- 2. 기존 테이블 삭제
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

-- 3. teams 테이블 새로 생성
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    member_count INTEGER DEFAULT 1,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. team_members 테이블 생성
CREATE TABLE public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'VIEWER',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(team_id, user_id)
);

-- 5. RLS 활성화
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 6. 최소한의 RLS 정책
CREATE POLICY "anyone_can_select_teams" 
ON public.teams FOR SELECT 
USING (true);

CREATE POLICY "authenticated_can_insert_teams" 
ON public.teams FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner_can_update_teams" 
ON public.teams FOR UPDATE 
USING (auth.uid() = owner_id);

CREATE POLICY "owner_can_delete_teams" 
ON public.teams FOR DELETE 
USING (auth.uid() = owner_id);

-- team_members 정책
CREATE POLICY "anyone_can_select_members" 
ON public.team_members FOR SELECT 
USING (true);

CREATE POLICY "team_owner_can_insert_members" 
ON public.team_members FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.teams 
        WHERE id = team_id AND owner_id = auth.uid()
    )
);

-- 7. 인덱스 생성
CREATE INDEX idx_teams_owner_id ON public.teams(owner_id);
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);

-- 8. 테스트
SELECT 'Setup completed successfully!' as status;