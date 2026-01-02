-- 매출 데이터 테이블
CREATE TABLE IF NOT EXISTS sales_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace TEXT NOT NULL CHECK (marketplace IN ('amazon_us', 'tiktok_shop', 'shopify')),
  date DATE NOT NULL,
  sku TEXT NOT NULL,
  product_name TEXT,
  revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
  cost DECIMAL(12, 2) NOT NULL DEFAULT 0,
  profit DECIMAL(12, 2) NOT NULL DEFAULT 0,
  quantity INTEGER,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 인덱스 추가
  CONSTRAINT unique_sales_record UNIQUE (marketplace, date, sku)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_sales_data_marketplace ON sales_data(marketplace);
CREATE INDEX IF NOT EXISTS idx_sales_data_date ON sales_data(date);
CREATE INDEX IF NOT EXISTS idx_sales_data_sku ON sales_data(sku);
CREATE INDEX IF NOT EXISTS idx_sales_data_marketplace_date ON sales_data(marketplace, date);

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
CREATE TRIGGER update_sales_data_updated_at
  BEFORE UPDATE ON sales_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) 활성화
ALTER TABLE sales_data ENABLE ROW LEVEL SECURITY;

-- 정책 생성 (모든 사용자가 읽기 가능, 서버만 쓰기 가능)
CREATE POLICY "Allow public read access" ON sales_data
  FOR SELECT
  USING (true);

-- 월별 집계를 위한 뷰 생성
CREATE OR REPLACE VIEW monthly_summary AS
SELECT 
  DATE_PART('year', date)::INTEGER AS year,
  DATE_PART('month', date)::INTEGER AS month,
  marketplace,
  SUM(revenue) AS total_revenue,
  SUM(cost) AS total_cost,
  SUM(profit) AS total_profit,
  COUNT(*) AS order_count
FROM sales_data
GROUP BY 
  DATE_PART('year', date),
  DATE_PART('month', date),
  marketplace
ORDER BY year DESC, month DESC, marketplace;

-- SKU별 집계를 위한 뷰 생성
CREATE OR REPLACE VIEW sku_summary AS
SELECT 
  sku,
  product_name,
  marketplace,
  SUM(revenue) AS total_revenue,
  SUM(cost) AS total_cost,
  SUM(profit) AS total_profit,
  SUM(quantity) AS total_quantity
FROM sales_data
GROUP BY sku, product_name, marketplace
ORDER BY total_revenue DESC;












