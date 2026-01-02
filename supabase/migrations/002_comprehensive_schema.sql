-- 기존 테이블 삭제 (개발 환경에서만 사용)
-- DROP TABLE IF EXISTS sales_data CASCADE;
-- DROP VIEW IF EXISTS monthly_summary CASCADE;
-- DROP VIEW IF EXISTS sku_summary CASCADE;

-- SKU 기본 정보 테이블 (최초 1회 입력, 수기 입력 항목)
CREATE TABLE IF NOT EXISTS sku_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  child_asin TEXT,
  product_name TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('amazon_us', 'tiktok_shop', 'shopify')),
  contract_type TEXT,
  company_name TEXT,
  brand_name TEXT,
  manager TEXT,
  profit_sheet_id TEXT,
  amazon_account_name TEXT,
  rank INTEGER,
  sales_price DECIMAL(12, 2),
  supply_cost_won DECIMAL(12, 2),
  transportation_mode TEXT,
  is_brand_representative BOOLEAN DEFAULT FALSE,
  is_account_representative BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 월별 SKU 데이터 테이블 (매일 자동 업데이트)
CREATE TABLE IF NOT EXISTS sku_monthly_data (
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
  CONSTRAINT unique_sku_month UNIQUE (sku, year, month)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_sku_master_sku ON sku_master(sku);
CREATE INDEX IF NOT EXISTS idx_sku_master_channel ON sku_master(channel);
CREATE INDEX IF NOT EXISTS idx_sku_monthly_data_sku ON sku_monthly_data(sku);
CREATE INDEX IF NOT EXISTS idx_sku_monthly_data_year_month ON sku_monthly_data(year, month);
CREATE INDEX IF NOT EXISTS idx_sku_monthly_data_channel ON sku_monthly_data(sku) INCLUDE (year, month);

-- updated_at 자동 업데이트 함수 (이미 있다면 스킵)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS update_sku_master_updated_at ON sku_master;
CREATE TRIGGER update_sku_master_updated_at
  BEFORE UPDATE ON sku_master
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sku_monthly_data_updated_at ON sku_monthly_data;
CREATE TRIGGER update_sku_monthly_data_updated_at
  BEFORE UPDATE ON sku_monthly_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) 활성화
ALTER TABLE sku_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE sku_monthly_data ENABLE ROW LEVEL SECURITY;

-- 정책 생성 (모든 사용자가 읽기 가능)
CREATE POLICY "Allow public read access to sku_master" ON sku_master
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access to sku_monthly_data" ON sku_monthly_data
  FOR SELECT
  USING (true);

-- 월별 집계 뷰 (채널별)
CREATE OR REPLACE VIEW monthly_summary_by_channel AS
SELECT 
  sm.channel,
  smd.year,
  smd.month,
  COUNT(DISTINCT smd.sku) AS sku_count,
  SUM(smd.gross_sales) AS total_revenue,
  SUM(smd.refunds) AS total_refunds,
  SUM(smd.profit_14_final) AS total_profit,
  SUM(smd.total_order_quantity) AS total_quantity,
  SUM(smd.cpc_cost) AS total_cpc_cost,
  SUM(smd.cpc_sales) AS total_cpc_sales,
  SUM(smd.self_dsp_cost + smd.support_dsp_cost) AS total_dsp_cost,
  SUM(smd.self_dsp_sales + smd.support_dsp_sales) AS total_dsp_sales
FROM sku_monthly_data smd
JOIN sku_master sm ON smd.sku = sm.sku
GROUP BY sm.channel, smd.year, smd.month
ORDER BY smd.year DESC, smd.month DESC, sm.channel;

-- SKU별 집계 뷰
CREATE OR REPLACE VIEW sku_summary_view AS
SELECT 
  sm.sku,
  sm.product_name,
  sm.channel,
  sm.brand_name,
  sm.company_name,
  SUM(smd.gross_sales) AS total_revenue,
  SUM(smd.profit_14_final) AS total_profit,
  SUM(smd.total_order_quantity) AS total_quantity,
  AVG(smd.margin_percentage) AS avg_margin_percentage
FROM sku_monthly_data smd
JOIN sku_master sm ON smd.sku = sm.sku
GROUP BY sm.sku, sm.product_name, sm.channel, sm.brand_name, sm.company_name
ORDER BY total_revenue DESC;












