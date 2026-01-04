-- amazon_us_monthly_data 테이블에 CCONMA 컬럼 추가
-- 외부 구글 시트의 재고 정보를 저장하기 위한 컬럼

ALTER TABLE amazon_us_monthly_data 
  ADD COLUMN IF NOT EXISTS cconma DECIMAL(12, 2);

-- 인덱스는 필요시 추가 (현재는 선택사항)
-- CREATE INDEX IF NOT EXISTS idx_amazon_us_monthly_data_cconma ON amazon_us_monthly_data(cconma);

COMMENT ON COLUMN amazon_us_monthly_data.cconma IS '외부 구글 시트에서 동기화된 재고 정보 (CCONMA 열 값)';



