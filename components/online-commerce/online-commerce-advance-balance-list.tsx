'use client';

import { useState, useEffect } from 'react';
import { ServiceRevenue } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function OnlineCommerceAdvanceBalanceList() {
  const [data, setData] = useState<ServiceRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    advance: 0,
    balance: 0,
    oneTime: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/service-revenue?team=online_commerce&_t=${Date.now()}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('데이터를 불러오는데 실패했습니다.');
      }

      const result = await response.json();

      if (result.success) {
        const allData = result.data || [];
        setData(allData);

        // 선/잔금 집계
        const advance = allData
          .filter((item: ServiceRevenue) => item.advanceBalance === '선금')
          .reduce((sum: number, item: ServiceRevenue) => sum + (item.expectedDepositAmount || 0), 0);

        const balance = allData
          .filter((item: ServiceRevenue) => item.advanceBalance === '잔금')
          .reduce((sum: number, item: ServiceRevenue) => sum + (item.expectedDepositAmount || 0), 0);

        const oneTime = allData
          .filter((item: ServiceRevenue) => item.advanceBalance === '일시불')
          .reduce((sum: number, item: ServiceRevenue) => sum + (item.expectedDepositAmount || 0), 0);

        setSummary({ advance, balance, oneTime });
      }
    } catch (error) {
      console.error('Error fetching advance balance data:', error);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="space-y-4">
      {/* 집계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-black/40 backdrop-blur-xl border-purple-500/30">
          <CardContent className="p-4">
            <div className="text-sm text-gray-400 mb-1">선금 총계</div>
            <div className="text-2xl font-bold text-cyan-400">
              {formatCurrency(summary.advance, 'KRW')}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/40 backdrop-blur-xl border-purple-500/30">
          <CardContent className="p-4">
            <div className="text-sm text-gray-400 mb-1">잔금 총계</div>
            <div className="text-2xl font-bold text-purple-400">
              {formatCurrency(summary.balance, 'KRW')}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/40 backdrop-blur-xl border-purple-500/30">
          <CardContent className="p-4">
            <div className="text-sm text-gray-400 mb-1">일시불 총계</div>
            <div className="text-2xl font-bold text-yellow-400">
              {formatCurrency(summary.oneTime, 'KRW')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 목록 */}
      <Card className="bg-black/40 backdrop-blur-xl border-purple-500/30">
        <CardHeader>
          <CardTitle>선/잔금 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">회사명</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">프로젝트명</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">선/잔금</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300">입금예정금액</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                      데이터가 없습니다
                    </td>
                  </tr>
                ) : (
                  data.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 text-sm text-gray-200">{item.companyName || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-200">{item.projectName || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-200">{item.advanceBalance || '-'}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-200">
                        {item.expectedDepositAmount
                          ? formatCurrency(item.expectedDepositAmount, item.expectedDepositCurrency)
                          : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

