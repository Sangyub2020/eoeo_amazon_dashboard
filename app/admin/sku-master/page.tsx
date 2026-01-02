'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SKUMaster, Channel, ProductMaster } from '@/lib/types';
import { Upload, FileText, Plus, Search, Trash2, Edit2, Download, List, CheckSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SKUMasterAdminPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<Partial<SKUMaster>>({
    sku: '',
    channel: 'amazon_us',
    internal_code: '',
    product_name: '',
    child_asin: '',
    manager: '',
    contract_type: '',
    amazon_account_name: '',
    rank: undefined,
    sales_price: undefined,
    supply_cost_won: undefined,
    transportation_mode: '',
    is_brand_representative: false,
    is_account_representative: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [skus, setSkus] = useState<SKUMaster[]>([]);
  const [filteredSKUs, setFilteredSKUs] = useState<SKUMaster[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'single' | 'bulk'>('list');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [bulkText, setBulkText] = useState('');
  const [deletingSku, setDeletingSku] = useState<string | null>(null);
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductMaster[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel>('amazon_us');
  const [selectedProduct, setSelectedProduct] = useState<ProductMaster | null>(null);
  const [selectedSKUs, setSelectedSKUs] = useState<Set<string>>(new Set());
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [parsedSKUList, setParsedSKUList] = useState<Partial<SKUMaster>[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // 제품 마스터 목록 가져오기 (internal_code 선택용)
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/product-master');
        const data = await response.json();
        if (data.data) {
          setProducts(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      }
    };
    fetchProducts();
  }, []);

  // internal_code 선택 시 제품명, 브랜드명, 바코드 자동 입력
  useEffect(() => {
    if (formData.internal_code && products.length > 0) {
      const product = products.find(p => p.internal_code === formData.internal_code);
      if (product) {
        setSelectedProduct(product);
        setFormData(prev => ({ 
          ...prev, 
          product_name: product.product_name || '',
          // 브랜드명과 바코드는 제품 마스터에서만 관리되므로 읽기 전용으로 표시
        }));
      } else {
        setSelectedProduct(null);
      }
    } else {
      setSelectedProduct(null);
    }
  }, [formData.internal_code, products]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/sku-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: `SKU "${formData.sku}"이(가) ${editingSku ? '수정' : '추가'}되었습니다!` });
        resetForm();
        fetchSKUs();
      } else {
        setMessage({ type: 'error', text: data.error || '오류가 발생했습니다.' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '오류가 발생했습니다.' });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      sku: '',
      channel: selectedChannel,
      internal_code: '',
      product_name: '',
      child_asin: '',
      manager: '',
      contract_type: '',
      amazon_account_name: '',
      sales_price: undefined,
      supply_cost_won: undefined,
      is_brand_representative: false,
      is_account_representative: false,
    });
    setSelectedProduct(null);
    setEditingSku(null);
  };

  const handleEdit = (sku: SKUMaster) => {
    setFormData({
      sku: sku.sku,
      channel: sku.channel,
      internal_code: sku.internal_code || '',
      product_name: sku.product_name || '',
      child_asin: sku.child_asin || '',
      manager: sku.manager || '',
      contract_type: sku.contract_type || '',
      amazon_account_name: sku.amazon_account_name || '',
      sales_price: sku.sales_price,
      supply_cost_won: sku.supply_cost_won,
      is_brand_representative: sku.is_brand_representative || false,
      is_account_representative: sku.is_account_representative || false,
    });
    // 제품 정보도 로드
    if (sku.internal_code && products.length > 0) {
      const product = products.find(p => p.internal_code === sku.internal_code);
      setSelectedProduct(product || null);
    }
    setSelectedChannel(sku.channel);
    setEditingSku(sku.sku);
    setActiveTab('single');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        setMessage({ type: 'success', text: `SKU "${sku}"이(가) 삭제되었습니다.` });
        await fetchSKUs();
        setSelectedSKUs(prev => {
          const newSet = new Set(prev);
          newSet.delete(sku);
          return newSet;
        });
      } else {
        setMessage({ type: 'error', text: data.error || '삭제 중 오류가 발생했습니다.' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '삭제 중 오류가 발생했습니다.' });
    } finally {
      setDeletingSku(null);
    }
  };

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

  const handleSelectAllSKUs = () => {
    if (selectedSKUs.size === filteredSKUs.length) {
      setSelectedSKUs(new Set());
    } else {
      setSelectedSKUs(new Set(filteredSKUs.map(sku => sku.sku)));
    }
  };

  const handleDeleteSelectedSKUs = async () => {
    if (selectedSKUs.size === 0) {
      setMessage({ type: 'error', text: '삭제할 SKU를 선택해주세요.' });
      return;
    }

    if (!confirm(`선택한 ${selectedSKUs.size}개의 SKU를 정말 삭제하시겠습니까?`)) {
      return;
    }

    setIsDeletingSelected(true);
    setMessage(null);

    try {
      const deletePromises = Array.from(selectedSKUs).map(sku =>
        fetch(
          `/api/sku-master?sku=${encodeURIComponent(sku)}`,
          { method: 'DELETE' }
        )
      );

      const results = await Promise.all(deletePromises);
      const errors = [];

      for (let i = 0; i < results.length; i++) {
        if (!results[i].ok) {
          errors.push(Array.from(selectedSKUs)[i]);
        }
      }

      if (errors.length === 0) {
        setMessage({ type: 'success', text: `${selectedSKUs.size}개의 SKU가 삭제되었습니다.` });
        setSelectedSKUs(new Set());
        await fetchSKUs();
      } else {
        setMessage({ type: 'error', text: `${errors.length}개의 SKU 삭제에 실패했습니다.` });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '일괄 삭제 중 오류가 발생했습니다.' });
    } finally {
      setIsDeletingSelected(false);
    }
  };

  const handleDownloadExampleCsv = () => {
    // CSV 헤더 (고정 형식 - 모든 필드를 따옴표로 감싸서 형식 고정)
    const headers = [
      'SKU',
      'Internal Code',
      'Child ASIN',
      '담당자',
      '계약 형태',
      'Amazon 계정명',
      '판매가',
      '공급가',
      '브랜드 대표(Y/N)',
      '계정 대표(Y/N)'
    ];

    // 예시 데이터 (모든 필드를 따옴표로 감싸서 형식 고정)
    const exampleData = [
      [
        'AMZ-PROD-001',
        'PROD-001',
        'B08XYZ123',
        '홍길동',
        '파트너십',
        'Account1',
        '29.99',
        '15000',
        'Y',
        'N'
      ],
      [
        'AMZ-PROD-002',
        'PROD-002',
        'B08XYZ124',
        '김철수',
        '운영대행',
        'Account2',
        '39.99',
        '20000',
        'N',
        'Y'
      ]
    ];

    // CSV 내용 생성 - 모든 필드를 따옴표로 감싸서 형식 고정
    const escapeCsvField = (field: string): string => {
      // 따옴표를 이스케이프 ("" -> "")
      const escaped = field.replace(/"/g, '""');
      // 모든 필드를 따옴표로 감싸기
      return `"${escaped}"`;
    };

    const csvContent = [
      headers.map(escapeCsvField).join(','),
      ...exampleData.map(row => row.map(escapeCsvField).join(','))
    ].join('\r\n');

    // BOM 추가 (Excel에서 한글 깨짐 방지)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SKU_마스터_일괄추가_예시_Amazon_US.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parseCsvText = (text: string): Partial<SKUMaster>[] => {
    try {
      // BOM 제거 (UTF-8 BOM: \uFEFF)
      if (text.length > 0 && text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
      }
      
      // 줄바꿈 정규화 (CRLF -> LF)
      text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      const lines = text.split('\n').filter(line => line.trim());
      const skuList: Partial<SKUMaster>[] = [];

      // 첫 번째 줄이 헤더인지 확인 (간단하게 SKU 포함 여부로 판단)
      let startIndex = 0;
      if (lines.length > 0) {
        const firstLine = lines[0].toLowerCase();
        // SKU가 포함되어 있으면 헤더로 간주
        if (firstLine.includes('sku')) {
          startIndex = 1;
        }
      }

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        // 탭으로 구분 (구글 시트에서 복사한 데이터)
        const parts = line.split('\t').map(p => p.trim());

        if (parts.length < 2) continue;

        // 순서대로 매핑: SKU, Internal Code, [제품명(무시)], Child ASIN, 담당자, 계약 형태, Amazon 계정명, 판매가, 공급가, ...
        // 제품명 필드는 제품 마스터에서 자동으로 가져오므로 무시
        const sku = parts[0]?.trim() || '';
        const internalCode = parts[1]?.trim() || undefined;
        
        // parts[2]가 ASIN인지 확인 (B0으로 시작하면 ASIN, 아니면 제품명으로 간주하고 무시)
        const part2 = parts[2]?.trim() || '';
        const part3 = parts[3]?.trim() || '';
        
        let childAsin: string | undefined = undefined;
        let manager: string | undefined = undefined;
        let contractType: string | undefined = undefined;
        let amazonAccountName: string | undefined = undefined;
        let salesPriceStr = '';
        let supplyCostWonStr = '';
        let startYIndex = 9; // 기본값 (제품명이 있는 경우)
        
        if (part2.toUpperCase().startsWith('B0')) {
          // parts[2]가 ASIN이면 제품명 필드가 없거나 비어있는 것
          childAsin = part2;
          manager = parts[3]?.trim() || undefined;
          contractType = parts[4]?.trim() || undefined;
          amazonAccountName = parts[5]?.trim() || undefined;
          salesPriceStr = parts[6]?.trim() || '';
          supplyCostWonStr = parts[7]?.trim() || '';
          startYIndex = 8;
        } else if (part3.toUpperCase().startsWith('B0')) {
          // parts[3]이 ASIN이면 parts[2]는 제품명(무시)
          childAsin = part3;
          manager = parts[4]?.trim() || undefined;
          contractType = parts[5]?.trim() || undefined;
          amazonAccountName = parts[6]?.trim() || undefined;
          salesPriceStr = parts[7]?.trim() || '';
          supplyCostWonStr = parts[8]?.trim() || '';
          startYIndex = 9;
        } else {
          // ASIN을 찾을 수 없으면 스킵
          continue;
        }
        
        // 브랜드 대표, 계정 대표 찾기 (뒤쪽 필드에서 Y 찾기)
        let isBrandRep = false;
        let isAccountRep = false;
        for (let j = startYIndex; j < parts.length; j++) {
          const part = parts[j]?.trim().toUpperCase();
          if (part === 'Y' || part === 'TRUE' || part === '1') {
            if (!isBrandRep) {
              isBrandRep = true;
            } else if (!isAccountRep) {
              isAccountRep = true;
              break;
            }
          }
        }
        
        // 판매가 파싱 (달러, 숫자 변환)
        // 판매가는 달러이므로 $ 기호 제거, 쉼표, 공백, 탭 제거
        const cleanedSalesPrice = salesPriceStr
          .replace(/[$₩원,\s\t]/g, '')  // 달러 기호, 원화 기호, 쉼표, 공백, 탭 제거
          .replace(/^-+|-+$/g, '');    // 앞뒤 하이픈 제거
        
        let salesPrice: number | undefined = undefined;
        if (cleanedSalesPrice && cleanedSalesPrice !== '-' && cleanedSalesPrice !== '') {
          const parsed = parseFloat(cleanedSalesPrice);
          if (!isNaN(parsed) && parsed > 0) {
            salesPrice = parsed;
          }
        }
        
        // 공급가 파싱 (원화, 숫자 변환)
        // 공급가는 원화이므로 ₩, 원 기호 제거, 쉼표, 공백, 탭 제거
        const cleanedSupplyCost = supplyCostWonStr
          .replace(/[$₩원,\s\t]/g, '')  // 달러, 원화 기호, 쉼표, 공백, 탭 제거
          .replace(/^-+|-+$/g, '');    // 앞뒤 하이픈 제거
        
        let supplyCostWon: number | undefined = undefined;
        if (cleanedSupplyCost && cleanedSupplyCost !== '-' && cleanedSupplyCost !== '' && cleanedSupplyCost !== '0') {
          const parsed = parseFloat(cleanedSupplyCost);
          if (!isNaN(parsed) && parsed > 0) {
            supplyCostWon = parsed;
          }
        }

        if (!sku) {
          continue;
        }

        // Internal Code가 있으면 제품 마스터에서 제품명 자동 조회
        let productName: string | undefined = undefined;
        if (internalCode && products.length > 0) {
          const product = products.find(p => p.internal_code === internalCode);
          if (product) {
            productName = product.product_name;
          }
        }

        skuList.push({
          sku,
          channel: 'amazon_us', // 채널은 Amazon US로 고정
          internal_code: internalCode,
          product_name: productName,
          child_asin: childAsin,
          manager,
          contract_type: contractType,
          amazon_account_name: amazonAccountName,
          sales_price: salesPrice,
          supply_cost_won: supplyCostWon,
          is_brand_representative: isBrandRep,
          is_account_representative: isAccountRep,
        });
      }

      return skuList;
    } catch (error: any) {
      throw error;
    }
  };

  const parseCsvFile = async (file: File): Promise<Partial<SKUMaster>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          let text: string;
          
          // ArrayBuffer로 읽어서 TextDecoder로 명시적으로 UTF-8 디코딩
          if (e.target?.result instanceof ArrayBuffer) {
            // BOM 확인 및 제거
            const uint8Array = new Uint8Array(e.target.result);
            let offset = 0;
            
            // UTF-8 BOM 체크 (EF BB BF)
            if (uint8Array.length >= 3 && 
                uint8Array[0] === 0xEF && 
                uint8Array[1] === 0xBB && 
                uint8Array[2] === 0xBF) {
              offset = 3;
            }
            
            const decoder = new TextDecoder('utf-8');
            text = decoder.decode(uint8Array.slice(offset));
          } else {
            text = e.target?.result as string;
          }
          
          const skuList = parseCsvText(text);
          resolve(skuList);
        } catch (error: any) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
      };
      
      // ArrayBuffer로 읽어서 명시적으로 UTF-8 디코딩
      reader.readAsArrayBuffer(file);
    });
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setIsLoading(true);
    setMessage(null);

    try {
      const skuList = await parseCsvFile(file);

      if (skuList.length === 0) {
        setMessage({ type: 'error', text: 'CSV 파일에서 유효한 데이터를 찾을 수 없습니다.' });
        setIsLoading(false);
        return;
      }

      // 미리보기 표시
      setParsedSKUList(skuList);
      setShowPreview(true);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'CSV 파일을 읽는 중 오류가 발생했습니다.' });
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
      const skuList = parseCsvText(bulkText);

      if (skuList.length === 0) {
        setMessage({ type: 'error', text: '유효한 데이터가 없습니다.' });
        setIsLoading(false);
        return;
      }

      // 미리보기 표시
      setParsedSKUList(skuList);
      setShowPreview(true);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '데이터를 파싱하는 중 오류가 발생했습니다.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmBulkAdd = async () => {
    if (parsedSKUList.length === 0) {
      setMessage({ type: 'error', text: '추가할 데이터가 없습니다.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/sku-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedSKUList),
      });

      const data = await response.json();

      if (response.ok) {
        let message = data.message || `${parsedSKUList.length}개의 SKU가 성공적으로 추가되었습니다!`;
        if (data.skipped && data.skipped > 0) {
          message = `${data.added || data.data?.length || 0}개의 SKU가 추가되었습니다. (${data.skipped}개는 중복으로 제외됨)`;
        }
        if (data.warnings && data.warnings.length > 0) {
          message += ` (경고: ${data.warnings.length}개 행 건너뜀)`;
        }
        setMessage({ type: 'success', text: message });
        setCsvFile(null);
        setBulkText('');
        setShowPreview(false);
        setParsedSKUList([]);
        if (document.querySelector('input[type="file"]')) {
          (document.querySelector('input[type="file"]') as HTMLInputElement).value = '';
        }
        fetchSKUs();
      } else {
        const errorMsg = data.error || '오류가 발생했습니다.';
        const details = data.details ? `\n상세: ${JSON.stringify(data.details)}` : '';
        setMessage({ type: 'error', text: errorMsg + details });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'SKU 추가 중 오류가 발생했습니다.' });
    } finally {
      setIsLoading(false);
    }
  };

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

  // 브랜드명 가져오기 (product_master 조인 데이터)
  const getBrandName = (sku: SKUMaster & { product_master?: { brand_name?: string } | null }) => {
    return (sku as any).product_master?.brand_name || '-';
  };

  // 채널별 필드 표시 여부
  const isAmazon = formData.channel === 'amazon_us';
  const isTikTok = formData.channel === 'tiktok_shop';

  // 채널 변경 시 formData도 업데이트
  useEffect(() => {
    if (!editingSku) {
      setFormData(prev => ({ ...prev, channel: selectedChannel }));
    }
  }, [selectedChannel, editingSku]);

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">SKU 마스터 관리</h1>

      {/* 채널 선택 */}
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">채널 선택:</span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSelectedChannel('amazon_us');
                if (!editingSku) {
                  setFormData(prev => ({ ...prev, channel: 'amazon_us' }));
                }
              }}
              disabled={!!editingSku}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                selectedChannel === 'amazon_us'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${editingSku ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Amazon US
            </button>
            <button
              onClick={() => {
                setSelectedChannel('tiktok_shop');
                if (!editingSku) {
                  setFormData(prev => ({ ...prev, channel: 'tiktok_shop' }));
                }
              }}
              disabled={!!editingSku}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                selectedChannel === 'tiktok_shop'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${editingSku ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              TikTok Shop
            </button>
          </div>
        </div>
      </div>

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
            SKU 목록
          </button>
          <button
            onClick={() => {
              setActiveTab('single');
              resetForm();
              setFormData(prev => ({ ...prev, channel: selectedChannel }));
            }}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'single'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Plus className="w-4 h-4 inline mr-2" />
            {editingSku ? 'SKU 수정' : '단일 추가'}
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

      <div className="space-y-6">
        {/* 입력 폼 - 단일 추가일 때만 표시 */}
        {activeTab === 'single' && (
          <div className="max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingSku ? 'SKU 수정' : '새 SKU 추가'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Internal Code <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.internal_code || ''}
                    onChange={(e) => setFormData({ ...formData, internal_code: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">선택하세요</option>
                    {products.map((product) => (
                      <option key={product.internal_code} value={product.internal_code}>
                        {product.internal_code} - {product.product_name}
                      </option>
                    ))}
                  </select>
                  {selectedProduct && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-md text-sm">
                      <div className="text-gray-700"><strong>브랜드:</strong> {selectedProduct.brand_name || '-'}</div>
                      <div className="text-gray-700"><strong>바코드:</strong> {selectedProduct.barcode || '-'}</div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    채널 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.channel === 'amazon_us' ? 'Amazon US' : 'TikTok Shop'}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                  />
                  <p className="text-xs text-gray-500 mt-1">채널은 상단의 채널 선택 버튼으로 변경하세요.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    SKU <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="AMZ-PROD-001"
                    disabled={!!editingSku}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">제품명</label>
                  <input
                    type="text"
                    value={formData.product_name || ''}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    placeholder="비타민C 1000mg"
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">제품 마스터에서 자동으로 가져옵니다.</p>
                </div>

                {/* Amazon 전용 필드 */}
                {isAmazon && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Child ASIN</label>
                      <input
                        type="text"
                        value={formData.child_asin || ''}
                        onChange={(e) => setFormData({ ...formData, child_asin: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="B08XYZ123"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Amazon 계정명</label>
                      <input
                        type="text"
                        value={formData.amazon_account_name || ''}
                        onChange={(e) => setFormData({ ...formData, amazon_account_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Amazon Account 1"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">담당자</label>
                  <input
                    type="text"
                    value={formData.manager || ''}
                    onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="홍길동"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">계약 형태</label>
                  <select
                    value={formData.contract_type || ''}
                    onChange={(e) => setFormData({ ...formData, contract_type: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">선택하세요</option>
                    <option value="파트너십">파트너십</option>
                    <option value="운영대행">운영대행</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">판매가</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sales_price || ''}
                    onChange={(e) => setFormData({ ...formData, sales_price: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="29.99"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">공급가 (원화)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.supply_cost_won || ''}
                    onChange={(e) => setFormData({ ...formData, supply_cost_won: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="15000"
                  />
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_brand_representative || false}
                      onChange={(e) => setFormData({ ...formData, is_brand_representative: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm">브랜드 대표</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_account_representative || false}
                      onChange={(e) => setFormData({ ...formData, is_account_representative: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm">계정 대표</span>
                  </label>
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
                    {isLoading ? '처리 중...' : editingSku ? '수정' : 'SKU 추가'}
                  </button>
                  {editingSku && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                      취소
                    </button>
                  )}
                </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 일괄 추가 - 일괄 추가 탭일 때만 표시 */}
        {activeTab === 'bulk' && (
          <div className="max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>여러 SKU 일괄 추가</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium">
                        <Upload className="w-4 h-4 inline mr-2" />
                        CSV 파일 업로드
                      </label>
                      <button
                        type="button"
                        onClick={handleDownloadExampleCsv}
                        className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        예시 파일 다운로드
                      </button>
                    </div>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvUpload}
                      disabled={isLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      <span className="font-semibold text-red-600">⚠️ 중요: 예시 파일의 형식을 정확히 따라주세요. 헤더나 열 순서를 변경하시면 오류가 발생합니다.</span>
                      <br />
                      CSV 형식: SKU, Internal Code, Child ASIN, 담당자, 계약 형태, Amazon 계정명, 판매가, 공급가, 브랜드 대표(Y/N), 계정 대표(Y/N)
                      <br />
                      <span className="text-gray-400">※ 채널은 Amazon US로 고정되며, Internal Code 입력 시 제품명은 자동으로 채워집니다.</span>
                      <br />
                      <span className="text-gray-400">※ 판매가는 달러(숫자만), 공급가는 원화(숫자만)로 입력하세요. 예: 판매가 29.99, 공급가 15000</span>
                    </p>
                  </div>

                  <div className="text-center text-gray-400">또는</div>

                  {/* 텍스트 붙여넣기 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      <FileText className="w-4 h-4 inline mr-2" />
                      텍스트 붙여넣기 (엑셀에서 복사)
                    </label>
                    <textarea
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      placeholder={`SKU,Internal Code,Child ASIN,담당자,계약 형태,Amazon 계정명,판매가,공급가,브랜드 대표(Y/N),계정 대표(Y/N)
SKU-001,PROD-001,B08XYZ123,홍길동,정액,MARS MADE,29.99,15000,Y,N
SKU-002,PROD-002,B08XYZ124,김철수,정률,Tangerine Stories,39.99,20000,N,Y`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md h-48 font-mono text-sm"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      엑셀에서 복사한 데이터를 붙여넣으세요. (쉼표로 구분)
                      <br />
                      형식: SKU, Internal Code, Child ASIN, 담당자, 계약 형태, Amazon 계정명, 판매가, 공급가, 브랜드 대표(Y/N), 계정 대표(Y/N)
                      <br />
                      <span className="text-gray-400">※ 첫 번째 줄은 헤더여야 합니다.</span>
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
                    {isLoading ? '파싱 중...' : '일괄 추가'}
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 미리보기 모달 */}
        {showPreview && parsedSKUList.length > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col">
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold">일괄 추가 미리보기</h2>
                <p className="text-sm text-gray-500 mt-1">총 {parsedSKUList.length}개의 SKU가 추가됩니다. 확인 후 추가하시겠습니까?</p>
              </div>
              <div className="p-6 overflow-auto flex-1">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[1000px]">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">SKU</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">Internal Code</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">제품명</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">Child ASIN</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">담당자</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">계약 형태</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">Amazon 계정명</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">판매가</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">공급가</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedSKUList.map((sku, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{sku.sku}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{sku.internal_code || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{sku.product_name || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{sku.child_asin || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{sku.manager || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{sku.contract_type || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{sku.amazon_account_name || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {sku.sales_price ? `$${sku.sales_price.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {sku.supply_cost_won ? `₩${sku.supply_cost_won.toLocaleString()}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setParsedSKUList([]);
                    setCsvFile(null);
                    if (document.querySelector('input[type="file"]')) {
                      (document.querySelector('input[type="file"]') as HTMLInputElement).value = '';
                    }
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  disabled={isLoading}
                >
                  취소
                </button>
                <button
                  onClick={handleConfirmBulkAdd}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {isLoading ? '추가 중...' : '추가하기'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SKU 목록 - 항상 하위에 표시 */}
        <Card>
          <CardHeader>
            <CardTitle>SKU 목록 ({filteredSKUs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {/* 검색 및 일괄 삭제 */}
            <div className="mb-4 space-y-2">
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
                {selectedSKUs.size > 0 && (
                  <button
                    onClick={handleDeleteSelectedSKUs}
                    disabled={isDeletingSelected}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
                  >
                    {isDeletingSelected ? '삭제 중...' : `선택 삭제 (${selectedSKUs.size})`}
                  </button>
                )}
              </div>
            </div>

            <div className="relative" style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto', overflowX: 'auto' }}>
              {filteredSKUs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  {searchTerm ? '검색 결과가 없습니다.' : '등록된 SKU가 없습니다.'}
                </p>
              ) : (
                <table className="w-full border-collapse min-w-[1200px]">
                  <thead className="bg-gray-50" style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                    <tr>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50 w-12">
                        <input
                          type="checkbox"
                          checked={selectedSKUs.size > 0 && selectedSKUs.size === filteredSKUs.length}
                          onChange={handleSelectAllSKUs}
                          className="w-4 h-4"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">Internal Code</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">브랜드</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">Amazon 계정명</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">Child ASIN</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">SKU</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">제품명</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">담당자</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b whitespace-nowrap bg-gray-50">계약형태</th>
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
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedSKUs.has(sku.sku)}
                            onChange={() => handleSelectSKU(sku.sku)}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{sku.internal_code || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{getBrandName(sku as any)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{sku.amazon_account_name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{sku.child_asin || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{sku.sku}</td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          <div className="font-medium">{sku.product_name || '-'}</div>
                        </td>
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
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



