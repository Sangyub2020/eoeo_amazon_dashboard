# SP-API 재고 API 검증 필요 사항

## ⚠️ 현재 상황

제가 SP-API 공식 문서를 직접 확인하지 않고 일반적인 지식으로 코드를 작성했습니다. 실제 API 호출 전에 다음 사항들을 검증해야 합니다.

## 🔍 확인이 필요한 사항

### 1. 엔드포인트
- ✅ `/fba/inventory/v1/summaries` - 일반적으로 맞는 것으로 보임
- ❓ 실제 베이스 URL과 정확한 경로 확인 필요

### 2. 파라미터 전달 방식

**현재 코드:**
```typescript
// marketplaceIds를 반복해서 추가
marketplaceIds.forEach((id) => url.searchParams.append("marketplaceIds", id));

// sellerSkus를 쉼표로 구분
const skuList = skus.slice(0, 50).join(",");
url.searchParams.append("sellerSkus", skuList);
```

**확인 필요:**
- `marketplaceIds`: 배열로 반복 추가가 맞는지? 아니면 쉼표로 구분?
- `sellerSkus`: 쉼표로 구분이 맞는지? 아니면 배열로 반복 추가?

### 3. 응답 구조

**현재 코드에서 가정:**
```typescript
inventoryData.inventorySummaries
summary.sellerSku
summary.totalQuantity.available
summary.totalQuantity.reserved
summary.totalQuantity.unfulfillable
```

**확인 필요:**
- 실제 응답이 `payload.inventorySummaries` 형태인지?
- `sellerSku` vs `sellerSKU` (대소문자)
- `totalQuantity` 구조가 정확한지?

## 📚 공식 문서 확인 방법

1. **Amazon Developer Documentation**
   - https://developer-docs.amazon.com/sp-api/
   - FBA Inventory API 섹션 확인

2. **API Reference 직접 확인**
   - `GET /fba/inventory/v1/summaries` 엔드포인트 문서
   - Request Parameters 섹션
   - Response Schema 섹션

## 🧪 테스트 방법

### 방법 1: 실제 API 호출 테스트

```bash
# Edge Function 배포 후 테스트
supabase functions invoke fetch-amazon-orders \
  --body '{
    "sku": "SBAR_CASTOROIL",
    "fetchInventory": true,
    "saveToDatabase": false
  }'
```

### 방법 2: Postman/curl로 직접 테스트

```bash
# 1. LWA Access Token 발급
curl -X POST https://api.amazon.com/auth/o2/token \
  -d "grant_type=refresh_token" \
  -d "refresh_token=YOUR_REFRESH_TOKEN" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET"

# 2. Inventory API 호출
curl -X GET "https://sellingpartnerapi-na.amazon.com/fba/inventory/v1/summaries?marketplaceIds=ATVPDKIKX0DER&sellerSkus=SBAR_CASTOROIL" \
  -H "x-amz-access-token: YOUR_ACCESS_TOKEN"
```

## 🔧 수정이 필요할 수 있는 부분

### 파라미터 전달 방식 수정 예시

**만약 sellerSkus가 배열로 반복 추가해야 한다면:**
```typescript
if (skus && skus.length > 0) {
  skus.slice(0, 50).forEach((sku) => {
    url.searchParams.append("sellerSkus", sku);
  });
}
```

**만약 marketplaceIds가 쉼표로 구분해야 한다면:**
```typescript
if (marketplaceIds && marketplaceIds.length > 0) {
  url.searchParams.append("marketplaceIds", marketplaceIds.join(","));
}
```

### 응답 구조 수정 예시

**만약 payload로 감싸져 있다면:**
```typescript
const summaries = inventoryData.payload?.inventorySummaries || inventoryData.inventorySummaries;
```

## ✅ 다음 단계

1. **공식 문서 확인** - Amazon Developer Documentation에서 정확한 API 스펙 확인
2. **테스트 호출** - 실제 API를 호출해서 응답 구조 확인
3. **코드 수정** - 필요시 파라미터 전달 방식 및 응답 파싱 로직 수정





