-- =========================================
-- Enum 타입 확인 및 수정된 팀 초대 시스템
-- Supabase SQL Editor에서 실행
-- =========================================

-- 1. 먼저 기존 enum 타입들 확인
SELECT 
  t.typname as enum_name,
  string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as enum_values
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
GROUP BY t.typname
ORDER BY t.typname;

-- 2. team_members 테이블의 컬럼 정보 확인
SELECT 
    column_name, 
    data_type, 
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'team_members'
ORDER BY ordinal_position;

-- 3. 팀 초대 대기열 테이블 생성 (텍스트 타입으로 안전하게)
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'EDITOR',
  invited_by UUID NOT NULL REFERENCES public.users(id),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(team_id, email)
);

-- RLS 정책 설정
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- 완료
SELECT 'Enum types checked and team_invitations table created!' as result;