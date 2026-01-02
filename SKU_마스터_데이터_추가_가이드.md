# SKU 마스터 데이터 추가 가이드

## 📋 개요

`sku_master` 테이블은 SKU의 기본 정보를 저장하는 테이블입니다. 이 정보는 최초 1회 입력되며, 이후 변경이 필요할 때만 업데이트합니다.

## 🔧 방법 1: API를 통한 추가 (권장)

### 단일 SKU 추가/업데이트

```bash
curl -X POST http://localhost:3001/api/sku-master \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "SKU-001",
    "product_name": "제품명",
    "channel": "amazon_us",
    "child_asin": "B08XYZ123",
    "company_name": "회사명",
    "brand_name": "브랜드명",
    "manager": "담당자명",
    "amazon_account_name": "아마존계정명",
    "sales_price": 29.99,
    "supply_cost_won": 20000,
    "transportation_mode": "해상",
    "is_brand_representative": false,
    "is_account_representative": false
  }'
```

### 여러 SKU 일괄 추가/업데이트

```bash
curl -X POST http://localhost:3001/api/sku-master \
  -H "Content-Type: application/json" \
  -d '[
    {
      "sku": "SKU-001",
      "product_name": "제품1",
      "channel": "amazon_us"
    },
    {
      "sku": "SKU-002",
      "product_name": "제품2",
      "channel": "tiktok_shop"
    }
  ]'
```

## 🔧 방법 2: Supabase 대시보드에서 직접 추가

1. Supabase 대시보드 접속
2. Table Editor에서 `sku_master` 테이블 선택
3. "Insert row" 클릭
4. 필수 필드 입력:
   - `sku` (필수)
   - `channel` (필수: amazon_us, tiktok_shop, shopify 중 하나)
5. 선택 필드 입력 (원하는 것만)
6. "Save" 클릭

## 🔧 방법 3: SQL을 통한 추가

Supabase SQL Editor에서:

```sql
-- 단일 SKU 추가
INSERT INTO sku_master (
  sku,
  product_name,
  channel,
  child_asin,
  company_name,
  brand_name,
  manager,
  amazon_account_name,
  sales_price,
  supply_cost_won,
  transportation_mode
) VALUES (
  'SKU-001',
  '제품명',
  'amazon_us',
  'B08XYZ123',
  '회사명',
  '브랜드명',
  '담당자명',
  '아마존계정명',
  29.99,
  20000,
  '해상'
);

-- 여러 SKU 일괄 추가
INSERT INTO sku_master (sku, product_name, channel) VALUES
  ('SKU-001', '제품1', 'amazon_us'),
  ('SKU-002', '제품2', 'tiktok_shop'),
  ('SKU-003', '제품3', 'shopify');

-- 기존 SKU 업데이트
UPDATE sku_master
SET 
  product_name = '새 제품명',
  sales_price = 39.99
WHERE sku = 'SKU-001';
```

## 🔧 방법 4: 코드에서 직접 추가

```typescript
import { upsertSKUMaster } from '@/lib/api';

// 단일 SKU 추가
await upsertSKUMaster({
  sku: 'SKU-001',
  product_name: '제품명',
  channel: 'amazon_us',
  child_asin: 'B08XYZ123',
  company_name: '회사명',
  brand_name: '브랜드명',
  manager: '담당자명',
  sales_price: 29.99,
  supply_cost_won: 20000,
});

// 여러 SKU 일괄 추가
const skuList = [
  { sku: 'SKU-001', product_name: '제품1', channel: 'amazon_us' },
  { sku: 'SKU-002', product_name: '제품2', channel: 'tiktok_shop' },
];

for (const sku of skuList) {
  await upsertSKUMaster(sku);
}
```

## 📝 필수 필드

- `sku`: SKU 코드 (고유값, 필수)
- `channel`: 채널 (필수)
  - `amazon_us`
  - `tiktok_shop`
  - `shopify`

## 📝 선택 필드

- `child_asin`: Child ASIN
- `product_name`: 제품명
- `contract_type`: 계약 형태
- `company_name`: 회사명
- `brand_name`: 브랜드명
- `manager`: 담당자
- `profit_sheet_id`: ProfitSheet ID
- `amazon_account_name`: Amazon 계정명
- `rank`: 제품 랭크
- `sales_price`: 판매가
- `supply_cost_won`: 공급가 (원화)
- `transportation_mode`: 물류 모드
- `is_brand_representative`: 브랜드 대표 여부 (기본값: false)
- `is_account_representative`: 계정 대표 여부 (기본값: false)

## ⚠️ 주의사항

1. **SKU는 고유값**: 같은 SKU로 다시 추가하면 업데이트됩니다 (upsert)
2. **채널은 필수**: 반드시 세 가지 중 하나를 선택해야 합니다
3. **외래키 제약**: `sku_monthly_data` 테이블에서 참조하므로, SKU를 삭제하면 관련 월별 데이터도 삭제됩니다

## 🔍 데이터 조회

```bash
# 모든 SKU 조회
curl http://localhost:3001/api/sku-master

# 특정 SKU 조회
curl http://localhost:3001/api/sku-master?sku=SKU-001
```

## 🗑️ 데이터 삭제

```bash
curl -X DELETE http://localhost:3001/api/sku-master?sku=SKU-001
```












