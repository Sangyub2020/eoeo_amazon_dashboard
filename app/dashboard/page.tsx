import { getMonthlySummary, getSKUSummary } from '@/lib/api';
import { StatsCard } from '@/components/stats-card';
import { MonthlyChart } from '@/components/monthly-chart';
import { SKUTable } from '@/components/sku-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DashboardPage() {
  const monthlyData = await getMonthlySummary('all');
  const skuData = await getSKUSummary('all', 50);

  // 전체 통계 계산
  const totalRevenue = monthlyData.reduce(
    (sum, item) => sum + Number(item.total_revenue || 0),
    0
  );
  const totalProfit = monthlyData.reduce(
    (sum, item) => sum + Number(item.total_profit || 0),
    0
  );
  const totalCost = totalRevenue - totalProfit; // 매출 - 이익 = 비용

  // 최근 3개월 평균
  const recent3Months = monthlyData.slice(0, 3);
  const avgRevenue =
    recent3Months.length > 0
      ? recent3Months.reduce(
          (sum, item) => sum + Number(item.total_revenue),
          0
        ) / recent3Months.length
      : 0;
  const avgProfit =
    recent3Months.length > 0
      ? recent3Months.reduce(
          (sum, item) => sum + Number(item.total_profit),
          0
        ) / recent3Months.length
      : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent mb-2">통합 대시보드</h1>
        <p className="text-gray-400">모든 마켓플레이스의 월별 매출과 이익 현황</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="총 매출"
          value={formatCurrency(totalRevenue)}
          subtitle="전체 기간 누적"
        />
        <StatsCard
          title="총 이익률"
          value={totalRevenue > 0 ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}%` : '0%'}
          subtitle="전체 기간 평균"
        />
        <StatsCard
          title="총 이익"
          value={formatCurrency(totalProfit)}
          subtitle="전체 기간 누적"
        />
        <StatsCard
          title="평균 월 매출"
          value={formatCurrency(avgRevenue)}
          subtitle="최근 3개월 평균"
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

      {/* SKU별 상세 데이터 */}
      <SKUTable
        data={skuData.map((item) => ({
          marketplace: item.channel || 'amazon_us',
          date: '', // SKU 집계 데이터에는 날짜가 없음
          sku: item.sku,
          product_name: item.product_name,
          revenue: Number(item.total_revenue || 0),
          cost: Number(item.total_revenue || 0) - Number(item.total_profit || 0), // 매출 - 이익 = 비용
          profit: Number(item.total_profit || 0),
          quantity: item.total_quantity ? Number(item.total_quantity) : undefined,
        }))}
        title="SKU별 집계 데이터 (상위 50개)"
      />
    </div>
  );
}

