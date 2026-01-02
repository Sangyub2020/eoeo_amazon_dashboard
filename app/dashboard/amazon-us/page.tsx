import { getMonthlySummary, getSKUDetailsByMonth } from '@/lib/api';
import { StatsCard } from '@/components/stats-card';
import { MonthlyChart } from '@/components/monthly-chart';
import { SKUTable } from '@/components/sku-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MonthlyDataGenerator } from '@/components/monthly-data-generator';
import { AmazonOrdersFetcher } from '@/components/amazon-orders-fetcher';
import { Suspense } from 'react';

export default async function AmazonUSPage() {
  const monthlyData = await getMonthlySummary('amazon_us');

  // 전체 통계 계산
  const totalRevenue = monthlyData.reduce(
    (sum, item) => sum + Number(item.total_revenue),
    0
  );
  const totalCost = monthlyData.reduce(
    (sum, item) => sum + Number(item.total_cost),
    0
  );
  const totalProfit = monthlyData.reduce(
    (sum, item) => sum + Number(item.total_profit),
    0
  );
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // 최근 달 데이터 가져오기
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const recentSKUDetails = await getSKUDetailsByMonth(
    currentYear,
    currentMonth,
    'amazon_us'
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  // 월별 데이터 준비 (1~12월)
  const currentYearData = monthlyData.filter(item => item.year === currentYear);
  const monthlyTableData = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const monthData = currentYearData.find(item => item.month === month);
    const revenue = monthData ? Number(monthData.total_revenue) : 0;
    const profit = monthData ? Number(monthData.total_profit) : 0;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    
    return {
      month,
      revenue,
      profit,
      margin,
    };
  });

  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Amazon US</h1>
          <p className="text-gray-600">Amazon US 마켓플레이스의 월별 매출과 이익 현황</p>
        </div>
        <Suspense fallback={<div>로딩 중...</div>}>
          <MonthlyDataGenerator channel="amazon_us" />
        </Suspense>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard
          title="총 매출"
          value={formatCurrency(totalRevenue)}
          subtitle="전체 기간 누적"
        />
        <StatsCard
          title="총 비용"
          value={formatCurrency(totalCost)}
          subtitle="전체 기간 누적"
        />
        <StatsCard
          title="총 이익"
          value={formatCurrency(totalProfit)}
          subtitle="전체 기간 누적"
        />
        <StatsCard
          title="이익률"
          value={formatPercentage(profitMargin)}
          subtitle="전체 기간 평균"
        />
      </div>

      {/* 월별 차트 */}
      <Card>
        <CardHeader>
          <CardTitle>월별 매출 및 이익 추이</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyChart data={monthlyData} showRevenue showProfit showCost />
        </CardContent>
      </Card>

      {/* 월별 매출/이익/이익률 표 */}
      <Card>
        <CardHeader>
          <CardTitle>{currentYear}년 월별 매출 및 이익 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">월</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">매출</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">이익</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">이익률</th>
                </tr>
              </thead>
              <tbody>
                {monthlyTableData.map((row) => (
                  <tr key={row.month} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{monthNames[row.month - 1]}</td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900">
                      {formatCurrency(row.revenue)}
                    </td>
                    <td className={`py-3 px-4 text-right font-medium ${
                      row.profit >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(row.profit)}
                    </td>
                    <td className={`py-3 px-4 text-right font-medium ${
                      row.margin >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatPercentage(row.margin)}
                    </td>
                  </tr>
                ))}
                {/* 합계 행 */}
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                  <td className="py-3 px-4 text-gray-900">합계</td>
                  <td className="py-3 px-4 text-right text-gray-900">
                    {formatCurrency(monthlyTableData.reduce((sum, row) => sum + row.revenue, 0))}
                  </td>
                  <td className={`py-3 px-4 text-right ${
                    monthlyTableData.reduce((sum, row) => sum + row.profit, 0) >= 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {formatCurrency(monthlyTableData.reduce((sum, row) => sum + row.profit, 0))}
                  </td>
                  <td className={`py-3 px-4 text-right ${
                    profitMargin >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercentage(profitMargin)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 최근 달 상세 데이터 */}
      <SKUTable
        data={recentSKUDetails.map((item: any) => {
          // SKUMonthlyData를 SalesData 형식으로 변환
          const productName = item.sku_master?.product_name || item.product_name || '';
          const channel = item.sku_master?.channel || 'amazon_us';
          
          // 매출 계산 (gross_sales 또는 다른 필드 사용)
          const revenue = Number(item.gross_sales || item.total_revenue || 0);
          
          // 비용 계산 (cost 필드가 있으면 사용, 없으면 revenue - margin 또는 0)
          const cost = Number(item.cost || (item.margin !== undefined ? revenue - item.margin : 0));
          
          // 이익 계산 (margin 또는 revenue - cost)
          const profit = Number(item.margin || item.profit || (revenue - cost));
          
          // 날짜 생성 (해당 월의 첫 번째 날)
          const date = `${item.year}-${String(item.month).padStart(2, '0')}-01`;
          
          return {
            marketplace: channel as 'amazon_us' | 'tiktok_shop',
            date: date,
            sku: item.sku,
            product_name: productName,
            revenue: revenue,
            cost: cost,
            profit: profit,
            quantity: item.total_order_quantity ? Number(item.total_order_quantity) : undefined,
          };
        })}
        title={`${currentYear}년 ${currentMonth}월 SKU별 상세 데이터`}
      />

      {/* Amazon 주문 데이터 가져오기 */}
      <AmazonOrdersFetcher />
    </div>
  );
}



