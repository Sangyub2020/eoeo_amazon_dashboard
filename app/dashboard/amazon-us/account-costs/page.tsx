'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AmazonUSAccountMonthlyCost } from '@/lib/types';
import { Plus, Edit, Trash2, Calculator, RotateCcw, Search, ChevronDown, ChevronRight } from 'lucide-react';

export default function AmazonUSAccountCostsPage() {
  const [costs, setCosts] = useState<AmazonUSAccountMonthlyCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCost, setEditingCost] = useState<AmazonUSAccountMonthlyCost | null>(null);
  const [accounts, setAccounts] = useState<{ account_name: string }[]>([]);
  
  // 필터
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number | ''>('');
  const [selectedMonth, setSelectedMonth] = useState<number | ''>('');
  const [accountSearchTerm, setAccountSearchTerm] = useState<string>('');
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState<boolean>(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // 폼 데이터
  const [formData, setFormData] = useState({
    account_name: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    premium_service_fee: 0,
    inbound_placement_fee: 0,
    monthly_storage_fee: 0,
    longterm_storage_fee: 0,
    fba_removal_order_disposal_fee: 0,
    fba_removal_order_return_fee: 0,
    subscription_fee: 0,
    paid_services_fee: 0,
    other_account_fees: 0,
    description: '',
    notes: '',
  });

  useEffect(() => {
    fetchAccounts();
    fetchCosts();
  }, [selectedAccount, selectedYear, selectedMonth]);

  // 계정 검색 필터링
  const filteredAccounts = useMemo(() => {
    if (!accountSearchTerm) return accounts;
    return accounts.filter(acc =>
      acc.account_name.toLowerCase().includes(accountSearchTerm.toLowerCase())
    );
  }, [accounts, accountSearchTerm]);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.account-dropdown-container')) {
        setIsAccountDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleRowExpansion = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/account-master');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchCosts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedAccount) params.append('account_name', selectedAccount);
      if (selectedYear) params.append('year', selectedYear.toString());
      if (selectedMonth) params.append('month', selectedMonth.toString());
      // 모든 기간 표시를 위해 필터 없이 전체 조회

      const response = await fetch(`/api/amazon-us-account-costs?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setCosts(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching costs:', error);
    } finally {
      setLoading(false);
    }
  };

  // 모든 계정과 비용을 매칭하여 표시할 데이터 생성
  const displayData = useMemo(() => {
    // 계정별로 비용을 그룹화 (계정명_연도_월을 키로)
    const costsMap = new Map<string, AmazonUSAccountMonthlyCost>();
    costs.forEach(cost => {
      const key = `${cost.account_name}_${cost.year}_${cost.month}`;
      costsMap.set(key, cost);
    });

    // 계정별로 비용이 등록된 연도/월 목록 생성
    const accountCostsMap = new Map<string, Set<string>>();
    costs.forEach(cost => {
      if (!accountCostsMap.has(cost.account_name)) {
        accountCostsMap.set(cost.account_name, new Set());
      }
      const key = `${cost.year}_${cost.month}`;
      accountCostsMap.get(cost.account_name)!.add(key);
    });

    // 모든 계정에 대해 데이터 생성
    const result: (AmazonUSAccountMonthlyCost & { hasCost: boolean; rowKey: string })[] = [];
    const processedKeys = new Set<string>();
    
    // 계정 마스터의 모든 계정을 순회
    accounts.forEach(account => {
      // 계정 필터링
      if (selectedAccount && account.account_name !== selectedAccount) {
        return;
      }

      const accountCosts = accountCostsMap.get(account.account_name) || new Set();
      
      if (accountCosts.size > 0) {
        // 비용이 등록된 연도/월만 표시 (필터 적용)
        accountCosts.forEach(yearMonthKey => {
          const [year, month] = yearMonthKey.split('_').map(Number);
          
          // 필터 적용
          if (selectedYear && year !== selectedYear) return;
          if (selectedMonth && month !== selectedMonth) return;
          
          const costKey = `${account.account_name}_${year}_${month}`;
          if (processedKeys.has(costKey)) return;
          processedKeys.add(costKey);
          
          const cost = costsMap.get(costKey);
          if (cost) {
            result.push({ ...cost, hasCost: true, rowKey: costKey });
          }
        });
      } else {
        // 비용이 등록되지 않은 계정도 표시
        // 필터가 있으면 해당 연도/월로 표시, 없으면 최근 연도/월로 표시
        const displayYear = selectedYear || new Date().getFullYear();
        const displayMonth = selectedMonth || new Date().getMonth() + 1;
        const costKey = `${account.account_name}_${displayYear}_${displayMonth}`;
        
        if (processedKeys.has(costKey)) return;
        processedKeys.add(costKey);
        
        result.push({
          account_name: account.account_name,
          year: displayYear,
          month: displayMonth,
          hasCost: false,
          rowKey: costKey,
        } as AmazonUSAccountMonthlyCost & { hasCost: boolean; rowKey: string });
      }
    });

    // 정렬: 연도 내림차순, 월 내림차순, 계정명 오름차순
    return result.sort((a, b) => {
      if (a.year !== b.year) return (b.year || 0) - (a.year || 0);
      if (a.month !== b.month) return (b.month || 0) - (a.month || 0);
      return (a.account_name || '').localeCompare(b.account_name || '');
    });
  }, [accounts, costs, selectedAccount, selectedYear, selectedMonth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCost
        ? `/api/amazon-us-account-costs/${editingCost.id}`
        : '/api/amazon-us-account-costs';
      const method = editingCost ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowForm(false);
        setEditingCost(null);
        resetForm();
        fetchCosts();
      } else {
        const error = await response.json();
        alert(`오류: ${error.error}`);
      }
    } catch (error: any) {
      alert(`오류: ${error.message}`);
    }
  };

  const handleEdit = (cost: AmazonUSAccountMonthlyCost) => {
    setEditingCost(cost);
    setFormData({
      account_name: cost.account_name,
      year: cost.year,
      month: cost.month,
      premium_service_fee: cost.premium_service_fee || 0,
      inbound_placement_fee: cost.inbound_placement_fee || 0,
      monthly_storage_fee: cost.monthly_storage_fee || 0,
      longterm_storage_fee: cost.longterm_storage_fee || 0,
      fba_removal_order_disposal_fee: cost.fba_removal_order_disposal_fee || 0,
      fba_removal_order_return_fee: cost.fba_removal_order_return_fee || 0,
      subscription_fee: cost.subscription_fee || 0,
      paid_services_fee: cost.paid_services_fee || 0,
      other_account_fees: cost.other_account_fees || 0,
      description: cost.description || '',
      notes: cost.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/amazon-us-account-costs/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchCosts();
      } else {
        const error = await response.json();
        alert(`오류: ${error.error}`);
      }
    } catch (error: any) {
      alert(`오류: ${error.message}`);
    }
  };

  const handleAllocate = async (cost: AmazonUSAccountMonthlyCost) => {
    if (!confirm(`${cost.account_name}의 ${cost.year}년 ${cost.month}월 비용을 안분하시겠습니까?`)) return;

    try {
      const response = await fetch('/api/amazon-us-account-costs/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_name: cost.account_name,
          year: cost.year,
          month: cost.month,
          allocation_method: 'sales_ratio',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`안분 완료: ${result.message}`);
        fetchCosts();
      } else {
        const error = await response.json();
        alert(`오류: ${error.error}`);
      }
    } catch (error: any) {
      alert(`오류: ${error.message}`);
    }
  };

  const handleResetAllocation = async (cost: AmazonUSAccountMonthlyCost) => {
    if (!confirm('안분을 재설정하시겠습니까? 안분된 금액이 모두 초기화됩니다.')) return;

    try {
      const response = await fetch('/api/amazon-us-account-costs/reset-allocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_name: cost.account_name,
          year: cost.year,
          month: cost.month,
        }),
      });

      if (response.ok) {
        alert('안분이 재설정되었습니다.');
        fetchCosts();
      } else {
        const error = await response.json();
        alert(`오류: ${error.error}`);
      }
    } catch (error: any) {
      alert(`오류: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      account_name: '',
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      premium_service_fee: 0,
      inbound_placement_fee: 0,
      monthly_storage_fee: 0,
      longterm_storage_fee: 0,
      fba_removal_order_disposal_fee: 0,
      fba_removal_order_return_fee: 0,
      subscription_fee: 0,
      paid_services_fee: 0,
      other_account_fees: 0,
      description: '',
      notes: '',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value).replace('US$', '$');
  };

  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
          계정 비용 관리
        </h1>
        <button
          onClick={() => {
            resetForm();
            setEditingCost(null);
            setShowForm(!showForm);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          {showForm ? '취소' : '비용 추가'}
        </button>
      </div>

      {/* 필터 */}
      <Card className="border border-purple-500/30 bg-black/40 backdrop-blur-xl shadow-lg shadow-cyan-500/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative account-dropdown-container">
              <div className="relative">
                <input
                  type="text"
                  placeholder="계정 검색..."
                  value={accountSearchTerm}
                  onChange={(e) => {
                    setAccountSearchTerm(e.target.value);
                    setIsAccountDropdownOpen(true);
                  }}
                  onFocus={() => setIsAccountDropdownOpen(true)}
                  className="px-3 py-2 pl-10 text-sm bg-black/40 border border-purple-500/30 rounded-md text-gray-200 w-64"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
              {isAccountDropdownOpen && (
                <div className="absolute z-50 w-64 mt-1 bg-gray-800 border border-purple-500/30 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  <div
                    className="px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 cursor-pointer"
                    onClick={() => {
                      setSelectedAccount('');
                      setAccountSearchTerm('');
                      setIsAccountDropdownOpen(false);
                    }}
                  >
                    전체 계정
                  </div>
                  {filteredAccounts.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">검색 결과가 없습니다</div>
                  ) : (
                    filteredAccounts.map((acc) => (
                      <div
                        key={acc.account_name}
                        className={`px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 cursor-pointer ${
                          selectedAccount === acc.account_name ? 'bg-purple-500/20' : ''
                        }`}
                        onClick={() => {
                          setSelectedAccount(acc.account_name);
                          setAccountSearchTerm(acc.account_name);
                          setIsAccountDropdownOpen(false);
                        }}
                      >
                        {acc.account_name}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : '')}
              className="px-3 py-2 text-sm bg-black/40 border border-purple-500/30 rounded-md text-gray-200"
            >
              <option value="">전체 연도</option>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                <option key={year} value={year}>
                  {year}년
                </option>
              ))}
            </select>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value ? parseInt(e.target.value) : '')}
              className="px-3 py-2 text-sm bg-black/40 border border-purple-500/30 rounded-md text-gray-200"
            >
              <option value="">전체 월</option>
              {monthNames.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 입력 폼 */}
      {showForm && (
        <Card className="border border-purple-500/30 bg-black/40 backdrop-blur-xl shadow-lg shadow-cyan-500/10">
          <CardHeader>
            <CardTitle className="text-gray-200">
              {editingCost ? '비용 수정' : '비용 추가'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">계정</label>
                  <select
                    required
                    value={formData.account_name}
                    onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                    className="w-full px-3 py-2 bg-black/40 border border-purple-500/30 rounded-md text-gray-200"
                  >
                    <option value="">선택하세요</option>
                    {accounts.map((acc) => (
                      <option key={acc.account_name} value={acc.account_name}>
                        {acc.account_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">연도</label>
                  <input
                    type="number"
                    required
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-black/40 border border-purple-500/30 rounded-md text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">월</label>
                  <select
                    required
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-black/40 border border-purple-500/30 rounded-md text-gray-200"
                  >
                    {monthNames.map((name, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">프리미엄 서비스 이용료</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.premium_service_fee}
                    onChange={(e) => setFormData({ ...formData, premium_service_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-black/40 border border-purple-500/30 rounded-md text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Inbound Placement Fee</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.inbound_placement_fee}
                    onChange={(e) => setFormData({ ...formData, inbound_placement_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-black/40 border border-purple-500/30 rounded-md text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Monthly Storage Fee</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.monthly_storage_fee}
                    onChange={(e) => setFormData({ ...formData, monthly_storage_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-black/40 border border-purple-500/30 rounded-md text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Longterm Storage Fee</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.longterm_storage_fee}
                    onChange={(e) => setFormData({ ...formData, longterm_storage_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-black/40 border border-purple-500/30 rounded-md text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">FBA Removal Order: Disposal Fee</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.fba_removal_order_disposal_fee}
                    onChange={(e) => setFormData({ ...formData, fba_removal_order_disposal_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-black/40 border border-purple-500/30 rounded-md text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">FBA Removal Order: Return Fee</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.fba_removal_order_return_fee}
                    onChange={(e) => setFormData({ ...formData, fba_removal_order_return_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-black/40 border border-purple-500/30 rounded-md text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">구독료</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.subscription_fee}
                    onChange={(e) => setFormData({ ...formData, subscription_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-black/40 border border-purple-500/30 rounded-md text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">유료 서비스 수수료</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.paid_services_fee}
                    onChange={(e) => setFormData({ ...formData, paid_services_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-black/40 border border-purple-500/30 rounded-md text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">기타 계정 단위 비용</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.other_account_fees}
                    onChange={(e) => setFormData({ ...formData, other_account_fees: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-black/40 border border-purple-500/30 rounded-md text-gray-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">설명</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 border border-purple-500/30 rounded-md text-gray-200"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">메모</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-black/40 border border-purple-500/30 rounded-md text-gray-200"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingCost(null);
                    resetForm();
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  {editingCost ? '수정' : '저장'}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 비용 목록 */}
      <Card className="border border-purple-500/30 bg-black/40 backdrop-blur-xl shadow-lg shadow-cyan-500/10">
        <CardHeader>
          <CardTitle className="text-gray-200">계정 비용 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : displayData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">데이터가 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-700">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase w-12"></th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">계정</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">연도/월</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">총 비용</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase">비용 등록 상태</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase">안분 상태</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {displayData.map((cost) => {
                    const isExpanded = cost.id ? expandedRows.has(cost.id) : false;
                    const rowKey = cost.rowKey || cost.id || `${cost.account_name}_${cost.year}_${cost.month}`;
                    return (
                      <Fragment key={rowKey}>
                        <tr className="hover:bg-gray-800/50">
                          <td className="px-4 py-3 text-sm">
                            {cost.hasCost && cost.id && (
                              <button
                                onClick={() => toggleRowExpansion(cost.id!)}
                                className="text-gray-400 hover:text-gray-200 transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-200">{cost.account_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-200">
                            {cost.year}년 {cost.month}월
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-200 text-right font-semibold">
                            {cost.hasCost ? formatCurrency(cost.total_account_cost || 0) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            {cost.hasCost ? (
                              <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                                비용등록
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs">
                                미등록
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            {cost.hasCost ? (
                              cost.is_allocated ? (
                                <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs">
                                  안분 완료
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-gray-500/20 text-gray-300 rounded text-xs">
                                  미안분
                                </span>
                              )
                            ) : (
                              <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs">
                                -
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {cost.hasCost ? (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(cost);
                                  }}
                                  className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
                                  title="수정"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                {!cost.is_allocated && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAllocate(cost);
                                    }}
                                    className="p-1.5 text-green-400 hover:bg-green-500/20 rounded transition-colors"
                                    title="안분 실행"
                                  >
                                    <Calculator className="w-4 h-4" />
                                  </button>
                                )}
                                {cost.is_allocated && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleResetAllocation(cost);
                                    }}
                                    className="p-1.5 text-yellow-400 hover:bg-yellow-500/20 rounded transition-colors"
                                    title="안분 재설정"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cost.id && handleDelete(cost.id);
                                  }}
                                  className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                                  title="삭제"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFormData({
                                    ...formData,
                                    account_name: cost.account_name,
                                    year: cost.year || new Date().getFullYear(),
                                    month: cost.month || new Date().getMonth() + 1,
                                  });
                                  setShowForm(true);
                                }}
                                className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
                                title="비용 등록"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                        {isExpanded && cost.id && cost.hasCost && (
                          <tr className="bg-gray-800/30">
                            <td colSpan={7} className="px-4 py-4">
                              <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-gray-300 mb-3">비용 상세 내역</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                  {cost.premium_service_fee !== undefined && cost.premium_service_fee > 0 && (
                                    <div className="bg-gray-700/30 p-3 rounded">
                                      <div className="text-xs text-gray-400 mb-1">프리미엄 서비스 이용료</div>
                                      <div className="text-sm font-medium text-gray-200">
                                        {formatCurrency(cost.premium_service_fee)}
                                      </div>
                                    </div>
                                  )}
                                  {cost.inbound_placement_fee !== undefined && cost.inbound_placement_fee > 0 && (
                                    <div className="bg-gray-700/30 p-3 rounded">
                                      <div className="text-xs text-gray-400 mb-1">Inbound Placement Fee</div>
                                      <div className="text-sm font-medium text-gray-200">
                                        {formatCurrency(cost.inbound_placement_fee)}
                                      </div>
                                    </div>
                                  )}
                                  {cost.monthly_storage_fee !== undefined && cost.monthly_storage_fee > 0 && (
                                    <div className="bg-gray-700/30 p-3 rounded">
                                      <div className="text-xs text-gray-400 mb-1">Monthly Storage Fee</div>
                                      <div className="text-sm font-medium text-gray-200">
                                        {formatCurrency(cost.monthly_storage_fee)}
                                      </div>
                                    </div>
                                  )}
                                  {cost.longterm_storage_fee !== undefined && cost.longterm_storage_fee > 0 && (
                                    <div className="bg-gray-700/30 p-3 rounded">
                                      <div className="text-xs text-gray-400 mb-1">Longterm Storage Fee</div>
                                      <div className="text-sm font-medium text-gray-200">
                                        {formatCurrency(cost.longterm_storage_fee)}
                                      </div>
                                    </div>
                                  )}
                                  {cost.fba_removal_order_disposal_fee !== undefined && cost.fba_removal_order_disposal_fee > 0 && (
                                    <div className="bg-gray-700/30 p-3 rounded">
                                      <div className="text-xs text-gray-400 mb-1">FBA Removal Order: Disposal Fee</div>
                                      <div className="text-sm font-medium text-gray-200">
                                        {formatCurrency(cost.fba_removal_order_disposal_fee)}
                                      </div>
                                    </div>
                                  )}
                                  {cost.fba_removal_order_return_fee !== undefined && cost.fba_removal_order_return_fee > 0 && (
                                    <div className="bg-gray-700/30 p-3 rounded">
                                      <div className="text-xs text-gray-400 mb-1">FBA Removal Order: Return Fee</div>
                                      <div className="text-sm font-medium text-gray-200">
                                        {formatCurrency(cost.fba_removal_order_return_fee)}
                                      </div>
                                    </div>
                                  )}
                                  {cost.subscription_fee !== undefined && cost.subscription_fee > 0 && (
                                    <div className="bg-gray-700/30 p-3 rounded">
                                      <div className="text-xs text-gray-400 mb-1">구독료</div>
                                      <div className="text-sm font-medium text-gray-200">
                                        {formatCurrency(cost.subscription_fee)}
                                      </div>
                                    </div>
                                  )}
                                  {cost.paid_services_fee !== undefined && cost.paid_services_fee > 0 && (
                                    <div className="bg-gray-700/30 p-3 rounded">
                                      <div className="text-xs text-gray-400 mb-1">유료 서비스 수수료</div>
                                      <div className="text-sm font-medium text-gray-200">
                                        {formatCurrency(cost.paid_services_fee)}
                                      </div>
                                    </div>
                                  )}
                                  {cost.other_account_fees !== undefined && cost.other_account_fees > 0 && (
                                    <div className="bg-gray-700/30 p-3 rounded">
                                      <div className="text-xs text-gray-400 mb-1">기타 계정 단위 비용</div>
                                      <div className="text-sm font-medium text-gray-200">
                                        {formatCurrency(cost.other_account_fees)}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                {(cost.description || cost.notes) && (
                                  <div className="mt-4 pt-4 border-t border-gray-700 space-y-2">
                                    {cost.description && (
                                      <div>
                                        <div className="text-xs text-gray-400 mb-1">설명</div>
                                        <div className="text-sm text-gray-300">{cost.description}</div>
                                      </div>
                                    )}
                                    {cost.notes && (
                                      <div>
                                        <div className="text-xs text-gray-400 mb-1">메모</div>
                                        <div className="text-sm text-gray-300">{cost.notes}</div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

