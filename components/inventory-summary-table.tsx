'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface InventorySummary {
  brand_name: string;
  product_name: string;
  sku: string;
  fba_inventory: number;
  inbound_working: number;
  inbound_shipped: number;
  inbound_receiving: number;
  reserved_orders: number;
  reserved_fc_transfer: number;
  reserved_fc_processing: number;
  researching_total: number;
  researching_short_term: number;
  researching_mid_term: number;
  researching_long_term: number;
  unfulfillable_total: number;
  unfulfillable_customer_damaged: number;
  unfulfillable_warehouse_damaged: number;
  unfulfillable_distributor_damaged: number;
  unfulfillable_carrier_damaged: number;
  unfulfillable_defective: number;
  unfulfillable_expired: number;
  pending_in_kr: number;
  in_air: number;
  in_ocean: number;
  sl_glovis: number;
  cconma: number;
  ctk_usa: number;
}

export function InventorySummaryTable() {
  const [data, setData] = useState<InventorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(11);
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'brand' | 'location' | 'list'>('brand');
  const [selectedBrandForDetail, setSelectedBrandForDetail] = useState<string>('all');
  const [isBrandDetailDropdownOpen, setIsBrandDetailDropdownOpen] = useState(false);
  const [brandDetailSearchTerm, setBrandDetailSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, [year, month]);

  // 브랜드 목록 추출
  const brandList = useMemo(() => {
    const brands = new Set(data.map(item => item.brand_name));
    return Array.from(brands).sort();
  }, [data]);

  // 필터링된 데이터
  const filteredData = useMemo(() => {
    if (selectedBrand === 'all') {
      return data;
    }
    return data.filter(item => item.brand_name === selectedBrand);
  }, [data, selectedBrand]);

  // 브랜드별 전체 재고수 (모든 재고 합산, 0인 브랜드 제외)
  const brandInventoryData = useMemo(() => {
    const brandMap = new Map<string, number>();
    data.forEach(item => {
      const current = brandMap.get(item.brand_name) || 0;
      // 모든 재고 합산
      const totalInventory = 
        item.fba_inventory +
        item.inbound_working +
        item.inbound_shipped +
        item.inbound_receiving +
        item.reserved_orders +
        item.reserved_fc_transfer +
        item.reserved_fc_processing +
        item.researching_total +
        item.unfulfillable_total +
        item.pending_in_kr +
        item.in_air +
        item.in_ocean +
        item.sl_glovis +
        (item.cconma || 0) +
        item.ctk_usa;
      brandMap.set(item.brand_name, current + totalInventory);
    });
    return Array.from(brandMap.entries())
      .map(([brand, inventory]) => ({ brand, inventory }))
      .filter(item => item.inventory > 0) // 재고가 0인 브랜드 제외
      .sort((a, b) => b.inventory - a.inventory);
  }, [data]);

  // 총 재고 계산 (모든 브랜드 합산)
  const totalInventory = useMemo(() => {
    return brandInventoryData.reduce((sum, item) => sum + item.inventory, 0);
  }, [brandInventoryData]);

  // 검색 가능한 브랜드 목록
  const filteredBrandList = useMemo(() => {
    if (!searchTerm.trim()) {
      return brandList;
    }
    return brandList.filter(brand =>
      brand.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [brandList, searchTerm]);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.brand-dropdown-container')) {
        setIsDropdownOpen(false);
      }
      if (!target.closest('.brand-detail-dropdown-container')) {
        setIsBrandDetailDropdownOpen(false);
      }
    };

    if (isDropdownOpen || isBrandDetailDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isDropdownOpen, isBrandDetailDropdownOpen]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/amazon-us-inventory-summary?year=${year}&month=${month}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setData(result.data || []);
    } catch (error: any) {
      console.error('Error fetching inventory summary:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncInventory = async () => {
    if (syncing) return;

    try {
      setSyncing(true);
      setSyncMessage(null);

      const response = await fetch('/api/sync-inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ year, month }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '동기화 실패');
      }

      setSyncMessage({
        type: 'success',
        text: result.message || `재고 동기화 완료: ${result.updatedCount}개 업데이트`,
      });

      // 동기화 후 데이터 새로고침
      await fetchData();
    } catch (error: any) {
      console.error('Error syncing inventory:', error);
      setSyncMessage({
        type: 'error',
        text: error.message || '재고 동기화 중 오류가 발생했습니다.',
      });
    } finally {
      setSyncing(false);
      // 5초 후 메시지 자동 제거
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('ko-KR').format(value);
  };

  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

  // 브랜드별로 데이터 그룹화
  const groupedByBrand = useMemo(() => {
    const grouped = filteredData.reduce((acc, item) => {
      const brandName = item.brand_name || 'Unknown';
      if (!acc[brandName]) {
        acc[brandName] = [];
      }
      acc[brandName].push(item);
      return acc;
    }, {} as Record<string, InventorySummary[]>);

    // 각 브랜드 내 제품명(SKU)으로 정렬
    for (const brand in grouped) {
      grouped[brand].sort((a, b) => {
        const productNameCompare = (a.product_name || '').localeCompare(b.product_name || '');
        if (productNameCompare !== 0) return productNameCompare;
        return (a.sku || '').localeCompare(b.sku || '');
      });
    }
    return grouped;
  }, [filteredData]);

  // 브랜드 이름 목록 (정렬)
  const brandNames = useMemo(() => Object.keys(groupedByBrand).sort(), [groupedByBrand]);

  // 브랜드별 합계 계산
  const brandTotals = useMemo(() => {
    return brandNames.reduce((acc, brandName) => {
      const products = groupedByBrand[brandName];
      acc[brandName] = products.reduce(
        (sum, item) => ({
          fba_inventory: sum.fba_inventory + item.fba_inventory,
          inbound_working: sum.inbound_working + item.inbound_working,
          inbound_shipped: sum.inbound_shipped + item.inbound_shipped,
          inbound_receiving: sum.inbound_receiving + item.inbound_receiving,
          reserved_orders: sum.reserved_orders + item.reserved_orders,
          reserved_fc_transfer: sum.reserved_fc_transfer + item.reserved_fc_transfer,
          reserved_fc_processing: sum.reserved_fc_processing + item.reserved_fc_processing,
          researching_total: sum.researching_total + item.researching_total,
          researching_short_term: sum.researching_short_term + item.researching_short_term,
          researching_mid_term: sum.researching_mid_term + item.researching_mid_term,
          researching_long_term: sum.researching_long_term + item.researching_long_term,
          unfulfillable_total: sum.unfulfillable_total + item.unfulfillable_total,
          unfulfillable_customer_damaged: sum.unfulfillable_customer_damaged + item.unfulfillable_customer_damaged,
          unfulfillable_warehouse_damaged: sum.unfulfillable_warehouse_damaged + item.unfulfillable_warehouse_damaged,
          unfulfillable_distributor_damaged: sum.unfulfillable_distributor_damaged + item.unfulfillable_distributor_damaged,
          unfulfillable_carrier_damaged: sum.unfulfillable_carrier_damaged + item.unfulfillable_carrier_damaged,
          unfulfillable_defective: sum.unfulfillable_defective + item.unfulfillable_defective,
          unfulfillable_expired: sum.unfulfillable_expired + item.unfulfillable_expired,
          pending_in_kr: sum.pending_in_kr + item.pending_in_kr,
          in_air: sum.in_air + item.in_air,
          in_ocean: sum.in_ocean + item.in_ocean,
          sl_glovis: sum.sl_glovis + item.sl_glovis,
          cconma: sum.cconma + (item.cconma || 0),
          ctk_usa: sum.ctk_usa + item.ctk_usa,
        }),
        {
          fba_inventory: 0,
          inbound_working: 0,
          inbound_shipped: 0,
          inbound_receiving: 0,
          reserved_orders: 0,
          reserved_fc_transfer: 0,
          reserved_fc_processing: 0,
          researching_total: 0,
          researching_short_term: 0,
          researching_mid_term: 0,
          researching_long_term: 0,
          unfulfillable_total: 0,
          unfulfillable_customer_damaged: 0,
          unfulfillable_warehouse_damaged: 0,
          unfulfillable_distributor_damaged: 0,
          unfulfillable_carrier_damaged: 0,
          unfulfillable_defective: 0,
          unfulfillable_expired: 0,
          pending_in_kr: 0,
          in_air: 0,
          in_ocean: 0,
          sl_glovis: 0,
          cconma: 0,
          ctk_usa: 0,
        }
      );
      return acc;
    }, {} as Record<string, Omit<InventorySummary, 'brand_name' | 'product_name' | 'sku'>>);
  }, [brandNames, groupedByBrand]);

  // 전체 합계 계산
  const total = useMemo(() => filteredData.reduce(
    (acc, item) => ({
      fba_inventory: acc.fba_inventory + item.fba_inventory,
      inbound_working: acc.inbound_working + item.inbound_working,
      inbound_shipped: acc.inbound_shipped + item.inbound_shipped,
      inbound_receiving: acc.inbound_receiving + item.inbound_receiving,
      reserved_orders: acc.reserved_orders + item.reserved_orders,
      reserved_fc_transfer: acc.reserved_fc_transfer + item.reserved_fc_transfer,
      reserved_fc_processing: acc.reserved_fc_processing + item.reserved_fc_processing,
      researching_total: acc.researching_total + item.researching_total,
      researching_short_term: acc.researching_short_term + item.researching_short_term,
      researching_mid_term: acc.researching_mid_term + item.researching_mid_term,
      researching_long_term: acc.researching_long_term + item.researching_long_term,
      unfulfillable_total: acc.unfulfillable_total + item.unfulfillable_total,
      unfulfillable_customer_damaged: acc.unfulfillable_customer_damaged + item.unfulfillable_customer_damaged,
      unfulfillable_warehouse_damaged: acc.unfulfillable_warehouse_damaged + item.unfulfillable_warehouse_damaged,
      unfulfillable_distributor_damaged: acc.unfulfillable_distributor_damaged + item.unfulfillable_distributor_damaged,
      unfulfillable_carrier_damaged: acc.unfulfillable_carrier_damaged + item.unfulfillable_carrier_damaged,
      unfulfillable_defective: acc.unfulfillable_defective + item.unfulfillable_defective,
      unfulfillable_expired: acc.unfulfillable_expired + item.unfulfillable_expired,
      pending_in_kr: acc.pending_in_kr + item.pending_in_kr,
      in_air: acc.in_air + item.in_air,
      in_ocean: acc.in_ocean + item.in_ocean,
      sl_glovis: acc.sl_glovis + item.sl_glovis,
      cconma: acc.cconma + (item.cconma || 0),
      ctk_usa: acc.ctk_usa + item.ctk_usa,
    }),
    {
      fba_inventory: 0,
      inbound_working: 0,
      inbound_shipped: 0,
      inbound_receiving: 0,
      reserved_orders: 0,
      reserved_fc_transfer: 0,
      reserved_fc_processing: 0,
      researching_total: 0,
      researching_short_term: 0,
      researching_mid_term: 0,
      researching_long_term: 0,
      unfulfillable_total: 0,
      unfulfillable_customer_damaged: 0,
      unfulfillable_warehouse_damaged: 0,
      unfulfillable_distributor_damaged: 0,
      unfulfillable_carrier_damaged: 0,
      unfulfillable_defective: 0,
      unfulfillable_expired: 0,
      pending_in_kr: 0,
      in_air: 0,
      in_ocean: 0,
      sl_glovis: 0,
      cconma: 0,
      ctk_usa: 0,
    }
  ), [filteredData]);

  // 재고위치별 집계 데이터
  const locationData = useMemo(() => {
    const locations = {
      'FBA 재고': data.reduce((sum, item) => sum + item.fba_inventory, 0),
      'Inbound Working': data.reduce((sum, item) => sum + item.inbound_working, 0),
      'Inbound Shipped': data.reduce((sum, item) => sum + item.inbound_shipped, 0),
      'Inbound Receiving': data.reduce((sum, item) => sum + item.inbound_receiving, 0),
      'Reserved Orders': data.reduce((sum, item) => sum + item.reserved_orders, 0),
      'Reserved FC Transfer': data.reduce((sum, item) => sum + item.reserved_fc_transfer, 0),
      'Reserved FC Processing': data.reduce((sum, item) => sum + item.reserved_fc_processing, 0),
      'Researching Total': data.reduce((sum, item) => sum + item.researching_total, 0),
      'Unfulfillable Total': data.reduce((sum, item) => sum + item.unfulfillable_total, 0),
    };
    return Object.entries(locations).map(([name, value]) => ({ name, value }));
  }, [data]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>재고 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">로딩 중...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border border-purple-500/30 bg-black/40 backdrop-blur-xl shadow-lg shadow-cyan-500/10">
        <CardHeader className="border-b border-purple-500/20 bg-slate-800">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="text-lg font-semibold text-gray-200">재고 현황</CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-300">년도:</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                  className="w-20 px-3 py-2 text-sm bg-black/40 border border-purple-500/30 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-gray-200 placeholder-gray-500 backdrop-blur-sm"
                  min="2020"
                  max="2100"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-300">월:</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  className="px-3 py-2 text-sm bg-black/40 border border-purple-500/30 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-gray-200 placeholder-gray-500 backdrop-blur-sm"
                >
                  {monthNames.map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleSyncInventory}
                disabled={syncing}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                  syncing
                    ? 'bg-gray-500/30 text-gray-400 cursor-not-allowed border border-gray-500/30'
                    : 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:opacity-90'
                }`}
              >
                {syncing ? '동기화 중...' : '재고 동기화'}
              </button>
              {syncMessage && (
                <div
                  className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap ${
                    syncMessage.type === 'success'
                      ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30'
                      : 'bg-red-900/30 text-red-400 border border-red-500/30'
                  }`}
                >
                  {syncMessage.text}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* 서브 탭 */}
          <div className="border-b border-purple-500/20 mb-6">
            <nav className="-mb-px flex space-x-6">
              <button
                onClick={() => setActiveSubTab('brand')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeSubTab === 'brand'
                    ? 'border-cyan-500 text-cyan-300'
                    : 'border-transparent text-gray-400 hover:text-cyan-300 hover:border-cyan-500/50'
                }`}
              >
                브랜드별 현황
              </button>
              <button
                onClick={() => setActiveSubTab('location')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeSubTab === 'location'
                    ? 'border-cyan-500 text-cyan-300'
                    : 'border-transparent text-gray-400 hover:text-cyan-300 hover:border-cyan-500/50'
                }`}
              >
                재고위치별 현황
              </button>
              <button
                onClick={() => setActiveSubTab('list')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeSubTab === 'list'
                    ? 'border-cyan-500 text-cyan-300'
                    : 'border-transparent text-gray-400 hover:text-cyan-300 hover:border-cyan-500/50'
                }`}
              >
                재고 전체 리스트
              </button>
            </nav>
          </div>

          {/* 탭 컨텐츠 */}
          {activeSubTab === 'brand' && (
            <div>
              {/* 총 재고 막대그래프 (최상단) */}
              {totalInventory > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4">전체 재고 현황</h3>
                  <div className="bg-black/60 backdrop-blur-sm p-4 rounded-lg border border-border/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-300">총 재고</span>
                      <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">{formatNumber(totalInventory)}</span>
                    </div>
                    <div className="w-full bg-black/60 rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-300"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* 브랜드별 전체 재고 막대그래프 (세로형) */}
              {brandInventoryData.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">브랜드별 전체 재고 현황</h3>
                  <div className="flex items-end gap-4 h-80 px-4 border-b border-gray-300 pb-2 overflow-x-auto">
                    {brandInventoryData.map(({ brand, inventory }) => {
                      const maxInventory = Math.max(...brandInventoryData.map(d => d.inventory));
                      const percentage = maxInventory > 0 ? (inventory / maxInventory) * 100 : 0;
                      const sharePercentage = totalInventory > 0 ? (inventory / totalInventory) * 100 : 0;
                      const isSelected = selectedBrand === brand || selectedBrand === 'all';
                      
                      return (
                        <div key={brand} className="flex flex-col items-center gap-2 group" style={{ minWidth: '80px', flex: '0 0 auto' }}>
                          {/* 막대 컨테이너 - 고정 높이 */}
                          <div className="w-full relative" style={{ height: '300px' }}>
                            {/* 막대 배경 (전체 높이) */}
                            <div className="w-full bg-black/60 rounded-t absolute bottom-0" style={{ height: '100%' }} />
                            {/* 실제 막대 (비율에 따라 높이 조절) */}
                            <div
                              className={`w-full rounded-t transition-all duration-300 absolute bottom-0 ${
                                isSelected ? 'bg-gradient-to-r from-cyan-500 to-purple-500' : 'bg-gray-600'
                              }`}
                              style={{ 
                                height: `${percentage}%`,
                                minHeight: percentage > 0 ? '4px' : '0px'
                              }}
                            />
                            {/* 호버 툴팁 */}
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                              <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
                                {formatNumber(inventory)} ({sharePercentage.toFixed(1)}%)
                              </div>
                            </div>
                          </div>
                          {/* 브랜드명 */}
                          <div className="text-xs font-medium text-gray-300 truncate w-full text-center" title={brand} style={{ maxWidth: '80px' }}>
                            {brand}
                          </div>
                          {/* 재고 수치 및 비중 */}
                          <div className="text-xs text-gray-500 font-semibold text-center">
                            <div>{formatNumber(inventory)}</div>
                            <div className="text-blue-600">{sharePercentage.toFixed(1)}%</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 브랜드별 재고 위치별 상세 그래프 */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">브랜드별 재고 위치별 상세 현황</h3>
                
                {/* 브랜드 선택 드롭다운 */}
                <div className="mb-4 flex justify-start">
                  <div className="w-64 relative brand-detail-dropdown-container">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsBrandDetailDropdownOpen(!isBrandDetailDropdownOpen)}
                        className="w-full px-3 py-2 text-left border border-gray-300 rounded-md shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
                      >
                        <span className={selectedBrandForDetail === 'all' ? 'text-gray-500' : ''}>
                          {selectedBrandForDetail === 'all' ? '브랜드 선택' : selectedBrandForDetail}
                        </span>
                        <svg
                          className={`w-5 h-5 transition-transform ${isBrandDetailDropdownOpen ? 'transform rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isBrandDetailDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-black/80 backdrop-blur-xl border border-border/30 rounded-md shadow-lg shadow-cyan-500/20 max-h-60 overflow-auto custom-scrollbar">
                          <div className="p-2 border-b">
                            <input
                              type="text"
                              placeholder="브랜드 검색..."
                              value={brandDetailSearchTerm}
                              onChange={(e) => setBrandDetailSearchTerm(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="py-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBrandForDetail('all');
                                setIsBrandDetailDropdownOpen(false);
                                setBrandDetailSearchTerm('');
                              }}
                              className={`w-full px-4 py-2 text-left hover:bg-purple-500/20 text-gray-200 ${
                                selectedBrandForDetail === 'all' ? 'bg-purple-500/20 text-cyan-300 font-medium' : ''
                              }`}
                            >
                              전체 브랜드
                            </button>
                            {brandList
                              .filter(brand => 
                                brandDetailSearchTerm === '' || 
                                brand.toLowerCase().includes(brandDetailSearchTerm.toLowerCase())
                              )
                              .map((brand) => (
                                <button
                                  key={brand}
                                  type="button"
                                  onClick={() => {
                                    setSelectedBrandForDetail(brand);
                                    setIsBrandDetailDropdownOpen(false);
                                    setBrandDetailSearchTerm('');
                                  }}
                                  className={`w-full px-4 py-2 text-left hover:bg-purple-500/20 text-gray-200 ${
                                    selectedBrandForDetail === brand ? 'bg-purple-500/20 text-cyan-300 font-medium' : ''
                                  }`}
                                >
                                  {brand}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 브랜드별 재고 위치별 상세 데이터 */}
                {selectedBrandForDetail !== 'all' && (() => {
                  const brandData = data.filter(item => item.brand_name === selectedBrandForDetail);
                  
                  if (brandData.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        {selectedBrandForDetail} 브랜드의 데이터가 없습니다.
                      </div>
                    );
                  }

                  // 브랜드별 재고 위치별 집계
                  const fbaInventory = brandData.reduce((sum, item) => sum + item.fba_inventory, 0);
                  const inboundWorking = brandData.reduce((sum, item) => sum + item.inbound_working, 0);
                  const inboundShipped = brandData.reduce((sum, item) => sum + item.inbound_shipped, 0);
                  const inboundReceiving = brandData.reduce((sum, item) => sum + item.inbound_receiving, 0);
                  const inboundTotal = inboundWorking + inboundShipped + inboundReceiving;
                  
                  const reservedOrders = brandData.reduce((sum, item) => sum + item.reserved_orders, 0);
                  const reservedFCTransfer = brandData.reduce((sum, item) => sum + item.reserved_fc_transfer, 0);
                  const reservedFCProcessing = brandData.reduce((sum, item) => sum + item.reserved_fc_processing, 0);
                  const reservedTotal = reservedOrders + reservedFCTransfer + reservedFCProcessing;
                  
                  const researchingTotal = brandData.reduce((sum, item) => sum + item.researching_total, 0);
                  const unfulfillableTotal = brandData.reduce((sum, item) => sum + item.unfulfillable_total, 0);
                  
                  const pendingInKR = brandData.reduce((sum, item) => sum + item.pending_in_kr, 0);
                  const inAir = brandData.reduce((sum, item) => sum + item.in_air, 0);
                  const inOcean = brandData.reduce((sum, item) => sum + item.in_ocean, 0);
                  const slGlovis = brandData.reduce((sum, item) => sum + item.sl_glovis, 0);
                  const cconma = brandData.reduce((sum, item) => sum + (item.cconma || 0), 0);
                  const ctkUSA = brandData.reduce((sum, item) => sum + item.ctk_usa, 0);

                  // 총 재고 계산
                  const totalInventory = fbaInventory + inboundTotal + reservedTotal + researchingTotal + unfulfillableTotal + 
                    pendingInKR + inAir + inOcean + slGlovis + cconma + ctkUSA;

                  // 재고 위치별 데이터 (그룹화)
                  const locationBreakdown: Array<{ name: string; value: number; color: string }> = [
                    { name: '총 재고', value: totalInventory, color: 'bg-blue-600' },
                    { name: 'FBA 재고', value: fbaInventory, color: 'bg-blue-500' },
                    { name: 'Inbound (합계)', value: inboundTotal, color: 'bg-green-500' },
                    { name: 'Reserved (합계)', value: reservedTotal, color: 'bg-yellow-500' },
                    { name: 'Researching Total', value: researchingTotal, color: 'bg-orange-500' },
                    { name: 'Unfulfillable Total', value: unfulfillableTotal, color: 'bg-red-500' },
                  ];

                  // 그외 재고들 (데이터가 있는 경우만)
                  if (pendingInKR > 0) locationBreakdown.push({ name: 'Pending in KR', value: pendingInKR, color: 'bg-purple-500' });
                  if (inAir > 0) locationBreakdown.push({ name: 'In Air', value: inAir, color: 'bg-indigo-500' });
                  if (inOcean > 0) locationBreakdown.push({ name: 'In Ocean', value: inOcean, color: 'bg-cyan-500' });
                  if (slGlovis > 0) locationBreakdown.push({ name: 'SL Glovis', value: slGlovis, color: 'bg-pink-500' });
                  if (cconma > 0) locationBreakdown.push({ name: 'CCONMA', value: cconma, color: 'bg-teal-500' });
                  if (ctkUSA > 0) locationBreakdown.push({ name: 'CTK USA', value: ctkUSA, color: 'bg-amber-500' });

                  const locationEntries = locationBreakdown.filter(item => item.value > 0);
                  const maxValue = Math.max(...locationEntries.map(item => item.value), 1);

                  return (
                    <div className="bg-black/40 backdrop-blur-sm border border-border/30 rounded-lg p-6">
                      <h4 className="text-md font-semibold mb-4 bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
                        {selectedBrandForDetail} 브랜드 재고 위치별 상세
                      </h4>
                      <div className="space-y-3">
                        {locationEntries.map(({ name, value, color }) => {
                          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
                          const sharePercentage = totalInventory > 0 ? (value / totalInventory) * 100 : 0;
                          
                          return (
                            <div key={name} className="flex items-center gap-4">
                              <div className="w-48 text-sm font-medium text-gray-700">
                                {name}
                              </div>
                              <div className="flex-1 relative">
                                <div className="w-full bg-black/60 rounded-full h-8 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${color}`}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <div className="absolute inset-0 flex items-center justify-between px-3">
                                  <span className="text-sm font-semibold text-gray-800">
                                    {formatNumber(value)}
                                  </span>
                                  <span className="text-sm font-semibold text-blue-600">
                                    {sharePercentage.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {selectedBrandForDetail === 'all' && (
                  <div className="text-center py-8 text-gray-500">
                    브랜드를 선택하면 해당 브랜드의 재고 위치별 상세 현황을 확인할 수 있습니다.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSubTab === 'location' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">재고위치별 현황</h3>
              {/* 재고위치별 집계 데이터 */}
              {locationData.length > 0 && (() => {
                const maxValue = Math.max(...locationData.map(d => d.value));

                return (
                  <div className="space-y-4">
                    {locationData.map(({ name, value }) => {
                      const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
                      return (
                        <div key={name} className="flex items-center gap-4">
                          <div className="w-48 text-sm font-medium text-gray-700">
                            {name}
                          </div>
                          <div className="flex-1 relative">
                            <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-sm font-semibold text-gray-800">
                                {formatNumber(value)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {activeSubTab === 'list' && (
            <div>
              {/* 브랜드 검색 드롭다운 */}
              <div className="mb-4 flex justify-end">
                <div className="w-64 relative brand-dropdown-container">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full px-3 py-2 text-left border border-gray-300 rounded-md shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
                    >
                      <span className={selectedBrand === 'all' ? 'text-gray-500' : ''}>
                        {selectedBrand === 'all' ? '전체 브랜드' : selectedBrand}
                      </span>
                      <svg
                        className={`w-5 h-5 transition-transform ${isDropdownOpen ? 'transform rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        <div className="p-2 border-b">
                          <input
                            type="text"
                            placeholder="브랜드 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="py-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBrand('all');
                              setIsDropdownOpen(false);
                              setSearchTerm('');
                            }}
                            className={`w-full px-4 py-2 text-left hover:bg-gray-100 ${
                              selectedBrand === 'all' ? 'bg-blue-50 text-blue-600 font-medium' : ''
                            }`}
                          >
                            전체 브랜드
                          </button>
                          {filteredBrandList.map((brand) => (
                            <button
                              key={brand}
                              type="button"
                              onClick={() => {
                                setSelectedBrand(brand);
                                setIsDropdownOpen(false);
                                setSearchTerm('');
                              }}
                              className={`w-full px-4 py-2 text-left hover:bg-purple-500/20 text-gray-200 ${
                                selectedBrand === brand ? 'bg-blue-50 text-blue-600 font-medium' : ''
                              }`}
                            >
                              {brand}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto" style={{ width: '100%', maxWidth: '100%' }}>
                {filteredData.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {selectedBrand === 'all' 
                      ? `${year}년 ${monthNames[month - 1]} 데이터가 없습니다.`
                      : `${selectedBrand} 브랜드의 ${year}년 ${monthNames[month - 1]} 데이터가 없습니다.`
                    }
                  </div>
                ) : (
                  <table className="w-full text-sm" style={{ tableLayout: 'fixed', minWidth: 'max-content' }}>
                  <thead className="bg-slate-800 sticky top-0 z-10">
                    <tr className="border-b border-purple-500/20">
                      <th className="text-left p-2 font-medium text-gray-200 select-none whitespace-nowrap sticky left-0 bg-slate-800 z-10">
                        브랜드
                      </th>
                      <th className="text-left p-2 font-medium text-gray-200 select-none whitespace-nowrap sticky left-[120px] bg-slate-800 z-10">
                        제품명 (SKU)
                      </th>
                      <th className="text-right p-2 font-medium text-gray-200 select-none whitespace-nowrap">
                        FBA 재고
                      </th>
                      <th className="text-right p-2 font-medium text-gray-200 select-none whitespace-nowrap">
                        Inbound Working
                      </th>
                      <th className="text-right p-2 font-medium text-gray-200 select-none whitespace-nowrap">
                        Inbound Shipped
                      </th>
                      <th className="text-right p-2 font-medium text-gray-200 select-none whitespace-nowrap">
                        Inbound Receiving
                      </th>
                      <th className="text-right p-2 font-medium text-gray-200 select-none whitespace-nowrap">
                        Reserved Orders
                      </th>
                      <th className="text-right p-2 font-medium text-gray-200 select-none whitespace-nowrap">
                        Reserved FC Transfer
                      </th>
                      <th className="text-right p-2 font-medium text-gray-200 select-none whitespace-nowrap">
                        Reserved FC Processing
                      </th>
                      <th className="text-right p-2 font-medium text-yellow-300 select-none whitespace-nowrap">
                        Researching Total
                      </th>
                      <th className="text-right p-2 font-medium text-yellow-300 select-none whitespace-nowrap">
                        Researching Short
                      </th>
                      <th className="text-right p-2 font-medium text-yellow-300 select-none whitespace-nowrap">
                        Researching Mid
                      </th>
                      <th className="text-right p-2 font-medium text-yellow-300 select-none whitespace-nowrap">
                        Researching Long
                      </th>
                      <th className="text-right p-2 font-medium text-red-300 select-none whitespace-nowrap">
                        Unfulfillable Total
                      </th>
                      <th className="text-right p-2 font-medium text-red-300 select-none whitespace-nowrap">
                        Customer Damaged
                      </th>
                      <th className="text-right p-2 font-medium text-red-300 select-none whitespace-nowrap">
                        Warehouse Damaged
                      </th>
                      <th className="text-right p-2 font-medium text-red-300 select-none whitespace-nowrap">
                        Distributor Damaged
                      </th>
                      <th className="text-right p-2 font-medium text-red-300 select-none whitespace-nowrap">
                        Carrier Damaged
                      </th>
                      <th className="text-right p-2 font-medium text-red-300 select-none whitespace-nowrap">
                        Defective
                      </th>
                      <th className="text-right p-2 font-medium text-red-300 select-none whitespace-nowrap">
                        Expired
                      </th>
                      <th className="text-right p-2 font-medium text-emerald-300 select-none whitespace-nowrap">
                        Pending in KR
                      </th>
                      <th className="text-right p-2 font-medium text-emerald-300 select-none whitespace-nowrap">
                        In Air
                      </th>
                      <th className="text-right p-2 font-medium text-emerald-300 select-none whitespace-nowrap">
                        In Ocean
                      </th>
                      <th className="text-right p-2 font-medium text-emerald-300 select-none whitespace-nowrap">
                        SL Glovis
                      </th>
                      <th className="text-right p-2 font-medium text-emerald-300 select-none whitespace-nowrap">
                        CCONMA
                      </th>
                      <th className="text-right p-2 font-medium text-emerald-300 select-none whitespace-nowrap">
                        CTK USA
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {brandNames.map((brandName, brandIdx) => {
                      const products = groupedByBrand[brandName];
                      const brandTotal = brandTotals[brandName];
                      
                      return (
                        <React.Fragment key={brandName}>
                          {/* 브랜드 헤더 행 */}
                          <tr className="bg-purple-500/20 font-semibold border-b border-purple-500/10">
                            <td className="p-2 text-[13px] font-bold text-cyan-300 sticky left-0 bg-purple-500/20 z-10" colSpan={26}>
                              {brandName || 'Unknown'}
                            </td>
                          </tr>
                          {/* 제품별 행 */}
                          {products.map((item, productIdx) => (
                            <tr key={`${item.brand_name}-${item.sku}-${productIdx}`} className="border-b border-purple-500/10 hover:bg-white/5">
                              <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300 sticky left-0 bg-black/40 z-10" title="">
                                {/* 빈 셀 (브랜드명은 헤더에 표시) */}
                              </td>
                              <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-200 font-medium sticky left-[120px] bg-black/40 z-10" title={`${item.product_name || '-'} (${item.sku})`}>
                                <div className="font-medium">{item.product_name || '-'}</div>
                                <div className="text-xs text-gray-400">{item.sku}</div>
                              </td>
                              <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300 text-right" title={formatNumber(item.fba_inventory)}>
                                {formatNumber(item.fba_inventory)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-300 border-r border-border/20">
                                {formatNumber(item.inbound_working)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-300 border-r border-border/20">
                                {formatNumber(item.inbound_shipped)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-300 border-r border-border/20">
                                {formatNumber(item.inbound_receiving)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-300 border-r border-border/20">
                                {formatNumber(item.reserved_orders)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-300 border-r border-border/20">
                                {formatNumber(item.reserved_fc_transfer)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-300 border-r border-border/20">
                                {formatNumber(item.reserved_fc_processing)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 border-r border-gray-200 bg-yellow-50">
                                {formatNumber(item.researching_total)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 border-r border-gray-200 bg-yellow-50">
                                {formatNumber(item.researching_short_term)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 border-r border-gray-200 bg-yellow-50">
                                {formatNumber(item.researching_mid_term)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 border-r border-gray-200 bg-yellow-50">
                                {formatNumber(item.researching_long_term)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 border-r border-gray-200 bg-red-50">
                                {formatNumber(item.unfulfillable_total)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 border-r border-gray-200 bg-red-50">
                                {formatNumber(item.unfulfillable_customer_damaged)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 border-r border-gray-200 bg-red-50">
                                {formatNumber(item.unfulfillable_warehouse_damaged)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 border-r border-gray-200 bg-red-50">
                                {formatNumber(item.unfulfillable_distributor_damaged)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 border-r border-gray-200 bg-red-50">
                                {formatNumber(item.unfulfillable_carrier_damaged)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 border-r border-gray-200 bg-red-50">
                                {formatNumber(item.unfulfillable_defective)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 border-r border-gray-200 bg-red-50">
                                {formatNumber(item.unfulfillable_expired)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 border-r border-gray-200 bg-green-50">
                                {formatNumber(item.pending_in_kr)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 border-r border-gray-200 bg-green-50">
                                {formatNumber(item.in_air)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 border-r border-gray-200 bg-green-50">
                                {formatNumber(item.in_ocean)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 border-r border-gray-200 bg-green-50">
                                {formatNumber(item.sl_glovis)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 border-r border-gray-200 bg-green-50">
                                {formatNumber(item.cconma || 0)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 border-r border-gray-200 bg-green-50">
                                {formatNumber(item.ctk_usa)}
                              </td>
                            </tr>
                          ))}
                          {/* 브랜드별 합계 행 */}
                          <tr className="bg-purple-500/20 font-semibold border-b border-purple-500/10">
                            <td className="p-2 text-[13px] font-medium text-cyan-300 sticky left-0 bg-purple-500/20 z-10">
                              {brandName} 합계
                            </td>
                            <td className="p-2 text-[13px] text-gray-400 sticky left-[120px] bg-purple-500/20 z-10">
                              {products.length}개 제품
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 border-r border-gray-200 border-t border-gray-300">
                              {formatNumber(brandTotal.fba_inventory)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 border-r border-gray-200 border-t border-gray-300">
                              {formatNumber(brandTotal.inbound_working)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 border-r border-gray-200 border-t border-gray-300">
                              {formatNumber(brandTotal.inbound_shipped)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 border-r border-gray-200 border-t border-gray-300">
                              {formatNumber(brandTotal.inbound_receiving)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 border-r border-gray-200 border-t border-gray-300">
                              {formatNumber(brandTotal.reserved_orders)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 border-r border-gray-200 border-t border-gray-300">
                              {formatNumber(brandTotal.reserved_fc_transfer)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 border-r border-gray-200 border-t border-gray-300">
                              {formatNumber(brandTotal.reserved_fc_processing)}
                            </td>
                            <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-yellow-400 text-right font-medium" title={formatNumber(brandTotal.researching_total)}>
                              {formatNumber(brandTotal.researching_total)}
                            </td>
                            <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-yellow-400 text-right font-medium" title={formatNumber(brandTotal.researching_short_term)}>
                              {formatNumber(brandTotal.researching_short_term)}
                            </td>
                            <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-yellow-400 text-right font-medium" title={formatNumber(brandTotal.researching_mid_term)}>
                              {formatNumber(brandTotal.researching_mid_term)}
                            </td>
                            <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-yellow-400 text-right font-medium" title={formatNumber(brandTotal.researching_long_term)}>
                              {formatNumber(brandTotal.researching_long_term)}
                            </td>
                            <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-red-400 text-right font-medium" title={formatNumber(brandTotal.unfulfillable_total)}>
                              {formatNumber(brandTotal.unfulfillable_total)}
                            </td>
                            <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-red-400 text-right font-medium" title={formatNumber(brandTotal.unfulfillable_customer_damaged)}>
                              {formatNumber(brandTotal.unfulfillable_customer_damaged)}
                            </td>
                            <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-red-400 text-right font-medium" title={formatNumber(brandTotal.unfulfillable_warehouse_damaged)}>
                              {formatNumber(brandTotal.unfulfillable_warehouse_damaged)}
                            </td>
                            <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-red-400 text-right font-medium" title={formatNumber(brandTotal.unfulfillable_distributor_damaged)}>
                              {formatNumber(brandTotal.unfulfillable_distributor_damaged)}
                            </td>
                            <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-red-400 text-right font-medium" title={formatNumber(brandTotal.unfulfillable_carrier_damaged)}>
                              {formatNumber(brandTotal.unfulfillable_carrier_damaged)}
                            </td>
                            <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-red-400 text-right font-medium" title={formatNumber(brandTotal.unfulfillable_defective)}>
                              {formatNumber(brandTotal.unfulfillable_defective)}
                            </td>
                            <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-red-400 text-right font-medium" title={formatNumber(brandTotal.unfulfillable_expired)}>
                              {formatNumber(brandTotal.unfulfillable_expired)}
                            </td>
                            <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-emerald-400 text-right font-medium" title={formatNumber(brandTotal.pending_in_kr)}>
                              {formatNumber(brandTotal.pending_in_kr)}
                            </td>
                            <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-emerald-400 text-right font-medium" title={formatNumber(brandTotal.in_air)}>
                              {formatNumber(brandTotal.in_air)}
                            </td>
                            <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-emerald-400 text-right font-medium" title={formatNumber(brandTotal.in_ocean)}>
                              {formatNumber(brandTotal.in_ocean)}
                            </td>
                            <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-emerald-400 text-right font-medium" title={formatNumber(brandTotal.sl_glovis)}>
                              {formatNumber(brandTotal.sl_glovis)}
                            </td>
                            <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-emerald-400 text-right font-medium" title={formatNumber(brandTotal.cconma)}>
                              {formatNumber(brandTotal.cconma)}
                            </td>
                            <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-emerald-400 text-right font-medium" title={formatNumber(brandTotal.ctk_usa)}>
                              {formatNumber(brandTotal.ctk_usa)}
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                    {/* 전체 합계 행 */}
                    <tr className="bg-purple-500/30 font-bold border-t-2 border-purple-500/20">
                      <td className="p-2 text-[13px] font-bold text-cyan-300 sticky left-0 bg-purple-500/30 z-10">
                        전체 합계
                      </td>
                      <td className="p-2 text-[13px] text-gray-400 sticky left-[120px] bg-purple-500/30 z-10">
                        {filteredData.length}개 제품
                      </td>
                      <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300 text-right font-bold" title={formatNumber(total.fba_inventory)}>
                        {formatNumber(total.fba_inventory)}
                      </td>
                      <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300 text-right font-bold" title={formatNumber(total.inbound_working)}>
                        {formatNumber(total.inbound_working)}
                      </td>
                      <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300 text-right font-bold" title={formatNumber(total.inbound_shipped)}>
                        {formatNumber(total.inbound_shipped)}
                      </td>
                      <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300 text-right font-bold" title={formatNumber(total.inbound_receiving)}>
                        {formatNumber(total.inbound_receiving)}
                      </td>
                      <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300 text-right font-bold" title={formatNumber(total.reserved_orders)}>
                        {formatNumber(total.reserved_orders)}
                      </td>
                      <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300 text-right font-bold" title={formatNumber(total.reserved_fc_transfer)}>
                        {formatNumber(total.reserved_fc_transfer)}
                      </td>
                      <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-gray-300 text-right font-bold" title={formatNumber(total.reserved_fc_processing)}>
                        {formatNumber(total.reserved_fc_processing)}
                      </td>
                      <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-yellow-400 text-right font-bold" title={formatNumber(total.researching_total)}>
                        {formatNumber(total.researching_total)}
                      </td>
                      <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-yellow-400 text-right font-bold" title={formatNumber(total.researching_short_term)}>
                        {formatNumber(total.researching_short_term)}
                      </td>
                      <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-yellow-400 text-right font-bold" title={formatNumber(total.researching_mid_term)}>
                        {formatNumber(total.researching_mid_term)}
                      </td>
                      <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-yellow-400 text-right font-bold" title={formatNumber(total.researching_long_term)}>
                        {formatNumber(total.researching_long_term)}
                      </td>
                      <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-red-400 text-right font-bold" title={formatNumber(total.unfulfillable_total)}>
                        {formatNumber(total.unfulfillable_total)}
                      </td>
                      <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-red-400 text-right font-bold" title={formatNumber(total.unfulfillable_customer_damaged)}>
                        {formatNumber(total.unfulfillable_customer_damaged)}
                      </td>
                      <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-red-400 text-right font-bold" title={formatNumber(total.unfulfillable_warehouse_damaged)}>
                        {formatNumber(total.unfulfillable_warehouse_damaged)}
                      </td>
                      <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-red-400 text-right font-bold" title={formatNumber(total.unfulfillable_distributor_damaged)}>
                        {formatNumber(total.unfulfillable_distributor_damaged)}
                      </td>
                      <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-red-400 text-right font-bold" title={formatNumber(total.unfulfillable_carrier_damaged)}>
                        {formatNumber(total.unfulfillable_carrier_damaged)}
                      </td>
                      <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-red-400 text-right font-bold" title={formatNumber(total.unfulfillable_defective)}>
                        {formatNumber(total.unfulfillable_defective)}
                      </td>
                      <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-red-400 text-right font-bold" title={formatNumber(total.unfulfillable_expired)}>
                        {formatNumber(total.unfulfillable_expired)}
                      </td>
                      <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-emerald-400 text-right font-bold" title={formatNumber(total.pending_in_kr)}>
                        {formatNumber(total.pending_in_kr)}
                      </td>
                      <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-emerald-400 text-right font-bold" title={formatNumber(total.in_air)}>
                        {formatNumber(total.in_air)}
                      </td>
                      <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-emerald-400 text-right font-bold" title={formatNumber(total.in_ocean)}>
                        {formatNumber(total.in_ocean)}
                      </td>
                      <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-emerald-400 text-right font-bold" title={formatNumber(total.sl_glovis)}>
                        {formatNumber(total.sl_glovis)}
                      </td>
                      <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-emerald-400 text-right font-bold" title={formatNumber(total.cconma)}>
                        {formatNumber(total.cconma)}
                      </td>
                      <td className="p-2 text-[13px] whitespace-nowrap truncate overflow-hidden text-emerald-400 text-right font-bold" title={formatNumber(total.ctk_usa)}>
                        {formatNumber(total.ctk_usa)}
                      </td>
                    </tr>
                  </tbody>
                </table>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
