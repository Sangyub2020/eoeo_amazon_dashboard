import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/serverSupabaseClient';

export async function GET(request: NextRequest) {
  try {
    const supabase = getServerSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client initialization failed' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const brandFilter = searchParams.get('brand') || '';
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    // 월별, 브랜드별 집계 쿼리
    let query = supabase
      .from('amazon_us_monthly_data')
      .select(`
        year,
        month,
        gross_sales,
        refunds,
        total_fba_fee,
        total_referral_fee,
        transportation_fee,
        allocated_account_cost,
        margin,
        total_order_quantity,
        exchange_rate,
        sku,
        sku_master!amazon_us_monthly_data_sku_fkey (
          brand_name,
          supply_cost_won
        )
      `);
    
    // 연도 필터
    if (year) {
      query = query.eq('year', parseInt(year));
    }
    
    // 월 필터
    if (month) {
      query = query.eq('month', parseInt(month));
    }

    // 브랜드 필터 적용
    if (brandFilter) {
      // 브랜드 필터링을 위해 먼저 해당 브랜드의 SKU 목록을 가져옴
      const { data: skuList } = await supabase
        .from('sku_master')
        .select('sku')
        .eq('channel', 'amazon_us')
        .ilike('brand_name', `%${brandFilter}%`);

      if (skuList && skuList.length > 0) {
        const skus = skuList.map((s) => s.sku);
        query = query.in('sku', skus);
      } else {
        // 해당 브랜드가 없으면 빈 결과 반환
        return NextResponse.json({ data: [] });
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching monthly brand summary:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return NextResponse.json(
        { 
          error: error.message || 'Failed to fetch data',
          details: error.details,
          hint: error.hint,
        },
        { status: 500 }
      );
    }

    // 계정별 Referral Fee Rate 조회
    const accountNames = Array.from(new Set(
      (data || [])
        .map((row: any) => (row.sku_master as any)?.amazon_account_name)
        .filter((name: any) => name)
    ));

    const accountRateMap = new Map<string, number>();
    if (accountNames.length > 0) {
      const { data: accountData } = await supabase
        .from('account_master')
        .select('account_name, referral_fee_rate')
        .in('account_name', accountNames);

      if (accountData) {
        accountData.forEach((account: any) => {
          accountRateMap.set(account.account_name, Number(account.referral_fee_rate || 0.15));
        });
      }
    }

    // 월별, 브랜드별로 그룹화하여 집계
    const summaryMap = new Map<string, {
      year: number;
      month: number;
      brand_name: string;
      gross_sales: number;
      refunds: number;
      total_supply_cost: number;
      total_fba_fee: number;
      total_referral_fee: number;
      transportation_fee: number;
      allocated_account_cost: number;
      total_cost: number; // refunds + total_supply_cost + total_fba_fee + total_referral_fee + transportation_fee + allocated_account_cost
      margin: number; // gross_sales - total_cost
      total_order_quantity: number;
    }>();

    if (data) {
      for (const row of data) {
        // sku_master는 foreign key 조인으로 단일 객체로 반환됨
        const skuMaster = row.sku_master as any;
        const brandName = skuMaster?.brand_name || 'Unknown';
        const key = `${row.year}-${row.month}-${brandName}`;

        if (!summaryMap.has(key)) {
          summaryMap.set(key, {
            year: row.year,
            month: row.month,
            brand_name: brandName,
            gross_sales: 0,
            refunds: 0,
            total_supply_cost: 0,
            total_fba_fee: 0,
            total_referral_fee: 0,
            transportation_fee: 0,
            allocated_account_cost: 0,
            total_cost: 0,
            margin: 0,
            total_order_quantity: 0,
          });
        }

        const summary = summaryMap.get(key)!;
        const exchangeRate = Number(row.exchange_rate || 1);
        const supplyCostWon = Number(skuMaster?.supply_cost_won || 0);
        const supplyPriceUsd = exchangeRate > 0 ? supplyCostWon / exchangeRate : 0;
        const totalOrderQuantity = Number(row.total_order_quantity || 0);
        const totalSupplyCost = supplyPriceUsd * totalOrderQuantity;

        summary.gross_sales += Number(row.gross_sales || 0);
        summary.refunds += Number(row.refunds || 0);
        summary.total_supply_cost += totalSupplyCost;
        summary.total_fba_fee += Number(row.total_fba_fee || 0);
        summary.total_referral_fee += Number(row.total_referral_fee || 0);
        summary.transportation_fee += Number(row.transportation_fee || 0);
        summary.allocated_account_cost += Number(row.allocated_account_cost || 0);
        summary.total_order_quantity += totalOrderQuantity;
      }
    }

    // 총 비용과 마진 계산
    for (const summary of summaryMap.values()) {
      summary.total_cost = summary.refunds + summary.total_supply_cost + summary.total_fba_fee + 
                          summary.total_referral_fee + summary.transportation_fee + summary.allocated_account_cost;
      summary.margin = summary.gross_sales - summary.total_cost;
    }

    // 배열로 변환하고 정렬 (년도 내림차순, 월 내림차순, 브랜드명 오름차순)
    const result = Array.from(summaryMap.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      if (a.month !== b.month) return b.month - a.month;
      return a.brand_name.localeCompare(b.brand_name);
    });

    return NextResponse.json({ data: result });
  } catch (error: any) {
    console.error('Unexpected error in monthly brand summary:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

