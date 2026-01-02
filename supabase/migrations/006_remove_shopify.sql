-- Shopify 관련 데이터베이스 객체 삭제 마이그레이션

-- 1. Shopify 월별 데이터 테이블 삭제
DROP TABLE IF EXISTS shopify_monthly_data CASCADE;

-- 2. 뷰에서 Shopify 관련 부분 제거
-- monthly_summary_by_channel 뷰 재생성 (Shopify 제외)
DROP VIEW IF EXISTS monthly_summary_by_channel CASCADE;

CREATE OR REPLACE VIEW monthly_summary_by_channel AS
SELECT 
  sm.channel,
  smd.year,
  smd.month,
  COUNT(DISTINCT smd.sku) AS sku_count,
  COALESCE(SUM(smd.gross_sales), 0) AS total_revenue,
  COALESCE(SUM(smd.refunds), 0) AS total_refunds,
  COALESCE(SUM(smd.profit_14_final), 0) AS total_profit,
  COALESCE(SUM(smd.total_order_quantity), 0) AS total_quantity,
  COALESCE(SUM(smd.cpc_cost), 0) AS total_cpc_cost,
  COALESCE(SUM(smd.cpc_sales), 0) AS total_cpc_sales,
  COALESCE(SUM(smd.self_dsp_cost + smd.support_dsp_cost), 0) AS total_dsp_cost,
  COALESCE(SUM(smd.self_dsp_sales + smd.support_dsp_sales), 0) AS total_dsp_sales,
  -- 레거시 호환성
  COALESCE(SUM(smd.cost), 0) AS total_cost,
  COUNT(*) AS order_count
FROM (
  SELECT sku, year, month, gross_sales, refunds, profit_14_final, total_order_quantity, 
         cpc_cost, cpc_sales, self_dsp_cost, support_dsp_cost, self_dsp_sales, support_dsp_sales, cost
  FROM amazon_us_monthly_data
  UNION ALL
  SELECT sku, year, month, gross_sales, refunds, profit_14_final, total_order_quantity,
         cpc_cost, cpc_sales, self_dsp_cost, support_dsp_cost, self_dsp_sales, support_dsp_sales, cost
  FROM tiktok_shop_monthly_data
) smd
JOIN sku_master sm ON smd.sku = sm.sku
WHERE sm.channel IN ('amazon_us', 'tiktok_shop')
GROUP BY sm.channel, smd.year, smd.month
ORDER BY smd.year DESC, smd.month DESC;

-- 3. sku_summary_view 뷰 재생성 (Shopify 제외)
DROP VIEW IF EXISTS sku_summary_view CASCADE;

CREATE OR REPLACE VIEW sku_summary_view AS
SELECT 
  sm.sku,
  sm.product_name,
  sm.channel,
  pm.brand_name,
  pm.company_name,
  COALESCE(SUM(smd.gross_sales), 0) AS total_revenue,
  COALESCE(SUM(smd.profit_14_final), 0) AS total_profit,
  COALESCE(SUM(smd.total_order_quantity), 0) AS total_quantity,
  CASE 
    WHEN SUM(smd.gross_sales) > 0 
    THEN (SUM(smd.profit_14_final) / SUM(smd.gross_sales)) * 100 
    ELSE 0 
  END AS avg_margin_percentage
FROM sku_master sm
LEFT JOIN product_master pm ON sm.internal_code = pm.internal_code
LEFT JOIN (
  SELECT sku, year, month, gross_sales, profit_14_final, total_order_quantity
  FROM amazon_us_monthly_data
  UNION ALL
  SELECT sku, year, month, gross_sales, profit_14_final, total_order_quantity
  FROM tiktok_shop_monthly_data
) smd ON sm.sku = smd.sku
WHERE sm.channel IN ('amazon_us', 'tiktok_shop')
GROUP BY sm.sku, sm.product_name, sm.channel, pm.brand_name, pm.company_name;

-- 4. sku_master 테이블의 channel 체크 제약조건 수정 (shopify 제거)
-- 기존 제약조건 삭제
ALTER TABLE sku_master DROP CONSTRAINT IF EXISTS sku_master_channel_check;

-- 새로운 제약조건 추가 (shopify 제외)
ALTER TABLE sku_master ADD CONSTRAINT sku_master_channel_check 
  CHECK (channel IN ('amazon_us', 'tiktok_shop'));

-- 5. sales_data 테이블의 marketplace 체크 제약조건 수정 (shopify 제거)
-- 기존 제약조건 삭제
ALTER TABLE sales_data DROP CONSTRAINT IF EXISTS sales_data_marketplace_check;

-- 새로운 제약조건 추가 (shopify 제외)
ALTER TABLE sales_data ADD CONSTRAINT sales_data_marketplace_check 
  CHECK (marketplace IN ('amazon_us', 'tiktok_shop'));

-- 6. Shopify 채널의 SKU 마스터 데이터 삭제 (선택사항)
-- 주의: 이 작업은 데이터를 삭제합니다. 필요하지 않다면 주석 처리하세요.
-- DELETE FROM sku_master WHERE channel = 'shopify';

-- 7. Shopify 채널의 sales_data 삭제 (선택사항)
-- 주의: 이 작업은 데이터를 삭제합니다. 필요하지 않다면 주석 처리하세요.
-- DELETE FROM sales_data WHERE marketplace = 'shopify';

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE 'Shopify 관련 데이터베이스 객체가 성공적으로 삭제되었습니다.';
END $$;





