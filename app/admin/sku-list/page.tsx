'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SKUMaster, Channel } from '@/lib/types';
import { Search, Trash2, Edit2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SKUListPage() {
  const router = useRouter();
  const [skus, setSkus] = useState<SKUMaster[]>([]);
  const [filteredSKUs, setFilteredSKUs] = useState<SKUMaster[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<Channel>('amazon_us');
  const [deletingSku, setDeletingSku] = useState<string | null>(null);
  const [editingSku, setEditingSku] = useState<string | null>(null);

  const fetchSKUs = async () => {
    try {
      const response = await fetch('/api/sku-master');
      const data = await response.json();
      if (data.data) {
        setSkus(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch SKUs:', error);
    }
  };

  useEffect(() => {
    fetchSKUs();
  }, []);

  // 검색 및 필터링 (선택된 채널 기준)
  useEffect(() => {
    let filtered = skus;
    
    // 선택된 채널로 필터링
    filtered = filtered.filter(sku => sku.channel === selectedChannel);
    
    if (searchTerm) {
      filtered = filtered.filter(sku => 
        sku.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sku.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sku.internal_code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredSKUs(filtered);
  }, [searchTerm, selectedChannel, skus]);

  const handleEdit = (sku: SKUMaster) => {
    router.push(`/admin/sku-master?edit=${sku.sku}`);
  };

  const handleDelete = async (sku: string) => {
    if (!confirm(`SKU "${sku}"을(를) 정말 삭제하시겠습니까?`)) {
      return;
    }

    setDeletingSku(sku);
    try {
      const response = await fetch(
        `/api/sku-master?sku=${encodeURIComponent(sku)}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (response.ok) {
        await fetchSKUs();
      } else {
        alert(data.error || '삭제 중 오류가 발생했습니다.');
      }
    } catch (error: any) {
      alert(error.message || '삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingSku(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          title="뒤로 가기"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-bold">SKU 목록</h1>
      </div>

      {/* 채널 선택 */}
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">채널 선택:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedChannel('amazon_us')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                selectedChannel === 'amazon_us'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Amazon US
            </button>
            <button
              onClick={() => setSelectedChannel('tiktok_shop')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                selectedChannel === 'tiktok_shop'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              TikTok Shop
            </button>
          </div>
        </div>
      </div>

      {/* SKU 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>SKU 목록 ({filteredSKUs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {/* 검색 입력 */}
          <div className="mb-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="SKU, 제품명, Internal Code로 검색..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  초기화
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            {filteredSKUs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {searchTerm ? '검색 결과가 없습니다.' : '등록된 SKU가 없습니다.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[1000px]">
                  <thead className="bg-gray-50" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">제품명</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">SKU</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">Internal Code</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">Child ASIN</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">Amazon 계정명</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">담당자</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">계약 형태</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">판매가</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">공급가</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSKUs.map((sku) => (
                      <tr
                        key={sku.id || sku.sku}
                        className="border-b hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          <div className="font-medium">{sku.product_name || '-'}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{sku.sku}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{sku.internal_code || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{sku.child_asin || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{sku.amazon_account_name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{sku.manager || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{sku.contract_type || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{sku.sales_price ? `$${sku.sales_price.toFixed(2)}` : '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{sku.supply_cost_won ? `₩${sku.supply_cost_won.toLocaleString()}` : '-'}</td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleEdit(sku)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="수정"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(sku.sku)}
                              disabled={deletingSku === sku.sku}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}









