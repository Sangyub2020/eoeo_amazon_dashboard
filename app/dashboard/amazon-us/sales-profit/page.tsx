import { getMonthlySummary } from '@/lib/api';
import { AmazonUSTabs } from '@/components/amazon-us-tabs';
import { MonthlySummaryView } from '@/components/monthly-summary-view';
import { getServerSupabase } from '@/lib/serverSupabaseClient';

export default async function AmazonUSSalesProfitPage() {
  const monthlyData = await getMonthlySummary('amazon_us');

  // 각 월별 환율 가져오기
  const serverSupabase = getServerSupabase();
  const exchangeRates: Record<string, number> = {};
  
  if (serverSupabase) {
    const { data: rateData } = await serverSupabase
      .from('amazon_us_monthly_data')
      .select('year, month, exchange_rate')
      .not('exchange_rate', 'is', null);

    if (rateData) {
      // 각 연월별로 평균 환율 계산
      const rateMap = new Map<string, number[]>();
      rateData.forEach(item => {
        const key = `${item.year}-${item.month}`;
        if (!rateMap.has(key)) {
          rateMap.set(key, []);
        }
        rateMap.get(key)!.push(Number(item.exchange_rate || 0));
      });

      rateMap.forEach((rates, key) => {
        const avgRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
        exchangeRates[key] = avgRate;
      });
    }
  }

  // MonthlySummaryView에 전달할 데이터 형식 변환 (환율 포함)
  const formattedData = monthlyData.map(item => {
    const key = `${item.year}-${item.month}`;
    const exchangeRate = exchangeRates[key] || 1; // 환율이 없으면 1로 설정 (변환 안 함)
    
    return {
      year: item.year,
      month: item.month,
      total_revenue: Number(item.total_revenue || 0),
      total_cost: Number(item.total_cost || 0),
      total_profit: Number(item.total_profit || 0),
      exchange_rate: exchangeRate,
    };
  });

  return (
    <div className="min-h-screen bg-[#121212] p-6">
      <div className="space-y-6">
        <AmazonUSTabs 
          activeTab="sales-profit"
          dashboardContent={<MonthlySummaryView initialData={formattedData} />} 
        />
      </div>
    </div>
  );
}


