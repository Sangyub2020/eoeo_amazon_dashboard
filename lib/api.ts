import { supabase } from './supabaseClient';
import { serverSupabase } from './serverSupabaseClient';
import { MonthlySummary, SKUSummary, SKUMaster, SKUMonthlyData, Channel } from './types';

// 채널별 테이블 이름 반환 헬퍼 함수
function getMonthlyDataTableName(channel: Channel): string {
  switch (channel) {
    case 'amazon_us':
      return 'amazon_us_monthly_data';
    case 'tiktok_shop':
      return 'tiktok_shop_monthly_data';
    default:
      throw new Error(`Invalid channel: ${channel}`);
  }
}

// SKU 마스터 정보 가져오기
export async function getSKUMaster(sku?: string): Promise<SKUMaster[]> {
  let query = supabase
    .from('sku_master')
    .select('*')
    .order('sku', { ascending: true });

  if (sku) {
    query = query.eq('sku', sku);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching SKU master:', error);
    throw error;
  }

  return data || [];
}

// 월별 집계 데이터 가져오기 (채널별)
// 서버 컴포넌트에서 사용하므로 serverSupabase 사용
export async function getMonthlySummary(
  channel: Channel = 'all'
): Promise<MonthlySummary[]> {
  try {
    // 서버 사이드에서는 getServerSupabase() 함수 사용
    const { getServerSupabase } = await import('./serverSupabaseClient');
    const client = getServerSupabase();
    
    if (!client) {
      console.error('No Supabase client available in getMonthlySummary');
      return [];
    }

    let query = client
      .from('monthly_summary_by_channel')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (channel !== 'all') {
      query = query.eq('channel', channel);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching monthly summary:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      // 에러가 발생해도 빈 배열 반환 (데이터가 없을 때도 정상 동작)
      return [];
    }

    return data || [];
  } catch (error: any) {
    console.error('Unexpected error in getMonthlySummary:', {
      message: error?.message,
      stack: error?.stack,
    });
    // 예상치 못한 에러도 빈 배열 반환
    return [];
  }
}

// SKU별 집계 데이터 가져오기
// 서버 컴포넌트에서 사용하므로 serverSupabase 사용
export async function getSKUSummary(
  channel: Channel = 'all',
  limit: number = 100
): Promise<SKUSummary[]> {
  try {
    // 서버 사이드에서는 getServerSupabase() 함수 사용
    const { getServerSupabase } = await import('./serverSupabaseClient');
    const client = getServerSupabase();
    
    if (!client) {
      console.error('No Supabase client available in getSKUSummary');
      return [];
    }

    let query = client
      .from('sku_summary_view')
      .select('*')
      .order('total_revenue', { ascending: false })
      .limit(limit);

    if (channel !== 'all') {
      query = query.eq('channel', channel);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching SKU summary:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      // 에러가 발생해도 빈 배열 반환
      return [];
    }

    return data || [];
  } catch (error: any) {
    console.error('Unexpected error in getSKUSummary:', {
      message: error?.message,
      stack: error?.stack,
    });
    return [];
  }
}

// 특정 월의 SKU별 상세 데이터 가져오기
// 서버 컴포넌트에서 사용하므로 serverSupabase 사용
export async function getSKUDetailsByMonth(
  year: number,
  month: number,
  channel: Channel = 'all'
): Promise<SKUMonthlyData[]> {
  try {
    // 서버 사이드에서는 getServerSupabase() 함수 사용
    const { getServerSupabase } = await import('./serverSupabaseClient');
    const client = getServerSupabase();
    
    if (!client) {
      console.error('No Supabase client available in getSKUDetailsByMonth');
      return [];
    }

    // 채널별로 테이블 분리되었으므로, 'all'인 경우 모든 채널에서 가져오기
    if (channel === 'all') {
      const [amazonData, tiktokData] = await Promise.all([
        client.from('amazon_us_monthly_data')
          .select(`
            *,
            sku_master (
              sku,
              product_name,
              channel,
              brand_name,
              company_name,
              sales_price,
              supply_cost_won
            )
          `)
          .eq('year', year)
          .eq('month', month)
          .order('total_order_quantity', { ascending: false }),
        client.from('tiktok_shop_monthly_data')
          .select(`
            *,
            sku_master (
              sku,
              product_name,
              channel,
              brand_name,
              company_name
            )
          `)
          .eq('year', year)
          .eq('month', month)
          .order('gross_sales', { ascending: false }),
      ]);

      const allData = [
        ...(amazonData.data || []),
        ...(tiktokData.data || []),
      ];

      // 전체 데이터를 정렬 (Amazon은 total_order_quantity, 다른 채널은 gross_sales 기준)
      return allData.sort((a, b) => {
        const valueA = Number(a.total_order_quantity || a.gross_sales || 0);
        const valueB = Number(b.total_order_quantity || b.gross_sales || 0);
        return valueB - valueA;
      }) as SKUMonthlyData[];
    }

    // 특정 채널인 경우
    const tableName = getMonthlyDataTableName(channel);
    const orderBy = channel === 'amazon_us' ? 'total_order_quantity' : 'gross_sales';
    
    const { data, error } = await client
      .from(tableName)
      .select(`
        *,
        sku_master (
          sku,
          product_name,
          channel,
          brand_name,
          company_name,
          sales_price,
          supply_cost_won
        )
      `)
      .eq('year', year)
      .eq('month', month)
      .order(orderBy, { ascending: false });

    if (error) {
      console.error('Error fetching SKU details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return [];
    }

    return (data || []) as SKUMonthlyData[];
  } catch (error: any) {
    console.error('Unexpected error in getSKUDetailsByMonth:', {
      message: error?.message,
      stack: error?.stack,
    });
    return [];
  }
}

// SKU 마스터 정보 저장/업데이트
export async function upsertSKUMaster(skuData: SKUMaster): Promise<SKUMaster> {
  const { data, error } = await supabase
    .from('sku_master')
    .upsert(skuData, {
      onConflict: 'sku',
    })
    .select()
    .single();

  if (error) {
    console.error('Error upserting SKU master:', error);
    throw error;
  }

  return data;
}

// 월별 SKU 데이터 저장/업데이트
export async function upsertSKUMonthlyData(
  monthlyData: SKUMonthlyData & { channel?: Channel }
): Promise<SKUMonthlyData> {
  // channel이 없으면 sku_master에서 조회
  if (!monthlyData.channel) {
    const { data: skuMaster } = await supabase
      .from('sku_master')
      .select('channel')
      .eq('sku', monthlyData.sku)
      .single();
    
    if (!skuMaster) {
      throw new Error(`SKU not found: ${monthlyData.sku}`);
    }
    monthlyData.channel = skuMaster.channel as Channel;
  }

  const tableName = getMonthlyDataTableName(monthlyData.channel);
  const { data, error } = await supabase
    .from(tableName)
    .upsert(monthlyData, {
      onConflict: 'sku,year,month',
    })
    .select()
    .single();

  if (error) {
    console.error('Error upserting SKU monthly data:', error);
    throw error;
  }

  return data;
}

// 여러 SKU 월별 데이터 일괄 저장/업데이트
export async function bulkUpsertSKUMonthlyData(
  monthlyDataList: (SKUMonthlyData & { channel?: Channel })[],
  channel: Channel
): Promise<void> {
  const tableName = getMonthlyDataTableName(channel);
  const { error } = await supabase
    .from(tableName)
    .upsert(monthlyDataList, {
      onConflict: 'sku,year,month',
    });

  if (error) {
    console.error('Error bulk upserting SKU monthly data:', error);
    throw error;
  }
}
