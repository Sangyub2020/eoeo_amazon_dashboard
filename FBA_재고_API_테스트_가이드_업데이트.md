# FBA 재고 API 테스트 가이드 (업데이트)

## ✅ 준비 완료 사항

1. **API 문서 기반 코드 수정 완료**
   - `sellerSkus`: 배열 반복 추가 형식으로 수정
   - `marketplaceIds`: 최대 1개만 전달하도록 수정
   - `details` 파라미터 추가 (선택사항)
   - 응답 구조에 맞게 재고 처리 로직 수정

2. **MARS MADE 브랜드 SKU 확인**
   - `SBAR_CASTOROIL` - [2.0] MARS MADE Castor Oil Shampoo Bar 120g
   - `ZX-QQ9I-D4BY` - MARS MADE CASTOR OIL CONDITIONER BAR 100g

## 🚀 테스트 방법

### 방법 1: UI를 통한 테스트 (권장)

1. **Edge Function 배포** (아직 안 했다면)
   ```bash
   # Supabase CLI 로그인
   npx supabase login
   
   # Edge Function 배포
   npx supabase functions deploy fetch-amazon-orders --project-ref yjxrrczopfpymwlbhzjy
   ```

2. **Supabase 환경 변수 확인**
   - Supabase Dashboard → Project Settings → Edge Functions → Secrets
   - 다음 변수들이 설정되어 있어야 합니다:
     - `AMAZON_CLIENT_ID`
     - `AMAZON_CLIENT_SECRET`
     - `AMAZON_REFRESH_TOKEN`
     - `AMAZON_SP_API_BASE_URL` (선택사항, 기본값: `https://sellingpartnerapi-na.amazon.com`)

3. **UI에서 테스트**
   - 브라우저에서 Amazon Orders Fetcher 페이지로 이동
   - 다음 설정:
     - **Marketplace IDs**: `ATVPDKIKX0DER` (US)
     - **SKU**: `SBAR_CASTOROIL` 또는 `ZX-QQ9I-D4BY`
     - **Fetch FBA Inventory**: ✅ 체크
     - **Save to Database**: ✅ 체크 (재고 정보를 DB에 저장하려면)
   - "Fetch Orders" 버튼 클릭

4. **결과 확인**
   - 브라우저 콘솔에서 로그 확인
   - Supabase Dashboard → Edge Functions → Logs에서 상세 로그 확인
   - Supabase Dashboard → Table Editor → `amazon_us_monthly_data`에서 재고 정보 확인

### 방법 2: Supabase Dashboard에서 직접 테스트

1. **Supabase Dashboard → Edge Functions → fetch-amazon-orders**

2. **Invoke Function** 클릭

3. **Request Body** 입력:
   ```json
   {
     "marketplaceIds": ["ATVPDKIKX0DER"],
     "sku": "SBAR_CASTOROIL",
     "fetchInventory": true,
     "saveToDatabase": false
   }
   ```

4. **Invoke** 클릭하여 실행

5. **Response** 확인:
   - `payload.inventorySummaries` 배열에 재고 정보가 포함되어야 합니다
   - 각 항목에는 `sellerSku`, `totalQuantity` 등이 포함됩니다

## 📊 예상 응답 구조

```json
{
  "success": true,
  "data": {
    "payload": {
      "granularity": {
        "granularityType": "Marketplace",
        "granularityId": "ATVPDKIKX0DER"
      },
      "inventorySummaries": [
        {
          "sellerSku": "SBAR_CASTOROIL",
          "totalQuantity": 123,
          "inventoryDetails": {
            "fulfillableQuantity": 100,
            "reservedQuantity": {
              "totalReservedQuantity": 20
            },
            "unfulfillableQuantity": {
              "totalUnfulfillableQuantity": 3
            }
          },
          "lastUpdatedTime": "2025-12-18T02:46:31.699Z"
        }
      ]
    }
  }
}
```

## 🔍 확인 사항

1. **API 호출 URL 확인**
   - 로그에서 `FBA Inventory API 호출: https://...` 메시지 확인
   - 파라미터가 올바르게 전달되었는지 확인:
     - `granularityType=Marketplace`
     - `granularityId=ATVPDKIKX0DER`
     - `marketplaceIds=ATVPDKIKX0DER`
     - `sellerSkus=SBAR_CASTOROIL` (반복 추가 형식)

2. **응답 구조 확인**
   - `payload.inventorySummaries` 배열 확인
   - 각 SKU의 `totalQuantity` 값 확인
   - `inventoryDetails`가 있는지 확인 (details=true인 경우)

3. **에러 처리**
   - `errors` 배열이 있는지 확인
   - HTTP 상태 코드 확인 (200이어야 함)

## 🐛 문제 해결

### 에러: "marketplaceIds는 필수 파라미터입니다"
- **원인**: `marketplaceIds`가 전달되지 않음
- **해결**: 요청 body에 `marketplaceIds` 배열 포함

### 에러: "FBA Inventory API 호출 실패: 403"
- **원인**: 인증 문제 또는 권한 부족
- **해결**: 
  - LWA Access Token이 유효한지 확인
  - SP-API 앱 권한에 FBA Inventory API가 포함되어 있는지 확인

### 에러: "FBA Inventory API 호출 실패: 400"
- **원인**: 잘못된 파라미터
- **해결**: 
  - `granularityType`이 "Marketplace"인지 확인
  - `sellerSkus`가 올바른 형식인지 확인 (반복 추가)

### 재고 정보가 0으로 표시됨
- **원인**: 실제 재고가 0이거나, 응답 구조 파싱 오류
- **해결**: 
  - 로그에서 실제 응답 구조 확인
  - `totalQuantity` 값이 직접 숫자인지 확인
  - `details=true`로 설정하여 상세 정보 확인

## 📝 다음 단계

테스트가 성공하면:
1. 모든 MARS MADE SKU에 대해 재고 정보 가져오기
2. `amazon_us_monthly_data` 테이블에 재고 정보 저장
3. 주문 데이터와 함께 월별 집계 데이터 생성

