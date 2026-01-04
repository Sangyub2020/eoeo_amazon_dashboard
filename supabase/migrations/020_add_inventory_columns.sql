-- amazon_us_monthly_data 테이블에 재고 관련 추가 컬럼들 추가
-- 외부 구글 시트의 재고 정보를 저장하기 위한 컬럼들

ALTER TABLE amazon_us_monthly_data 
  ADD COLUMN IF NOT EXISTS pending_in_kr INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS in_air INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS in_ocean INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sl_glovis INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ctk_usa INTEGER DEFAULT 0;

-- 컬럼 설명 추가
COMMENT ON COLUMN amazon_us_monthly_data.pending_in_kr IS '한국 대기 중인 재고 수량';
COMMENT ON COLUMN amazon_us_monthly_data.in_air IS '항공 운송 중인 재고 수량';
COMMENT ON COLUMN amazon_us_monthly_data.in_ocean IS '해상 운송 중인 재고 수량';
COMMENT ON COLUMN amazon_us_monthly_data.sl_glovis IS 'SL Glovis 재고 수량';
COMMENT ON COLUMN amazon_us_monthly_data.ctk_usa IS 'CTK USA 재고 수량';



