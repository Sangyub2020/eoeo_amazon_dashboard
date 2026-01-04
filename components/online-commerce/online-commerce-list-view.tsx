'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { ServiceRevenue } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Search, Download, Settings, ChevronDown, ChevronUp, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

const ITEMS_PER_PAGE = 100;

type SortField = 'category' | 'vendorCode' | 'companyName' | 'brandNames' | 'project' | 'projectName' | 'projectCode' | 'expectedDepositDate' | 'expectedDepositAmount' | 'depositDate' | 'depositAmount' | null;
type SortDirection = 'asc' | 'desc';

export function OnlineCommerceListView() {
  const [data, setData] = useState<ServiceRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchColumns, setSearchColumns] = useState<string[]>(['companyName', 'projectName', 'vendorCode']);
  const [depositStatusFilter, setDepositStatusFilter] = useState<'입금완료' | '입금예정' | '입금지연' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  
  const allColumns = [
    { key: 'number', label: '번호', alwaysVisible: true },
    { key: 'category', label: '거래 유형', alwaysVisible: false },
    { key: 'projectCode', label: '프로젝트 코드', alwaysVisible: false },
    { key: 'project', label: '프로젝트', alwaysVisible: false },
    { key: 'projectName', label: '프로젝트명', alwaysVisible: true },
    { key: 'vendorCode', label: '거래처코드', alwaysVisible: false },
    { key: 'companyName', label: '회사명', alwaysVisible: true },
    { key: 'brandNames', label: '브랜드명', alwaysVisible: false },
    { key: 'depositStatus', label: '입금여부', alwaysVisible: true },
    { key: 'expectedDepositDate', label: '입금예정일', alwaysVisible: true },
    { key: 'expectedDepositAmount', label: '입금예정금액', alwaysVisible: true },
    { key: 'depositDate', label: '입금일', alwaysVisible: true },
    { key: 'depositAmount', label: '입금액', alwaysVisible: true },
    { key: 'invoiceSupplyPrice', label: '세금계산서 공급가액', alwaysVisible: false },
    { key: 'oneTimeExpenseAmount', label: '일시불 실비', alwaysVisible: false },
    { key: 'invoiceAttachmentStatus', label: '세금계산서 첨부', alwaysVisible: false },
    { key: 'businessRegistrationNumber', label: '사업자번호', alwaysVisible: false },
    { key: 'invoiceEmail', label: '세금계산서 이메일', alwaysVisible: false },
    { key: 'eoeoManager', label: '이공이공 담당자', alwaysVisible: false },
    { key: 'contractLink', label: '계약서 링크', alwaysVisible: false },
    { key: 'estimateLink', label: '견적서 링크', alwaysVisible: false },
    { key: 'attributionYearMonth', label: '귀속 연월', alwaysVisible: false },
    { key: 'advanceBalance', label: '선/잔금', alwaysVisible: false },
    { key: 'ratio', label: '비율', alwaysVisible: false },
    { key: 'description', label: '비고', alwaysVisible: false },
    { key: 'createdDate', label: '등록일', alwaysVisible: false },
    { key: 'issueNotes', label: '발행 메모', alwaysVisible: false },
    { key: 'taxStatus', label: '세금 상태', alwaysVisible: false },
  ];

  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(allColumns.filter(col => 
      col.key !== 'projectCode' && 
      col.key !== 'createdDate' && 
      col.key !== 'businessRegistrationNumber' && 
      col.key !== 'invoiceEmail'
    ).map(col => col.key))
  );

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    number: 60,
    category: 120,
    projectCode: 120,
    project: 100,
    projectName: 150,
    vendorCode: 120,
    companyName: 150,
    brandNames: 150,
    depositStatus: 100,
    expectedDepositDate: 120,
    expectedDepositAmount: 120,
    depositDate: 120,
    depositAmount: 120,
    invoiceSupplyPrice: 140,
    oneTimeExpenseAmount: 120,
    invoiceAttachmentStatus: 120,
    businessRegistrationNumber: 120,
    invoiceEmail: 180,
    eoeoManager: 120,
    contractLink: 120,
    estimateLink: 120,
    attributionYearMonth: 100,
    advanceBalance: 100,
    ratio: 80,
    description: 200,
    createdDate: 120,
    issueNotes: 200,
    taxStatus: 100,
  });

  const searchableColumns = [
    { value: 'companyName', label: '회사명' },
    { value: 'projectName', label: '프로젝트명' },
    { value: 'vendorCode', label: '거래처코드' },
    { value: 'projectCode', label: '프로젝트 코드' },
    { value: 'brandNames', label: '브랜드명' },
    { value: 'category', label: '거래 유형' },
  ];

  useEffect(() => {
    fetchRecords();
  }, [depositStatusFilter]);

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('team', 'online_commerce');
      if (depositStatusFilter) params.append('depositStatus', depositStatusFilter);
      if (searchQuery) params.append('search', searchQuery);
      params.append('_t', Date.now().toString());

      const response = await fetch(`/api/service-revenue?${params.toString()}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('입금 목록을 불러오는데 실패했습니다.');
      }

      const result = await response.json();

      if (result.success) {
        const formattedRecords = result.data.map((r: any) => ({
          ...r,
          expectedDepositCurrency: r.expectedDepositCurrency || 'KRW',
          depositCurrency: r.depositCurrency || 'KRW',
          hasWarning: !r.vendorCode || !r.category || !r.projectCode,
        }));
        setData(formattedRecords);
      } else {
        setError(result.error || '입금 목록을 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchRecords();
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortField) return data;

    return [...data].sort((a, b) => {
      let aVal: any = (a as any)[sortField];
      let bVal: any = (b as any)[sortField];

      if (sortField === 'brandNames') {
        aVal = Array.isArray(aVal) ? aVal.join(', ') : aVal || '';
        bVal = Array.isArray(bVal) ? bVal.join(', ') : bVal || '';
      }

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });
  }, [data, sortField, sortDirection]);

  const filteredData = useMemo(() => {
    let filtered = sortedData;

    // 검색 필터
    if (searchQuery && searchColumns.length > 0) {
      const term = searchQuery.toLowerCase();
      filtered = filtered.filter((item) => {
        return searchColumns.some((col) => {
          const value = (item as any)[col];
          if (col === 'brandNames' && Array.isArray(value)) {
            return value.some((brand: string) => brand.toLowerCase().includes(term));
          }
          return value?.toString().toLowerCase().includes(term);
        });
      });
    }

    // 입금여부 필터 (이미 API에서 처리되지만 클라이언트에서도 적용)
    if (depositStatusFilter) {
      filtered = filtered.filter((item) => item.depositStatus === depositStatusFilter);
    }

    return filtered;
  }, [sortedData, searchQuery, searchColumns, depositStatusFilter]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentPageRecords = filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const getDepositStatus = (record: ServiceRevenue): '입금완료' | '입금예정' | '입금지연' => {
    if (record.depositAmount && record.depositAmount > 0) {
      return '입금완료';
    }
    if (record.expectedDepositDate) {
      const expectedDate = new Date(record.expectedDepositDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expectedDate.setHours(0, 0, 0, 0);
      return expectedDate < today ? '입금지연' : '입금예정';
    }
    return '입금예정';
  };

  const getDepositStatusBadge = (status?: string) => {
    const finalStatus = status || '입금예정';
    
    const styles = {
      입금완료: 'bg-green-500/20 text-green-400 border-green-500/30',
      입금예정: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      입금지연: 'bg-red-500/20 text-red-400 border-red-500/30',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs border ${styles[finalStatus as keyof typeof styles] || ''}`}>
        {finalStatus}
      </span>
    );
  };

  const getCategoryBadge = (category?: string) => {
    if (!category) return null;
    
    const categoryColors: Record<string, string> = {
      '광고': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      '운영': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      '기타': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };

    const colorClass = categoryColors[category] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';

    return (
      <span className={`px-2 py-1 rounded text-xs border ${colorClass}`}>
        {category}
      </span>
    );
  };

  const handleDownloadCSV = () => {
    const csv = convertToCSV(filteredData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `online_commerce_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const convertToCSV = (data: ServiceRevenue[]) => {
    if (data.length === 0) return '';

    const visibleCols = allColumns.filter(col => visibleColumns.has(col.key));
    const headers = visibleCols.map(col => col.label);
    
    const csvRows = [
      headers.join(','),
      ...data.map((row) =>
        visibleCols.map((col) => {
          let value: any = (row as any)[col.key];
          if (col.key === 'brandNames' && Array.isArray(value)) {
            value = value.join('; ');
          }
          if (value === null || value === undefined) return '';
          if (typeof value === 'number') {
            if (col.key.includes('Amount') || col.key.includes('Price')) {
              return value;
            }
            return value;
          }
          return String(value).replace(/"/g, '""');
        }).join(',')
      ),
    ];

    return csvRows.join('\n');
  };

  const toggleColumn = (column: string) => {
    const columnDef = allColumns.find(col => col.key === column);
    if (columnDef?.alwaysVisible) return; // 항상 표시되는 열은 토글 불가

    setVisibleColumns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(column)) {
        newSet.delete(column);
      } else {
        newSet.add(column);
      }
      return newSet;
    });
  };

  const handleResizeStart = (e: React.MouseEvent, column: string) => {
    e.preventDefault();
    setResizingColumn(column);
    const startX = e.clientX;
    const startWidth = columnWidths[column] || 100;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX;
      const minWidth = 60;
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

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 inline ml-1 text-gray-400" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-4 h-4 inline ml-1 text-cyan-400" />
    ) : (
      <ArrowDown className="w-4 h-4 inline ml-1 text-cyan-400" />
    );
  };

  if (loading) {
    return (
      <Card className="bg-black/40 backdrop-blur-xl border-purple-500/30">
        <CardContent className="p-6">
          <div className="text-center text-gray-400">로딩 중...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-black/40 backdrop-blur-xl border-purple-500/30">
        <CardContent className="p-6">
          <div className="text-center text-red-400">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 상단 툴바 */}
      <Card className="bg-black/40 backdrop-blur-xl border-purple-500/30">
        <CardContent className="p-4 border-b border-purple-500/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-200">
              입금 목록 ({filteredData.length}개)
            </h3>
            <div className="flex gap-2">
              <div className="relative">
                <Button
                  onClick={() => setIsColumnSelectorOpen(!isColumnSelectorOpen)}
                  variant="outline"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  열 선택
                </Button>
                {isColumnSelectorOpen && (
                  <div className="absolute right-0 mt-2 bg-black/80 backdrop-blur-xl border border-purple-500/30 rounded-md shadow-lg z-50 p-2 min-w-[200px] max-h-96 overflow-y-auto">
                    {allColumns.map((col) => (
                      <label
                        key={col.key}
                        className={`flex items-center gap-2 px-3 py-2 hover:bg-white/5 rounded cursor-pointer ${
                          col.alwaysVisible ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={visibleColumns.has(col.key)}
                          onChange={() => toggleColumn(col.key)}
                          disabled={col.alwaysVisible}
                          className="rounded border-purple-500/30"
                        />
                        <span className="text-sm text-gray-200">{col.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <Button onClick={handleDownloadCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                CSV 다운로드
              </Button>
            </div>
          </div>

          {/* 입금여부 필터 */}
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={() => setDepositStatusFilter(null)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                depositStatusFilter === null
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'bg-black/40 text-gray-300 border border-purple-500/30 hover:bg-white/5'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setDepositStatusFilter('입금완료')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                depositStatusFilter === '입금완료'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-black/40 text-gray-300 border border-purple-500/30 hover:bg-white/5'
              }`}
            >
              입금완료
            </button>
            <button
              onClick={() => setDepositStatusFilter('입금예정')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                depositStatusFilter === '입금예정'
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'bg-black/40 text-gray-300 border border-purple-500/30 hover:bg-white/5'
              }`}
            >
              입금예정
            </button>
            <button
              onClick={() => setDepositStatusFilter('입금지연')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                depositStatusFilter === '입금지연'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-black/40 text-gray-300 border border-purple-500/30 hover:bg-white/5'
              }`}
            >
              입금지연
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 검색 영역 */}
      <Card className="bg-black/40 backdrop-blur-xl border-purple-500/30">
        <CardContent className="p-4 border-b border-purple-500/20 space-y-3">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="검색어를 입력하세요..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 bg-black/40 border border-purple-500/30 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-gray-200 placeholder-gray-500 backdrop-blur-sm"
              />
            </div>
            <div className="w-64">
              <label className="block text-xs text-gray-300 mb-1">검색 컬럼</label>
              <MultiSelect
                value={searchColumns}
                onChange={setSearchColumns}
                options={searchableColumns}
                placeholder="검색할 컬럼 선택"
                className="w-full"
              />
            </div>
            <Button onClick={handleSearch}>
              <Search className="w-4 h-4 mr-2" />
              검색
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 테이블 */}
      <Card className="bg-black/40 backdrop-blur-xl border-purple-500/30">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800 sticky top-0 z-10">
                <tr className="border-b border-purple-500/20">
                  {allColumns
                    .filter(col => visibleColumns.has(col.key))
                    .map((col) => {
                      const isSortable = ['category', 'vendorCode', 'companyName', 'brandNames', 'project', 'projectName', 'projectCode', 'expectedDepositDate', 'expectedDepositAmount', 'depositDate', 'depositAmount'].includes(col.key);
                      const sortFieldKey = col.key as SortField;
                      
                      return (
                        <th
                          key={col.key}
                          style={{ width: columnWidths[col.key] }}
                          className={`text-left p-2 font-medium text-gray-200 whitespace-nowrap relative ${
                            isSortable ? 'cursor-pointer hover:bg-white/5' : ''
                          }`}
                          onClick={() => isSortable && handleSort(sortFieldKey)}
                        >
                          <div className="flex items-center">
                            {col.label}
                            {isSortable && getSortIcon(sortFieldKey)}
                          </div>
                          <div
                            className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-cyan-500 ${
                              resizingColumn === col.key ? 'bg-cyan-500' : ''
                            }`}
                            onMouseDown={(e) => handleResizeStart(e, col.key)}
                          />
                        </th>
                      );
                    })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {currentPageRecords.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.size} className="p-8 text-left text-gray-400">
                      {searchQuery ? '검색 결과가 없습니다.' : '등록된 입금 정보가 없습니다.'}
                    </td>
                  </tr>
                ) : (
                  currentPageRecords.map((record, index) => {
                    const hasWarning = (record as any).hasWarning;
                    const depositStatus = getDepositStatus(record);
                    
                    return (
                      <tr
                        key={record.id}
                        className={`border-b border-purple-500/10 hover:bg-white/5 ${hasWarning ? 'bg-yellow-500/10' : ''}`}
                      >
                        {allColumns
                          .filter(col => visibleColumns.has(col.key))
                          .map((col) => {
                            let cellContent: React.ReactNode = '-';
                            
                            switch (col.key) {
                              case 'number':
                                cellContent = startIndex + index + 1;
                                break;
                              case 'category':
                                cellContent = getCategoryBadge(record.category);
                                break;
                              case 'projectCode':
                                cellContent = record.projectCode || '-';
                                break;
                              case 'project':
                                cellContent = record.project || '-';
                                break;
                              case 'projectName':
                                cellContent = record.projectName || '-';
                                break;
                              case 'vendorCode':
                                cellContent = record.vendorCode || '-';
                                break;
                              case 'companyName':
                                cellContent = record.companyName || '-';
                                break;
                              case 'brandNames':
                                cellContent = Array.isArray(record.brandNames) && record.brandNames.length > 0
                                  ? record.brandNames.join(', ')
                                  : '-';
                                break;
                              case 'depositStatus':
                                cellContent = getDepositStatusBadge(depositStatus);
                                break;
                              case 'expectedDepositDate':
                                cellContent = formatDate(record.expectedDepositDate);
                                break;
                              case 'expectedDepositAmount':
                                cellContent = record.expectedDepositAmount
                                  ? formatCurrency(record.expectedDepositAmount, record.expectedDepositCurrency)
                                  : '-';
                                break;
                              case 'depositDate':
                                cellContent = formatDate(record.depositDate);
                                break;
                              case 'depositAmount':
                                cellContent = record.depositAmount
                                  ? formatCurrency(record.depositAmount, record.depositCurrency)
                                  : '-';
                                break;
                              case 'invoiceSupplyPrice':
                                cellContent = record.invoiceSupplyPrice
                                  ? formatCurrency(record.invoiceSupplyPrice, 'KRW')
                                  : '-';
                                break;
                              case 'oneTimeExpenseAmount':
                                cellContent = record.oneTimeExpenseAmount
                                  ? formatCurrency(record.oneTimeExpenseAmount, 'KRW')
                                  : '-';
                                break;
                              case 'invoiceAttachmentStatus':
                                const attachmentStatus = record.invoiceAttachmentStatus;
                                const attachmentStyles = {
                                  required: 'bg-red-500/20 text-red-400 border-red-500/30',
                                  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
                                  not_required: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
                                };
                                cellContent = attachmentStatus ? (
                                  <span className={`px-2 py-1 rounded text-xs border ${attachmentStyles[attachmentStatus] || ''}`}>
                                    {attachmentStatus === 'required' ? '필수' : attachmentStatus === 'completed' ? '완료' : '불필요'}
                                  </span>
                                ) : '-';
                                break;
                              case 'businessRegistrationNumber':
                                cellContent = record.businessRegistrationNumber || '-';
                                break;
                              case 'invoiceEmail':
                                cellContent = record.invoiceEmail || '-';
                                break;
                              case 'eoeoManager':
                                cellContent = record.eoeoManager || '-';
                                break;
                              case 'contractLink':
                                cellContent = record.contractLink ? (
                                  <a
                                    href={record.contractLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-cyan-400 hover:text-cyan-300 underline"
                                  >
                                    링크
                                  </a>
                                ) : '-';
                                break;
                              case 'estimateLink':
                                cellContent = record.estimateLink ? (
                                  <a
                                    href={record.estimateLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-cyan-400 hover:text-cyan-300 underline"
                                  >
                                    링크
                                  </a>
                                ) : '-';
                                break;
                              case 'attributionYearMonth':
                                cellContent = record.attributionYearMonth || '-';
                                break;
                              case 'advanceBalance':
                                cellContent = record.advanceBalance || '-';
                                break;
                              case 'ratio':
                                cellContent = record.ratio ? `${record.ratio}%` : '-';
                                break;
                              case 'description':
                                cellContent = record.description || '-';
                                break;
                              case 'createdDate':
                                cellContent = formatDate(record.createdDate);
                                break;
                              case 'issueNotes':
                                cellContent = record.issueNotes || '-';
                                break;
                              case 'taxStatus':
                                cellContent = record.taxStatus || '-';
                                break;
                              default:
                                cellContent = '-';
                            }

                            const isNumber = col.key === 'number';
                            const isAmount = col.key.includes('Amount') || col.key.includes('Price');
                            
                            return (
                              <td
                                key={col.key}
                                className={`p-2 text-xs ${
                                  isNumber ? 'text-gray-300' : isAmount ? 'text-right text-gray-200' : 'text-gray-200'
                                }`}
                              >
                                {cellContent}
                              </td>
                            );
                          })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="px-4 py-4 border-t border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                전체 {filteredData.length}개 중 {startIndex + 1}-
                {Math.min(startIndex + ITEMS_PER_PAGE, filteredData.length)}개 표시
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  이전
                </Button>
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
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  다음
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
