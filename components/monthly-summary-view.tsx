'use client';

import { useState, useEffect, useMemo } from 'react';
import { StatsCard } from '@/components/stats-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MonthlyDataGenerator } from '@/components/monthly-data-generator';
import { Suspense } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MonthlySummary {
  year: number;
  month: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  exchange_rate?: number; // 각 월의 환율
}

interface MonthlySummaryViewProps {
  initialData: MonthlySummary[];
}

export function MonthlySummaryView({ initialData }: MonthlySummaryViewProps) {
  const [data, setData] = useState<MonthlySummary[]>(initialData);

  // 사용 가능한 연도 목록
  const availableYears = useMemo(() => {
    const years = new Set(data.map(item => item.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [data]);

  // 초기 선택 연도: 데이터에 있는 첫 번째 연도 (가장 최근 연도)
  const initialYear = useMemo(() => {
    return availableYears.length > 0 ? availableYears[0] : new Date().getFullYear();
  }, [availableYears]);

  const [selectedYear, setSelectedYear] = useState(initialYear);

  // 데이터가 변경되면 선택된 연도를 최신 연도로 업데이트
  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  // 선택한 연도의 데이터 필터링 및 집계 (원화로 변환)
  const yearData = useMemo(() => {
    const filtered = data.filter(item => item.year === selectedYear);
    
    // 1월부터 12월까지 모든 월 데이터 생성 (없는 월은 0으로)
    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const monthData = filtered.find(item => item.month === month);
      const exchangeRate = monthData?.exchange_rate || 1; // 환율이 없으면 1 (변환 안 함)
      
      // USD를 원화로 변환
      const revenueUSD = monthData ? Number(monthData.total_revenue || 0) : 0;
      const costUSD = monthData ? Number(monthData.total_cost || 0) : 0;
      const profitUSD = monthData ? Number(monthData.total_profit || 0) : 0;
      
      const revenueKRW = revenueUSD * exchangeRate;
      const costKRW = costUSD * exchangeRate;
      const profitKRW = profitUSD * exchangeRate;
      
      return {
        month,
        monthLabel: `${month}월`,
        revenue: revenueKRW,
        cost: costKRW,
        profit: profitKRW,
        profitMargin: revenueKRW > 0 
          ? (profitKRW / revenueKRW) * 100 
          : 0,
        exchangeRate, // 환율 정보 저장 (표시용)
      };
    });

    // 전체 집계 (원화 기준)
    const totalRevenue = monthlyData.reduce((sum, item) => sum + item.revenue, 0);
    const totalCost = monthlyData.reduce((sum, item) => sum + item.cost, 0);
    const totalProfit = monthlyData.reduce((sum, item) => sum + item.profit, 0);
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      monthlyData,
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
    };
  }, [data, selectedYear]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      {/* 헤더 섹션 */}
      <div className="p-4 border-b border-purple-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-200">월별 현황</h3>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 text-sm bg-black/40 border border-purple-500/30 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-gray-200 placeholder-gray-500 backdrop-blur-sm"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>
                  {year}년
                </option>
              ))}
            </select>
          </div>
          <Suspense fallback={<div className="text-sm text-gray-400">로딩 중...</div>}>
            <MonthlyDataGenerator channel="amazon_us" />
          </Suspense>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="총 매출"
          value={formatCurrency(yearData.totalRevenue)}
          subtitle={`${selectedYear}년 누적`}
        />
        <StatsCard
          title="총 비용"
          value={formatCurrency(yearData.totalCost)}
          subtitle={`${selectedYear}년 누적`}
        />
        <StatsCard
          title="총 이익"
          value={formatCurrency(yearData.totalProfit)}
          subtitle={`${selectedYear}년 누적`}
        />
        <StatsCard
          title="이익률"
          value={formatPercentage(yearData.profitMargin)}
          subtitle={`${selectedYear}년 평균`}
        />
      </div>

      {/* 월별 막대그래프 */}
      <Card className="border border-purple-500/30 bg-black/40 backdrop-blur-xl shadow-lg shadow-cyan-500/10">
        <CardHeader className="border-b border-purple-500/20 bg-slate-800">
          <CardTitle className="text-base font-semibold text-gray-200">
            {selectedYear}년 월별 매출 및 이익 현황
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 bg-black/40">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={yearData.monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(168, 85, 247, 0.2)" />
              <XAxis
                dataKey="monthLabel"
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                axisLine={{ stroke: 'rgba(168, 85, 247, 0.3)' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickFormatter={(value) => `₩${(value / 1000000).toFixed(0)}M`}
                axisLine={{ stroke: 'rgba(168, 85, 247, 0.3)' }}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelStyle={{ color: '#e5e7eb', fontWeight: 500 }}
                contentStyle={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  borderRadius: '8px',
                  boxShadow: '0 8px 16px rgba(6, 182, 212, 0.2)',
                  color: '#e5e7eb'
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px', color: '#9ca3af' }}
                iconType="rect"
              />
              <Bar
                dataKey="revenue"
                fill="url(#revenueGradient)"
                name="매출"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="profit"
                fill="url(#profitGradient)"
                name="이익"
                radius={[6, 6, 0, 0]}
              />
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#0891b2" />
                </linearGradient>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#9333ea" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

