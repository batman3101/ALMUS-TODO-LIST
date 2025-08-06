-- Users 테이블에 대한 RLS 정책 설정
-- 이 스크립트를 Supabase SQL Editor에서 실행하세요

-- RLS 활성화
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있을 경우)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- 사용자가 자신의 프로필을 조회할 수 있도록 허용
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- 사용자가 자신의 프로필을 생성할 수 있도록 허용
CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 사용자가 자신의 프로필을 업데이트할 수 있도록 허용
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- 팀 멤버들끼리 서로의 프로필을 볼 수 있도록 허용
CREATE POLICY "Team members can view each other" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm1
      JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
      WHERE tm1.user_id = auth.uid() 
      AND tm2.user_id = users.id
    )
  );