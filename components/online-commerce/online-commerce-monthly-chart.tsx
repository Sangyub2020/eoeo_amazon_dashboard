'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function OnlineCommerceMonthlyChart() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [accountingView, setAccountingView] = useState<'basic' | 'management' | 'real'>('basic');
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    totalExpense: 0,
  });

  useEffect(() => {
    fetchData();
  }, [selectedYear, accountingView]);

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
        const records = result.data || [];
        
        // 월별 집계
        const monthlyMap = new Map<string, { depositAmount: number; profit: number; expense: number }>();
        
        records.forEach((record: any) => {
          if (record.attributionYearMonth) {
            const [year, month] = record.attributionYearMonth.split('-');
            if (year === selectedYear.toString()) {
              const key = `${year}-${month}`;
              const existing = monthlyMap.get(key) || { depositAmount: 0, profit: 0, expense: 0 };
              
              existing.depositAmount += record.depositAmount || 0;
              existing.profit += (record.depositAmount || 0) - (record.expectedDepositAmount || 0);
              existing.expense += record.oneTimeExpenseAmount || 0;
              
              monthlyMap.set(key, existing);
            }
          }
        });

        const chartData = Array.from({ length: 12 }, (_, i) => {
          const month = String(i + 1).padStart(2, '0');
          const key = `${selectedYear}-${month}`;
          const monthly = monthlyMap.get(key) || { depositAmount: 0, profit: 0, expense: 0 };
          
          return {
            month: `${i + 1}월`,
            depositAmount: monthly.depositAmount,
            profit: monthly.profit,
            expense: monthly.expense,
          };
        });

        setData(chartData);

        // 총계 계산
        const total = Array.from(monthlyMap.values()).reduce(
          (acc, curr) => ({
            totalRevenue: acc.totalRevenue + curr.depositAmount,
            totalProfit: acc.totalProfit + curr.profit,
            totalExpense: acc.totalExpense + curr.expense,
          }),
          { totalRevenue: 0, totalProfit: 0, totalExpense: 0 }
        );

        setSummary(total);
      }
    } catch (error) {
      console.error('Error fetching monthly data:', error);
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
            <CardTitle>월별 입금액 및 이익 현황</CardTitle>
            <div className="flex gap-4">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-2 bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                  <option key={year} value={year}>
                    {year}년
                  </option>
                ))}
              </select>
              <select
                value={accountingView}
                onChange={(e) => setAccountingView(e.target.value as any)}
                className="px-3 py-2 bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <option value="basic">기본</option>
                <option value="management">관리회계</option>
                <option value="real">리얼회계</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="text-center text-gray-400 py-8">데이터가 없습니다</div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="depositAmount" fill="#06b6d4" name="입금액" />
                <Line type="monotone" dataKey="profit" stroke="#a855f7" strokeWidth={2} name="이익" />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 총계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-black/40 backdrop-blur-xl border-purple-500/30">
          <CardContent className="p-4">
            <div className="text-sm text-gray-400 mb-1">매출 총계</div>
            <div className="text-2xl font-bold text-cyan-400">
              {formatCurrency(summary.totalRevenue, 'KRW')}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/40 backdrop-blur-xl border-purple-500/30">
          <CardContent className="p-4">
            <div className="text-sm text-gray-400 mb-1">이익 총계</div>
            <div className="text-2xl font-bold text-purple-400">
              {formatCurrency(summary.totalProfit, 'KRW')}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/40 backdrop-blur-xl border-purple-500/30">
          <CardContent className="p-4">
            <div className="text-sm text-gray-400 mb-1">실비 총계</div>
            <div className="text-2xl font-bold text-yellow-400">
              {formatCurrency(summary.totalExpense, 'KRW')}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

