'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MonthlySummary } from '@/lib/types';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface MonthlyChartProps {
  data: MonthlySummary[];
  showRevenue?: boolean;
  showProfit?: boolean;
  showCost?: boolean;
}

export function MonthlyChart({
  data,
  showRevenue = true,
  showProfit = true,
  showCost = false,
}: MonthlyChartProps) {
  // 데이터 포맷팅
  const chartData = data.map((item) => {
    const revenue = Number(item.total_revenue || 0);
    const profit = Number(item.total_profit || 0);
    const cost = revenue - profit; // 매출 - 이익 = 비용
    return {
      month: `${item.year}-${String(item.month).padStart(2, '0')}`,
      monthLabel: `${item.year}년 ${item.month}월`,
      revenue,
      cost,
      profit,
    };
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="monthLabel"
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `$${value.toLocaleString()}`}
        />
        <Tooltip
          formatter={(value: number) => formatCurrency(value)}
          labelStyle={{ color: '#000' }}
        />
        <Legend />
        {showRevenue && (
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#3b82f6"
            strokeWidth={2}
            name="매출"
            dot={{ r: 4 }}
          />
        )}
        {showCost && (
          <Line
            type="monotone"
            dataKey="cost"
            stroke="#ef4444"
            strokeWidth={2}
            name="비용"
            dot={{ r: 4 }}
          />
        )}
        {showProfit && (
          <Line
            type="monotone"
            dataKey="profit"
            stroke="#10b981"
            strokeWidth={2}
            name="이익"
            dot={{ r: 4 }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

