'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MonthlySKUSummary {
  year: number;
  month: number;
  sku: string;
  product_name: string;
  brand_name: string;
  sales_price: number;
  supply_price_usd: number;
  fba_fee_per_unit: number;
  referral_fee_per_unit: number;
  transportation_fee_per_unit: number;
  tariff_per_unit: number;
  gross_sales: number;
  refunds: number;
  total_fba_fee: number;
  total_referral_fee: number;
  transportation_fee: number;
  allocated_account_cost: number;
  total_cost: number; // refunds + total_supply_cost + total_fba_fee + total_referral_fee + transportation_fee + allocated_account_cost
  margin: number; // gross_sales - total_cost
  total_order_quantity: number;
}

type SortColumn = 'sku' | 'product_name' | 'brand_name' | 'sales_price' | 'supply_price_usd' | 'fba_fee_per_unit' | 'referral_fee_per_unit' | 'transportation_fee_per_unit' | 'tariff_per_unit' | 'product_margin' | 'gross_sales' | 'refunds' | 'total_fba_fee' | 'total_referral_fee' | 'transportation_fee' | 'allocated_account_cost' | 'total_cost' | 'margin' | 'total_order_quantity';
type SortDirection = 'asc' | 'desc' | null;

const ITEMS_PER_PAGE = 100;

export function MonthlyBrandSummaryTable() {
  const [data, setData] = useState<MonthlySKUSummary[]>([]);
  const [filteredData, setFilteredData] = useState<MonthlySKUSummary[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [skuFilter, setSkuFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [showLowSales, setShowLowSales] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | ''>('');
  const [selectedMonth, setSelectedMonth] = useState<number | ''>('');
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [showMarginSection, setShowMarginSection] = useState(true);
  const [showMarginPercent, setShowMarginPercent] = useState(false);
  const [showProfitPercent, setShowProfitPercent] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    brand_name: 120,
    product_name: 152,
    sku: 120,
    sales_price: 65,
    supply_price_usd: 65,
    fba_fee_per_unit: 65,
    referral_fee_per_unit: 65,
    transportation_fee_per_unit: 65,
    tariff_per_unit: 65,
    product_margin: 65,
    gross_sales: 120,
    refunds: 120,
    total_fba_fee: 120,
    total_referral_fee: 140,
    transportation_fee: 120,
    allocated_account_cost: 120,
    total_cost: 120,
    margin: 120,
    total_order_quantity: 120,
  });
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  // 데이터 로드 후 기본 연도/월 설정
  useEffect(() => {
    if (data.length > 0 && !selectedYear && !selectedMonth) {
      // 가장 최근 연도/월로 설정
      const sorted = [...data].sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
      if (sorted.length > 0) {
        setSelectedYear(sorted[0].year);
        setSelectedMonth(sorted[0].month);
      }
    }
  }, [data, selectedYear, selectedMonth]);

  useEffect(() => {
    // 연도/월, SKU 및 브랜드 필터 적용
    let filtered = data;
    
    // 연도 필터
    if (selectedYear) {
      filtered = filtered.filter((item) => item.year === selectedYear);
    }
    
    // 월 필터
    if (selectedMonth) {
      filtered = filtered.filter((item) => item.month === selectedMonth);
    }
    
    if (skuFilter.trim()) {
      filtered = filtered.filter((item) =>
        item.sku.toLowerCase().includes(skuFilter.toLowerCase()) ||
        item.product_name.toLowerCase().includes(skuFilter.toLowerCase())
      );
    }
    
    if (brandFilter.trim()) {
      filtered = filtered.filter((item) =>
        item.brand_name.toLowerCase().includes(brandFilter.toLowerCase())
      );
    }
    
    // 총 매출 $10 이하 항목 필터링 (기본적으로 숨김)
    if (!showLowSales) {
      filtered = filtered.filter((item) => item.gross_sales > 10);
    }
    
    // 정렬 적용
    if (sortColumn && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        let aVal: any;
        let bVal: any;
        
        // 상품 마진은 계산된 값
        if (sortColumn === 'product_margin') {
          aVal = a.sales_price - a.supply_price_usd - a.fba_fee_per_unit - a.referral_fee_per_unit - a.transportation_fee_per_unit - a.tariff_per_unit;
          bVal = b.sales_price - b.supply_price_usd - b.fba_fee_per_unit - b.referral_fee_per_unit - b.transportation_fee_per_unit - b.tariff_per_unit;
        } else {
          aVal = a[sortColumn];
          bVal = b[sortColumn];
        }
        
        // 문자열 비교
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          const comparison = aVal.localeCompare(bVal);
          return sortDirection === 'asc' ? comparison : -comparison;
        }
        
        // 숫자 비교
        const comparison = (aVal || 0) - (bVal || 0);
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }
    
      setFilteredData(filtered);
    // 필터 변경 시 첫 페이지로 리셋
    setCurrentPage(1);
  }, [selectedYear, selectedMonth, skuFilter, brandFilter, showLowSales, sortColumn, sortDirection, data]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // 같은 컬럼 클릭 시: asc -> desc -> null 순환
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      // 다른 컬럼 클릭 시: asc로 시작
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleResizeStart = (e: React.MouseEvent, column: string) => {
    e.preventDefault();
    setResizingColumn(column);
    const startX = e.clientX;
    const startWidth = columnWidths[column];

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX;
      // 상품마진 Section 컬럼들은 더 큰 최소 너비 필요
      const minWidth = ['sales_price', 'supply_price_usd', 'fba_fee_per_unit', 'referral_fee_per_unit', 'transportation_fee_per_unit', 'tariff_per_unit', 'product_margin'].includes(column) ? 60 : 20;
      const newWidth = Math.max(minWidth, startWidth + diff);
      setColumnWidths((prev) => ({
        ...prev,
        [column]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (brandFilter) params.append('brand', brandFilter);
      if (skuFilter) params.append('sku', skuFilter);
      
      const response = await fetch(`/api/amazon-us-monthly-sku-summary?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setData(result.data || []);
    } catch (error: any) {
      console.error('Error fetching monthly SKU summary:', error);
      // 에러 상태를 표시하기 위해 빈 배열로 설정
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      currencyDisplay: 'symbol',
    }).format(value).replace('US$', '$');
  };

  const formatCurrencyTwoDecimals = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      currencyDisplay: 'symbol',
    }).format(value).replace('US$', '$');
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('ko-KR').format(value);
  };

  // 브랜드별 색상 매핑 함수
  const getBrandBadgeStyle = (brandName: string) => {
    if (!brandName) return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    
    // 브랜드명을 해시하여 일관된 색상 생성
    let hash = 0;
    for (let i = 0; i < brandName.length; i++) {
      hash = brandName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // 색상 팔레트 (다양한 색상 조합)
    const colorPalettes = [
      { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/30' },
      { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30' },
      { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/30' },
      { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30' },
      { bg: 'bg-teal-500/20', text: 'text-teal-300', border: 'border-teal-500/30' },
      { bg: 'bg-indigo-500/20', text: 'text-indigo-300', border: 'border-indigo-500/30' },
      { bg: 'bg-pink-500/20', text: 'text-pink-300', border: 'border-pink-500/30' },
      { bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-500/30' },
      { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/30' },
      { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30' },
      { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500/30' },
      { bg: 'bg-lime-500/20', text: 'text-lime-300', border: 'border-lime-500/30' },
    ];
    
    const index = Math.abs(hash) % colorPalettes.length;
    const palette = colorPalettes[index];
    
    return `${palette.bg} ${palette.text} ${palette.border}`;
  };

  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

  // 테이블 전체 너비 계산
  const totalTableWidth = useMemo(() => {
    const getWidth = (key: string) => columnWidths[key] || 0;
    let total = getWidth('brand_name') + getWidth('product_name') + getWidth('sku');
    if (showMarginSection) {
      total += getWidth('sales_price') + getWidth('supply_price_usd') + getWidth('fba_fee_per_unit') + 
               getWidth('referral_fee_per_unit') + getWidth('transportation_fee_per_unit') + 
               getWidth('tariff_per_unit') + getWidth('product_margin');
    }
    total += getWidth('gross_sales') + getWidth('refunds') + getWidth('total_supply_cost') + 
             getWidth('total_fba_fee') + getWidth('total_referral_fee') + 
             getWidth('transportation_fee') + getWidth('allocated_account_cost') + getWidth('total_cost') + 
             getWidth('margin') + getWidth('total_order_quantity');
    return total;
  }, [columnWidths, showMarginSection]);

  // 사용 가능한 연도 목록 추출
  const availableYears = Array.from(new Set(data.map((item) => item.year))).sort((a, b) => b - a);
  
  // 선택한 연도의 사용 가능한 월 목록 추출
  const availableMonths = selectedYear
    ? Array.from(
        new Set(
          data
            .filter((item) => item.year === selectedYear)
            .map((item) => item.month)
        )
      ).sort((a, b) => b - a)
    : [];

  // 총 매출 $10 이하인 항목 개수 계산 (선택한 연도/월 기준)
  const lowSalesCount = filteredData.filter((item) => item.gross_sales <= 10).length;

  // 선택한 연도/월의 SKU별 매출 비중 계산 (Top 20)
  const skuSalesData = useMemo(() => {
    if (!selectedYear || !selectedMonth) return [];
    
    const monthData = filteredData.filter((item) => 
      item.year === selectedYear && item.month === selectedMonth
    );
    
    if (monthData.length === 0) return [];
    
    const totalSales = monthData.reduce((sum, item) => sum + (item.gross_sales || 0), 0);
    if (totalSales === 0) return [];
    
    // 제품명 간소화 함수
    const simplifyProductName = (name: string, maxLength: number = 30): string => {
      if (!name) return '-';
      if (name.length <= maxLength) return name;
      // 공백이나 특수문자로 나누어서 앞부분만 표시
      const parts = name.split(/[\s\-_]/);
      let result = '';
      for (const part of parts) {
        if ((result + part).length <= maxLength - 3) {
          result += (result ? ' ' : '') + part;
        } else {
          break;
        }
      }
      return result ? `${result}...` : name.substring(0, maxLength - 3) + '...';
    };
    
    const skuSales = monthData
      .map((item) => ({
        sku: item.sku,
        product_name: item.product_name || '-',
        simplified_product_name: simplifyProductName(item.product_name || '-', 30),
        brand_name: item.brand_name,
        gross_sales: item.gross_sales || 0,
        percentage: ((item.gross_sales || 0) / totalSales) * 100,
      }))
      .sort((a, b) => b.gross_sales - a.gross_sales)
      .slice(0, 20);
    
    return skuSales;
  }, [filteredData, selectedYear, selectedMonth]);

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // 선택한 연도/월의 합계 계산 (필터링된 데이터 기준)
  const total = filteredData.reduce((acc, item) => {
    acc.gross_sales += item.gross_sales || 0;
    acc.refunds += item.refunds || 0;
    acc.total_fba_fee += item.total_fba_fee || 0;
    acc.total_referral_fee += item.total_referral_fee || 0;
    acc.transportation_fee += item.transportation_fee || 0;
    acc.allocated_account_cost += item.allocated_account_cost || 0;
    acc.total_cost += item.total_cost || 0;
    acc.margin += item.margin || 0;
    acc.total_order_quantity += item.total_order_quantity || 0;
    return acc;
  }, {
    gross_sales: 0,
    refunds: 0,
    total_fba_fee: 0,
    total_referral_fee: 0,
    transportation_fee: 0,
    allocated_account_cost: 0,
    total_cost: 0,
    margin: 0,
    total_order_quantity: 0,
  });

  if (loading) {
    return (
      <Card className="border-border/10 bg-black/40 backdrop-blur-sm shadow-lg shadow-cyan-500/10">
        <CardContent className="p-6">
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-border/10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-semibold bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">SKU별 현황</h1>
          <div className="flex items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value ? Number(e.target.value) : '');
              setSelectedMonth(''); // 연도 변경 시 월 초기화
            }}
            className="px-3 py-2 text-sm bg-black/40 border border-purple-500/30 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-gray-200 placeholder-gray-500 backdrop-blur-sm"
          >
            <option value="">연도 선택</option>
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}년
              </option>
            ))}
          </select>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value ? Number(e.target.value) : '')}
            disabled={!selectedYear}
            className="px-3 py-2 text-sm border border-gray-600 rounded-md shadow-sm bg-gray-800 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            <option value="">월 선택</option>
            {availableMonths.map((month) => (
              <option key={month} value={month}>
                {monthNames[month - 1]}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="SKU/제품명으로 검색..."
            value={skuFilter}
            onChange={(e) => setSkuFilter(e.target.value)}
            className="w-64 px-3 py-2 text-sm border border-border/20 rounded-md shadow-sm bg-black/40 backdrop-blur-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
          />
            <input
              type="text"
              placeholder="브랜드명으로 검색..."
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
            className="w-64 px-3 py-2 text-sm border border-border/20 rounded-md shadow-sm bg-black/40 backdrop-blur-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
          />
          <button
            onClick={() => setShowLowSales(!showLowSales)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              showLowSales
                ? 'bg-black/60 text-gray-300 hover:bg-black/80 border border-border/20'
                : 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:shadow-lg hover:shadow-cyan-500/50'
            }`}
          >
            {showLowSales ? '$10 이하 숨기기' : `$10 이하 표시${lowSalesCount > 0 ? ` (${lowSalesCount}개)` : ''}`}
          </button>
          </div>
        </div>
        {/* 상품 기본 마진 SECTION 컨트롤 */}
        <div className="flex items-center gap-2">
          {showMarginSection ? (
            <button
              onClick={() => setShowMarginSection(false)}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20"
            >
              상품 기본 마진 SECTION 숨기기
            </button>
          ) : (
            <button
              onClick={() => setShowMarginSection(true)}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30"
            >
              상품 기본 마진 SECTION 보이기
            </button>
          )}
        </div>
      </div>
      {/* SKU별 매출 비중 막대그래프 */}
      {selectedYear && selectedMonth && skuSalesData.length > 0 && (
        <Card className="border border-purple-500/30 bg-black/40 backdrop-blur-xl shadow-lg shadow-cyan-500/10">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-200 mb-4">
              {selectedYear}년 {monthNames[selectedMonth - 1]} SKU별 매출 비중 (Top 20)
            </h3>
            <div className="space-y-2">
              {skuSalesData.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-40 text-xs text-gray-300 truncate" title={`${item.product_name} (${item.sku})`}>
                    {item.simplified_product_name || item.product_name}
                  </div>
                  <div className="flex-1 relative">
                    <div className="h-6 bg-gray-700 rounded overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-end pr-2"
                        style={{ width: `${item.percentage}%` }}
                      >
                        {item.percentage > 3 && (
                          <span className="text-xs font-medium text-white">
                            {item.percentage.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="w-24 text-xs text-gray-300 text-right">
                    {formatCurrency(item.gross_sales)}
                  </div>
                  <div className="w-16 text-xs text-gray-400 text-right">
                    {item.percentage.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      <Card className="border border-purple-500/30 bg-black/40 backdrop-blur-xl shadow-lg shadow-cyan-500/10">
        <CardContent className="p-0">
        <div className="overflow-x-auto">
          {!selectedYear || !selectedMonth ? (
            <div className="text-center py-8 text-gray-500">연도와 월을 선택해주세요.</div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">데이터가 없습니다.</div>
          ) : (
            <>
                    <div className="overflow-x-auto">
              <table className="divide-y divide-border/10" style={{ tableLayout: 'fixed', width: `${totalTableWidth}px`, minWidth: `${totalTableWidth}px` }}>
                <thead className="bg-black/60 backdrop-blur-sm">
                  {/* 그룹 헤더 행 */}
                  <tr className="border-b border-purple-500/20">
                    <th 
                      colSpan={3} 
                      style={{ 
                        width: (columnWidths.brand_name || 0) + (columnWidths.product_name || 0) + (columnWidths.sku || 0),
                        minWidth: (columnWidths.brand_name || 0) + (columnWidths.product_name || 0) + (columnWidths.sku || 0)
                      }}
                      className="px-2 py-3 text-center text-sm font-semibold text-blue-300 uppercase tracking-wider bg-blue-900/30 overflow-hidden"
                    >
                      <div className="whitespace-nowrap overflow-hidden text-ellipsis">제품 기본정보 SECTION</div>
                    </th>
                    {showMarginSection && (
                      <th 
                        colSpan={7} 
                        style={{ 
                          width: (columnWidths.sales_price || 0) + (columnWidths.supply_price_usd || 0) + (columnWidths.fba_fee_per_unit || 0) + (columnWidths.referral_fee_per_unit || 0) + (columnWidths.transportation_fee_per_unit || 0) + (columnWidths.tariff_per_unit || 0) + (columnWidths.product_margin || 0),
                          minWidth: (columnWidths.sales_price || 0) + (columnWidths.supply_price_usd || 0) + (columnWidths.fba_fee_per_unit || 0) + (columnWidths.referral_fee_per_unit || 0) + (columnWidths.transportation_fee_per_unit || 0) + (columnWidths.tariff_per_unit || 0) + (columnWidths.product_margin || 0)
                        }}
                        className="px-2 py-3 text-center text-sm font-semibold text-cyan-300 uppercase tracking-wider bg-purple-900/30 overflow-hidden"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <span className="whitespace-nowrap overflow-hidden text-ellipsis">상품 기본 마진 SECTION</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMarginPercent(!showMarginPercent);
                            }}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                              showMarginPercent
                                ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                                : 'bg-gray-500/10 text-gray-400 border border-gray-500/20 hover:bg-gray-500/20'
                            }`}
                          >
                            비율(%)
                          </button>
                        </div>
                      </th>
                    )}
                    <th 
                      colSpan={10} 
                      style={{ 
                        width: (columnWidths.gross_sales || 0) + (columnWidths.refunds || 0) + (columnWidths.total_supply_cost || 0) + (columnWidths.total_fba_fee || 0) + (columnWidths.total_referral_fee || 0) + (columnWidths.transportation_fee || 0) + (columnWidths.allocated_account_cost || 0) + (columnWidths.total_cost || 0) + (columnWidths.margin || 0) + (columnWidths.total_order_quantity || 0),
                        minWidth: (columnWidths.gross_sales || 0) + (columnWidths.refunds || 0) + (columnWidths.total_supply_cost || 0) + (columnWidths.total_fba_fee || 0) + (columnWidths.total_referral_fee || 0) + (columnWidths.transportation_fee || 0) + (columnWidths.allocated_account_cost || 0) + (columnWidths.total_cost || 0) + (columnWidths.margin || 0) + (columnWidths.total_order_quantity || 0)
                      }}
                      className="px-2 py-3 text-center text-sm font-semibold text-emerald-300 uppercase tracking-wider bg-emerald-900/30 overflow-hidden"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="whitespace-nowrap overflow-hidden text-ellipsis">매출 이익 SECTION</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowProfitPercent(!showProfitPercent);
                          }}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                            showProfitPercent
                              ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                              : 'bg-gray-500/10 text-gray-400 border border-gray-500/20 hover:bg-gray-500/20'
                          }`}
                        >
                          비율(%)
                        </button>
                      </div>
                    </th>
                  </tr>
                  {/* 실제 컬럼 헤더 행 */}
                  <tr className="border-b border-purple-500/20">
                    <th style={{ width: columnWidths.brand_name, minWidth: columnWidths.brand_name }} className="text-left p-2 text-xs font-medium text-blue-200 cursor-pointer hover:bg-white/10 select-none whitespace-nowrap relative bg-blue-900/20" onClick={() => handleSort('brand_name')}>
                      <div className="flex items-center">
                        <span>브랜드</span>
                        {sortColumn === 'brand_name' && (
                          <span className="ml-1 text-cyan-300">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                      <div
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent z-20"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleResizeStart(e, 'brand_name');
                        }}
                      />
                    </th>
                    <th style={{ width: columnWidths.product_name, minWidth: columnWidths.product_name }} className="text-left p-2 text-xs font-medium text-blue-200 cursor-pointer hover:bg-white/10 select-none whitespace-nowrap relative bg-blue-900/20" onClick={() => handleSort('product_name')}>
                      <div className="flex items-center">
                        <span>제품명</span>
                        {sortColumn === 'product_name' && (
                          <span className="ml-1 text-cyan-300">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                      <div
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent z-20"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleResizeStart(e, 'product_name');
                        }}
                      />
                    </th>
                    <th style={{ width: columnWidths.sku, minWidth: columnWidths.sku }} className="text-left p-2 text-xs font-medium text-blue-200 cursor-pointer hover:bg-white/10 select-none whitespace-nowrap relative bg-blue-900/20" onClick={() => handleSort('sku')}>
                      <div className="flex items-center">
                        <span>SKU</span>
                        {sortColumn === 'sku' && (
                          <span className="ml-1 text-cyan-300">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                      <div
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent z-20"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleResizeStart(e, 'sku');
                        }}
                      />
                    </th>
                    {showMarginSection && (
                      <>
                        <th
                          style={{ width: columnWidths.sales_price, minWidth: columnWidths.sales_price }}
                          className="text-right p-2 text-xs font-medium text-gray-300 cursor-pointer hover:bg-white/10 select-none whitespace-nowrap relative bg-purple-900/20"
                          onClick={() => handleSort('sales_price')}
                        >
                      <div className="flex items-center justify-end">
                        <span>판가</span>
                        {sortColumn === 'sales_price' && (
                          <span className="ml-1 text-cyan-300">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                      <div
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent z-10"
                        onMouseDown={(e) => handleResizeStart(e, 'sales_price')}
                      />
                    </th>
                    <th
                      style={{ width: columnWidths.supply_price_usd, minWidth: columnWidths.supply_price_usd }}
                      className="text-right p-2 text-xs font-medium text-gray-300 cursor-pointer hover:bg-white/10 select-none whitespace-nowrap relative bg-purple-900/20"
                      onClick={() => handleSort('supply_price_usd')}
                    >
                      <div className="flex items-center justify-end">
                        <span>공급가</span>
                        {sortColumn === 'supply_price_usd' && (
                          <span className="ml-1 text-cyan-300">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                      <div
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent z-10"
                        onMouseDown={(e) => handleResizeStart(e, 'supply_price_usd')}
                      />
                    </th>
                    <th
                      style={{ width: columnWidths.fba_fee_per_unit, minWidth: columnWidths.fba_fee_per_unit }}
                      className="text-right p-2 text-xs font-medium text-gray-300 cursor-pointer hover:bg-white/10 select-none whitespace-nowrap relative bg-purple-900/20"
                      onClick={() => handleSort('fba_fee_per_unit')}
                    >
                      <div className="flex items-center justify-end">
                        <span>FBA fee</span>
                        {sortColumn === 'fba_fee_per_unit' && (
                          <span className="ml-1 text-cyan-300">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                      <div
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent z-10"
                        onMouseDown={(e) => handleResizeStart(e, 'fba_fee_per_unit')}
                      />
                    </th>
                    <th
                      style={{ width: columnWidths.referral_fee_per_unit, minWidth: columnWidths.referral_fee_per_unit }}
                      className="text-right p-2 text-xs font-medium text-gray-300 cursor-pointer hover:bg-white/10 select-none whitespace-nowrap relative bg-purple-900/20"
                      onClick={() => handleSort('referral_fee_per_unit')}
                    >
                      <div className="flex items-center justify-end">
                        <span>아마존 Fee</span>
                        {sortColumn === 'referral_fee_per_unit' && (
                          <span className="ml-1 text-cyan-300">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                      <div
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent z-10"
                        onMouseDown={(e) => handleResizeStart(e, 'referral_fee_per_unit')}
                      />
                    </th>
                    <th
                      style={{ width: columnWidths.transportation_fee_per_unit, minWidth: columnWidths.transportation_fee_per_unit }}
                      className="text-right p-2 text-xs font-medium text-gray-300 cursor-pointer hover:bg-white/10 select-none whitespace-nowrap relative bg-purple-900/20"
                      onClick={() => handleSort('transportation_fee_per_unit')}
                    >
                      <div className="flex items-center justify-end">
                        <span>물류비</span>
                        {sortColumn === 'transportation_fee_per_unit' && (
                          <span className="ml-1 text-cyan-300">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                      <div
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent z-10"
                        onMouseDown={(e) => handleResizeStart(e, 'transportation_fee_per_unit')}
                      />
                    </th>
                    <th
                      style={{ width: columnWidths.tariff_per_unit, minWidth: columnWidths.tariff_per_unit }}
                      className="text-right p-2 text-xs font-medium text-gray-300 cursor-pointer hover:bg-white/10 select-none whitespace-nowrap relative bg-purple-900/20"
                      onClick={() => handleSort('tariff_per_unit')}
                    >
                      <div className="flex items-center justify-end">
                        <span>관세</span>
                        {sortColumn === 'tariff_per_unit' && (
                          <span className="ml-1 text-cyan-300">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                      <div
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent z-10"
                        onMouseDown={(e) => handleResizeStart(e, 'tariff_per_unit')}
                      />
                    </th>
                    <th
                      style={{ width: columnWidths.product_margin, minWidth: columnWidths.product_margin }}
                      className="text-right p-2 text-xs font-medium text-gray-300 cursor-pointer hover:bg-white/10 select-none whitespace-nowrap relative bg-purple-900/20"
                      onClick={() => handleSort('product_margin')}
                    >
                      <div className="flex items-center justify-end">
                        <span>상품 마진</span>
                        {sortColumn === 'product_margin' && (
                          <span className="ml-1 text-cyan-300">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                      <div
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent z-10"
                        onMouseDown={(e) => handleResizeStart(e, 'product_margin')}
                      />
                    </th>
                      </>
                    )}
                    <th
                      style={{ width: columnWidths.gross_sales }}
                      className="text-right p-2 text-xs font-medium text-gray-300 cursor-pointer hover:bg-white/10 select-none whitespace-nowrap relative bg-emerald-900/20"
                      onClick={() => handleSort('gross_sales')}
                    >
                      <div className="flex items-center justify-end">
                        <span>총 매출</span>
                        {sortColumn === 'gross_sales' && (
                          <span className="ml-1 text-cyan-300">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                      <div
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent z-10"
                        onMouseDown={(e) => handleResizeStart(e, 'gross_sales')}
                      />
                            </th>
                    <th
                      style={{ width: columnWidths.refunds }}
                      className="text-right p-2 text-xs font-medium text-gray-300 cursor-pointer hover:bg-white/10 select-none whitespace-nowrap relative bg-emerald-900/20"
                      onClick={() => handleSort('refunds')}
                    >
                      <div className="flex items-center justify-end">
                        <span>환불</span>
                        {sortColumn === 'refunds' && (
                          <span className="ml-1 text-cyan-300">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                      <div
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent z-10"
                        onMouseDown={(e) => handleResizeStart(e, 'refunds')}
                      />
                            </th>
                    <th
                      style={{ width: columnWidths.total_supply_cost }}
                      className="text-right p-2 text-xs font-medium text-gray-300 select-none whitespace-nowrap relative bg-emerald-900/20"
                    >
                      <div className="flex items-center justify-end">
                        <span>Total 공급가</span>
                      </div>
                      <div
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent z-10"
                        onMouseDown={(e) => handleResizeStart(e, 'total_supply_cost')}
                      />
                            </th>
                    <th
                      style={{ width: columnWidths.total_fba_fee }}
                      className="text-right p-2 text-xs font-medium text-gray-300 cursor-pointer hover:bg-white/10 select-none whitespace-nowrap relative bg-emerald-900/20"
                      onClick={() => handleSort('total_fba_fee')}
                    >
                      <div className="flex items-center justify-end">
                        <span>Total FBA Fee</span>
                        {sortColumn === 'total_fba_fee' && (
                          <span className="ml-1 text-cyan-300">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                      <div
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent z-10"
                        onMouseDown={(e) => handleResizeStart(e, 'total_fba_fee')}
                      />
                            </th>
                    <th
                      style={{ width: columnWidths.total_referral_fee }}
                      className="text-right p-2 text-xs font-medium text-gray-300 cursor-pointer hover:bg-white/10 select-none whitespace-nowrap relative bg-emerald-900/20"
                      onClick={() => handleSort('total_referral_fee')}
                    >
                      <div className="flex items-center justify-end">
                        <span>Total 아마존 Fee</span>
                        {sortColumn === 'total_referral_fee' && (
                          <span className="ml-1 text-cyan-300">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                      <div
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent z-10"
                        onMouseDown={(e) => handleResizeStart(e, 'total_referral_fee')}
                      />
                            </th>
                    <th
                      style={{ width: columnWidths.transportation_fee }}
                      className="text-right p-2 text-xs font-medium text-gray-300 cursor-pointer hover:bg-white/10 select-none whitespace-nowrap relative bg-emerald-900/20"
                      onClick={() => handleSort('transportation_fee')}
                    >
                      <div className="flex items-center justify-end">
                        <span>Total 물류비</span>
                        {sortColumn === 'transportation_fee' && (
                          <span className="ml-1 text-cyan-300">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                      <div
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent z-10"
                        onMouseDown={(e) => handleResizeStart(e, 'transportation_fee')}
                      />
                            </th>
                    <th
                      style={{ width: columnWidths.allocated_account_cost }}
                      className="text-right p-2 text-xs font-medium text-gray-300 cursor-pointer hover:bg-white/10 select-none whitespace-nowrap relative bg-emerald-900/20"
                      onClick={() => handleSort('allocated_account_cost')}
                    >
                      <div className="flex items-center justify-end">
                        <span>계정 단위 비용</span>
                        {sortColumn === 'allocated_account_cost' && (
                          <span className="ml-1 text-cyan-300">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                      <div
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent z-10"
                        onMouseDown={(e) => handleResizeStart(e, 'allocated_account_cost')}
                      />
                            </th>
                    <th
                      style={{ width: columnWidths.total_cost }}
                      className="text-right p-2 text-xs font-medium text-gray-300 cursor-pointer hover:bg-white/10 select-none whitespace-nowrap relative bg-emerald-900/20"
                      onClick={() => handleSort('total_cost')}
                    >
                      <div className="flex items-center justify-end">
                        <span>총 비용</span>
                        {sortColumn === 'total_cost' && (
                          <span className="ml-1 text-cyan-300">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                      <div
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent z-10"
                        onMouseDown={(e) => handleResizeStart(e, 'total_cost')}
                      />
                            </th>
                    <th
                      style={{ width: columnWidths.margin }}
                      className="text-right p-2 text-xs font-medium text-gray-300 cursor-pointer hover:bg-white/10 select-none whitespace-nowrap relative bg-emerald-900/20"
                      onClick={() => handleSort('margin')}
                    >
                      <div className="flex items-center justify-end">
                        <span>마진</span>
                        {sortColumn === 'margin' && (
                          <span className="ml-1 text-cyan-300">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                      <div
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent z-10"
                        onMouseDown={(e) => handleResizeStart(e, 'margin')}
                      />
                            </th>
                    <th
                      style={{ width: columnWidths.total_order_quantity }}
                      className="text-right p-2 text-xs font-medium text-gray-300 cursor-pointer hover:bg-white/10 select-none whitespace-nowrap relative bg-emerald-900/20"
                      onClick={() => handleSort('total_order_quantity')}
                    >
                      <div className="flex items-center justify-end">
                        <span>판매 수량</span>
                        {sortColumn === 'total_order_quantity' && (
                          <span className="ml-1 text-cyan-300">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                      <div
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 bg-transparent z-10"
                        onMouseDown={(e) => handleResizeStart(e, 'total_order_quantity')}
                      />
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                  {filteredData.map((item, idx) => (
                      <tr key={`${item.sku}-${item.year}-${item.month}-${idx}`} className="border-b border-purple-500/10 hover:bg-white/5">
                        <td style={{ width: columnWidths.brand_name, minWidth: columnWidths.brand_name }} className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden" title={item.brand_name || 'Unknown'}>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getBrandBadgeStyle(item.brand_name || '')}`}>
                            {item.brand_name || 'Unknown'}
                          </span>
                        </td>
                        <td style={{ width: columnWidths.product_name, minWidth: columnWidths.product_name }} className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300" title={item.product_name || 'Unknown'}>
                          {item.product_name || 'Unknown'}
                        </td>
                        <td style={{ width: columnWidths.sku, minWidth: columnWidths.sku }} className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-200 font-medium" title={item.sku || 'Unknown'}>
                          {item.sku || 'Unknown'}
                        </td>
                        {showMarginSection && (
                          <>
                            <td style={{ width: columnWidths.sales_price, minWidth: columnWidths.sales_price }} className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300 text-right" title={showMarginPercent ? (item.sales_price > 0 ? '100.00%' : '-') : formatCurrencyTwoDecimals(item.sales_price)}>
                              {showMarginPercent ? (
                                item.sales_price > 0 ? '100.00%' : '-'
                              ) : (
                                formatCurrencyTwoDecimals(item.sales_price)
                              )}
                            </td>
                            <td style={{ width: columnWidths.supply_price_usd, minWidth: columnWidths.supply_price_usd }} className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300 text-right">
                              {item.supply_price_usd > 0 && item.sales_price > 0 ? (
                                showMarginPercent ? (
                                  `${((item.supply_price_usd / item.sales_price) * 100).toFixed(2)}%`
                                ) : (
                                  formatCurrencyTwoDecimals(item.supply_price_usd)
                                )
                              ) : '-'}
                            </td>
                            <td style={{ width: columnWidths.fba_fee_per_unit, minWidth: columnWidths.fba_fee_per_unit }} className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300 text-right">
                              {item.sales_price > 0 ? (
                                showMarginPercent ? (
                                  `${((item.fba_fee_per_unit / item.sales_price) * 100).toFixed(2)}%`
                                ) : (
                                  formatCurrencyTwoDecimals(item.fba_fee_per_unit)
                                )
                              ) : '-'}
                            </td>
                            <td style={{ width: columnWidths.referral_fee_per_unit, minWidth: columnWidths.referral_fee_per_unit }} className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300 text-right">
                              {item.sales_price > 0 ? (
                                showMarginPercent ? (
                                  `${((item.referral_fee_per_unit / item.sales_price) * 100).toFixed(2)}%`
                                ) : (
                                  formatCurrencyTwoDecimals(item.referral_fee_per_unit)
                                )
                              ) : '-'}
                            </td>
                            <td style={{ width: columnWidths.transportation_fee_per_unit, minWidth: columnWidths.transportation_fee_per_unit }} className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300 text-right">
                              {item.sales_price > 0 ? (
                                showMarginPercent ? (
                                  `${((item.transportation_fee_per_unit / item.sales_price) * 100).toFixed(2)}%`
                                ) : (
                                  formatCurrencyTwoDecimals(item.transportation_fee_per_unit)
                                )
                              ) : '-'}
                            </td>
                            <td style={{ width: columnWidths.tariff_per_unit, minWidth: columnWidths.tariff_per_unit }} className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300 text-right">
                              {item.sales_price > 0 ? (
                                showMarginPercent ? (
                                  `${((item.tariff_per_unit / item.sales_price) * 100).toFixed(2)}%`
                                ) : (
                                  formatCurrencyTwoDecimals(item.tariff_per_unit)
                                )
                              ) : '-'}
                            </td>
                            <td style={{ width: columnWidths.product_margin, minWidth: columnWidths.product_margin }} className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-emerald-400 font-medium text-right">
                              {(() => {
                                const productMargin = item.sales_price - item.supply_price_usd - item.fba_fee_per_unit - item.referral_fee_per_unit - item.transportation_fee_per_unit - item.tariff_per_unit;
                                return item.sales_price > 0 ? (
                                  showMarginPercent ? (
                                    `${((productMargin / item.sales_price) * 100).toFixed(2)}%`
                                  ) : (
                                    formatCurrencyTwoDecimals(productMargin)
                                  )
                                ) : '-';
                              })()}
                            </td>
                          </>
                        )}
                        <td style={{ width: columnWidths.gross_sales }} className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300 text-right bg-emerald-900/20" title={formatCurrency(item.gross_sales)}>
                                  {formatCurrency(item.gross_sales)}
                                </td>
                        <td style={{ width: columnWidths.refunds }} className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-red-400 text-right bg-emerald-900/20" title={showProfitPercent ? (item.gross_sales > 0 ? `${((item.refunds / item.gross_sales) * 100).toFixed(2)}%` : '-') : formatCurrency(item.refunds)}>
                                  {showProfitPercent ? (
                                    item.gross_sales > 0 ? `${((item.refunds / item.gross_sales) * 100).toFixed(2)}%` : '-'
                                  ) : (
                                    formatCurrency(item.refunds)
                                  )}
                                </td>
                        <td 
                          style={{ width: columnWidths.total_supply_cost }} 
                          className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300 text-right bg-emerald-900/20" 
                          title={(() => {
                            const totalSupplyCost = (item.supply_price_usd || 0) * (item.total_order_quantity || 0);
                            if (showProfitPercent) {
                              return item.gross_sales > 0 
                                ? (((totalSupplyCost / item.gross_sales) * 100).toFixed(2) + '%')
                                : '-';
                            }
                            return formatCurrency(totalSupplyCost);
                          })()}
                        >
                          {(() => {
                            const totalSupplyCost = (item.supply_price_usd || 0) * (item.total_order_quantity || 0);
                            if (showProfitPercent) {
                              return item.gross_sales > 0 
                                ? (((totalSupplyCost / item.gross_sales) * 100).toFixed(2) + '%')
                                : '-';
                            }
                            return formatCurrency(totalSupplyCost);
                          })()}
                        </td>
                        <td style={{ width: columnWidths.total_fba_fee }} className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300 text-right bg-emerald-900/20" title={showProfitPercent ? (item.gross_sales > 0 ? `${((item.total_fba_fee / item.gross_sales) * 100).toFixed(2)}%` : '-') : formatCurrency(item.total_fba_fee)}>
                                  {showProfitPercent ? (
                                    item.gross_sales > 0 ? `${((item.total_fba_fee / item.gross_sales) * 100).toFixed(2)}%` : '-'
                                  ) : (
                                    formatCurrency(item.total_fba_fee)
                                  )}
                                </td>
                        <td style={{ width: columnWidths.total_referral_fee }} className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300 text-right bg-emerald-900/20" title={showProfitPercent ? (item.gross_sales > 0 ? `${((item.total_referral_fee / item.gross_sales) * 100).toFixed(2)}%` : '-') : formatCurrency(item.total_referral_fee)}>
                                  {showProfitPercent ? (
                                    item.gross_sales > 0 ? `${((item.total_referral_fee / item.gross_sales) * 100).toFixed(2)}%` : '-'
                                  ) : (
                                    formatCurrency(item.total_referral_fee)
                                  )}
                                </td>
                        <td style={{ width: columnWidths.transportation_fee }} className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300 text-right bg-emerald-900/20" title={showProfitPercent ? (item.gross_sales > 0 ? `${((item.transportation_fee / item.gross_sales) * 100).toFixed(2)}%` : '-') : formatCurrency(item.transportation_fee)}>
                                  {showProfitPercent ? (
                                    item.gross_sales > 0 ? `${((item.transportation_fee / item.gross_sales) * 100).toFixed(2)}%` : '-'
                                  ) : (
                                    formatCurrency(item.transportation_fee)
                                  )}
                                </td>
                        <td style={{ width: columnWidths.allocated_account_cost }} className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300 text-right bg-emerald-900/20" title={showProfitPercent ? (item.gross_sales > 0 ? `${((item.allocated_account_cost / item.gross_sales) * 100).toFixed(2)}%` : '-') : formatCurrency(item.allocated_account_cost)}>
                                  {showProfitPercent ? (
                                    item.gross_sales > 0 ? `${((item.allocated_account_cost / item.gross_sales) * 100).toFixed(2)}%` : '-'
                                  ) : (
                                    formatCurrency(item.allocated_account_cost)
                                  )}
                                </td>
                        <td style={{ width: columnWidths.total_cost }} className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300 text-right bg-emerald-900/20" title={showProfitPercent ? (item.gross_sales > 0 ? `${((item.total_cost / item.gross_sales) * 100).toFixed(2)}%` : '-') : formatCurrency(item.total_cost)}>
                                  {showProfitPercent ? (
                                    item.gross_sales > 0 ? `${((item.total_cost / item.gross_sales) * 100).toFixed(2)}%` : '-'
                                  ) : (
                                    formatCurrency(item.total_cost)
                                  )}
                                </td>
                        <td style={{ width: columnWidths.margin }} className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-emerald-400 font-medium text-right bg-emerald-900/20" title={showProfitPercent ? (item.gross_sales > 0 ? `${((item.margin / item.gross_sales) * 100).toFixed(2)}%` : '-') : formatCurrency(item.margin)}>
                                  {showProfitPercent ? (
                                    item.gross_sales > 0 ? `${((item.margin / item.gross_sales) * 100).toFixed(2)}%` : '-'
                                  ) : (
                                    formatCurrency(item.margin)
                                  )}
                                </td>
                        <td style={{ width: columnWidths.total_order_quantity }} className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300 text-right bg-emerald-900/20" title={formatNumber(item.total_order_quantity)}>
                                  {formatNumber(item.total_order_quantity)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-4 border-t border-purple-500/20">
                <div className="text-sm text-gray-300">
                  전체 <span className="font-medium text-cyan-300">{filteredData.length}</span>개 중{' '}
                  <span className="font-medium text-cyan-300">{startIndex + 1}</span>-
                  <span className="font-medium text-cyan-300">{Math.min(endIndex, filteredData.length)}</span>개 표시
                  </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-200 bg-black/60 border border-purple-500/30 rounded-md hover:bg-purple-500/20 hover:border-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    이전
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
                            currentPage === pageNum
                              ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-cyan-500/50'
                              : 'text-gray-200 bg-black/60 border border-border/20 hover:bg-purple-500/20 hover:border-cyan-500/30'
                          }`}
                        >
                          {pageNum}
                        </button>
                );
              })}
            </div>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-200 bg-black/60 border border-border/20 rounded-md hover:bg-purple-500/20 hover:border-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    다음
                  </button>
                </div>
              </div>
            )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
    </div>
  );
}

