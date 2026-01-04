'use client';

import { useState, useEffect } from 'react';
import { ServiceRevenue } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function OnlineCommerceOutstanding() {
  const [data, setData] = useState<ServiceRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalOutstanding, setTotalOutstanding] = useState(0);

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
        // 입금예정일이 지났는데 입금액이 없는 항목 필터링
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const outstanding = allData.filter((item: ServiceRevenue) => {
          if (!item.expectedDepositDate) return false;
          if (item.depositAmount && item.depositAmount > 0) return false;

          const expectedDate = new Date(item.expectedDepositDate);
          expectedDate.setHours(0, 0, 0, 0);
          return expectedDate < today;
        });

        setData(outstanding);

        // 미수금 총계 계산
        const total = outstanding.reduce((sum: number, item: ServiceRevenue) => {
          return sum + (item.expectedDepositAmount || 0);
        }, 0);
        setTotalOutstanding(total);
      }
    } catch (error) {
      console.error('Error fetching outstanding data:', error);
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
      <Card className="bg-black/40 backdrop-blur-xl border-purple-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>미수금 현황</CardTitle>
            <div className="text-2xl font-bold text-red-400">
              총 미수금: {formatCurrency(totalOutstanding, 'KRW')}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">회사명</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">프로젝트명</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">입금예정일</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300">입금예정금액</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">지연일수</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      미수금 항목이 없습니다
                    </td>
                  </tr>
                ) : (
                  data.map((item) => {
                    const expectedDate = item.expectedDepositDate ? new Date(item.expectedDepositDate) : null;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const delayDays = expectedDate
                      ? Math.floor((today.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24))
                      : 0;

                    return (
                      <tr key={item.id} className="hover:bg-white/5">
                        <td className="px-4 py-3 text-sm text-gray-200">{item.companyName || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-200">{item.projectName || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-200">
                          {formatDate(item.expectedDepositDate)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-200">
                          {item.expectedDepositAmount
                            ? formatCurrency(item.expectedDepositAmount, item.expectedDepositCurrency)
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-red-400">
                          {delayDays > 0 ? `${delayDays}일` : '-'}
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

