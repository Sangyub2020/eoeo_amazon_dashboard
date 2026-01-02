# Amazon SP-API 다음 단계 가이드

## 🎯 목표

특정 브랜드, 특정 SKU에 대해 예시 데이터(재고, 매출)를 특정 월에 대해 SP-API로 호출 후 Supabase에 저장하기

## ✅ 완료된 작업

1. ✅ SP-API 앱 생성 완료
2. ✅ Client ID, Secret, Refresh Token 확인 완료
3. ✅ Edge Function 생성 (`fetch-amazon-orders`)
4. ✅ React 컴포넌트 생성 (`AmazonOrdersFetcher`)
5. ✅ 주문 데이터 가져오기 및 Supabase 저장 로직 추가

## 📋 다음 단계

### 1. Edge Function 배포

```bash
# Supabase CLI 사용
supabase functions deploy fetch-amazon-orders

# 또는 Supabase Dashboard에서 직접 배포
```

### 2. Supabase Secrets 설정

Supabase Dashboard → Settings → Edge Functions → Secrets에 다음 추가:

```
AMAZON_SP_API_CLIENT_ID=your_client_id_here
AMAZON_SP_API_CLIENT_SECRET=your_client_secret_here
AMAZON_SP_API_REFRESH_TOKEN=your_refresh_token_here
AMAZON_SP_API_BASE_URL=https://sellingpartnerapi-na.amazon.com
```

**⚠️ 중요**: AWS IAM 자격 증명은 더 이상 필요 없습니다!

### 3. SKU 마스터에 데이터 추가

SP-API에서 가져온 주문 데이터를 저장하려면, 먼저 `sku_master` 테이블에 해당 SKU가 등록되어 있어야 합니다.

**방법 1: Admin 페이지에서 추가**
1. `/admin/sku-master` 페이지로 이동
2. SKU 추가 (예: `AMZ-PROD-001`)
3. Channel: `amazon_us` 선택

**방법 2: API로 추가**
```bash
POST /api/sku-master
{
  "sku": "AMZ-PROD-001",
  "channel": "amazon_us",
  "product_name": "제품명"
}
```

### 4. 테스트 실행

1. Amazon US 대시보드 페이지로 이동
2. "Amazon 주문 데이터 가져오기" 섹션에서:
   - **특정 SKU**: 원하는 SKU 입력 (예: `AMZ-PROD-001`)
   - **연도**: 예) `2024`
   - **월**: 예) `12`
   - **Supabase에 데이터 저장**: 체크
3. **주문 데이터 가져오기** 버튼 클릭

### 5. 데이터 확인

저장된 데이터는 다음 위치에서 확인할 수 있습니다:

1. **Supabase Dashboard**:
   - Table Editor → `amazon_us_monthly_data` 테이블 확인

2. **대시보드**:
   - Amazon US 페이지에서 월별 차트 확인
   - SKU별 상세 데이터 테이블 확인

## 📊 저장되는 데이터 구조

### amazon_us_monthly_data 테이블

```typescript
{
  sku: string;                    // SKU 코드
  year: number;                   // 연도
  month: number;                  // 월 (1-12)
  total_order_quantity: number;   // 총 주문 수량
  fba_inventory: number;          // FBA 재고 (현재는 0, 재고 API로 업데이트 필요)
  // 기타 필드들...
}
```

## 🔄 향후 개선 사항

### 1. 재고 데이터 가져오기

현재는 주문 데이터만 가져오고 있습니다. 재고 데이터를 가져오려면:

- **SP-API Inventory API** 사용
- 엔드포인트: `/fba/inventory/v1/summaries`
- FBA 재고 정보 가져와서 `fba_inventory` 필드 업데이트

### 2. 매출 데이터 계산

주문 데이터에서 매출 정보 추출:
- `OrderTotal.Amount` → 매출 계산
- `ItemPrice.Amount` → 제품별 매출
- `total_order_quantity` → 주문 수량

### 3. 수수료 정보 가져오기

- **SP-API Finances API** 사용
- FBA Fee, Referral Fee 등 가져오기

## 🧪 예시 테스트 시나리오

### 시나리오 1: 특정 SKU의 12월 데이터 가져오기

1. SKU 마스터에 `AMZ-PROD-001` 추가 (channel: `amazon_us`)
2. 필터 설정:
   - SKU: `AMZ-PROD-001`
   - 연도: `2024`
   - 월: `12`
3. "주문 데이터 가져오기" 클릭
4. 결과 확인:
   - 주문 개수
   - 저장된 월별 데이터 개수
   - Supabase 테이블에서 확인

### 시나리오 2: 모든 SKU의 특정 월 데이터 가져오기

1. 필터 설정:
   - SKU: (비워둠)
   - 연도: `2024`
   - 월: `12`
2. "주문 데이터 가져오기" 클릭
3. 모든 SKU의 12월 데이터가 저장됨

## 📝 참고사항

- **SKU 마스터 필수**: 주문 데이터를 저장하려면 해당 SKU가 `sku_master` 테이블에 등록되어 있어야 합니다
- **채널 확인**: SKU의 `channel`이 `amazon_us`여야 합니다
- **중복 방지**: 같은 SKU, 연도, 월의 데이터는 upsert로 업데이트됩니다

## 🔍 문제 해결

### "SKU가 sku_master에 없습니다" 경고

- Admin 페이지에서 해당 SKU를 먼저 추가하세요
- 또는 API로 추가: `POST /api/sku-master`

### 데이터가 저장되지 않음

- Supabase Secrets 확인
- Edge Function 로그 확인
- 브라우저 콘솔에서 에러 확인





