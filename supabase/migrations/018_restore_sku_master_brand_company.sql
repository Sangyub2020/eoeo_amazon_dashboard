-- sku_master 테이블의 brand_name과 company_name 복구
-- product_master의 데이터를 사용하여 복구

-- 1. 먼저 컬럼이 존재하는지 확인하고, 없으면 추가
ALTER TABLE sku_master 
  ADD COLUMN IF NOT EXISTS brand_name TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT;

-- 2. product_master의 brand_name과 company_name을 사용하여 sku_master 업데이트
-- internal_code가 일치하는 경우에만 업데이트
UPDATE sku_master sm
SET 
  brand_name = pm.brand_name,
  company_name = pm.company_name
FROM product_master pm
WHERE sm.internal_code = pm.internal_code
  AND sm.internal_code IS NOT NULL
  AND (sm.brand_name IS NULL OR sm.brand_name = '')
  AND (sm.company_name IS NULL OR sm.company_name = '');

-- 3. 업데이트 결과 확인용 쿼리 (주석 처리)
-- SELECT 
--   sm.sku,
--   sm.internal_code,
--   sm.brand_name AS sku_brand_name,
--   sm.company_name AS sku_company_name,
--   pm.brand_name AS product_brand_name,
--   pm.company_name AS product_company_name
-- FROM sku_master sm
-- LEFT JOIN product_master pm ON sm.internal_code = pm.internal_code
-- WHERE sm.internal_code IS NOT NULL
-- ORDER BY sm.sku;



