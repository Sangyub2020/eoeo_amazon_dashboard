-- Amazon US 월별 데이터 테이블 재설계
-- 기존 테이블을 새로운 구조로 변경

-- 1. 기존 테이블 백업용으로 이름 변경 (필요시)
-- ALTER TABLE amazon_us_monthly_data RENAME TO amazon_us_monthly_data_old;

-- 2. 새 구조로 테이블 생성
DROP TABLE IF EXISTS amazon_us_monthly_data CASCADE;

CREATE TABLE amazon_us_monthly_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL REFERENCES sku_master(sku) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  
  -- SKU 마스터 정보 (참조용으로 포함, 실제 값은 sku_master에서 가져옴)
  -- sku, year, month로 sku_master와 조인하여 필요한 정보 가져올 수 있음
  
  -- 환율
  exchange_rate DECIMAL(10, 4),
  
  -- (1) FBA 재고
  fba_inventory INTEGER DEFAULT 0,
  
  -- (2) FBA 입고중은 프론트/백엔드에서 계산: inbound_working + inbound_shipped + inbound_receiving + reserved_fc_transfer + reserved_fc_processing
  
  -- (3) Inbound Working
  inbound_working INTEGER DEFAULT 0,
  
  -- (4) Inbound Shipped
  inbound_shipped INTEGER DEFAULT 0,
  
  -- (5) Inbound Receiving
  inbound_receiving INTEGER DEFAULT 0,
  
  -- (6) Reserved Orders
  reserved_orders INTEGER DEFAULT 0,
  
  -- (7) Reserved FC Transfer
  reserved_fc_transfer INTEGER DEFAULT 0,
  
  -- (8) Reserved FC Processing
  reserved_fc_processing INTEGER DEFAULT 0,
  
  -- (9) FBA Fee
  fba_fee DECIMAL(12, 2) DEFAULT 0,
  
  -- (10) Referral Fee
  referral_fee DECIMAL(12, 2) DEFAULT 0,
  
  -- (11) Transportation Mode
  transportation_mode TEXT,
  
  -- (12) Transportation Fee
  transportation_fee DECIMAL(12, 2) DEFAULT 0,
  
  -- (13) 관세율 (예: 0.05 = 5%)
  tariff_rate DECIMAL(5, 4),
  
  -- (14) 개당 관세
  tariff_per_unit DECIMAL(12, 2) DEFAULT 0,
  
  -- (15) Margin (Sales Price - FBA Fee - Referral Fee - Transportation Fee - Supply Price)
  -- 계산 필드: sku_master의 sales_price - (9) - (10) - (12) - supply_cost_usd
  margin DECIMAL(12, 2),
  
  -- (16) Total Order Quantity
  total_order_quantity INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 고유 제약 조건
  CONSTRAINT unique_amazon_us_sku_month UNIQUE (sku, year, month)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_amazon_us_monthly_data_sku ON amazon_us_monthly_data(sku);
CREATE INDEX IF NOT EXISTS idx_amazon_us_monthly_data_year_month ON amazon_us_monthly_data(year, month);

-- 트리거 생성
DROP TRIGGER IF EXISTS update_amazon_us_monthly_data_updated_at ON amazon_us_monthly_data;
CREATE TRIGGER update_amazon_us_monthly_data_updated_at
  BEFORE UPDATE ON amazon_us_monthly_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 활성화
ALTER TABLE amazon_us_monthly_data ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성
DROP POLICY IF EXISTS "Allow public read access to amazon_us_monthly_data" ON amazon_us_monthly_data;
CREATE POLICY "Allow public read access to amazon_us_monthly_data" ON amazon_us_monthly_data
  FOR SELECT
  USING (true);

-- FBA 입고중은 DB에 저장하지 않고, 프론트/백엔드에서 계산
-- 계산식: inbound_working + inbound_shipped + inbound_receiving + reserved_fc_transfer + reserved_fc_processing









