-- account_master 테이블에 Amazon API 인증 정보 컬럼 추가
-- 여러 Amazon 계정을 지원하기 위한 마이그레이션

ALTER TABLE account_master
ADD COLUMN IF NOT EXISTS sp_api_client_id TEXT,
ADD COLUMN IF NOT EXISTS sp_api_client_secret TEXT,
ADD COLUMN IF NOT EXISTS sp_api_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS sp_api_base_url TEXT DEFAULT 'https://sellingpartnerapi-na.amazon.com';

-- 코멘트 추가
COMMENT ON COLUMN account_master.sp_api_client_id IS 'Amazon SP-API Client ID (이 계정의 API 인증 정보)';
COMMENT ON COLUMN account_master.sp_api_client_secret IS 'Amazon SP-API Client Secret (암호화 권장)';
COMMENT ON COLUMN account_master.sp_api_refresh_token IS 'Amazon SP-API Refresh Token (암호화 권장)';
COMMENT ON COLUMN account_master.sp_api_base_url IS 'Amazon SP-API Base URL (기본값: https://sellingpartnerapi-na.amazon.com)';

-- 인덱스 추가 (API 정보 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_account_master_has_api_info ON account_master(account_name) 
WHERE sp_api_client_id IS NOT NULL AND sp_api_client_secret IS NOT NULL AND sp_api_refresh_token IS NOT NULL;




