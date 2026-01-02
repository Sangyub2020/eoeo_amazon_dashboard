-- 제품 마스터 테이블 (Internal Code 기준, 모든 채널 공통 정보)
CREATE TABLE IF NOT EXISTS product_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_code TEXT NOT NULL UNIQUE, -- 회사 내부 제품 코드 (모든 채널에서 동일)
  product_name TEXT NOT NULL,
  company_name TEXT,
  brand_name TEXT,
  manager TEXT,
  contract_type TEXT,
  profit_sheet_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SKU 마스터 테이블 수정 (채널별 특화 정보)
-- 기존 테이블 구조 확인 후 필요한 컬럼만 추가/수정
ALTER TABLE sku_master 
  ADD COLUMN IF NOT EXISTS internal_code TEXT REFERENCES product_master(internal_code) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS channel_specific_data JSONB DEFAULT '{}'::jsonb; -- 채널별 특화 데이터를 JSON으로 저장

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_product_master_internal_code ON product_master(internal_code);
CREATE INDEX IF NOT EXISTS idx_sku_master_internal_code ON sku_master(internal_code);

-- updated_at 자동 업데이트 트리거
DROP TRIGGER IF EXISTS update_product_master_updated_at ON product_master;
CREATE TRIGGER update_product_master_updated_at
  BEFORE UPDATE ON product_master
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 활성화
ALTER TABLE product_master ENABLE ROW LEVEL SECURITY;

-- 정책 생성
DROP POLICY IF EXISTS "Allow public read access to product_master" ON product_master;
CREATE POLICY "Allow public read access to product_master" ON product_master
  FOR SELECT
  USING (true);

-- 제품별 SKU 목록을 보여주는 뷰
CREATE OR REPLACE VIEW product_sku_mapping AS
SELECT 
  pm.internal_code,
  pm.product_name,
  pm.company_name,
  pm.brand_name,
  sm.sku,
  sm.channel,
  sm.child_asin,
  sm.amazon_account_name,
  sm.sales_price,
  sm.supply_cost_won,
  sm.transportation_mode
FROM product_master pm
LEFT JOIN sku_master sm ON pm.internal_code = sm.internal_code
ORDER BY pm.internal_code, sm.channel;












