// Amazon SP-API 타입 정의

export interface AmazonOrder {
  AmazonOrderId: string;
  SellerOrderId?: string;
  PurchaseDate: string;
  LastUpdateDate: string;
  OrderStatus: 'Pending' | 'Unshipped' | 'PartiallyShipped' | 'Shipped' | 'Canceled' | 'Unfulfillable' | 'InvoiceUnconfirmed' | 'PendingAvailability';
  FulfillmentChannel?: 'MFN' | 'AFN';
  SalesChannel?: string;
  OrderChannel?: string;
  ShipServiceLevel?: string;
  ShippingAddress?: AmazonAddress;
  OrderTotal?: AmazonMoney;
  NumberOfItemsShipped?: number;
  NumberOfItemsUnshipped?: number;
  PaymentMethod?: string;
  PaymentMethodDetails?: string[];
  MarketplaceId: string;
  BuyerInfo?: AmazonBuyerInfo;
  EasyShipShipmentStatus?: string;
  OrderType?: 'StandardOrder' | 'Preorder';
  EarliestShipDate?: string;
  LatestShipDate?: string;
  EarliestDeliveryDate?: string;
  LatestDeliveryDate?: string;
  IsBusinessOrder?: boolean;
  IsPrime?: boolean;
  IsGlobalExpressEnabled?: boolean;
  IsSoldByAB?: boolean;
  IsIBA?: boolean;
  OrderItems?: AmazonOrderItem[];
}

export interface AmazonAddress {
  Name?: string;
  AddressLine1?: string;
  AddressLine2?: string;
  AddressLine3?: string;
  City?: string;
  County?: string;
  District?: string;
  StateOrRegion?: string;
  PostalCode?: string;
  CountryCode?: string;
  Phone?: string;
  AddressType?: string;
}

export interface AmazonMoney {
  CurrencyCode?: string;
  Amount?: string;
}

export interface AmazonBuyerInfo {
  BuyerEmail?: string;
  BuyerName?: string;
  BuyerCounty?: string;
  BuyerTaxInfo?: {
    CompanyLegalName?: string;
    TaxingRegion?: string;
    TaxClassifications?: Array<{
      Name?: string;
      Value?: string;
    }>;
  };
  PurchaseOrderNumber?: string;
}

export interface AmazonOrderItem {
  ASIN?: string;
  OrderItemId: string;
  SellerSKU?: string;
  Title?: string;
  QuantityOrdered: number;
  QuantityShipped?: number;
  ProductInfo?: {
    NumberOfItems?: number;
  };
  PointsGranted?: {
    PointsNumber?: number;
    PointsMonetaryValue?: AmazonMoney;
  };
  ItemPrice?: AmazonMoney;
  ShippingPrice?: AmazonMoney;
  ItemTax?: AmazonMoney;
  ShippingTax?: AmazonMoney;
  ShippingDiscount?: AmazonMoney;
  ShippingDiscountTax?: AmazonMoney;
  PromotionDiscount?: AmazonMoney;
  PromotionDiscountTax?: AmazonMoney;
  PromotionIds?: string[];
  CODFee?: AmazonMoney;
  CODFeeDiscount?: AmazonMoney;
  IsGift?: boolean;
  ConditionNote?: string;
  ConditionId?: string;
  ConditionSubtypeId?: string;
  ScheduledDeliveryStartDate?: string;
  ScheduledDeliveryEndDate?: string;
  PriceDesignation?: string;
  TaxCollection?: {
    Model?: string;
    ResponsibleParty?: string;
  };
  SerialNumberRequired?: boolean;
  IsTransparency?: boolean;
  IossNumber?: string;
  StoreChainStoreId?: string;
  DeemedResellerCategory?: string;
  BuyerInfo?: {
    BuyerEmail?: string;
    BuyerName?: string;
    BuyerCounty?: string;
  };
}

export interface AmazonOrdersResponse {
  payload?: {
    Orders?: AmazonOrder[];
    NextToken?: string;
  };
  errors?: Array<{
    code: string;
    message: string;
    details?: string;
  }>;
}

export interface FetchAmazonOrdersRequest {
  marketplaceIds?: string[];
  createdAfter?: string;
  createdBefore?: string;
  sku?: string; // 특정 SKU 필터
  year?: number; // 특정 연도 필터
  month?: number; // 특정 월 필터 (1-12)
  saveToDatabase?: boolean; // Supabase에 저장할지 여부
}

export interface FetchAmazonOrdersResponse {
  success: boolean;
  data: AmazonOrdersResponse;
  ordersCount: number;
  timestamp: string;
  error?: string;
}



