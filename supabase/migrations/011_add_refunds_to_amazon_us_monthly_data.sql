-- amazon_us_monthly_data 테이블에 refunds 컬럼 추가

ALTER TABLE amazon_us_monthly_data
ADD COLUMN IF NOT EXISTS refunds DECIMAL(12, 2) DEFAULT 0;

-- 코멘트 추가
COMMENT ON COLUMN amazon_us_monthly_data.refunds IS '환불 금액';





