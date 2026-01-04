'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AmazonUSRawData } from './amazon-us-raw-data';
import { AmazonOrdersFetcher } from './amazon-orders-fetcher';
import { InventorySummaryTable } from './inventory-summary-table';
import { MonthlyBrandSummaryTable } from './monthly-brand-summary-table';

interface AmazonUSTabsProps {
  dashboardContent: React.ReactNode;
  activeTab?: 'sales-profit' | 'inventory' | 'raw-data' | 'data-fetch';
}

export function AmazonUSTabs({ dashboardContent, activeTab: initialActiveTab }: AmazonUSTabsProps) {
  const [activeTab, setActiveTab] = useState<'sales-profit' | 'inventory' | 'raw-data' | 'data-fetch'>(initialActiveTab || 'sales-profit');
  const [salesProfitSubTab, setSalesProfitSubTab] = useState<'monthly' | 'brand' | 'detail'>('monthly');
  
  // URL이 변경되면 activeTab 업데이트
  useEffect(() => {
    if (initialActiveTab) {
      setActiveTab(initialActiveTab);
    }
  }, [initialActiveTab]);

  return (
    <div className="w-full min-w-0">
      {/* 탭 컨텐츠 */}
      {activeTab === 'sales-profit' && (
        <div className="space-y-6">
          {/* 매출 이익 현황 하위 탭 */}
          <div className="border-b border-purple-500/20">
            <nav className="-mb-px flex space-x-6">
              <button
                onClick={() => setSalesProfitSubTab('monthly')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  salesProfitSubTab === 'monthly'
                    ? 'border-cyan-500 text-cyan-300'
                    : 'border-transparent text-gray-400 hover:text-cyan-300 hover:border-cyan-500/50'
                }`}
              >
                월별 현황
              </button>
              <button
                onClick={() => setSalesProfitSubTab('brand')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  salesProfitSubTab === 'brand'
                    ? 'border-cyan-500 text-cyan-300'
                    : 'border-transparent text-gray-400 hover:text-cyan-300 hover:border-cyan-500/50'
                }`}
              >
                브랜드별 현황
              </button>
              <button
                onClick={() => setSalesProfitSubTab('detail')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  salesProfitSubTab === 'detail'
                    ? 'border-cyan-500 text-cyan-300'
                    : 'border-transparent text-gray-400 hover:text-cyan-300 hover:border-cyan-500/50'
                }`}
              >
                SKU별 현황
              </button>
            </nav>
          </div>
          {/* 하위 탭 컨텐츠 */}
          {salesProfitSubTab === 'monthly' && dashboardContent}
          {salesProfitSubTab === 'brand' && <BrandSummaryView />}
          {salesProfitSubTab === 'detail' && <MonthlyBrandSummaryTable />}
        </div>
      )}
      {activeTab === 'inventory' && <InventorySummaryTable />}
      {activeTab === 'raw-data' && <AmazonUSRawData />}
      {activeTab === 'data-fetch' && <AmazonOrdersFetcher />}
    </div>
  );
}

// 브랜드별 현황 컴포넌트
function BrandSummaryView() {
  return (
    <div className="space-y-6">
      <div className="p-4 border-b border-purple-500/20">
        <h3 className="text-lg font-semibold text-gray-200">브랜드별 현황</h3>
        <p className="text-xs text-gray-400 mt-1">브랜드별 매출 및 이익 집계</p>
      </div>
      <BrandSummaryTable />
    </div>
  );
}

type BrandSortColumn = 'brand_name' | 'gross_sales' | 'refunds' | 'total_supply_cost' | 'total_fba_fee' | 'total_referral_fee' | 'transportation_fee' | 'allocated_account_cost' | 'total_cost' | 'margin' | 'total_order_quantity';
type BrandSortDirection = 'asc' | 'desc' | null;

// 브랜드별 집계 테이블 컴포넌트
function BrandSummaryTable() {
  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number | ''>('');
  const [selectedMonth, setSelectedMonth] = useState<number | ''>('');
  const [brandFilter, setBrandFilter] = useState('');
  const [showLowSales, setShowLowSales] = useState(false);
  const [sortColumn, setSortColumn] = useState<BrandSortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<BrandSortDirection>(null);

  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedMonth]);

  // 데이터 로드 후 기본 연도/월 설정
  useEffect(() => {
    if (data.length > 0 && !selectedYear && !selectedMonth) {
      const sorted = [...data].sort((a: any, b: any) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
      if (sorted.length > 0) {
        setSelectedYear(sorted[0].year);
        setSelectedMonth(sorted[0].month);
      }
    }
  }, [data, selectedYear, selectedMonth]);

  // 필터링 및 정렬
  useEffect(() => {
    let filtered = data;
    
    if (selectedYear) {
      filtered = filtered.filter((item: any) => item.year === selectedYear);
    }
    
    if (selectedMonth) {
      filtered = filtered.filter((item: any) => item.month === selectedMonth);
    }
    
    if (brandFilter.trim()) {
      filtered = filtered.filter((item: any) =>
        item.brand_name.toLowerCase().includes(brandFilter.toLowerCase())
      );
    }
    
    // 총 매출 $1000 이하 항목 필터링 (기본적으로 숨김)
    if (!showLowSales) {
      filtered = filtered.filter((item: any) => item.gross_sales > 1000);
    }
    
    // 정렬 적용
    if (sortColumn && sortDirection) {
      filtered = [...filtered].sort((a: any, b: any) => {
        let aVal: any;
        let bVal: any;
        
        switch (sortColumn) {
          case 'brand_name':
            aVal = a.brand_name || '';
            bVal = b.brand_name || '';
            break;
          case 'gross_sales':
            aVal = a.gross_sales || 0;
            bVal = b.gross_sales || 0;
            break;
          case 'refunds':
            aVal = a.refunds || 0;
            bVal = b.refunds || 0;
            break;
          case 'total_supply_cost':
            aVal = a.total_supply_cost || 0;
            bVal = b.total_supply_cost || 0;
            break;
          case 'total_fba_fee':
            aVal = a.total_fba_fee || 0;
            bVal = b.total_fba_fee || 0;
            break;
          case 'total_referral_fee':
            aVal = a.total_referral_fee || 0;
            bVal = b.total_referral_fee || 0;
            break;
          case 'transportation_fee':
            aVal = a.transportation_fee || 0;
            bVal = b.transportation_fee || 0;
            break;
          case 'allocated_account_cost':
            aVal = a.allocated_account_cost || 0;
            bVal = b.allocated_account_cost || 0;
            break;
          case 'total_cost':
            aVal = a.total_cost || 0;
            bVal = b.total_cost || 0;
            break;
          case 'margin':
            aVal = a.margin || 0;
            bVal = b.margin || 0;
            break;
          case 'total_order_quantity':
            aVal = a.total_order_quantity || 0;
            bVal = b.total_order_quantity || 0;
            break;
          default:
            return 0;
        }
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDirection === 'asc' 
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }
    
    setFilteredData(filtered);
  }, [data, selectedYear, selectedMonth, brandFilter, showLowSales, sortColumn, sortDirection]);

  const handleSort = (column: BrandSortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedYear) params.append('year', selectedYear.toString());
      if (selectedMonth) params.append('month', selectedMonth.toString());
      
      const response = await fetch(`/api/amazon-us-monthly-brand-summary?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch brand summary');
      }
      const result = await response.json();
      
      const processedData = (result.data || []).map((item: any) => {
        const year = item.year != null && item.year !== undefined ? Number(item.year) : null;
        const month = item.month != null && item.month !== undefined ? Number(item.month) : null;
        
        if (year === null || month === null) {
          console.warn('Missing year or month in item:', item);
        }
        
        return {
          brand_name: item.brand_name || 'Unknown',
          year: year,
          month: month,
          gross_sales: Number(item.gross_sales || 0),
          refunds: Number(item.refunds || 0),
          total_supply_cost: Number(item.total_supply_cost || 0),
          total_fba_fee: Number(item.total_fba_fee || 0),
          total_referral_fee: Number(item.total_referral_fee || 0),
          transportation_fee: Number(item.transportation_fee || 0),
          allocated_account_cost: Number(item.allocated_account_cost || 0),
          total_cost: Number(item.total_cost || 0),
          margin: Number(item.margin || 0),
          total_order_quantity: Number(item.total_order_quantity || 0),
        };
      }).filter((item: any) => item.year != null && item.month != null);

      processedData.sort((a: any, b: any) => {
        if (a.year !== b.year) return b.year - a.year;
        if (a.month !== b.month) return b.month - a.month;
        return a.brand_name.localeCompare(b.brand_name);
      });

      setData(processedData);
    } catch (error) {
      console.error('Error fetching brand summary:', error);
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

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('ko-KR').format(value);
  };

  // 사용 가능한 연도 목록 추출
  const availableYears = Array.from(new Set(data.map((item: any) => item.year).filter(Boolean))).sort((a: any, b: any) => b - a);
  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  
  // 총 매출 $1000 이하 항목 개수 계산
  const lowSalesCount = data.filter((item: any) => item.gross_sales <= 1000).length;

  // 선택한 연도/월의 브랜드별 매출 비중 계산 (Top 10)
  const brandSalesData = useMemo(() => {
    if (!selectedYear || !selectedMonth) return [];
    
    const monthData = filteredData.filter((item: any) => 
      item.year === selectedYear && item.month === selectedMonth
    );
    
    if (monthData.length === 0) return [];
    
    const totalSales = monthData.reduce((sum: number, item: any) => sum + (item.gross_sales || 0), 0);
    if (totalSales === 0) return [];
    
    const brandSales = monthData
      .map((item: any) => ({
        brand_name: item.brand_name,
        gross_sales: item.gross_sales || 0,
        percentage: ((item.gross_sales || 0) / totalSales) * 100,
      }))
      .sort((a, b) => b.gross_sales - a.gross_sales)
      .slice(0, 10);
    
    return brandSales;
  }, [filteredData, selectedYear, selectedMonth]);

  if (loading) {
    return (
      <div className="text-center py-8">로딩 중...</div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 필터 섹션 */}
      <Card className="border border-purple-500/30 bg-black/40 backdrop-blur-xl shadow-lg shadow-cyan-500/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-300 whitespace-nowrap">연도:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : '')}
                className="px-3 py-2 text-sm bg-black/40 border border-purple-500/30 rounded-md text-gray-200"
              >
                <option value="">전체</option>
                {availableYears.map((year: any) => (
                  <option key={year} value={year}>
                    {year}년
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-300 whitespace-nowrap">월:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value ? parseInt(e.target.value) : '')}
                className="px-3 py-2 text-sm bg-black/40 border border-purple-500/30 rounded-md text-gray-200"
              >
                <option value="">전체</option>
                {monthNames.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-300 whitespace-nowrap">브랜드 검색:</label>
              <input
                type="text"
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                placeholder="브랜드명 입력..."
                className="px-3 py-2 text-sm bg-black/40 border border-purple-500/30 rounded-md text-gray-200 w-48"
              />
            </div>
            {lowSalesCount > 0 && (
              <button
                onClick={() => setShowLowSales(!showLowSales)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  showLowSales
                    ? 'bg-black/60 text-gray-300 hover:bg-black/80 border border-purple-500/30'
                    : 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:shadow-lg hover:shadow-cyan-500/50'
                }`}
              >
                {showLowSales ? '$1000 이하 숨기기' : `$1000 이하 표시 (${lowSalesCount}개)`}
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 브랜드별 매출 비중 막대그래프 */}
      {selectedYear && selectedMonth && brandSalesData.length > 0 && (
        <Card className="border border-purple-500/30 bg-black/40 backdrop-blur-xl shadow-lg shadow-cyan-500/10">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-200 mb-4">
              {selectedYear}년 {monthNames[selectedMonth - 1]} 브랜드별 매출 비중 (Top 10)
            </h3>
            <div className="space-y-2">
              {brandSalesData.map((item: any, index: number) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-32 text-xs text-gray-300 truncate" title={item.brand_name}>
                    {item.brand_name}
                  </div>
                  <div className="flex-1 relative">
                    <div className="h-6 bg-gray-700 rounded overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-end pr-2"
                        style={{ width: `${item.percentage}%` }}
                      >
                        {item.percentage > 5 && (
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
          <div className="overflow-x-auto max-h-[calc(100vh-300px)]">
            <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
              <thead className="bg-slate-800 sticky top-0 z-10">
                <tr className="border-b border-purple-500/20">
                  <th 
                    className="text-left p-2 font-medium text-gray-200 select-none whitespace-nowrap cursor-pointer hover:bg-white/10"
                    onClick={() => handleSort('brand_name')}
                  >
                    <div className="flex items-center">
                      <span>브랜드</span>
                      {sortColumn === 'brand_name' && (
                        <span className="ml-1 text-cyan-300">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="text-right p-2 font-medium text-gray-200 select-none whitespace-nowrap cursor-pointer hover:bg-white/10"
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
                  </th>
                  <th 
                    className="text-right p-2 font-medium text-gray-200 select-none whitespace-nowrap cursor-pointer hover:bg-white/10"
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
                  </th>
                  <th 
                    className="text-right p-2 font-medium text-gray-200 select-none whitespace-nowrap cursor-pointer hover:bg-white/10"
                    onClick={() => handleSort('total_supply_cost')}
                  >
                    <div className="flex items-center justify-end">
                      <span>Total 공급가</span>
                      {sortColumn === 'total_supply_cost' && (
                        <span className="ml-1 text-cyan-300">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="text-right p-2 font-medium text-gray-200 select-none whitespace-nowrap cursor-pointer hover:bg-white/10"
                    onClick={() => handleSort('total_fba_fee')}
                  >
                    <div className="flex items-center justify-end">
                      <span>FBA Fee</span>
                      {sortColumn === 'total_fba_fee' && (
                        <span className="ml-1 text-cyan-300">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="text-right p-2 font-medium text-gray-200 select-none whitespace-nowrap cursor-pointer hover:bg-white/10"
                    onClick={() => handleSort('total_referral_fee')}
                  >
                    <div className="flex items-center justify-end">
                      <span>아마존 Fee</span>
                      {sortColumn === 'total_referral_fee' && (
                        <span className="ml-1 text-cyan-300">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="text-right p-2 font-medium text-gray-200 select-none whitespace-nowrap cursor-pointer hover:bg-white/10"
                    onClick={() => handleSort('transportation_fee')}
                  >
                    <div className="flex items-center justify-end">
                      <span>물류비</span>
                      {sortColumn === 'transportation_fee' && (
                        <span className="ml-1 text-cyan-300">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="text-right p-2 font-medium text-gray-200 select-none whitespace-nowrap cursor-pointer hover:bg-white/10"
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
                  </th>
                  <th 
                    className="text-right p-2 font-medium text-gray-200 select-none whitespace-nowrap cursor-pointer hover:bg-white/10"
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
                  </th>
                  <th 
                    className="text-right p-2 font-medium text-gray-200 select-none whitespace-nowrap cursor-pointer hover:bg-white/10"
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
                  </th>
                  <th 
                    className="text-right p-2 font-medium text-gray-200 select-none whitespace-nowrap cursor-pointer hover:bg-white/10"
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
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-8 text-gray-500">
                      데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item, index) => {
                    return (
                      <tr key={index} className="border-b border-purple-500/10 hover:bg-white/5">
                        <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-200 font-medium" title={item.brand_name}>
                          {item.brand_name}
                        </td>
                        <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300 text-right font-medium" title={formatCurrency(item.gross_sales)}>
                          {formatCurrency(item.gross_sales)}
                        </td>
                        <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-red-400 text-right" title={formatCurrency(item.refunds)}>
                          {formatCurrency(item.refunds)}
                        </td>
                        <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300 text-right" title={formatCurrency(item.total_supply_cost)}>
                          {formatCurrency(item.total_supply_cost)}
                        </td>
                        <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300 text-right" title={formatCurrency(item.total_fba_fee)}>
                          {formatCurrency(item.total_fba_fee)}
                        </td>
                        <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300 text-right" title={formatCurrency(item.total_referral_fee)}>
                          {formatCurrency(item.total_referral_fee)}
                        </td>
                        <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300 text-right" title={formatCurrency(item.transportation_fee)}>
                          {formatCurrency(item.transportation_fee)}
                        </td>
                        <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300 text-right" title={formatCurrency(item.allocated_account_cost)}>
                          {formatCurrency(item.allocated_account_cost)}
                        </td>
                        <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300 text-right" title={formatCurrency(item.total_cost)}>
                          {formatCurrency(item.total_cost)}
                        </td>
                        <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-emerald-400 font-medium text-right" title={formatCurrency(item.margin)}>
                          {formatCurrency(item.margin)}
                        </td>
                        <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300 text-right" title={formatNumber(item.total_order_quantity)}>
                          {formatNumber(item.total_order_quantity)}
                        </td>
                      </tr>
                    );
                  })
                )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}

