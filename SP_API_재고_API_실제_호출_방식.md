# SP-API 재고 API 실제 호출 방식

## ⚠️ 중요: 실제 테스트 필요

제가 작성한 코드는 **일반적인 지식과 웹 검색 결과**를 바탕으로 작성했습니다. 실제 API 호출 전에 다음을 확인해야 합니다.

## 📋 현재 구현된 방식

### 엔드포인트
```
GET /fba/inventory/v1/summaries
```

### 파라미터 (현재 코드)

1. **granularityType & granularityId** (웹 검색 결과 기반)
   ```typescript
   url.searchParams.append("granularityType", "Marketplace");
   url.searchParams.append("granularityId", "ATVPDKIKX0DER");
   ```

2. **sellerSkus** (쉼표로 구분)
   ```typescript
   url.searchParams.append("sellerSkus", "SBAR_CASTOROIL,ZX-QQ9I-D4BY");
   ```

### 응답 구조 (가정)

```typescript
// 가능한 구조 1
{
  payload: {
    inventorySummaries: [...]
  }
}

// 가능한 구조 2
{
  inventorySummaries: [...]
}

// 각 summary 구조
{
  sellerSku: "SBAR_CASTOROIL",  // 또는 sellerSKU
  totalQuantity: {
    available: 50,
    reserved: 10,
    unfulfillable: 0
  }
}
```

## 🔍 확인이 필요한 사항

### 1. 파라미터 형식

**질문:**
- `sellerSkus`를 쉼표로 구분하는 것이 맞나요?
- 아니면 반복 파라미터로 추가해야 하나요? (`sellerSkus=SKU1&sellerSkus=SKU2`)

**현재 코드:**
```typescript
// 쉼표로 구분
url.searchParams.append("sellerSkus", skus.join(","));
```

**대안:**
```typescript
// 반복 파라미터
skus.forEach(sku => url.searchParams.append("sellerSkus", sku));
```

### 2. Marketplace 지정 방식

**질문:**
- `granularityType` + `granularityId`를 사용해야 하나요?
- 아니면 `marketplaceIds`를 사용해야 하나요?

**현재 코드:**
```typescript
url.searchParams.append("granularityType", "Marketplace");
url.searchParams.append("granularityId", marketplaceIds[0]);
```

### 3. 응답 구조

**질문:**
- 응답이 `payload`로 감싸져 있나요?
- `sellerSku` vs `sellerSKU` (대소문자)
- `totalQuantity` 구조가 정확한가요?

## 🧪 테스트 방법

### 1단계: Edge Function 배포

```bash
supabase functions deploy fetch-amazon-orders
```

### 2단계: 테스트 호출

```bash
supabase functions invoke fetch-amazon-orders \
  --body '{
    "sku": "SBAR_CASTOROIL",
    "fetchInventory": true,
    "saveToDatabase": false
  }'
```

### 3단계: 로그 확인

Edge Function 로그에서 다음을 확인:
- 실제 요청 URL
- 응답 구조 (첫 500자)
- 에러 메시지 (있다면)

### 4단계: 코드 수정

로그를 보고 실제 응답 구조에 맞게 코드 수정

## 📚 공식 문서 확인

**Amazon Developer Documentation:**
- https://developer-docs.amazon.com/sp-api/
- FBA Inventory API 섹션
- `GET /fba/inventory/v1/summaries` 엔드포인트 문서

## 🔧 수정이 필요할 수 있는 부분

코드에 이미 여러 가능성을 고려한 주석을 추가했습니다:

1. **파라미터 전달 방식**: 쉼표 구분 vs 반복 추가
2. **응답 구조**: payload 감싸짐 여부
3. **필드명**: 대소문자 차이

실제 테스트 후 로그를 확인하고 필요시 수정하세요.





