# FBA 재고 API 테스트 가이드

## ✅ 구현 완료

Edge Function에 FBA 재고 API 호출 기능을 추가했습니다.

### 추가된 기능

1. **`fetchFBAInventory` 함수**: SP-API FBA Inventory API 호출
   - 엔드포인트: `/fba/inventory/v1/summaries`
   - SKU별 재고 정보 가져오기

2. **재고 정보 자동 업데이트**:
   - 주문 데이터와 함께 재고 정보도 가져와서 업데이트
   - 재고 정보만 따로 가져올 수도 있음

3. **UI 옵션 추가**:
   - "FBA 재고 정보 가져오기" 체크박스 추가

## 🚀 사용 방법

### 방법 1: UI에서 테스트

1. Amazon US 대시보드 페이지로 이동
2. "Amazon 주문 데이터 가져오기" 섹션에서:
   - **SKU**: `SBAR_CASTOROIL` 또는 `ZX-QQ9I-D4BY` 입력
   - **연도**: `2025`
   - **월**: `12`
   - **FBA 재고 정보 가져오기**: ✅ 체크
   - **Supabase에 데이터 저장**: ✅ 체크
3. **주문 데이터 가져오기** 버튼 클릭

### 방법 2: Edge Function 직접 호출

```bash
# Supabase CLI 사용
supabase functions invoke fetch-amazon-orders \
  --body '{
    "sku": "SBAR_CASTOROIL",
    "year": 2025,
    "month": 12,
    "fetchInventory": true,
    "saveToDatabase": true
  }'
```

## 📊 재고 정보 구조

SP-API에서 반환하는 재고 정보:

```json
{
  "inventorySummaries": [
    {
      "sellerSku": "SBAR_CASTOROIL",
      "fnSku": "...",
      "asin": "...",
      "productName": "...",
      "totalQuantity": {
        "available": 50,
        "reserved": 10,
        "unfulfillable": 0
      },
      "inventoryDetails": [...]
    }
  ]
}
```

### 계산 방식

총 재고 = `available + reserved + unfulfillable`

이 값이 `fba_inventory` 필드에 저장됩니다.

## 🔍 확인 방법

### Supabase Dashboard에서 확인

```sql
SELECT 
  sku,
  year,
  month,
  fba_inventory,
  total_order_quantity,
  updated_at
FROM amazon_us_monthly_data
WHERE sku IN ('SBAR_CASTOROIL', 'ZX-QQ9I-D4BY')
  AND year = 2025
  AND month = 12;
```

## ⚠️ 주의사항

1. **SKU 제한**: 한 번에 최대 50개 SKU까지 조회 가능
2. **API 권한**: SP-API 앱에 FBA Inventory 권한이 있어야 함
3. **재고 정보만 가져오기**: 주문 데이터 없이 재고만 가져오려면 `fetchInventory: true`만 설정

## 🐛 문제 해결

### "FBA Inventory API 호출 실패" 에러

- SP-API 앱에 FBA Inventory 권한이 있는지 확인
- SKU가 정확한지 확인
- Marketplace ID가 올바른지 확인

### 재고 정보가 0으로 표시됨

- 실제로 재고가 없는 경우일 수 있음
- SKU가 FBA로 등록되어 있는지 확인
- Seller Central에서 재고 확인

