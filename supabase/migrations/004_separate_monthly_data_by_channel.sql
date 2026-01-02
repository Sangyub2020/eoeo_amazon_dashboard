-- 채널별 월별 데이터 테이블 분리 마이그레이션
-- 기존 sku_monthly_data 테이블을 채널별로 분리

-- 1. Amazon US 월별 데이터 테이블 생성
CREATE TABLE IF NOT EXISTS amazon_us_monthly_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL REFERENCES sku_master(sku) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  
  -- 재고 관련
  fba_inventory INTEGER DEFAULT 0,
  in_transit_to_fba INTEGER DEFAULT 0,
  inbound_working INTEGER DEFAULT 0,
  inbound_shipped INTEGER DEFAULT 0,
  inbound_receiving INTEGER DEFAULT 0,
  reserved_orders INTEGER DEFAULT 0,
  reserved_fc_transfer INTEGER DEFAULT 0,
  reserved_fc_processing INTEGER DEFAULT 0,
  ocean_to_3pl INTEGER DEFAULT 0,
  in_3pl INTEGER DEFAULT 0,
  
  -- 환율 및 공급가
  monthly_exchange_rate DECIMAL(10, 4),
  supply_cost_usd DECIMAL(12, 2),
  
  -- 수수료 (단가)
  fba_fee DECIMAL(12, 2) DEFAULT 0,
  referral_fee DECIMAL(12, 2) DEFAULT 0,
  transportation_fee DECIMAL(12, 2) DEFAULT 0,
  
  -- 계산된 값 (단가)
  cost DECIMAL(12, 2),
  margin DECIMAL(12, 2),
  margin_percentage DECIMAL(5, 2),
  
  -- 판매 수량
  total_order_quantity INTEGER DEFAULT 0,
  promotion_completed INTEGER DEFAULT 0,
  mcf_disposal_quantity INTEGER DEFAULT 0,
  organic_quantity INTEGER DEFAULT 0,
  mcf_quantity INTEGER DEFAULT 0,
  
  -- 매출
  gross_sales DECIMAL(12, 2) DEFAULT 0,
  refunds DECIMAL(12, 2) DEFAULT 0,
  
  -- 총 수수료
  total_fba_fee DECIMAL(12, 2) DEFAULT 0,
  total_referral_fee DECIMAL(12, 2) DEFAULT 0,
  
  -- 계정 단위 비용
  fba_inventory_disposals DECIMAL(12, 2) DEFAULT 0,
  fba_inventory_removals DECIMAL(12, 2) DEFAULT 0,
  fba_long_term_storage_fees DECIMAL(12, 2) DEFAULT 0,
  monthly_subscription_fee DECIMAL(12, 2) DEFAULT 0,
  paid_services_fee DECIMAL(12, 2) DEFAULT 0,
  monthly_storage_fee DECIMAL(12, 2) DEFAULT 0,
  
  -- 프로모션 비용
  self_promotion_cost DECIMAL(12, 2) DEFAULT 0,
  support_promotion_cost DECIMAL(12, 2) DEFAULT 0,
  
  -- CPC 관련
  cpc_cost DECIMAL(12, 2) DEFAULT 0,
  cpc_sales DECIMAL(12, 2) DEFAULT 0,
  cpc_roas DECIMAL(10, 4),
  sp_spend DECIMAL(12, 2) DEFAULT 0,
  sp_sales DECIMAL(12, 2) DEFAULT 0,
  sb_spend DECIMAL(12, 2) DEFAULT 0,
  sb_sales DECIMAL(12, 2) DEFAULT 0,
  sd_spend DECIMAL(12, 2) DEFAULT 0,
  sd_sales DECIMAL(12, 2) DEFAULT 0,
  
  -- DSP 관련
  self_dsp_cost DECIMAL(12, 2) DEFAULT 0,
  self_dsp_sales DECIMAL(12, 2) DEFAULT 0,
  support_dsp_cost DECIMAL(12, 2) DEFAULT 0,
  support_dsp_sales DECIMAL(12, 2) DEFAULT 0,
  dsp_roas DECIMAL(10, 4),
  
  -- MCF 비용
  self_mcf DECIMAL(12, 2) DEFAULT 0,
  support_mcf DECIMAL(12, 2) DEFAULT 0,
  
  -- 틱톡 비용
  self_tiktok_cost DECIMAL(12, 2) DEFAULT 0,
  support_tiktok_cost DECIMAL(12, 2) DEFAULT 0,
  
  -- 기타 마케팅 비용
  affiliate_cost DECIMAL(12, 2) DEFAULT 0,
  performance_marketing_cost DECIMAL(12, 2) DEFAULT 0,
  pulsead_fee DECIMAL(12, 2) DEFAULT 0,
  self_instagram_cost DECIMAL(12, 2) DEFAULT 0,
  
  -- 정산 및 지원금
  amazon_settlement DECIMAL(12, 2) DEFAULT 0,
  marketing_support_amount DECIMAL(12, 2) DEFAULT 0,
  
  -- 단계별 이익 및 비용
  profit_1 DECIMAL(12, 2),
  cost_1 DECIMAL(12, 2),
  cost_1_ratio DECIMAL(5, 2),
  profit_2 DECIMAL(12, 2),
  cost_2 DECIMAL(12, 2),
  cost_2_ratio DECIMAL(5, 2),
  profit_3 DECIMAL(12, 2),
  cost_3 DECIMAL(12, 2),
  cost_3_ratio DECIMAL(5, 2),
  profit_4 DECIMAL(12, 2),
  cost_4 DECIMAL(12, 2),
  cost_4_ratio DECIMAL(5, 2),
  profit_5 DECIMAL(12, 2),
  cost_5 DECIMAL(12, 2),
  cost_5_ratio DECIMAL(5, 2),
  profit_6 DECIMAL(12, 2),
  cost_6 DECIMAL(12, 2),
  cost_6_ratio DECIMAL(5, 2),
  profit_7 DECIMAL(12, 2),
  cost_7 DECIMAL(12, 2),
  cost_7_ratio DECIMAL(5, 2),
  profit_8 DECIMAL(12, 2),
  cost_8 DECIMAL(12, 2),
  cost_8_ratio DECIMAL(5, 2),
  profit_9 DECIMAL(12, 2),
  cost_9 DECIMAL(12, 2),
  cost_9_ratio DECIMAL(5, 2),
  profit_9_5 DECIMAL(12, 2),
  cost_9_5 DECIMAL(12, 2),
  cost_9_5_ratio DECIMAL(5, 2),
  profit_10 DECIMAL(12, 2),
  cost_10 DECIMAL(12, 2),
  cost_10_ratio DECIMAL(5, 2),
  profit_11 DECIMAL(12, 2),
  cost_11 DECIMAL(12, 2),
  cost_11_ratio DECIMAL(5, 2),
  profit_12 DECIMAL(12, 2),
  cost_12 DECIMAL(12, 2),
  cost_12_ratio DECIMAL(5, 2),
  profit_13 DECIMAL(12, 2),
  cost_13 DECIMAL(12, 2),
  cost_13_ratio DECIMAL(5, 2),
  profit_14_final DECIMAL(12, 2),
  support_amount_ratio DECIMAL(5, 2),
  
  -- 기타 수익
  other_revenue DECIMAL(12, 2) DEFAULT 0,
  
  -- 일별 판매량 (JSON으로 저장)
  daily_sales JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 고유 제약 조건
  CONSTRAINT unique_amazon_us_sku_month UNIQUE (sku, year, month),
  -- SKU가 amazon_us 채널인지 확인
  CONSTRAINT check_amazon_us_channel CHECK (
    EXISTS (
      SELECT 1 FROM sku_master sm 
      WHERE sm.sku = amazon_us_monthly_data.sku 
      AND sm.channel = 'amazon_us'
    )
  )
);

-- 2. TikTok Shop 월별 데이터 테이블 생성 (Amazon과 동일한 구조, 일부 필드는 NULL 허용 가능)
CREATE TABLE IF NOT EXISTS tiktok_shop_monthly_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL REFERENCES sku_master(sku) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  
  -- 재고 관련
  fba_inventory INTEGER DEFAULT 0,
  in_transit_to_fba INTEGER DEFAULT 0,
  inbound_working INTEGER DEFAULT 0,
  inbound_shipped INTEGER DEFAULT 0,
  inbound_receiving INTEGER DEFAULT 0,
  reserved_orders INTEGER DEFAULT 0,
  reserved_fc_transfer INTEGER DEFAULT 0,
  reserved_fc_processing INTEGER DEFAULT 0,
  ocean_to_3pl INTEGER DEFAULT 0,
  in_3pl INTEGER DEFAULT 0,
  
  -- 환율 및 공급가
  monthly_exchange_rate DECIMAL(10, 4),
  supply_cost_usd DECIMAL(12, 2),
  
  -- 수수료 (단가)
  fba_fee DECIMAL(12, 2) DEFAULT 0,
  referral_fee DECIMAL(12, 2) DEFAULT 0,
  transportation_fee DECIMAL(12, 2) DEFAULT 0,
  
  -- 계산된 값 (단가)
  cost DECIMAL(12, 2),
  margin DECIMAL(12, 2),
  margin_percentage DECIMAL(5, 2),
  
  -- 판매 수량
  total_order_quantity INTEGER DEFAULT 0,
  promotion_completed INTEGER DEFAULT 0,
  mcf_disposal_quantity INTEGER DEFAULT 0,
  organic_quantity INTEGER DEFAULT 0,
  mcf_quantity INTEGER DEFAULT 0,
  
  -- 매출
  gross_sales DECIMAL(12, 2) DEFAULT 0,
  refunds DECIMAL(12, 2) DEFAULT 0,
  
  -- 총 수수료
  total_fba_fee DECIMAL(12, 2) DEFAULT 0,
  total_referral_fee DECIMAL(12, 2) DEFAULT 0,
  
  -- 계정 단위 비용
  fba_inventory_disposals DECIMAL(12, 2) DEFAULT 0,
  fba_inventory_removals DECIMAL(12, 2) DEFAULT 0,
  fba_long_term_storage_fees DECIMAL(12, 2) DEFAULT 0,
  monthly_subscription_fee DECIMAL(12, 2) DEFAULT 0,
  paid_services_fee DECIMAL(12, 2) DEFAULT 0,
  monthly_storage_fee DECIMAL(12, 2) DEFAULT 0,
  
  -- 프로모션 비용
  self_promotion_cost DECIMAL(12, 2) DEFAULT 0,
  support_promotion_cost DECIMAL(12, 2) DEFAULT 0,
  
  -- CPC 관련
  cpc_cost DECIMAL(12, 2) DEFAULT 0,
  cpc_sales DECIMAL(12, 2) DEFAULT 0,
  cpc_roas DECIMAL(10, 4),
  sp_spend DECIMAL(12, 2) DEFAULT 0,
  sp_sales DECIMAL(12, 2) DEFAULT 0,
  sb_spend DECIMAL(12, 2) DEFAULT 0,
  sb_sales DECIMAL(12, 2) DEFAULT 0,
  sd_spend DECIMAL(12, 2) DEFAULT 0,
  sd_sales DECIMAL(12, 2) DEFAULT 0,
  
  -- DSP 관련
  self_dsp_cost DECIMAL(12, 2) DEFAULT 0,
  self_dsp_sales DECIMAL(12, 2) DEFAULT 0,
  support_dsp_cost DECIMAL(12, 2) DEFAULT 0,
  support_dsp_sales DECIMAL(12, 2) DEFAULT 0,
  dsp_roas DECIMAL(10, 4),
  
  -- MCF 비용
  self_mcf DECIMAL(12, 2) DEFAULT 0,
  support_mcf DECIMAL(12, 2) DEFAULT 0,
  
  -- 틱톡 비용
  self_tiktok_cost DECIMAL(12, 2) DEFAULT 0,
  support_tiktok_cost DECIMAL(12, 2) DEFAULT 0,
  
  -- 기타 마케팅 비용
  affiliate_cost DECIMAL(12, 2) DEFAULT 0,
  performance_marketing_cost DECIMAL(12, 2) DEFAULT 0,
  pulsead_fee DECIMAL(12, 2) DEFAULT 0,
  self_instagram_cost DECIMAL(12, 2) DEFAULT 0,
  
  -- 정산 및 지원금
  amazon_settlement DECIMAL(12, 2) DEFAULT 0,
  marketing_support_amount DECIMAL(12, 2) DEFAULT 0,
  
  -- 단계별 이익 및 비용
  profit_1 DECIMAL(12, 2),
  cost_1 DECIMAL(12, 2),
  cost_1_ratio DECIMAL(5, 2),
  profit_2 DECIMAL(12, 2),
  cost_2 DECIMAL(12, 2),
  cost_2_ratio DECIMAL(5, 2),
  profit_3 DECIMAL(12, 2),
  cost_3 DECIMAL(12, 2),
  cost_3_ratio DECIMAL(5, 2),
  profit_4 DECIMAL(12, 2),
  cost_4 DECIMAL(12, 2),
  cost_4_ratio DECIMAL(5, 2),
  profit_5 DECIMAL(12, 2),
  cost_5 DECIMAL(12, 2),
  cost_5_ratio DECIMAL(5, 2),
  profit_6 DECIMAL(12, 2),
  cost_6 DECIMAL(12, 2),
  cost_6_ratio DECIMAL(5, 2),
  profit_7 DECIMAL(12, 2),
  cost_7 DECIMAL(12, 2),
  cost_7_ratio DECIMAL(5, 2),
  profit_8 DECIMAL(12, 2),
  cost_8 DECIMAL(12, 2),
  cost_8_ratio DECIMAL(5, 2),
  profit_9 DECIMAL(12, 2),
  cost_9 DECIMAL(12, 2),
  cost_9_ratio DECIMAL(5, 2),
  profit_9_5 DECIMAL(12, 2),
  cost_9_5 DECIMAL(12, 2),
  cost_9_5_ratio DECIMAL(5, 2),
  profit_10 DECIMAL(12, 2),
  cost_10 DECIMAL(12, 2),
  cost_10_ratio DECIMAL(5, 2),
  profit_11 DECIMAL(12, 2),
  cost_11 DECIMAL(12, 2),
  cost_11_ratio DECIMAL(5, 2),
  profit_12 DECIMAL(12, 2),
  cost_12 DECIMAL(12, 2),
  cost_12_ratio DECIMAL(5, 2),
  profit_13 DECIMAL(12, 2),
  cost_13 DECIMAL(12, 2),
  cost_13_ratio DECIMAL(5, 2),
  profit_14_final DECIMAL(12, 2),
  support_amount_ratio DECIMAL(5, 2),
  
  -- 기타 수익
  other_revenue DECIMAL(12, 2) DEFAULT 0,
  
  -- 일별 판매량 (JSON으로 저장)
  daily_sales JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 고유 제약 조건
  CONSTRAINT unique_tiktok_shop_sku_month UNIQUE (sku, year, month),
  -- SKU가 tiktok_shop 채널인지 확인
  CONSTRAINT check_tiktok_shop_channel CHECK (
    EXISTS (
      SELECT 1 FROM sku_master sm 
      WHERE sm.sku = tiktok_shop_monthly_data.sku 
      AND sm.channel = 'tiktok_shop'
    )
  )
);

-- 3. Shopify 월별 데이터 테이블 생성
CREATE TABLE IF NOT EXISTS shopify_monthly_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL REFERENCES sku_master(sku) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  
  -- 재고 관련
  fba_inventory INTEGER DEFAULT 0,
  in_transit_to_fba INTEGER DEFAULT 0,
  inbound_working INTEGER DEFAULT 0,
  inbound_shipped INTEGER DEFAULT 0,
  inbound_receiving INTEGER DEFAULT 0,
  reserved_orders INTEGER DEFAULT 0,
  reserved_fc_transfer INTEGER DEFAULT 0,
  reserved_fc_processing INTEGER DEFAULT 0,
  ocean_to_3pl INTEGER DEFAULT 0,
  in_3pl INTEGER DEFAULT 0,
  
  -- 환율 및 공급가
  monthly_exchange_rate DECIMAL(10, 4),
  supply_cost_usd DECIMAL(12, 2),
  
  -- 수수료 (단가)
  fba_fee DECIMAL(12, 2) DEFAULT 0,
  referral_fee DECIMAL(12, 2) DEFAULT 0,
  transportation_fee DECIMAL(12, 2) DEFAULT 0,
  
  -- 계산된 값 (단가)
  cost DECIMAL(12, 2),
  margin DECIMAL(12, 2),
  margin_percentage DECIMAL(5, 2),
  
  -- 판매 수량
  total_order_quantity INTEGER DEFAULT 0,
  promotion_completed INTEGER DEFAULT 0,
  mcf_disposal_quantity INTEGER DEFAULT 0,
  organic_quantity INTEGER DEFAULT 0,
  mcf_quantity INTEGER DEFAULT 0,
  
  -- 매출
  gross_sales DECIMAL(12, 2) DEFAULT 0,
  refunds DECIMAL(12, 2) DEFAULT 0,
  
  -- 총 수수료
  total_fba_fee DECIMAL(12, 2) DEFAULT 0,
  total_referral_fee DECIMAL(12, 2) DEFAULT 0,
  
  -- 계정 단위 비용
  fba_inventory_disposals DECIMAL(12, 2) DEFAULT 0,
  fba_inventory_removals DECIMAL(12, 2) DEFAULT 0,
  fba_long_term_storage_fees DECIMAL(12, 2) DEFAULT 0,
  monthly_subscription_fee DECIMAL(12, 2) DEFAULT 0,
  paid_services_fee DECIMAL(12, 2) DEFAULT 0,
  monthly_storage_fee DECIMAL(12, 2) DEFAULT 0,
  
  -- 프로모션 비용
  self_promotion_cost DECIMAL(12, 2) DEFAULT 0,
  support_promotion_cost DECIMAL(12, 2) DEFAULT 0,
  
  -- CPC 관련
  cpc_cost DECIMAL(12, 2) DEFAULT 0,
  cpc_sales DECIMAL(12, 2) DEFAULT 0,
  cpc_roas DECIMAL(10, 4),
  sp_spend DECIMAL(12, 2) DEFAULT 0,
  sp_sales DECIMAL(12, 2) DEFAULT 0,
  sb_spend DECIMAL(12, 2) DEFAULT 0,
  sb_sales DECIMAL(12, 2) DEFAULT 0,
  sd_spend DECIMAL(12, 2) DEFAULT 0,
  sd_sales DECIMAL(12, 2) DEFAULT 0,
  
  -- DSP 관련
  self_dsp_cost DECIMAL(12, 2) DEFAULT 0,
  self_dsp_sales DECIMAL(12, 2) DEFAULT 0,
  support_dsp_cost DECIMAL(12, 2) DEFAULT 0,
  support_dsp_sales DECIMAL(12, 2) DEFAULT 0,
  dsp_roas DECIMAL(10, 4),
  
  -- MCF 비용
  self_mcf DECIMAL(12, 2) DEFAULT 0,
  support_mcf DECIMAL(12, 2) DEFAULT 0,
  
  -- 틱톡 비용
  self_tiktok_cost DECIMAL(12, 2) DEFAULT 0,
  support_tiktok_cost DECIMAL(12, 2) DEFAULT 0,
  
  -- 기타 마케팅 비용
  affiliate_cost DECIMAL(12, 2) DEFAULT 0,
  performance_marketing_cost DECIMAL(12, 2) DEFAULT 0,
  pulsead_fee DECIMAL(12, 2) DEFAULT 0,
  self_instagram_cost DECIMAL(12, 2) DEFAULT 0,
  
  -- 정산 및 지원금
  amazon_settlement DECIMAL(12, 2) DEFAULT 0,
  marketing_support_amount DECIMAL(12, 2) DEFAULT 0,
  
  -- 단계별 이익 및 비용
  profit_1 DECIMAL(12, 2),
  cost_1 DECIMAL(12, 2),
  cost_1_ratio DECIMAL(5, 2),
  profit_2 DECIMAL(12, 2),
  cost_2 DECIMAL(12, 2),
  cost_2_ratio DECIMAL(5, 2),
  profit_3 DECIMAL(12, 2),
  cost_3 DECIMAL(12, 2),
  cost_3_ratio DECIMAL(5, 2),
  profit_4 DECIMAL(12, 2),
  cost_4 DECIMAL(12, 2),
  cost_4_ratio DECIMAL(5, 2),
  profit_5 DECIMAL(12, 2),
  cost_5 DECIMAL(12, 2),
  cost_5_ratio DECIMAL(5, 2),
  profit_6 DECIMAL(12, 2),
  cost_6 DECIMAL(12, 2),
  cost_6_ratio DECIMAL(5, 2),
  profit_7 DECIMAL(12, 2),
  cost_7 DECIMAL(12, 2),
  cost_7_ratio DECIMAL(5, 2),
  profit_8 DECIMAL(12, 2),
  cost_8 DECIMAL(12, 2),
  cost_8_ratio DECIMAL(5, 2),
  profit_9 DECIMAL(12, 2),
  cost_9 DECIMAL(12, 2),
  cost_9_ratio DECIMAL(5, 2),
  profit_9_5 DECIMAL(12, 2),
  cost_9_5 DECIMAL(12, 2),
  cost_9_5_ratio DECIMAL(5, 2),
  profit_10 DECIMAL(12, 2),
  cost_10 DECIMAL(12, 2),
  cost_10_ratio DECIMAL(5, 2),
  profit_11 DECIMAL(12, 2),
  cost_11 DECIMAL(12, 2),
  cost_11_ratio DECIMAL(5, 2),
  profit_12 DECIMAL(12, 2),
  cost_12 DECIMAL(12, 2),
  cost_12_ratio DECIMAL(5, 2),
  profit_13 DECIMAL(12, 2),
  cost_13 DECIMAL(12, 2),
  cost_13_ratio DECIMAL(5, 2),
  profit_14_final DECIMAL(12, 2),
  support_amount_ratio DECIMAL(5, 2),
  
  -- 기타 수익
  other_revenue DECIMAL(12, 2) DEFAULT 0,
  
  -- 일별 판매량 (JSON으로 저장)
  daily_sales JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 고유 제약 조건
  CONSTRAINT unique_shopify_sku_month UNIQUE (sku, year, month),
  -- SKU가 shopify 채널인지 확인
  CONSTRAINT check_shopify_channel CHECK (
    EXISTS (
      SELECT 1 FROM sku_master sm 
      WHERE sm.sku = shopify_monthly_data.sku 
      AND sm.channel = 'shopify'
    )
  )
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_amazon_us_monthly_data_sku ON amazon_us_monthly_data(sku);
CREATE INDEX IF NOT EXISTS idx_amazon_us_monthly_data_year_month ON amazon_us_monthly_data(year, month);
CREATE INDEX IF NOT EXISTS idx_tiktok_shop_monthly_data_sku ON tiktok_shop_monthly_data(sku);
CREATE INDEX IF NOT EXISTS idx_tiktok_shop_monthly_data_year_month ON tiktok_shop_monthly_data(year, month);
CREATE INDEX IF NOT EXISTS idx_shopify_monthly_data_sku ON shopify_monthly_data(sku);
CREATE INDEX IF NOT EXISTS idx_shopify_monthly_data_year_month ON shopify_monthly_data(year, month);

-- 트리거 생성
DROP TRIGGER IF EXISTS update_amazon_us_monthly_data_updated_at ON amazon_us_monthly_data;
CREATE TRIGGER update_amazon_us_monthly_data_updated_at
  BEFORE UPDATE ON amazon_us_monthly_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tiktok_shop_monthly_data_updated_at ON tiktok_shop_monthly_data;
CREATE TRIGGER update_tiktok_shop_monthly_data_updated_at
  BEFORE UPDATE ON tiktok_shop_monthly_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shopify_monthly_data_updated_at ON shopify_monthly_data;
CREATE TRIGGER update_shopify_monthly_data_updated_at
  BEFORE UPDATE ON shopify_monthly_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 활성화
ALTER TABLE amazon_us_monthly_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiktok_shop_monthly_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_monthly_data ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성
CREATE POLICY "Allow public read access to amazon_us_monthly_data" ON amazon_us_monthly_data
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access to tiktok_shop_monthly_data" ON tiktok_shop_monthly_data
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access to shopify_monthly_data" ON shopify_monthly_data
  FOR SELECT
  USING (true);

-- 기존 데이터 마이그레이션 (기존 sku_monthly_data가 있는 경우)
-- Amazon US 데이터
INSERT INTO amazon_us_monthly_data (
  sku, year, month,
  fba_inventory, in_transit_to_fba, inbound_working, inbound_shipped, inbound_receiving,
  reserved_orders, reserved_fc_transfer, reserved_fc_processing, ocean_to_3pl, in_3pl,
  monthly_exchange_rate, supply_cost_usd,
  fba_fee, referral_fee, transportation_fee,
  cost, margin, margin_percentage,
  total_order_quantity, promotion_completed, mcf_disposal_quantity, organic_quantity, mcf_quantity,
  gross_sales, refunds,
  total_fba_fee, total_referral_fee,
  fba_inventory_disposals, fba_inventory_removals, fba_long_term_storage_fees,
  monthly_subscription_fee, paid_services_fee, monthly_storage_fee,
  self_promotion_cost, support_promotion_cost,
  cpc_cost, cpc_sales, cpc_roas, sp_spend, sp_sales, sb_spend, sb_sales, sd_spend, sd_sales,
  self_dsp_cost, self_dsp_sales, support_dsp_cost, support_dsp_sales, dsp_roas,
  self_mcf, support_mcf,
  self_tiktok_cost, support_tiktok_cost,
  affiliate_cost, performance_marketing_cost, pulsead_fee, self_instagram_cost,
  amazon_settlement, marketing_support_amount,
  profit_1, cost_1, cost_1_ratio, profit_2, cost_2, cost_2_ratio,
  profit_3, cost_3, cost_3_ratio, profit_4, cost_4, cost_4_ratio,
  profit_5, cost_5, cost_5_ratio, profit_6, cost_6, cost_6_ratio,
  profit_7, cost_7, cost_7_ratio, profit_8, cost_8, cost_8_ratio,
  profit_9, cost_9, cost_9_ratio, profit_9_5, cost_9_5, cost_9_5_ratio,
  profit_10, cost_10, cost_10_ratio, profit_11, cost_11, cost_11_ratio,
  profit_12, cost_12, cost_12_ratio, profit_13, cost_13, cost_13_ratio,
  profit_14_final, support_amount_ratio,
  other_revenue, daily_sales, created_at, updated_at
)
SELECT 
  smd.sku, smd.year, smd.month,
  smd.fba_inventory, smd.in_transit_to_fba, smd.inbound_working, smd.inbound_shipped, smd.inbound_receiving,
  smd.reserved_orders, smd.reserved_fc_transfer, smd.reserved_fc_processing, smd.ocean_to_3pl, smd.in_3pl,
  smd.monthly_exchange_rate, smd.supply_cost_usd,
  smd.fba_fee, smd.referral_fee, smd.transportation_fee,
  smd.cost, smd.margin, smd.margin_percentage,
  smd.total_order_quantity, smd.promotion_completed, smd.mcf_disposal_quantity, smd.organic_quantity, smd.mcf_quantity,
  smd.gross_sales, smd.refunds,
  smd.total_fba_fee, smd.total_referral_fee,
  smd.fba_inventory_disposals, smd.fba_inventory_removals, smd.fba_long_term_storage_fees,
  smd.monthly_subscription_fee, smd.paid_services_fee, smd.monthly_storage_fee,
  smd.self_promotion_cost, smd.support_promotion_cost,
  smd.cpc_cost, smd.cpc_sales, smd.cpc_roas, smd.sp_spend, smd.sp_sales, smd.sb_spend, smd.sb_sales, smd.sd_spend, smd.sd_sales,
  smd.self_dsp_cost, smd.self_dsp_sales, smd.support_dsp_cost, smd.support_dsp_sales, smd.dsp_roas,
  smd.self_mcf, smd.support_mcf,
  smd.self_tiktok_cost, smd.support_tiktok_cost,
  smd.affiliate_cost, smd.performance_marketing_cost, smd.pulsead_fee, smd.self_instagram_cost,
  smd.amazon_settlement, smd.marketing_support_amount,
  smd.profit_1, smd.cost_1, smd.cost_1_ratio, smd.profit_2, smd.cost_2, smd.cost_2_ratio,
  smd.profit_3, smd.cost_3, smd.cost_3_ratio, smd.profit_4, smd.cost_4, smd.cost_4_ratio,
  smd.profit_5, smd.cost_5, smd.cost_5_ratio, smd.profit_6, smd.cost_6, smd.cost_6_ratio,
  smd.profit_7, smd.cost_7, smd.cost_7_ratio, smd.profit_8, smd.cost_8, smd.cost_8_ratio,
  smd.profit_9, smd.cost_9, smd.cost_9_ratio, smd.profit_9_5, smd.cost_9_5, smd.cost_9_5_ratio,
  smd.profit_10, smd.cost_10, smd.cost_10_ratio, smd.profit_11, smd.cost_11, smd.cost_11_ratio,
  smd.profit_12, smd.cost_12, smd.cost_12_ratio, smd.profit_13, smd.cost_13, smd.cost_13_ratio,
  smd.profit_14_final, smd.support_amount_ratio,
  smd.other_revenue, smd.daily_sales, smd.created_at, smd.updated_at
FROM sku_monthly_data smd
JOIN sku_master sm ON smd.sku = sm.sku
WHERE sm.channel = 'amazon_us'
ON CONFLICT (sku, year, month) DO NOTHING;

-- TikTok Shop 데이터
INSERT INTO tiktok_shop_monthly_data (
  sku, year, month,
  fba_inventory, in_transit_to_fba, inbound_working, inbound_shipped, inbound_receiving,
  reserved_orders, reserved_fc_transfer, reserved_fc_processing, ocean_to_3pl, in_3pl,
  monthly_exchange_rate, supply_cost_usd,
  fba_fee, referral_fee, transportation_fee,
  cost, margin, margin_percentage,
  total_order_quantity, promotion_completed, mcf_disposal_quantity, organic_quantity, mcf_quantity,
  gross_sales, refunds,
  total_fba_fee, total_referral_fee,
  fba_inventory_disposals, fba_inventory_removals, fba_long_term_storage_fees,
  monthly_subscription_fee, paid_services_fee, monthly_storage_fee,
  self_promotion_cost, support_promotion_cost,
  cpc_cost, cpc_sales, cpc_roas, sp_spend, sp_sales, sb_spend, sb_sales, sd_spend, sd_sales,
  self_dsp_cost, self_dsp_sales, support_dsp_cost, support_dsp_sales, dsp_roas,
  self_mcf, support_mcf,
  self_tiktok_cost, support_tiktok_cost,
  affiliate_cost, performance_marketing_cost, pulsead_fee, self_instagram_cost,
  amazon_settlement, marketing_support_amount,
  profit_1, cost_1, cost_1_ratio, profit_2, cost_2, cost_2_ratio,
  profit_3, cost_3, cost_3_ratio, profit_4, cost_4, cost_4_ratio,
  profit_5, cost_5, cost_5_ratio, profit_6, cost_6, cost_6_ratio,
  profit_7, cost_7, cost_7_ratio, profit_8, cost_8, cost_8_ratio,
  profit_9, cost_9, cost_9_ratio, profit_9_5, cost_9_5, cost_9_5_ratio,
  profit_10, cost_10, cost_10_ratio, profit_11, cost_11, cost_11_ratio,
  profit_12, cost_12, cost_12_ratio, profit_13, cost_13, cost_13_ratio,
  profit_14_final, support_amount_ratio,
  other_revenue, daily_sales, created_at, updated_at
)
SELECT 
  smd.sku, smd.year, smd.month,
  smd.fba_inventory, smd.in_transit_to_fba, smd.inbound_working, smd.inbound_shipped, smd.inbound_receiving,
  smd.reserved_orders, smd.reserved_fc_transfer, smd.reserved_fc_processing, smd.ocean_to_3pl, smd.in_3pl,
  smd.monthly_exchange_rate, smd.supply_cost_usd,
  smd.fba_fee, smd.referral_fee, smd.transportation_fee,
  smd.cost, smd.margin, smd.margin_percentage,
  smd.total_order_quantity, smd.promotion_completed, smd.mcf_disposal_quantity, smd.organic_quantity, smd.mcf_quantity,
  smd.gross_sales, smd.refunds,
  smd.total_fba_fee, smd.total_referral_fee,
  smd.fba_inventory_disposals, smd.fba_inventory_removals, smd.fba_long_term_storage_fees,
  smd.monthly_subscription_fee, smd.paid_services_fee, smd.monthly_storage_fee,
  smd.self_promotion_cost, smd.support_promotion_cost,
  smd.cpc_cost, smd.cpc_sales, smd.cpc_roas, smd.sp_spend, smd.sp_sales, smd.sb_spend, smd.sb_sales, smd.sd_spend, smd.sd_sales,
  smd.self_dsp_cost, smd.self_dsp_sales, smd.support_dsp_cost, smd.support_dsp_sales, smd.dsp_roas,
  smd.self_mcf, smd.support_mcf,
  smd.self_tiktok_cost, smd.support_tiktok_cost,
  smd.affiliate_cost, smd.performance_marketing_cost, smd.pulsead_fee, smd.self_instagram_cost,
  smd.amazon_settlement, smd.marketing_support_amount,
  smd.profit_1, smd.cost_1, smd.cost_1_ratio, smd.profit_2, smd.cost_2, smd.cost_2_ratio,
  smd.profit_3, smd.cost_3, smd.cost_3_ratio, smd.profit_4, smd.cost_4, smd.cost_4_ratio,
  smd.profit_5, smd.cost_5, smd.cost_5_ratio, smd.profit_6, smd.cost_6, smd.cost_6_ratio,
  smd.profit_7, smd.cost_7, smd.cost_7_ratio, smd.profit_8, smd.cost_8, smd.cost_8_ratio,
  smd.profit_9, smd.cost_9, smd.cost_9_ratio, smd.profit_9_5, smd.cost_9_5, smd.cost_9_5_ratio,
  smd.profit_10, smd.cost_10, smd.cost_10_ratio, smd.profit_11, smd.cost_11, smd.cost_11_ratio,
  smd.profit_12, smd.cost_12, smd.cost_12_ratio, smd.profit_13, smd.cost_13, smd.cost_13_ratio,
  smd.profit_14_final, smd.support_amount_ratio,
  smd.other_revenue, smd.daily_sales, smd.created_at, smd.updated_at
FROM sku_monthly_data smd
JOIN sku_master sm ON smd.sku = sm.sku
WHERE sm.channel = 'tiktok_shop'
ON CONFLICT (sku, year, month) DO NOTHING;

-- Shopify 데이터
INSERT INTO shopify_monthly_data (
  sku, year, month,
  fba_inventory, in_transit_to_fba, inbound_working, inbound_shipped, inbound_receiving,
  reserved_orders, reserved_fc_transfer, reserved_fc_processing, ocean_to_3pl, in_3pl,
  monthly_exchange_rate, supply_cost_usd,
  fba_fee, referral_fee, transportation_fee,
  cost, margin, margin_percentage,
  total_order_quantity, promotion_completed, mcf_disposal_quantity, organic_quantity, mcf_quantity,
  gross_sales, refunds,
  total_fba_fee, total_referral_fee,
  fba_inventory_disposals, fba_inventory_removals, fba_long_term_storage_fees,
  monthly_subscription_fee, paid_services_fee, monthly_storage_fee,
  self_promotion_cost, support_promotion_cost,
  cpc_cost, cpc_sales, cpc_roas, sp_spend, sp_sales, sb_spend, sb_sales, sd_spend, sd_sales,
  self_dsp_cost, self_dsp_sales, support_dsp_cost, support_dsp_sales, dsp_roas,
  self_mcf, support_mcf,
  self_tiktok_cost, support_tiktok_cost,
  affiliate_cost, performance_marketing_cost, pulsead_fee, self_instagram_cost,
  amazon_settlement, marketing_support_amount,
  profit_1, cost_1, cost_1_ratio, profit_2, cost_2, cost_2_ratio,
  profit_3, cost_3, cost_3_ratio, profit_4, cost_4, cost_4_ratio,
  profit_5, cost_5, cost_5_ratio, profit_6, cost_6, cost_6_ratio,
  profit_7, cost_7, cost_7_ratio, profit_8, cost_8, cost_8_ratio,
  profit_9, cost_9, cost_9_ratio, profit_9_5, cost_9_5, cost_9_5_ratio,
  profit_10, cost_10, cost_10_ratio, profit_11, cost_11, cost_11_ratio,
  profit_12, cost_12, cost_12_ratio, profit_13, cost_13, cost_13_ratio,
  profit_14_final, support_amount_ratio,
  other_revenue, daily_sales, created_at, updated_at
)
SELECT 
  smd.sku, smd.year, smd.month,
  smd.fba_inventory, smd.in_transit_to_fba, smd.inbound_working, smd.inbound_shipped, smd.inbound_receiving,
  smd.reserved_orders, smd.reserved_fc_transfer, smd.reserved_fc_processing, smd.ocean_to_3pl, smd.in_3pl,
  smd.monthly_exchange_rate, smd.supply_cost_usd,
  smd.fba_fee, smd.referral_fee, smd.transportation_fee,
  smd.cost, smd.margin, smd.margin_percentage,
  smd.total_order_quantity, smd.promotion_completed, smd.mcf_disposal_quantity, smd.organic_quantity, smd.mcf_quantity,
  smd.gross_sales, smd.refunds,
  smd.total_fba_fee, smd.total_referral_fee,
  smd.fba_inventory_disposals, smd.fba_inventory_removals, smd.fba_long_term_storage_fees,
  smd.monthly_subscription_fee, smd.paid_services_fee, smd.monthly_storage_fee,
  smd.self_promotion_cost, smd.support_promotion_cost,
  smd.cpc_cost, smd.cpc_sales, smd.cpc_roas, smd.sp_spend, smd.sp_sales, smd.sb_spend, smd.sb_sales, smd.sd_spend, smd.sd_sales,
  smd.self_dsp_cost, smd.self_dsp_sales, smd.support_dsp_cost, smd.support_dsp_sales, smd.dsp_roas,
  smd.self_mcf, smd.support_mcf,
  smd.self_tiktok_cost, smd.support_tiktok_cost,
  smd.affiliate_cost, smd.performance_marketing_cost, smd.pulsead_fee, smd.self_instagram_cost,
  smd.amazon_settlement, smd.marketing_support_amount,
  smd.profit_1, smd.cost_1, smd.cost_1_ratio, smd.profit_2, smd.cost_2, smd.cost_2_ratio,
  smd.profit_3, smd.cost_3, smd.cost_3_ratio, smd.profit_4, smd.cost_4, smd.cost_4_ratio,
  smd.profit_5, smd.cost_5, smd.cost_5_ratio, smd.profit_6, smd.cost_6, smd.cost_6_ratio,
  smd.profit_7, smd.cost_7, smd.cost_7_ratio, smd.profit_8, smd.cost_8, smd.cost_8_ratio,
  smd.profit_9, smd.cost_9, smd.cost_9_ratio, smd.profit_9_5, smd.cost_9_5, smd.cost_9_5_ratio,
  smd.profit_10, smd.cost_10, smd.cost_10_ratio, smd.profit_11, smd.cost_11, smd.cost_11_ratio,
  smd.profit_12, smd.cost_12, smd.cost_12_ratio, smd.profit_13, smd.cost_13, smd.cost_13_ratio,
  smd.profit_14_final, smd.support_amount_ratio,
  smd.other_revenue, smd.daily_sales, smd.created_at, smd.updated_at
FROM sku_monthly_data smd
JOIN sku_master sm ON smd.sku = sm.sku
WHERE sm.channel = 'shopify'
ON CONFLICT (sku, year, month) DO NOTHING;

-- 뷰 수정 (채널별 테이블을 UNION으로 합치기)
CREATE OR REPLACE VIEW monthly_summary_by_channel AS
SELECT 
  'amazon_us' AS channel,
  year,
  month,
  COUNT(DISTINCT sku) AS sku_count,
  SUM(gross_sales) AS total_revenue,
  SUM(refunds) AS total_refunds,
  SUM(profit_14_final) AS total_profit,
  SUM(total_order_quantity) AS total_quantity,
  SUM(cpc_cost) AS total_cpc_cost,
  SUM(cpc_sales) AS total_cpc_sales,
  SUM(self_dsp_cost + support_dsp_cost) AS total_dsp_cost,
  SUM(self_dsp_sales + support_dsp_sales) AS total_dsp_sales,
  SUM(cost) AS total_cost
FROM amazon_us_monthly_data
GROUP BY year, month

UNION ALL

SELECT 
  'tiktok_shop' AS channel,
  year,
  month,
  COUNT(DISTINCT sku) AS sku_count,
  SUM(gross_sales) AS total_revenue,
  SUM(refunds) AS total_refunds,
  SUM(profit_14_final) AS total_profit,
  SUM(total_order_quantity) AS total_quantity,
  SUM(cpc_cost) AS total_cpc_cost,
  SUM(cpc_sales) AS total_cpc_sales,
  SUM(self_dsp_cost + support_dsp_cost) AS total_dsp_cost,
  SUM(self_dsp_sales + support_dsp_sales) AS total_dsp_sales,
  SUM(cost) AS total_cost
FROM tiktok_shop_monthly_data
GROUP BY year, month

UNION ALL

SELECT 
  'shopify' AS channel,
  year,
  month,
  COUNT(DISTINCT sku) AS sku_count,
  SUM(gross_sales) AS total_revenue,
  SUM(refunds) AS total_refunds,
  SUM(profit_14_final) AS total_profit,
  SUM(total_order_quantity) AS total_quantity,
  SUM(cpc_cost) AS total_cpc_cost,
  SUM(cpc_sales) AS total_cpc_sales,
  SUM(self_dsp_cost + support_dsp_cost) AS total_dsp_cost,
  SUM(self_dsp_sales + support_dsp_sales) AS total_dsp_sales,
  SUM(cost) AS total_cost
FROM shopify_monthly_data
GROUP BY year, month

ORDER BY year DESC, month DESC, channel;

-- SKU별 집계 뷰 수정
CREATE OR REPLACE VIEW sku_summary_view AS
SELECT 
  sm.sku,
  sm.product_name,
  'amazon_us' AS channel,
  sm.brand_name,
  sm.company_name,
  SUM(amd.gross_sales) AS total_revenue,
  SUM(amd.profit_14_final) AS total_profit,
  SUM(amd.total_order_quantity) AS total_quantity,
  AVG(amd.margin_percentage) AS avg_margin_percentage,
  SUM(amd.cost) AS total_cost
FROM amazon_us_monthly_data amd
JOIN sku_master sm ON amd.sku = sm.sku
WHERE sm.channel = 'amazon_us'
GROUP BY sm.sku, sm.product_name, sm.brand_name, sm.company_name

UNION ALL

SELECT 
  sm.sku,
  sm.product_name,
  'tiktok_shop' AS channel,
  sm.brand_name,
  sm.company_name,
  SUM(tmd.gross_sales) AS total_revenue,
  SUM(tmd.profit_14_final) AS total_profit,
  SUM(tmd.total_order_quantity) AS total_quantity,
  AVG(tmd.margin_percentage) AS avg_margin_percentage,
  SUM(tmd.cost) AS total_cost
FROM tiktok_shop_monthly_data tmd
JOIN sku_master sm ON tmd.sku = sm.sku
WHERE sm.channel = 'tiktok_shop'
GROUP BY sm.sku, sm.product_name, sm.brand_name, sm.company_name

UNION ALL

SELECT 
  sm.sku,
  sm.product_name,
  'shopify' AS channel,
  sm.brand_name,
  sm.company_name,
  SUM(smd.gross_sales) AS total_revenue,
  SUM(smd.profit_14_final) AS total_profit,
  SUM(smd.total_order_quantity) AS total_quantity,
  AVG(smd.margin_percentage) AS avg_margin_percentage,
  SUM(smd.cost) AS total_cost
FROM shopify_monthly_data smd
JOIN sku_master sm ON smd.sku = sm.sku
WHERE sm.channel = 'shopify'
GROUP BY sm.sku, sm.product_name, sm.brand_name, sm.company_name

ORDER BY total_revenue DESC;









