-- =========================================
-- project_id를 nullable로 변경
-- Supabase SQL Editor에서 실행
-- =========================================

-- tasks 테이블의 project_id 컬럼을 nullable로 변경
ALTER TABLE public.tasks 
ALTER COLUMN project_id DROP NOT NULL;

-- 완료 메시지
SELECT 'project_id column is now nullable!' as result;