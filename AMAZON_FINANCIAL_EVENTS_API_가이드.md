# Amazon SP-API listFinancialEvents API 가이드

## 📋 개요

`listFinancialEvents` API는 한 번의 호출로 다양한 재무 정보를 제공합니다. API 호출을 최소화하기 위해 이 API에서 추출 가능한 모든 정보를 정리했습니다.

**API 엔드포인트**: `GET /finances/v0/financialEvents`

**참고 문서**: https://developer-docs.amazon.com/sp-api/reference/listfinancialevents

## 🎯 API 호출 최소화 전략

이 API는 **한 번의 호출**로 다음 정보를 모두 제공합니다:
- 환불 정보 (RefundEventList)
- 차지백 정보 (ChargebackEventList)
- 배송 수수료 정보 (ShipmentEventList)
- 서비스 수수료 정보 (ServiceFeeEventList)
- 조정 정보 (AdjustmentEventList)
- 채권 회수 정보 (DebtRecoveryEventList)
- FBA 청산 정보 (FBALiquidationEventList)
- FBA 제거 정보 (FBARemovalEventList)
- 보증 청구 정보 (GuaranteeClaimEventList)
- Amazon Pay 정보 (PayWithAmazonEventList)
- 역청구 정보 (RetrochargeEventList)
- SAFET 환불 정보 (SAFETReimbursementEventList)
- 세금 원천징수 정보 (TaxWithholdingEventList)
- 기타 재무 이벤트

## 📊 추출 가능한 정보 상세

### 1. RefundEventList (환불 정보)

**경로**: `payload.FinancialEvents.RefundEventList[]`

**추출 가능한 정보**:
- `PostedDate`: 환불 처리일
- `AmazonOrderId`: 주문 ID
- `MarketplaceName`: 마켓플레이스 이름
- `ShipmentItemAdjustmentList[]`: 상품별 조정 내역
  - `SellerSKU`: SKU 코드 ⭐
  - `FnSKU`: FBA SKU
  - `ItemChargeAdjustmentList[]`: 환불 금액 상세
    - `ChargeType`: 수수료 유형 (Principal, Tax, Shipping 등) ⭐
    - `ChargeAmount.CurrencyAmount`: 환불 금액 ⭐
    - `ChargeAmount.CurrencyCode`: 통화 코드

**사용 예시**:
```typescript
// 환불 금액 계산 (Principal만)
if (chargeAdjustment.ChargeType === "Principal") {
  totalRefunds += Math.abs(chargeAdjustment.ChargeAmount.CurrencyAmount);
}
```

### 2. ChargebackEventList (차지백 정보)

**경로**: `payload.FinancialEvents.ChargebackEventList[]`

**추출 가능한 정보**:
- `PostedDate`: 차지백 처리일
- `AmazonOrderId`: 주문 ID
- `ChargebackAmount.CurrencyAmount`: 차지백 금액
- `ChargebackAmount.CurrencyCode`: 통화 코드
- `ChargebackReasonCode`: 차지백 사유 코드
- `ChargebackReasonCodeDescription`: 차지백 사유 설명

### 3. ShipmentEventList (배송 수수료 정보)

**경로**: `payload.FinancialEvents.ShipmentEventList[]`

**추출 가능한 정보**:
- `PostedDate`: 배송 처리일
- `AmazonOrderId`: 주문 ID
- `MarketplaceName`: 마켓플레이스 이름
- `ShipmentItemList[]`: 상품별 배송 정보
  - `SellerSKU`: SKU 코드 ⭐
  - `ItemChargeList[]`: 배송 수수료 상세
    - `ChargeType`: 수수료 유형
    - `ChargeAmount.CurrencyAmount`: 수수료 금액
    - `ChargeAmount.CurrencyCode`: 통화 코드

### 4. ServiceFeeEventList (서비스 수수료 정보)

**경로**: `payload.FinancialEvents.ServiceFeeEventList[]`

**추출 가능한 정보**:
- `PostedDate`: 서비스 수수료 처리일
- `AmazonOrderId`: 주문 ID
- `FeeDescription`: 수수료 설명
- `FeeAmount.CurrencyAmount`: 수수료 금액
- `FeeAmount.CurrencyCode`: 통화 코드

### 5. AdjustmentEventList (조정 정보)

**경로**: `payload.FinancialEvents.AdjustmentEventList[]`

**추출 가능한 정보**:
- `PostedDate`: 조정 처리일
- `AdjustmentType`: 조정 유형
- `AdjustmentAmount.CurrencyAmount`: 조정 금액
- `AdjustmentAmount.CurrencyCode`: 통화 코드
- `AdjustmentItemList[]`: 상품별 조정 내역
  - `SellerSKU`: SKU 코드 ⭐
  - `Quantity`: 수량
  - `PerUnitAmount.CurrencyAmount`: 개당 금액
  - `TotalAmount.CurrencyAmount`: 총 금액

### 6. SAFETReimbursementEventList (SAFET 환불 정보)

**경로**: `payload.FinancialEvents.SAFETReimbursementEventList[]`

**추출 가능한 정보**:
- `PostedDate`: SAFET 환불 처리일
- `SAFETClaimId`: SAFET 청구 ID
- `ReimbursedAmount.CurrencyAmount`: 환불 금액
- `ReimbursedAmount.CurrencyCode`: 통화 코드
- `ReasonCode`: 환불 사유 코드

### 7. 기타 이벤트 유형

다음 이벤트 유형도 동일한 API에서 제공됩니다:
- `DebtRecoveryEventList`: 채권 회수 정보
- `FBALiquidationEventList`: FBA 청산 정보
- `FBARemovalEventList`: FBA 제거 정보
- `GuaranteeClaimEventList`: 보증 청구 정보
- `PayWithAmazonEventList`: Amazon Pay 정보
- `RetrochargeEventList`: 역청구 정보
- `TaxWithholdingEventList`: 세금 원천징수 정보
- `RentalTransactionEventList`: 렌탈 거래 정보
- `ProductAdsPaymentEventList`: 제품 광고 결제 정보
- 등등...

## 🚀 사용 방법

### 별도 Edge Function: `fetch-amazon-refunds`

환불 정보 조회를 위한 별도 Edge Function이 생성되었습니다.

**엔드포인트**: `https://[project-ref].supabase.co/functions/v1/fetch-amazon-refunds`

**요청 예시**:
```typescript
const response = await fetch('https://[project-ref].supabase.co/functions/v1/fetch-amazon-refunds', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseAnonKey}`,
  },
  body: JSON.stringify({
    postedAfter: '2025-11-01T00:00:00Z',
    postedBefore: '2025-11-30T23:59:59Z',
    sku: 'SBAR_CASTOROIL', // 선택사항: 특정 SKU 필터링
    maxPages: 100, // 선택사항: 최대 페이지 수 (기본값: 100)
  }),
});

const result = await response.json();
// result.data.totalRefunds: 총 환불 금액
// result.data.events.refunds: 환불 이벤트 목록
// result.data.events.chargebacks: 차지백 이벤트 목록
// result.data.events.shipments: 배송 수수료 이벤트 목록
// 등등...
```

**응답 구조**:
```typescript
{
  success: true,
  data: {
    totalRefunds: 123.45, // 총 환불 금액 (USD)
    events: {
      refunds: [...], // 환불 이벤트 목록
      chargebacks: [...], // 차지백 이벤트 목록
      shipments: [...], // 배송 수수료 이벤트 목록
      serviceFees: [...], // 서비스 수수료 이벤트 목록
      adjustments: [...], // 조정 이벤트 목록
      safetReimbursements: [...], // SAFET 환불 이벤트 목록
      // 등등...
    },
    pageCount: 10, // 처리된 페이지 수
    hasMore: false, // 더 많은 데이터가 있는지 여부
  }
}
```

## ⚠️ 주의사항

1. **Rate Limit**: 0.5 requests/second (2초 간격 필요)
2. **페이지네이션**: `NextToken`을 사용하여 여러 페이지 처리
3. **타임아웃**: Edge Function 타임아웃을 고려하여 `maxPages` 설정
4. **데이터 지연**: 주문이 Financial Events에 나타나기까지 최대 48시간 소요
5. **SKU 필터링**: API 파라미터로는 불가능하며, 응답 데이터를 파싱하여 필터링

## 💡 최적화 팁

1. **기간 필터링**: `PostedAfter`와 `PostedBefore`를 사용하여 필요한 기간만 조회
2. **SKU 필터링**: 응답 데이터를 파싱하여 필요한 SKU만 추출
3. **비동기 처리**: 환불 정보 조회를 별도 Edge Function으로 분리하여 메인 프로세스와 독립적으로 처리
4. **배치 처리**: 많은 데이터가 있는 경우 여러 번에 나누어 처리

## 📚 참고 자료

- [SP-API listFinancialEvents 문서](https://developer-docs.amazon.com/sp-api/reference/listfinancialevents)
- [SP-API Finances API 개요](https://developer-docs.amazon.com/sp-api/docs/finances-api-v0-reference)

