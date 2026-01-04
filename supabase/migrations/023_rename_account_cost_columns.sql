-- 계정 비용 테이블 컬럼명 수정
-- 더 명확한 명칭으로 변경

-- 1. 재고 폐기 수수료 → FBA Removal Order: Disposal Fee
ALTER TABLE amazon_us_account_monthly_costs 
RENAME COLUMN inventory_disposal_fee TO fba_removal_order_disposal_fee;

COMMENT ON COLUMN amazon_us_account_monthly_costs.fba_removal_order_disposal_fee IS 'FBA Removal Order: Disposal Fee';

-- 2. 재고 제거 수수료 → FBA Removal Order: Return Fee
ALTER TABLE amazon_us_account_monthly_costs 
RENAME COLUMN inventory_removal_fee TO fba_removal_order_return_fee;

COMMENT ON COLUMN amazon_us_account_monthly_costs.fba_removal_order_return_fee IS 'FBA Removal Order: Return Fee';

-- 3. 장기 저장 수수료 → Longterm Storage Fee
ALTER TABLE amazon_us_account_monthly_costs 
RENAME COLUMN long_term_storage_fee TO longterm_storage_fee;

COMMENT ON COLUMN amazon_us_account_monthly_costs.longterm_storage_fee IS 'Longterm Storage Fee';

-- 4. 월별 저장 수수료는 컬럼명은 그대로 두고 코멘트만 업데이트
COMMENT ON COLUMN amazon_us_account_monthly_costs.monthly_storage_fee IS 'Monthly Storage Fee';

