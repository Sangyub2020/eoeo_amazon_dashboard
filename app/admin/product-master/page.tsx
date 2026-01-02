'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProductMaster } from '@/lib/types';
import { Upload, FileText, Plus, Search, Trash2, List, Edit2, CheckSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProductMasterAdminPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<Partial<ProductMaster>>({
    internal_code: '',
    barcode: '',
    product_name: '',
    company_name: '',
    brand_name: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [products, setProducts] = useState<ProductMaster[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductMaster[]>([]);
  const [searchCode, setSearchCode] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'single' | 'bulk'>('list');
  const [bulkText, setBulkText] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductMaster | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/product-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: `제품 "${formData.product_name}"이(가) ${editingProduct ? '수정' : '추가'}되었습니다!` });
        setFormData({
          internal_code: '',
          barcode: '',
          product_name: '',
          company_name: '',
          brand_name: '',
        });
        setEditingProduct(null);
        fetchProducts();
        if (editingProduct) {
          setActiveTab('list');
        }
      } else {
        setMessage({ type: 'error', text: data.error || '오류가 발생했습니다.' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '오류가 발생했습니다.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (!bulkText.trim()) {
      setMessage({ type: 'error', text: '데이터를 입력해주세요.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // 텍스트를 파싱하여 제품 배열로 변환
      const lines = bulkText.trim().split('\n').filter(line => line.trim());
      const products: Partial<ProductMaster>[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // 탭 또는 쉼표로 구분 (쉼표가 따옴표 안에 있으면 무시)
        const parts = line.split(/\t|,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(p => p.trim().replace(/^"|"$/g, ''));
        
        if (parts.length < 2) {
          continue; // 최소 internal_code와 product_name 필요
        }

        // 데이터 정리: 빈 문자열은 undefined로
        const internalCode = parts[0]?.trim();
        const barcode = parts[1]?.trim() || undefined;
        const productName = parts[2]?.trim() || parts[1]?.trim() || undefined;
        const companyName = parts[3]?.trim() || undefined;
        const brandName = parts[4]?.trim() || undefined;

        // 필수 필드 확인
        if (!internalCode || !productName) {
          continue;
        }

        products.push({
          internal_code: internalCode,
          barcode: barcode || undefined,
          product_name: productName,
          company_name: companyName || undefined,
          brand_name: brandName || undefined,
        });
      }

      if (products.length === 0) {
        setMessage({ type: 'error', text: '유효한 데이터가 없습니다.' });
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/product-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(products),
      });

      const data = await response.json();

      if (response.ok) {
        let message = data.message || `${products.length}개의 제품이 성공적으로 추가되었습니다!`;
        if (data.skipped && data.skipped > 0) {
          message = `${data.added || data.data?.length || 0}개의 제품이 추가되었습니다. (${data.skipped}개는 중복으로 제외됨)`;
        }
        if (data.warnings && data.warnings.length > 0) {
          message += ` (경고: ${data.warnings.length}개 행 건너뜀)`;
        }
        setMessage({ 
          type: 'success', 
          text: message
        });
        setBulkText('');
        fetchProducts();
      } else {
        const errorMsg = data.error || '오류가 발생했습니다.';
        const details = data.details ? `\n상세: ${JSON.stringify(data.details)}` : '';
        setMessage({ 
          type: 'error', 
          text: errorMsg + details 
        });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '오류가 발생했습니다.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setIsLoading(true);
    setMessage(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const products: Partial<ProductMaster>[] = [];

      // 첫 번째 줄이 헤더인지 확인
      const startIndex = lines[0]?.toLowerCase().includes('internal_code') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        // CSV 파싱 (쉼표로 구분, 따옴표 처리)
        const parts = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)?.map(p => p.replace(/^"|"$/g, '').trim()) || 
                     line.split(',').map(p => p.trim());

        if (parts.length < 2) continue;

        // 데이터 정리
        const internalCode = parts[0]?.trim();
        const barcode = parts[1]?.trim() || undefined;
        const productName = parts[2]?.trim() || parts[1]?.trim() || undefined;
        const companyName = parts[3]?.trim() || undefined;
        const brandName = parts[4]?.trim() || undefined;

        // 필수 필드 확인
        if (!internalCode || !productName) {
          continue;
        }

        products.push({
          internal_code: internalCode,
          barcode: barcode || undefined,
          product_name: productName,
          company_name: companyName || undefined,
          brand_name: brandName || undefined,
        });
      }

      if (products.length === 0) {
        setMessage({ type: 'error', text: 'CSV 파일에서 유효한 데이터를 찾을 수 없습니다.' });
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/product-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(products),
      });

      const data = await response.json();

      if (response.ok) {
        let message = data.message || `${products.length}개의 제품이 성공적으로 추가되었습니다!`;
        if (data.skipped && data.skipped > 0) {
          message = `${data.added || data.data?.length || 0}개의 제품이 추가되었습니다. (${data.skipped}개는 중복으로 제외됨)`;
        }
        if (data.warnings && data.warnings.length > 0) {
          message += ` (경고: ${data.warnings.length}개 행 건너뜀)`;
        }
        setMessage({ 
          type: 'success', 
          text: message
        });
        setCsvFile(null);
        e.target.value = ''; // 파일 입력 초기화
        fetchProducts();
      } else {
        const errorMsg = data.error || '오류가 발생했습니다.';
        const details = data.details ? `\n상세: ${JSON.stringify(data.details)}` : '';
        setMessage({ 
          type: 'error', 
          text: errorMsg + details 
        });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'CSV 파일을 읽는 중 오류가 발생했습니다.' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async (code?: string) => {
    try {
      const url = code 
        ? `/api/product-master?internal_code=${encodeURIComponent(code)}`
        : '/api/product-master';
      const response = await fetch(url);
      const data = await response.json();
      if (data.data) {
        setProducts(data.data);
        setFilteredProducts(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const handleSearch = async () => {
    if (searchCode.trim()) {
      await fetchProducts(searchCode.trim());
    } else {
      await fetchProducts();
    }
  };

  const handleEdit = (product: ProductMaster) => {
    setFormData({
      internal_code: product.internal_code,
      barcode: product.barcode || '',
      product_name: product.product_name,
      company_name: product.company_name || '',
      brand_name: product.brand_name || '',
    });
    setEditingProduct(product);
    setActiveTab('single');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (internalCode: string) => {
    if (!confirm(`제품 "${internalCode}"을(를) 정말 삭제하시겠습니까?`)) {
      return;
    }

    setDeletingCode(internalCode);
    try {
      const response = await fetch(
        `/api/product-master?internal_code=${encodeURIComponent(internalCode)}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: `제품 "${internalCode}"이(가) 삭제되었습니다.` });
        await fetchProducts(searchCode.trim() || undefined);
        setSelectedProducts(new Set());
      } else {
        setMessage({ type: 'error', text: data.error || '삭제 중 오류가 발생했습니다.' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '삭제 중 오류가 발생했습니다.' });
    } finally {
      setDeletingCode(null);
    }
  };

  const handleSelectProduct = (internalCode: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(internalCode)) {
        newSet.delete(internalCode);
      } else {
        newSet.add(internalCode);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.internal_code)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedProducts.size === 0) {
      setMessage({ type: 'error', text: '삭제할 제품을 선택해주세요.' });
      return;
    }

    if (!confirm(`선택한 ${selectedProducts.size}개의 제품을 정말 삭제하시겠습니까?`)) {
      return;
    }

    setIsDeletingSelected(true);
    setMessage(null);

    try {
      const deletePromises = Array.from(selectedProducts).map(internalCode =>
        fetch(
          `/api/product-master?internal_code=${encodeURIComponent(internalCode)}`,
          { method: 'DELETE' }
        )
      );

      const results = await Promise.all(deletePromises);
      const errors = [];

      for (let i = 0; i < results.length; i++) {
        if (!results[i].ok) {
          const data = await results[i].json();
          errors.push(Array.from(selectedProducts)[i]);
        }
      }

      if (errors.length === 0) {
        setMessage({ type: 'success', text: `${selectedProducts.size}개의 제품이 삭제되었습니다.` });
        setSelectedProducts(new Set());
        await fetchProducts(searchCode.trim() || undefined);
      } else {
        setMessage({ type: 'error', text: `${errors.length}개의 제품 삭제에 실패했습니다.` });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '일괄 삭제 중 오류가 발생했습니다.' });
    } finally {
      setIsDeletingSelected(false);
    }
  };


  useEffect(() => {
    fetchProducts();
  }, []);

  // 검색어가 변경되면 자동으로 검색 (실시간 검색)
  useEffect(() => {
    if (searchCode.trim()) {
      const filtered = products.filter(p => 
        p.internal_code.toLowerCase().includes(searchCode.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [searchCode, products]);

  return (
    <div className="max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">제품 마스터 관리</h1>

      {/* 탭 메뉴 */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'list'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <List className="w-4 h-4 inline mr-2" />
            제품 마스터 목록
          </button>
          <button
            onClick={() => setActiveTab('single')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'single'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Plus className="w-4 h-4 inline mr-2" />
            단일 추가
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'bulk'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            일괄 추가
          </button>
        </div>
      </div>

      {activeTab === 'list' ? (
        /* 제품 목록 - 전체 너비 */
        <Card>
          <CardHeader>
            <CardTitle>제품 목록 ({filteredProducts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {/* 검색 및 일괄 삭제 */}
            <div className="mb-4 space-y-2">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    placeholder="Code로 검색..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  검색
                </button>
                {searchCode && (
                  <button
                    onClick={() => {
                      setSearchCode('');
                      fetchProducts();
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    초기화
                  </button>
                )}
                {selectedProducts.size > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    disabled={isDeletingSelected}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
                  >
                    {isDeletingSelected ? '삭제 중...' : `선택 삭제 (${selectedProducts.size})`}
                  </button>
                )}
              </div>
            </div>

            <div className="relative" style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto', overflowX: 'auto' }}>
              {filteredProducts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  {searchCode ? '검색 결과가 없습니다.' : '등록된 제품이 없습니다.'}
                </p>
              ) : (
                <table className="w-full border-collapse min-w-[800px]">
                  <thead className="bg-gray-50" style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                    <tr>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50 w-12">
                        <input
                          type="checkbox"
                          checked={selectedProducts.size > 0 && selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">Internal Code</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">회사명</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">브랜드</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">Barcode</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">제품명</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr
                        key={product.id}
                        className="border-b hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(product.internal_code)}
                            onChange={() => handleSelectProduct(product.internal_code)}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{product.internal_code}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{product.company_name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{product.brand_name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{product.barcode || '-'}</td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          <div className="font-medium">{product.product_name}</div>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleEdit(product)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="수정"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(product.internal_code)}
                              disabled={deletingCode === product.internal_code}
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
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* 입력 폼 - 상단에 작게 */}
          <div className="max-w-2xl">
          {/* 입력 폼 */}
          <Card>
          <CardHeader>
            <CardTitle>
              {activeTab === 'single' 
                ? (editingProduct ? '제품 수정' : '새 제품 추가')
                : '여러 제품 일괄 추가'}
            </CardTitle>
          </CardHeader>
            <CardContent>
              {activeTab === 'single' ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Internal Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.internal_code}
                    onChange={(e) => setFormData({ ...formData, internal_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="PROD-001"
                    disabled={!!editingProduct}
                  />
                  {editingProduct && (
                    <p className="text-xs text-gray-500 mt-1">Internal Code는 수정할 수 없습니다.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Barcode</label>
                  <input
                    type="text"
                    value={formData.barcode || ''}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="1234567890123"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    제품명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="비타민C 1000mg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">회사명</label>
                  <input
                    type="text"
                    value={formData.company_name || ''}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="이공이공"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">브랜드명</label>
                  <input
                    type="text"
                    value={formData.brand_name || ''}
                    onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="브랜드A"
                  />
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

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {isLoading ? '처리 중...' : editingProduct ? '수정' : '제품 추가'}
                  </button>
                  {editingProduct && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProduct(null);
                        setFormData({
                          internal_code: '',
                          barcode: '',
                          product_name: '',
                          company_name: '',
                          brand_name: '',
                        });
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                      취소
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                {/* CSV 파일 업로드 */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Upload className="w-4 h-4 inline mr-2" />
                    CSV 파일 업로드
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    CSV 형식: Internal Code, Barcode, 제품명, 회사명, 브랜드명
                  </p>
                </div>

                <div className="text-center text-gray-400">또는</div>

                {/* 텍스트 붙여넣기 */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    텍스트 붙여넣기 (엑셀에서 복사)
                  </label>
                  <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={`PROD-001	1234567890123	비타민C 1000mg	이공이공	브랜드A
PROD-002	1234567890124	오메가3	이공이공	브랜드A
PROD-003	1234567890125	프로틴	이공이공	브랜드B`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md h-48 font-mono text-sm"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    엑셀에서 복사한 데이터를 붙여넣으세요. (탭 또는 쉼표로 구분)
                    <br />
                    형식: Internal Code | Barcode | 제품명 | 회사명 | 브랜드명
                  </p>
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

                <button
                  onClick={handleBulkSubmit}
                  disabled={isLoading || !bulkText.trim()}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {isLoading ? '추가 중...' : '일괄 추가'}
                </button>
              </div>
            )}
            </CardContent>
          </Card>
          </div>
        </div>
      )}
    </div>
  );
}
