-- amazon_us_monthly_data 테이블에 안분된 계정 비용 컬럼 추가
-- 계정 단위 비용을 SKU별 매출 비율로 안분한 금액을 저장

ALTER TABLE amazon_us_monthly_data 
ADD COLUMN IF NOT EXISTS allocated_account_cost DECIMAL(12, 2) DEFAULT 0;

COMMENT ON COLUMN amazon_us_monthly_data.allocated_account_cost IS '계정 단위 비용에서 안분된 금액 (해당 SKU의 매출 비율에 따라 계산)';

-- 인덱스 추가 (필요시)
-- CREATE INDEX IF NOT EXISTS idx_amazon_us_monthly_data_allocated_cost ON amazon_us_monthly_data(allocated_account_cost);

