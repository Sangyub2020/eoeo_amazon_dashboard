-- Amazon US 계정별 월별 비용 테이블 생성
-- SKU 단위가 아닌 계정 단위로 청구되는 비용들을 저장
-- 예: 프리미엄 서비스 이용료, FBA 창고 이용료 등

CREATE TABLE IF NOT EXISTS amazon_us_account_monthly_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name TEXT NOT NULL REFERENCES account_master(account_name) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  
  -- 계정 단위 비용 항목들
  premium_service_fee DECIMAL(12, 2) DEFAULT 0, -- 아마존 프리미엄 서비스 이용료
  inbound_placement_fee DECIMAL(12, 2) DEFAULT 0, -- Inbound Placement Fee
  monthly_storage_fee DECIMAL(12, 2) DEFAULT 0, -- Monthly Storage Fee
  longterm_storage_fee DECIMAL(12, 2) DEFAULT 0, -- Longterm Storage Fee
  fba_removal_order_disposal_fee DECIMAL(12, 2) DEFAULT 0, -- FBA Removal Order: Disposal Fee
  fba_removal_order_return_fee DECIMAL(12, 2) DEFAULT 0, -- FBA Removal Order: Return Fee
  subscription_fee DECIMAL(12, 2) DEFAULT 0, -- 구독료
  paid_services_fee DECIMAL(12, 2) DEFAULT 0, -- 유료 서비스 수수료
  other_account_fees DECIMAL(12, 2) DEFAULT 0, -- 기타 계정 단위 비용
  
  -- 총 비용 (위 항목들의 합계, 계산 필드로도 사용 가능)
  total_account_cost DECIMAL(12, 2) DEFAULT 0,
  
  -- 안분 관련 정보
  is_allocated BOOLEAN DEFAULT FALSE, -- 안분 완료 여부
  allocated_at TIMESTAMP WITH TIME ZONE, -- 안분 완료 시각
  allocation_method TEXT DEFAULT 'sales_ratio', -- 안분 방법 (sales_ratio: 매출 비율, quantity_ratio: 수량 비율 등)
  
  -- 메모/설명
  description TEXT,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 고유 제약 조건: 계정별 월별로 하나의 레코드만
  CONSTRAINT unique_account_month UNIQUE (account_name, year, month)
);

-- 코멘트 추가
COMMENT ON TABLE amazon_us_account_monthly_costs IS 'Amazon US 계정별 월별 비용 (SKU 단위가 아닌 계정 단위 비용)';
COMMENT ON COLUMN amazon_us_account_monthly_costs.account_name IS '계정 이름 (account_master 참조)';
COMMENT ON COLUMN amazon_us_account_monthly_costs.premium_service_fee IS '아마존 프리미엄 서비스 이용료';
COMMENT ON COLUMN amazon_us_account_monthly_costs.inbound_placement_fee IS 'Inbound Placement Fee';
COMMENT ON COLUMN amazon_us_account_monthly_costs.monthly_storage_fee IS 'Monthly Storage Fee';
COMMENT ON COLUMN amazon_us_account_monthly_costs.longterm_storage_fee IS 'Longterm Storage Fee';
COMMENT ON COLUMN amazon_us_account_monthly_costs.fba_removal_order_disposal_fee IS 'FBA Removal Order: Disposal Fee';
COMMENT ON COLUMN amazon_us_account_monthly_costs.fba_removal_order_return_fee IS 'FBA Removal Order: Return Fee';
COMMENT ON COLUMN amazon_us_account_monthly_costs.subscription_fee IS '구독료';
COMMENT ON COLUMN amazon_us_account_monthly_costs.paid_services_fee IS '유료 서비스 수수료';
COMMENT ON COLUMN amazon_us_account_monthly_costs.other_account_fees IS '기타 계정 단위 비용';
COMMENT ON COLUMN amazon_us_account_monthly_costs.total_account_cost IS '총 계정 비용 (모든 비용 항목의 합계)';
COMMENT ON COLUMN amazon_us_account_monthly_costs.is_allocated IS 'SKU별 안분 완료 여부';
COMMENT ON COLUMN amazon_us_account_monthly_costs.allocated_at IS '안분 완료 시각';
COMMENT ON COLUMN amazon_us_account_monthly_costs.allocation_method IS '안분 방법 (sales_ratio: 매출 비율, quantity_ratio: 수량 비율 등)';

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_account_monthly_costs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER account_monthly_costs_updated_at
  BEFORE UPDATE ON amazon_us_account_monthly_costs
  FOR EACH ROW
  EXECUTE FUNCTION update_account_monthly_costs_updated_at();

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_account_monthly_costs_account_name ON amazon_us_account_monthly_costs(account_name);
CREATE INDEX IF NOT EXISTS idx_account_monthly_costs_year_month ON amazon_us_account_monthly_costs(year, month);
CREATE INDEX IF NOT EXISTS idx_account_monthly_costs_allocated ON amazon_us_account_monthly_costs(is_allocated);

-- RLS 정책 추가
ALTER TABLE amazon_us_account_monthly_costs ENABLE ROW LEVEL SECURITY;

-- 읽기 권한
DROP POLICY IF EXISTS "Allow public read access to account_monthly_costs" ON amazon_us_account_monthly_costs;
CREATE POLICY "Allow public read access to account_monthly_costs" ON amazon_us_account_monthly_costs
  FOR SELECT USING (true);

-- 삽입 권한
DROP POLICY IF EXISTS "Allow public insert access to account_monthly_costs" ON amazon_us_account_monthly_costs;
CREATE POLICY "Allow public insert access to account_monthly_costs" ON amazon_us_account_monthly_costs
  FOR INSERT WITH CHECK (true);

-- 수정 권한
DROP POLICY IF EXISTS "Allow public update access to account_monthly_costs" ON amazon_us_account_monthly_costs;
CREATE POLICY "Allow public update access to account_monthly_costs" ON amazon_us_account_monthly_costs
  FOR UPDATE USING (true);

-- 삭제 권한
DROP POLICY IF EXISTS "Allow public delete access to account_monthly_costs" ON amazon_us_account_monthly_costs;
CREATE POLICY "Allow public delete access to account_monthly_costs" ON amazon_us_account_monthly_costs
  FOR DELETE USING (true);

