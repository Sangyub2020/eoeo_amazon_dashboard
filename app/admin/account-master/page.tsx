'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';

interface AccountMaster {
  id: string;
  account_name: string;
  merchant_code: string;
  referral_fee_rate: number;
  sp_api_client_id?: string;
  sp_api_client_secret?: string;
  sp_api_refresh_token?: string;
  sp_api_base_url?: string;
  created_at?: string;
  updated_at?: string;
}

export default function AccountMasterPage() {
  const [accounts, setAccounts] = useState<AccountMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    account_name: '',
    merchant_code: '',
    referral_fee_rate: '0.15',
    sp_api_client_id: '',
    sp_api_client_secret: '',
    sp_api_refresh_token: '',
    sp_api_base_url: 'https://sellingpartnerapi-na.amazon.com',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 계정 목록 조회
  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/account-master');
      if (!response.ok) {
        throw new Error('계정 목록 조회 실패');
      }
      const { data } = await response.json();
      setAccounts(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // 계정 추가
  const handleAdd = async () => {
    try {
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/account-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_name: formData.account_name,
          merchant_code: formData.merchant_code,
          referral_fee_rate: parseFloat(formData.referral_fee_rate),
          sp_api_client_id: formData.sp_api_client_id || null,
          sp_api_client_secret: formData.sp_api_client_secret || null,
          sp_api_refresh_token: formData.sp_api_refresh_token || null,
          sp_api_base_url: formData.sp_api_base_url || 'https://sellingpartnerapi-na.amazon.com',
        }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || '계정 추가 실패');
      }

      setSuccess('계정이 추가되었습니다.');
      setIsAdding(false);
      setFormData({ 
        account_name: '', 
        merchant_code: '', 
        referral_fee_rate: '0.15',
        sp_api_client_id: '',
        sp_api_client_secret: '',
        sp_api_refresh_token: '',
        sp_api_base_url: 'https://sellingpartnerapi-na.amazon.com',
      });
      fetchAccounts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 계정 수정
  const handleUpdate = async (id: string) => {
    try {
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/account-master', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          account_name: formData.account_name,
          merchant_code: formData.merchant_code,
          referral_fee_rate: parseFloat(formData.referral_fee_rate),
          sp_api_client_id: formData.sp_api_client_id || null,
          sp_api_client_secret: formData.sp_api_client_secret || null,
          sp_api_refresh_token: formData.sp_api_refresh_token || null,
          sp_api_base_url: formData.sp_api_base_url || 'https://sellingpartnerapi-na.amazon.com',
        }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || '계정 수정 실패');
      }

      setSuccess('계정이 수정되었습니다.');
      setEditingId(null);
      setFormData({ 
        account_name: '', 
        merchant_code: '', 
        referral_fee_rate: '0.15',
        sp_api_client_id: '',
        sp_api_client_secret: '',
        sp_api_refresh_token: '',
        sp_api_base_url: 'https://sellingpartnerapi-na.amazon.com',
      });
      fetchAccounts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 계정 삭제
  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/account-master?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || '계정 삭제 실패');
      }

      setSuccess('계정이 삭제되었습니다.');
      fetchAccounts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 수정 모드 시작
  const startEdit = (account: AccountMaster) => {
    setEditingId(account.id);
    setFormData({
      account_name: account.account_name,
      merchant_code: account.merchant_code,
      referral_fee_rate: account.referral_fee_rate.toString(),
      sp_api_client_id: account.sp_api_client_id || '',
      sp_api_client_secret: account.sp_api_client_secret || '',
      sp_api_refresh_token: account.sp_api_refresh_token || '',
      sp_api_base_url: account.sp_api_base_url || 'https://sellingpartnerapi-na.amazon.com',
    });
    setIsAdding(false);
  };

  // 수정 취소
  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ 
      account_name: '', 
      merchant_code: '', 
      referral_fee_rate: '0.15',
      sp_api_client_id: '',
      sp_api_client_secret: '',
      sp_api_refresh_token: '',
      sp_api_base_url: 'https://sellingpartnerapi-na.amazon.com',
    });
  };

  // 추가 모드 시작
  const startAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormData({ 
      account_name: '', 
      merchant_code: '', 
      referral_fee_rate: '0.15',
      sp_api_client_id: '',
      sp_api_client_secret: '',
      sp_api_refresh_token: '',
      sp_api_base_url: 'https://sellingpartnerapi-na.amazon.com',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">계정 마스터</h1>
        {!isAdding && !editingId && (
          <button
            onClick={startAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            계정 추가
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      {/* 추가/수정 폼 */}
      {(isAdding || editingId) && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-xl font-semibold mb-4">
            {isAdding ? '계정 추가' : '계정 수정'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                계정 이름 *
              </label>
              <input
                type="text"
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="예: MARS MADE"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Merchant Code *
              </label>
              <input
                type="text"
                value={formData.merchant_code}
                onChange={(e) => setFormData({ ...formData, merchant_code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="예: A2635T8UXSIYOI"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Referral 수수료율 * (0.15 = 15%)
              </label>
              <input
                type="number"
                step="0.0001"
                min="0"
                max="1"
                value={formData.referral_fee_rate}
                onChange={(e) => setFormData({ ...formData, referral_fee_rate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.15"
              />
              <p className="mt-1 text-sm text-gray-500">
                현재 값: {(parseFloat(formData.referral_fee_rate) * 100).toFixed(2)}%
              </p>
            </div>
            
            {/* API 인증 정보 섹션 */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">Amazon SP-API 인증 정보 (선택사항)</h3>
              <p className="text-sm text-gray-500 mb-4">
                여러 계정을 사용하는 경우, 각 계정의 API 인증 정보를 입력하세요. 
                입력하지 않으면 환경 변수의 기본 계정을 사용합니다.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SP-API Client ID
                  </label>
                  <input
                    type="text"
                    value={formData.sp_api_client_id}
                    onChange={(e) => setFormData({ ...formData, sp_api_client_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="amzn1.application-oa2-client.xxxxx"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SP-API Client Secret
                  </label>
                  <input
                    type="password"
                    value={formData.sp_api_client_secret}
                    onChange={(e) => setFormData({ ...formData, sp_api_client_secret: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="암호화되어 저장됩니다"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SP-API Refresh Token
                  </label>
                  <input
                    type="password"
                    value={formData.sp_api_refresh_token}
                    onChange={(e) => setFormData({ ...formData, sp_api_refresh_token: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Atzr|xxxxx"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SP-API Base URL
                  </label>
                  <input
                    type="text"
                    value={formData.sp_api_base_url}
                    onChange={(e) => setFormData({ ...formData, sp_api_base_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://sellingpartnerapi-na.amazon.com"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    US: https://sellingpartnerapi-na.amazon.com
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={isAdding ? handleAdd : () => handleUpdate(editingId!)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Save className="w-5 h-5" />
                저장
              </button>
              <button
                onClick={cancelEdit}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                <X className="w-5 h-5" />
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 계정 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                계정 이름
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Merchant Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Referral 수수료율
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  등록된 계정이 없습니다.
                </td>
              </tr>
            ) : (
              accounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {account.account_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {account.merchant_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(account.referral_fee_rate * 100).toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(account)}
                        className="text-blue-600 hover:text-blue-900"
                        disabled={editingId === account.id || isAdding}
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(account.id)}
                        className="text-red-600 hover:text-red-900"
                        disabled={editingId === account.id || isAdding}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}





