import { getMonthlySummary, getSKUSummary, getSKUDetailsByMonth } from '@/lib/api';
import { StatsCard } from '@/components/stats-card';
import { MonthlyChart } from '@/components/monthly-chart';
import { SKUTable } from '@/components/sku-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function TikTokShopPage() {
  const monthlyData = await getMonthlySummary('tiktok_shop');
  const skuData = await getSKUSummary('tiktok_shop', 50);

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

  // 최근 달 데이터 가져오기
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const recentSKUDetails = await getSKUDetailsByMonth(
    currentYear,
    currentMonth,
    'tiktok_shop'
  );

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">TikTok Shop</h1>
        <p className="text-gray-600">TikTok Shop 마켓플레이스의 월별 매출과 이익 현황</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

      {/* SKU별 집계 */}
      <SKUTable
        data={skuData.map((item) => ({
          marketplace: item.marketplace,
          date: '',
          sku: item.sku,
          product_name: item.product_name,
          revenue: Number(item.total_revenue),
          cost: Number(item.total_cost),
          profit: Number(item.total_profit),
          quantity: item.total_quantity ? Number(item.total_quantity) : undefined,
        }))}
        title="SKU별 집계 데이터 (상위 50개)"
      />

      {/* 최근 달 상세 데이터 */}
      <SKUTable
        data={recentSKUDetails}
        title={`${currentYear}년 ${currentMonth}월 SKU별 상세 데이터`}
      />
    </div>
  );
}












