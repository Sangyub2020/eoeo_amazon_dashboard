-- account_master 테이블에 RLS 정책 추가
-- 다른 테이블들과 동일하게 공개 읽기/쓰기 허용

-- RLS 활성화
ALTER TABLE account_master ENABLE ROW LEVEL SECURITY;

-- 읽기 정책 (모든 사용자 허용)
DROP POLICY IF EXISTS "Allow public read access to account_master" ON account_master;
CREATE POLICY "Allow public read access to account_master" ON account_master
  FOR SELECT
  USING (true);

-- 쓰기 정책 (모든 사용자 허용)
DROP POLICY IF EXISTS "Allow public insert access to account_master" ON account_master;
CREATE POLICY "Allow public insert access to account_master" ON account_master
  FOR INSERT
  WITH CHECK (true);

-- 수정 정책 (모든 사용자 허용)
DROP POLICY IF EXISTS "Allow public update access to account_master" ON account_master;
CREATE POLICY "Allow public update access to account_master" ON account_master
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 삭제 정책 (모든 사용자 허용)
DROP POLICY IF EXISTS "Allow public delete access to account_master" ON account_master;
CREATE POLICY "Allow public delete access to account_master" ON account_master
  FOR DELETE
  USING (true);




