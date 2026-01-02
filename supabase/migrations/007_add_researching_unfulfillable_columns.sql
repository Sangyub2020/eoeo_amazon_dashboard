-- Researching과 Unfulfillable 재고 정보 컬럼 추가

-- 1. Researching 재고 관련 컬럼 추가
ALTER TABLE amazon_us_monthly_data
ADD COLUMN IF NOT EXISTS researching_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS researching_short_term INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS researching_mid_term INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS researching_long_term INTEGER DEFAULT 0;

-- 2. Unfulfillable 재고 관련 컬럼 추가
ALTER TABLE amazon_us_monthly_data
ADD COLUMN IF NOT EXISTS unfulfillable_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unfulfillable_customer_damaged INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unfulfillable_warehouse_damaged INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unfulfillable_distributor_damaged INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unfulfillable_carrier_damaged INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unfulfillable_defective INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unfulfillable_expired INTEGER DEFAULT 0;

-- 3. 컬럼 설명 추가 (선택사항)
COMMENT ON COLUMN amazon_us_monthly_data.researching_total IS '조사 중인 총 재고 수량';
COMMENT ON COLUMN amazon_us_monthly_data.researching_short_term IS '단기 조사 중인 재고 수량';
COMMENT ON COLUMN amazon_us_monthly_data.researching_mid_term IS '중기 조사 중인 재고 수량';
COMMENT ON COLUMN amazon_us_monthly_data.researching_long_term IS '장기 조사 중인 재고 수량';

COMMENT ON COLUMN amazon_us_monthly_data.unfulfillable_total IS '판매 불가능한 총 재고 수량';
COMMENT ON COLUMN amazon_us_monthly_data.unfulfillable_customer_damaged IS '고객 손상으로 인한 판매 불가 재고';
COMMENT ON COLUMN amazon_us_monthly_data.unfulfillable_warehouse_damaged IS '창고 손상으로 인한 판매 불가 재고';
COMMENT ON COLUMN amazon_us_monthly_data.unfulfillable_distributor_damaged IS '유통업체 손상으로 인한 판매 불가 재고';
COMMENT ON COLUMN amazon_us_monthly_data.unfulfillable_carrier_damaged IS '운송업체 손상으로 인한 판매 불가 재고';
COMMENT ON COLUMN amazon_us_monthly_data.unfulfillable_defective IS '불량품으로 인한 판매 불가 재고';
COMMENT ON COLUMN amazon_us_monthly_data.unfulfillable_expired IS '유통기한 만료로 인한 판매 불가 재고';





