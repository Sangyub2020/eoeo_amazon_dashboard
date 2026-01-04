-- sku_master 테이블에서 profit_sheet_id 컬럼 제거

ALTER TABLE sku_master
DROP COLUMN IF EXISTS profit_sheet_id;




