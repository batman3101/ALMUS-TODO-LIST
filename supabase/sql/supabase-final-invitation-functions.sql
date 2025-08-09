-- =========================================
-- 최종 팀 초대 자동화 함수들 (정확한 타입 사용)
-- Supabase SQL Editor에서 실행
-- =========================================

-- 1. team_invitations 테이블의 role을 team_role enum으로 수정
ALTER TABLE public.team_invitations 
ALTER COLUMN role TYPE team_role USING role::team_role;

-- 2. users 테이블에 사용자가 추가될 때 대기 중인 초대를 자동 처리하는 함수
CREATE OR REPLACE FUNCTION public.handle_user_invitations()
RETURNS TRIGGER AS $$
BEGIN
  -- 새로 등록된 사용자의 이메일로 대기 중인 초대가 있는지 확인
  INSERT INTO public.team_members (team_id, user_id, role, status, is_active, joined_at)
  SELECT 
    ti.team_id,
    NEW.id as user_id,
    ti.role,           -- team_role enum 타입
    'ACTIVE',          -- text 타입
    true,              -- boolean 타입
    NOW()
  FROM public.team_invitations ti
  WHERE ti.email = NEW.email 
    AND ti.status = 'PENDING'
    AND NOT EXISTS (
      -- 이미 해당 팀의 멤버가 아닌 경우에만 추가
      SELECT 1 FROM public.team_members tm 
      WHERE tm.team_id = ti.team_id AND tm.user_id = NEW.id
    );

  -- 처리된 초대를 ACCEPTED 상태로 업데이트
  UPDATE public.team_invitations 
  SET 
    status = 'ACCEPTED',
    accepted_at = NOW()
  WHERE email = NEW.email AND status = 'PENDING';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. users 테이블에 트리거 연결
DROP TRIGGER IF EXISTS on_user_created_handle_invitations ON public.users;
CREATE TRIGGER on_user_created_handle_invitations
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_invitations();

-- 4. 팀 초대 함수 (애플리케이션에서 호출)
CREATE OR REPLACE FUNCTION public.invite_team_member(
  p_team_id UUID,
  p_email TEXT,
  p_role team_role,
  p_invited_by UUID
)
RETURNS JSON AS $$
DECLARE
  existing_user_id UUID;
  result JSON;
BEGIN
  -- 이미 존재하는 사용자인지 확인
  SELECT id INTO existing_user_id 
  FROM public.users 
  WHERE email = p_email;

  IF existing_user_id IS NOT NULL THEN
    -- 사용자가 이미 존재하는 경우 바로 team_members에 추가
    
    -- 이미 팀 멤버인지 확인
    IF EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_id = p_team_id AND user_id = existing_user_id
    ) THEN
      RETURN json_build_object(
        'success', false,
        'message', '이미 팀 멤버입니다.'
      );
    END IF;

    -- team_members에 추가
    INSERT INTO public.team_members (team_id, user_id, role, status, is_active, joined_at, invited_by)
    VALUES (p_team_id, existing_user_id, p_role, 'ACTIVE', true, NOW(), p_invited_by);

    RETURN json_build_object(
      'success', true,
      'message', '팀 멤버로 즉시 추가되었습니다.'
    );
  ELSE
    -- 사용자가 존재하지 않는 경우 초대 대기열에 추가
    INSERT INTO public.team_invitations (team_id, email, role, invited_by)
    VALUES (p_team_id, p_email, p_role, p_invited_by)
    ON CONFLICT (team_id, email) 
    DO UPDATE SET 
      role = EXCLUDED.role,
      invited_by = EXCLUDED.invited_by,
      created_at = NOW(),
      status = 'PENDING';

    RETURN json_build_object(
      'success', true,
      'message', '사용자가 회원가입하면 자동으로 팀에 추가됩니다.'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 기존 대기 중인 초대가 있는 경우 처리 (기존 사용자들을 위한 일회성 실행)
INSERT INTO public.team_members (team_id, user_id, role, status, is_active, joined_at)
SELECT DISTINCT
  ti.team_id,
  u.id as user_id,
  ti.role,      -- team_role enum
  'ACTIVE',     -- text
  true,         -- boolean
  NOW()
FROM public.team_invitations ti
INNER JOIN public.users u ON u.email = ti.email
WHERE ti.status = 'PENDING'
  AND NOT EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.team_id = ti.team_id AND tm.user_id = u.id
  );

-- 처리된 초대를 ACCEPTED 상태로 업데이트
UPDATE public.team_invitations 
SET 
  status = 'ACCEPTED',
  accepted_at = NOW()
WHERE status = 'PENDING' 
  AND email IN (SELECT email FROM public.users);

-- 완료 메시지
SELECT 'Team invitation automation system completed successfully!' as result;