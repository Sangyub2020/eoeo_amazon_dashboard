-- 월별 총 수수료 필드 추가
-- 개당 수수료와 월별 총 수수료를 모두 저장할 수 있도록 필드 추가

ALTER TABLE amazon_us_monthly_data
ADD COLUMN IF NOT EXISTS total_fba_fee DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_referral_fee DECIMAL(12, 2) DEFAULT 0;

-- 코멘트 추가
COMMENT ON COLUMN amazon_us_monthly_data.fba_fee IS '개당 FBA 수수료';
COMMENT ON COLUMN amazon_us_monthly_data.referral_fee IS '개당 추천 수수료';
COMMENT ON COLUMN amazon_us_monthly_data.total_fba_fee IS '월별 총 FBA 수수료 (개당 수수료 × 판매 수량)';
COMMENT ON COLUMN amazon_us_monthly_data.total_referral_fee IS '월별 총 추천 수수료 (개당 수수료 × 판매 수량)';





