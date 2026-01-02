'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SKUMaster, SKUMonthlyData, Channel } from '@/lib/types';
import { Plus, Search, CheckSquare, X } from 'lucide-react';

interface MonthlyDataGeneratorProps {
  channel: Channel;
  onDataGenerated?: () => void;
}

interface SKUWithProduct extends SKUMaster {
  product_master?: {
    brand_name?: string;
    company_name?: string;
  } | null;
}

export function MonthlyDataGenerator({ channel, onDataGenerated }: MonthlyDataGeneratorProps) {
  const [showModal, setShowModal] = useState(false);
  const [skus, setSkus] = useState<SKUWithProduct[]>([]);
  const [filteredSKUs, setFilteredSKUs] = useState<SKUWithProduct[]>([]);
  const [selectedSKUs, setSelectedSKUs] = useState<Set<string>>(new Set());
  const [brandFilter, setBrandFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [exchangeRate, setExchangeRate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [generatedData, setGeneratedData] = useState<any[]>([]);
  const [showResult, setShowResult] = useState(false);

  // SKU 목록 가져오기
  useEffect(() => {
    if (showModal) {
      fetchSKUs();
    }
  }, [showModal, channel]);

  const fetchSKUs = async () => {
    try {
      const response = await fetch(`/api/sku-master?channel=${channel}`);
      const result = await response.json();
      if (result.data) {
        const skuList = result.data as SKUWithProduct[];
        setSkus(skuList);
        setFilteredSKUs(skuList);
        // 모든 SKU를 기본으로 선택
        setSelectedSKUs(new Set(skuList.map(sku => sku.sku)));
      }
    } catch (error) {
      console.error('Failed to fetch SKUs:', error);
      setMessage({ type: 'error', text: 'SKU 목록을 가져오는 중 오류가 발생했습니다.' });
    }
  };

  // 브랜드 목록 가져오기
  const getBrands = () => {
    const brands = new Set<string>();
    skus.forEach(sku => {
      const brand = (sku as any).product_master?.brand_name;
      if (brand) {
        brands.add(brand);
      }
    });
    return Array.from(brands).sort();
  };

  // 필터링
  useEffect(() => {
    let filtered = skus;

    // 브랜드 필터
    if (brandFilter) {
      filtered = filtered.filter(sku => 
        (sku as any).product_master?.brand_name === brandFilter
      );
    }

    // 검색어 필터
    if (searchTerm) {
      filtered = filtered.filter(sku =>
        sku.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sku.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sku.internal_code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredSKUs(filtered);
  }, [brandFilter, searchTerm, skus]);

  const handleSelectSKU = (sku: string) => {
    setSelectedSKUs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sku)) {
        newSet.delete(sku);
      } else {
        newSet.add(sku);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedSKUs.size === filteredSKUs.length) {
      setSelectedSKUs(new Set());
    } else {
      setSelectedSKUs(new Set(filteredSKUs.map(sku => sku.sku)));
    }
  };

  const handleGenerate = async () => {
    if (selectedSKUs.size === 0) {
      setMessage({ type: 'error', text: '최소 하나 이상의 SKU를 선택해주세요.' });
      return;
    }

    if (!year || !month || month < 1 || month > 12) {
      setMessage({ type: 'error', text: '연도와 월을 올바르게 입력해주세요.' });
      return;
    }

    if (!exchangeRate || parseFloat(exchangeRate) <= 0) {
      setMessage({ type: 'error', text: '환율을 올바르게 입력해주세요.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/monthly-data/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          skus: Array.from(selectedSKUs),
          year,
          month,
          exchange_rate: parseFloat(exchangeRate),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        const successMsg = result.message || `${result.created_count}개의 데이터가 생성되었습니다.`;
        if (result.skipped_count > 0) {
          setMessage({ 
            type: 'success', 
            text: `${successMsg} (${result.skipped_count}개는 중복으로 제외됨)` 
          });
        } else {
          setMessage({ type: 'success', text: successMsg });
        }
        setGeneratedData(result.data || []);
        setShowModal(false);
        setShowResult(true);
        // 페이지 새로고침하여 최신 데이터 표시
        if (onDataGenerated) {
          onDataGenerated();
        } else {
          window.location.reload();
        }
      } else {
        setMessage({ type: 'error', text: result.error || '데이터 생성 중 오류가 발생했습니다.' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '데이터 생성 중 오류가 발생했습니다.' });
    } finally {
      setIsLoading(false);
    }
  };

  const getBrandName = (sku: SKUWithProduct) => {
    return (sku as any).product_master?.brand_name || '-';
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        월별 데이터 생성
      </button>

      {/* 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">월별 데이터 생성</h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setMessage(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-auto flex-1">
              <div className="space-y-4">
                {/* 입력 필드 */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      연도 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={year}
                      onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="2020"
                      max="2099"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      월 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={month}
                      onChange={(e) => setMonth(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="1"
                      max="12"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      환율 (USD/KRW) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="1300.00"
                      step="0.01"
                    />
                  </div>
                </div>

                {message && (
                  <div
                    className={`p-3 rounded-md ${
                      message.type === 'success'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {message.text}
                  </div>
                )}

                {/* 필터 */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">브랜드 필터</label>
                    <select
                      value={brandFilter}
                      onChange={(e) => setBrandFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">전체 브랜드</option>
                      {getBrands().map(brand => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">검색</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="SKU, 제품명, Internal Code 검색..."
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>

                {/* 선택 정보 */}
                <div className="text-sm text-gray-600">
                  선택된 SKU: {selectedSKUs.size}개 / 전체: {filteredSKUs.length}개
                </div>

                {/* SKU 목록 */}
                <div className="border rounded-md max-h-96 overflow-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b w-12">
                          <input
                            type="checkbox"
                            checked={selectedSKUs.size > 0 && selectedSKUs.size === filteredSKUs.length && filteredSKUs.length > 0}
                            onChange={handleSelectAll}
                            className="w-4 h-4"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">Internal Code</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">SKU</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">브랜드</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">제품명</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSKUs.map((sku) => (
                        <tr key={sku.sku} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedSKUs.has(sku.sku)}
                              onChange={() => handleSelectSKU(sku.sku)}
                              className="w-4 h-4"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{sku.internal_code || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{sku.sku}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{getBrandName(sku)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{sku.product_name || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setMessage(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                disabled={isLoading}
              >
                취소
              </button>
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isLoading ? '생성 중...' : '데이터 생성'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 생성 결과 */}
      {showResult && generatedData.length > 0 && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>생성된 월별 판매 현황 ({year}년 {month}월)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto', overflowX: 'auto' }}>
                  <table className="w-full border-collapse min-w-[1000px]">
                    <thead className="bg-gray-50" style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">Internal Code</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">SKU</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">브랜드</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">제품명</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">환율</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">공급가(원화)</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">공급가(USD)</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">판매가(USD)</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">매출</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">수량</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generatedData.map((data, index) => {
                        const skuMaster = data.sku_master;
                        const internalCode = skuMaster?.internal_code || '-';
                        const monthlyData = data as SKUMonthlyData;
                        const originalSku = skus.find(s => s.sku === monthlyData.sku);
                        const brandName = originalSku ? getBrandName(originalSku) : '-';
                        return (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{internalCode}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{monthlyData.sku}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{brandName}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{skuMaster?.product_name || originalSku?.product_name || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 text-right whitespace-nowrap">
                              {monthlyData.monthly_exchange_rate?.toFixed(4) || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 text-right whitespace-nowrap">
                              {originalSku?.supply_cost_won ? `₩${originalSku.supply_cost_won.toLocaleString()}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 text-right whitespace-nowrap">
                              {monthlyData.supply_cost_usd ? `$${monthlyData.supply_cost_usd.toFixed(2)}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 text-right whitespace-nowrap">
                              {originalSku?.sales_price ? `$${originalSku.sales_price.toFixed(2)}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 text-right whitespace-nowrap">
                              {monthlyData.gross_sales ? `$${monthlyData.gross_sales.toFixed(2)}` : '$0.00'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 text-right whitespace-nowrap">
                              {monthlyData.total_order_quantity || 0}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}









