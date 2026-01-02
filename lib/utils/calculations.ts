// Amazon US 월별 데이터 계산 유틸리티 함수
import { AmazonUSMonthlyData } from '@/lib/types';

/**
 * FBA 입고중 계산
 * inbound_working + inbound_shipped + inbound_receiving + reserved_fc_transfer + reserved_fc_processing
 */
export function calculateFBAInboundTotal(data: AmazonUSMonthlyData): number {
  return (
    (data.inbound_working || 0) +
    (data.inbound_shipped || 0) +
    (data.inbound_receiving || 0) +
    (data.reserved_fc_transfer || 0) +
    (data.reserved_fc_processing || 0)
  );
}

/**
 * Margin 계산
 * Sales Price - FBA Fee - Referral Fee - Transportation Fee - Supply Price
 * 
 * @param monthlyData 월별 데이터
 * @param salesPrice SKU 마스터의 판매가
 * @param supplyCostUsd 공급가 (USD)
 */
export function calculateMargin(
  monthlyData: AmazonUSMonthlyData,
  salesPrice: number,
  supplyCostUsd: number
): number {
  const fbaFee = monthlyData.fba_fee || 0;
  const referralFee = monthlyData.referral_fee || 0;
  const transportationFee = monthlyData.transportation_fee || 0;
  
  return salesPrice - fbaFee - referralFee - transportationFee - supplyCostUsd;
}

/**
 * Margin 퍼센트 계산
 */
export function calculateMarginPercentage(
  monthlyData: AmazonUSMonthlyData,
  salesPrice: number,
  supplyCostUsd: number
): number {
  if (salesPrice <= 0) return 0;
  
  const margin = calculateMargin(monthlyData, salesPrice, supplyCostUsd);
  return (margin / salesPrice) * 100;
}









