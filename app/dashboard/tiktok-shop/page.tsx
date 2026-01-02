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
          marketplace: (item.marketplace || 'tiktok_shop') as 'amazon_us' | 'tiktok_shop',
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
        data={recentSKUDetails.map((item: any) => {
          // SKUMonthlyData를 SalesData 형식으로 변환
          const productName = item.sku_master?.product_name || item.product_name || '';
          const channel = item.sku_master?.channel || 'tiktok_shop';
          
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
    </div>
  );
}












