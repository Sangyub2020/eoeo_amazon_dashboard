// 마켓플레이스/채널 타입
export type Channel = 'amazon_us' | 'tiktok_shop' | 'all';
// 참고: 'shopify'는 더 이상 사용하지 않습니다

// 제품 마스터 정보 (Internal Code 기준, 모든 채널 공통)
export interface ProductMaster {
  id?: string;
  internal_code: string; // 회사 내부 제품 코드 (모든 채널에서 동일)
  barcode?: string; // 바코드
  product_name: string;
  company_name?: string;
  brand_name?: string;
  created_at?: string;
  updated_at?: string;
}

// SKU 마스터 정보 (채널별 특화 정보)
export interface SKUMaster {
  id?: string;
  internal_code?: string; // 제품 마스터 참조
  sku: string; // 채널별 SKU (고유값)
  channel: Channel;
  child_asin?: string; // Amazon 전용
  product_name?: string; // 채널별 제품명 (없으면 product_master에서 가져옴)
  manager?: string; // 담당자 (하위 마스터로 이동)
  contract_type?: string; // 계약 형태 (하위 마스터로 이동)
  amazon_account_name?: string; // Amazon 전용
  rank?: number;
  sales_price?: number;
  supply_cost_won?: number;
  transportation_mode?: string;
  is_brand_representative?: boolean;
  is_account_representative?: boolean;
  channel_specific_data?: Record<string, any>; // 채널별 특화 데이터 (JSON)
  created_at?: string;
  updated_at?: string;
}

// 일별 판매량 타입
export interface DailySales {
  [day: string]: number; // "1", "2", ..., "31"
}

// 월별 SKU 데이터 (Amazon US용 간소화된 구조)
export interface AmazonUSMonthlyData {
  id?: string;
  sku: string;
  year: number;
  month: number;
  
  // 환율
  exchange_rate?: number;
  
  // (1) FBA 재고
  fba_inventory?: number;
  
  // (2) FBA 입고중은 계산 필드 (저장 안 함)
  // 계산식: inbound_working + inbound_shipped + inbound_receiving + reserved_fc_transfer + reserved_fc_processing
  // 사용: calculateFBAInboundTotal() 유틸리티 함수 사용
  
  // (3) Inbound Working
  inbound_working?: number;
  
  // (4) Inbound Shipped
  inbound_shipped?: number;
  
  // (5) Inbound Receiving
  inbound_receiving?: number;
  
  // (6) Reserved Orders
  reserved_orders?: number;
  
  // (7) Reserved FC Transfer
  reserved_fc_transfer?: number;
  
  // (8) Reserved FC Processing
  reserved_fc_processing?: number;
  
  // (9) FBA Fee
  fba_fee?: number;
  
  // (10) Referral Fee
  referral_fee?: number;
  
  // (11) Transportation Mode
  transportation_mode?: string;
  
  // (12) Transportation Fee
  transportation_fee?: number;
  
  // (13) 관세율 (예: 0.05 = 5%)
  tariff_rate?: number;
  
  // (14) 개당 관세
  tariff_per_unit?: number;
  
  // (15) Margin (Sales Price - FBA Fee - Referral Fee - Transportation Fee - Supply Price)
  margin?: number;
  
  // (16) Total Order Quantity
  total_order_quantity?: number;
  
  // (17) CCONMA - 외부 구글 시트에서 동기화된 재고 정보
  cconma?: number;
  
  // (18) 재고 관련 추가 컬럼들 (외부 구글 시트에서 동기화)
  pending_in_kr?: number; // 한국 대기 중인 재고
  in_air?: number; // 항공 운송 중인 재고
  in_ocean?: number; // 해상 운송 중인 재고
  sl_glovis?: number; // SL Glovis 재고
  ctk_usa?: number; // CTK USA 재고
  
  created_at?: string;
  updated_at?: string;
  allocated_account_cost?: number; // 계정 단위 비용에서 안분된 금액
}

// Amazon US 계정별 월별 비용
export interface AmazonUSAccountMonthlyCost {
  id?: string;
  account_name: string;
  year: number;
  month: number;
  
  // 계정 단위 비용 항목들
  premium_service_fee?: number;
  inbound_placement_fee?: number;
  monthly_storage_fee?: number;
  longterm_storage_fee?: number;
  fba_removal_order_disposal_fee?: number;
  fba_removal_order_return_fee?: number;
  subscription_fee?: number;
  paid_services_fee?: number;
  other_account_fees?: number;
  
  // 총 비용
  total_account_cost?: number;
  
  // 안분 관련 정보
  is_allocated?: boolean;
  allocated_at?: string;
  allocation_method?: string; // 'sales_ratio' | 'quantity_ratio'
  
  // 메모/설명
  description?: string;
  notes?: string;
  
  created_at?: string;
  updated_at?: string;
}

// 기존 SKUMonthlyData 타입 (다른 채널용 또는 호환성 유지)
export interface SKUMonthlyData {
  id?: string;
  sku: string;
  year: number;
  month: number;
  
  // 재고 관련
  fba_inventory?: number;
  in_transit_to_fba?: number;
  inbound_working?: number;
  inbound_shipped?: number;
  inbound_receiving?: number;
  reserved_orders?: number;
  reserved_fc_transfer?: number;
  reserved_fc_processing?: number;
  ocean_to_3pl?: number;
  in_3pl?: number;
  
  // 환율 및 공급가
  monthly_exchange_rate?: number;
  exchange_rate?: number; // 호환성
  supply_cost_usd?: number;
  
  // 수수료 (단가)
  fba_fee?: number;
  referral_fee?: number;
  transportation_fee?: number;
  
  // 계산된 값 (단가)
  cost?: number;
  margin?: number;
  margin_percentage?: number;
  
  // 판매 수량
  total_order_quantity?: number;
  promotion_completed?: number;
  mcf_disposal_quantity?: number;
  organic_quantity?: number;
  mcf_quantity?: number;
  
  // 매출
  gross_sales?: number;
  refunds?: number;
  
  // 총 수수료
  total_fba_fee?: number;
  total_referral_fee?: number;
  
  // 계정 단위 비용
  fba_inventory_disposals?: number;
  fba_inventory_removals?: number;
  fba_long_term_storage_fees?: number;
  monthly_subscription_fee?: number;
  paid_services_fee?: number;
  monthly_storage_fee?: number;
  
  // 프로모션 비용
  self_promotion_cost?: number;
  support_promotion_cost?: number;
  
  // CPC 관련
  cpc_cost?: number;
  cpc_sales?: number;
  cpc_roas?: number;
  sp_spend?: number;
  sp_sales?: number;
  sb_spend?: number;
  sb_sales?: number;
  sd_spend?: number;
  sd_sales?: number;
  
  // DSP 관련
  self_dsp_cost?: number;
  self_dsp_sales?: number;
  support_dsp_cost?: number;
  support_dsp_sales?: number;
  dsp_roas?: number;
  
  // MCF 비용
  self_mcf?: number;
  support_mcf?: number;
  
  // 틱톡 비용
  self_tiktok_cost?: number;
  support_tiktok_cost?: number;
  
  // 기타 마케팅 비용
  affiliate_cost?: number;
  performance_marketing_cost?: number;
  pulsead_fee?: number;
  self_instagram_cost?: number;
  
  // 정산 및 지원금
  amazon_settlement?: number;
  marketing_support_amount?: number;
  
  // 단계별 이익 및 비용 (1차~14차)
  profit_1?: number;
  cost_1?: number;
  cost_1_ratio?: number;
  profit_2?: number;
  cost_2?: number;
  cost_2_ratio?: number;
  profit_3?: number;
  cost_3?: number;
  cost_3_ratio?: number;
  profit_4?: number;
  cost_4?: number;
  cost_4_ratio?: number;
  profit_5?: number;
  cost_5?: number;
  cost_5_ratio?: number;
  profit_6?: number;
  cost_6?: number;
  cost_6_ratio?: number;
  profit_7?: number;
  cost_7?: number;
  cost_7_ratio?: number;
  profit_8?: number;
  cost_8?: number;
  cost_8_ratio?: number;
  profit_9?: number;
  cost_9?: number;
  cost_9_ratio?: number;
  profit_9_5?: number;
  cost_9_5?: number;
  cost_9_5_ratio?: number;
  profit_10?: number;
  cost_10?: number;
  cost_10_ratio?: number;
  profit_11?: number;
  cost_11?: number;
  cost_11_ratio?: number;
  profit_12?: number;
  cost_12?: number;
  cost_12_ratio?: number;
  profit_13?: number;
  cost_13?: number;
  cost_13_ratio?: number;
  profit_14_final?: number;
  support_amount_ratio?: number;
  
  // 기타 수익
  other_revenue?: number;
  
  // 일별 판매량
  daily_sales?: DailySales;
  
  created_at?: string;
  updated_at?: string;
}

// 월별 집계 데이터 타입
export interface MonthlySummary {
  year: number;
  month: number;
  channel: Channel;
  sku_count?: number;
  total_revenue: number;
  total_refunds?: number;
  total_profit: number;
  total_quantity?: number;
  total_cpc_cost?: number;
  total_cpc_sales?: number;
  total_dsp_cost?: number;
  total_dsp_sales?: number;
  // 레거시 호환성
  total_cost?: number;
  order_count?: number;
}

// SKU별 집계 데이터 타입
export interface SKUSummary {
  sku: string;
  product_name?: string;
  channel: Channel;
  brand_name?: string;
  company_name?: string;
  total_revenue: number;
  total_profit: number;
  total_quantity?: number;
  avg_margin_percentage?: number;
  // 레거시 호환성
  marketplace?: Channel;
  total_cost?: number;
}

// 레거시 호환성을 위한 타입 (기존 코드와의 호환)
export type Marketplace = Channel;
export interface SalesData {
  id?: string;
  marketplace: Marketplace;
  date: string;
  sku: string;
  product_name?: string;
  revenue: number;
  cost: number;
  profit: number;
  quantity?: number;
  currency?: string;
  created_at?: string;
  updated_at?: string;
}

// 서비스 매출 타입
export interface ServiceRevenue {
  id?: string;
  category?: string;
  vendorCode?: string;
  companyName?: string;
  brandNames?: string[];
  businessRegistrationNumber?: string;
  invoiceEmail?: string;
  projectCode?: string;
  project?: string;
  projectCategory?: string;
  projectName?: string;
  eoeoManager?: string;
  contractLink?: string;
  estimateLink?: string;
  attributionYearMonth?: string;
  advanceBalance?: string;
  ratio?: string;
  expectedDepositDate?: string;
  depositStatus?: '입금완료' | '입금예정' | '입금지연';
  oneTimeExpenseAmount?: number;
  expectedDepositAmount?: number;
  expectedDepositCurrency?: 'KRW' | 'USD';
  description?: string;
  depositDate?: string;
  depositAmount?: number;
  depositCurrency?: 'KRW' | 'USD';
  createdDate?: string;
  invoiceCopy?: string;
  invoiceAttachmentStatus?: 'required' | 'completed' | 'not_required';
  issueNotes?: string;
  taxStatus?: string;
  invoiceSupplyPrice?: number;
  createdAt?: string;
  updatedAt?: string;
}
