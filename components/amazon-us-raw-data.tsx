'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, ChevronLeft, ChevronRight, Columns, CheckSquare, Square } from 'lucide-react';

interface RawDataRow {
  id: string;
  sku: string;
  year: number;
  month: number;
  exchange_rate?: number;
  fba_inventory?: number;
  inbound_working?: number;
  inbound_shipped?: number;
  inbound_receiving?: number;
  reserved_orders?: number;
  reserved_fc_transfer?: number;
  reserved_fc_processing?: number;
  fba_fee?: number;
  referral_fee?: number;
  transportation_mode?: string;
  transportation_fee?: number;
  tariff_rate?: number;
  tariff_per_unit?: number;
  margin?: number;
  total_order_quantity?: number;
  gross_sales?: number;
  refunds?: number;
  total_fba_fee?: number;
  total_referral_fee?: number;
  researching_total?: number;
  researching_short_term?: number;
  researching_mid_term?: number;
  researching_long_term?: number;
  unfulfillable_total?: number;
  unfulfillable_customer_damaged?: number;
  unfulfillable_warehouse_damaged?: number;
  unfulfillable_distributor_damaged?: number;
  unfulfillable_carrier_damaged?: number;
  unfulfillable_defective?: number;
  unfulfillable_expired?: number;
  created_at?: string;
  updated_at?: string;
  sku_master?: {
    sku: string;
    product_name?: string;
    brand_name?: string;
    internal_code?: string;
    product_master?: {
      product_name?: string;
      brand_name?: string;
      company_name?: string;
    };
  };
}

interface ColumnOption {
  key: string;
  label: string;
  visible: boolean;
}

export function AmazonUSRawData() {
  const [data, setData] = useState<RawDataRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchType, setSearchType] = useState<'sku' | 'brand' | 'product_name'>('sku');
  const [searchValue, setSearchValue] = useState('');
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  // 모든 가능한 컬럼 목록
  const allColumns: ColumnOption[] = [
    { key: 'sku', label: 'SKU', visible: true },
    { key: 'year', label: '연도', visible: true },
    { key: 'month', label: '월', visible: true },
    { key: 'product_name', label: '제품명', visible: true },
    { key: 'brand_name', label: '브랜드명', visible: true },
    { key: 'company_name', label: '회사명', visible: false },
    { key: 'gross_sales', label: '총 매출', visible: true },
    { key: 'refunds', label: '환불', visible: true },
    { key: 'total_order_quantity', label: '주문 수량', visible: true },
    { key: 'fba_inventory', label: 'FBA 재고', visible: true },
    { key: 'fba_fee', label: 'FBA 수수료 (개당)', visible: false },
    { key: 'referral_fee', label: '추천 수수료 (개당)', visible: false },
    { key: 'total_fba_fee', label: '총 FBA 수수료', visible: false },
    { key: 'total_referral_fee', label: '총 추천 수수료', visible: false },
    { key: 'transportation_fee', label: '운송비', visible: false },
    { key: 'tariff_per_unit', label: '개당 관세', visible: false },
    { key: 'margin', label: '마진', visible: true },
    { key: 'exchange_rate', label: '환율', visible: false },
    { key: 'inbound_working', label: 'Inbound Working', visible: false },
    { key: 'inbound_shipped', label: 'Inbound Shipped', visible: false },
    { key: 'inbound_receiving', label: 'Inbound Receiving', visible: false },
    { key: 'reserved_orders', label: '예약 주문', visible: false },
    { key: 'reserved_fc_transfer', label: 'Reserved FC Transfer', visible: false },
    { key: 'reserved_fc_processing', label: 'Reserved FC Processing', visible: false },
    { key: 'researching_total', label: '조사 중 총 재고', visible: false },
    { key: 'researching_short_term', label: '조사 중 (단기)', visible: false },
    { key: 'researching_mid_term', label: '조사 중 (중기)', visible: false },
    { key: 'researching_long_term', label: '조사 중 (장기)', visible: false },
    { key: 'unfulfillable_total', label: '판매 불가 총 재고', visible: false },
    { key: 'unfulfillable_customer_damaged', label: '판매 불가 (고객 손상)', visible: false },
    { key: 'unfulfillable_warehouse_damaged', label: '판매 불가 (창고 손상)', visible: false },
    { key: 'unfulfillable_distributor_damaged', label: '판매 불가 (유통업체 손상)', visible: false },
    { key: 'unfulfillable_carrier_damaged', label: '판매 불가 (운송업체 손상)', visible: false },
    { key: 'unfulfillable_defective', label: '판매 불가 (불량)', visible: false },
    { key: 'unfulfillable_expired', label: '판매 불가 (유통기한 만료)', visible: false },
    { key: 'transportation_mode', label: '운송 모드', visible: false },
    { key: 'tariff_rate', label: '관세율', visible: false },
    { key: 'created_at', label: '생성일', visible: false },
    { key: 'updated_at', label: '수정일', visible: false },
  ];

  const [columns, setColumns] = useState<ColumnOption[]>(allColumns);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
      });

      if (searchValue) {
        params.append('searchType', searchType);
        params.append('searchValue', searchValue);
      }

      const response = await fetch(`/api/amazon-us-raw-data?${params.toString()}`);
      const result = await response.json();

      if (response.ok) {
        setData(result.data || []);
        setTotalPages(result.pagination.totalPages);
        setTotal(result.pagination.total);
      } else {
        console.error('Error fetching data:', result.error);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, searchType, searchValue]);

  const handleSearch = () => {
    setPage(1);
    fetchData();
  };

  const formatValue = (value: any, key: string): string => {
    if (value === null || value === undefined) return '-';
    
    if (key.includes('_fee') || key === 'gross_sales' || key === 'refunds' || key === 'margin' || key === 'transportation_fee' || key === 'tariff_per_unit') {
      return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (key === 'exchange_rate' || key === 'tariff_rate') {
      return Number(value).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    }
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return String(value);
  };

  const getDisplayValue = (row: RawDataRow, key: string): any => {
    if (key === 'product_name') {
      return row.sku_master?.product_name || row.sku_master?.product_master?.product_name || '-';
    }
    if (key === 'brand_name') {
      return row.sku_master?.brand_name || row.sku_master?.product_master?.brand_name || '-';
    }
    if (key === 'company_name') {
      return row.sku_master?.product_master?.company_name || '-';
    }
    return row[key as keyof RawDataRow];
  };

  const visibleColumns = columns.filter((col) => col.visible);

  const toggleColumn = (key: string) => {
    setColumns((prev) =>
      prev.map((col) => (col.key === key ? { ...col, visible: !col.visible } : col))
    );
  };

  return (
    <Card className="border border-purple-500/30 bg-black/40 backdrop-blur-xl shadow-lg shadow-cyan-500/10">
      <CardHeader className="border-b border-purple-500/20 bg-slate-800">
        <CardTitle className="flex items-center justify-between text-lg font-semibold text-gray-200">
          <span>RAW Data</span>
          <button
            onClick={() => setShowColumnSelector(!showColumnSelector)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-black/60 hover:bg-purple-500/20 border border-purple-500/30 rounded-md text-gray-200 transition-colors"
          >
            <Columns className="w-4 h-4" />
            열 선택
          </button>
        </CardTitle>
      </CardHeader>
        <CardContent className="p-4">
          {/* 검색 필터 */}
          <div className="mb-4 p-4 border-b border-purple-500/20 space-y-3">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-xs text-gray-300 mb-1">검색 타입</label>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as 'sku' | 'brand' | 'product_name')}
                  className="w-full px-3 py-2 bg-black/40 border border-purple-500/30 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-gray-200 placeholder-gray-500 backdrop-blur-sm"
                >
                  <option value="sku">SKU</option>
                  <option value="brand">브랜드명</option>
                  <option value="product_name">제품명</option>
                </select>
              </div>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="검색어를 입력하세요..."
                  className="w-full pl-10 pr-4 py-2 bg-black/40 border border-purple-500/30 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-gray-200 placeholder-gray-500 backdrop-blur-sm"
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-md hover:opacity-90 flex items-center gap-2 transition-colors"
              >
                <Search className="w-4 h-4" />
                검색
              </button>
              {searchValue && (
                <button
                  onClick={() => {
                    setSearchValue('');
                    setPage(1);
                    fetchData();
                  }}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20 hover:bg-gray-500/20 transition-colors"
                >
                  초기화
                </button>
              )}
            </div>
          </div>

          {/* 열 선택 모달 */}
          {showColumnSelector && (
            <div className="mb-4 p-4 bg-black/40 backdrop-blur-sm rounded-md border border-purple-500/30">
              <h3 className="text-sm font-semibold mb-2 text-gray-200">표시할 열 선택</h3>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                {columns.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 cursor-pointer text-sm hover:bg-white/10 p-1 rounded"
                  >
                    {col.visible ? (
                      <CheckSquare className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                    <input
                      type="checkbox"
                      checked={col.visible}
                      onChange={() => toggleColumn(col.key)}
                      className="hidden"
                    />
                    <span className="text-gray-300">{col.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 데이터 테이블 */}
          {loading ? (
            <div className="text-center py-8">로딩 중...</div>
          ) : (
            <>
              <div className="overflow-x-auto max-h-[calc(100vh-300px)]">
                <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                  <thead className="bg-slate-800 sticky top-0 z-10">
                    <tr className="border-b border-purple-500/20">
                      {visibleColumns.map((col) => (
                        <th
                          key={col.key}
                          className="text-left p-2 font-medium text-gray-200 select-none whitespace-nowrap"
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.length === 0 ? (
                      <tr>
                        <td
                          colSpan={visibleColumns.length}
                          className="p-8 text-center text-gray-400"
                        >
                          데이터가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      data.map((row) => (
                        <tr key={row.id} className="border-b border-purple-500/10 hover:bg-white/5">
                          {visibleColumns.map((col) => {
                            const value = getDisplayValue(row, col.key);
                            const formattedValue = formatValue(value, col.key);
                            return (
                              <td
                                key={col.key}
                                className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300"
                                title={String(formattedValue)}
                              >
                                {formattedValue}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* 페이지네이션 */}
              <div className="mt-4 flex items-center justify-between px-4 py-4 border-t border-purple-500/20">
                <div className="text-sm text-gray-300">
                  전체 <span className="font-medium text-cyan-300">{total.toLocaleString()}</span>개 중{' '}
                  <span className="font-medium text-cyan-300">{(page - 1) * 100 + 1}</span>-
                  <span className="font-medium text-cyan-300">{Math.min(page * 100, total)}</span>개 표시
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-200 bg-black/60 border border-purple-500/30 rounded-md hover:bg-purple-500/20 hover:border-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    이전
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-300">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-200 bg-black/60 border border-purple-500/30 rounded-md hover:bg-purple-500/20 hover:border-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                  >
                    다음
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
      </CardContent>
    </Card>
  );
}

