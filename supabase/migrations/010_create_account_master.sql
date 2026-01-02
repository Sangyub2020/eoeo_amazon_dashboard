-- 계정 마스터 테이블 생성
-- Amazon 계정별 정보를 저장하는 테이블

CREATE TABLE IF NOT EXISTS account_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name TEXT NOT NULL UNIQUE, -- 계정 이름 (예: "MARS MADE", "Tangerine Stories")
  merchant_code TEXT NOT NULL UNIQUE, -- Merchant Code (예: "A2635T8UXSIYOI")
  referral_fee_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.15, -- Referral 수수료율 (예: 0.15 = 15%)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT referral_fee_rate_check CHECK (referral_fee_rate >= 0 AND referral_fee_rate <= 1)
);

-- 코멘트 추가
COMMENT ON TABLE account_master IS 'Amazon 계정별 마스터 정보';
COMMENT ON COLUMN account_master.account_name IS '계정 이름';
COMMENT ON COLUMN account_master.merchant_code IS 'Merchant Code (Seller ID)';
COMMENT ON COLUMN account_master.referral_fee_rate IS 'Referral 수수료율 (0.15 = 15%)';

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_account_master_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER account_master_updated_at
  BEFORE UPDATE ON account_master
  FOR EACH ROW
  EXECUTE FUNCTION update_account_master_updated_at();

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_account_master_merchant_code ON account_master(merchant_code);
CREATE INDEX IF NOT EXISTS idx_account_master_account_name ON account_master(account_name);





