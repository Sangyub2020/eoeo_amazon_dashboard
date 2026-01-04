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
    const skuFilter = searchParams.get('sku') || '';
    const brandFilter = searchParams.get('brand') || '';

    // SKU별 데이터 조회 (집계 없이)
    let query = supabase
      .from('amazon_us_monthly_data')
      .select(`
        year,
        month,
        sku,
        gross_sales,
        refunds,
        total_fba_fee,
        total_referral_fee,
        transportation_fee,
        fba_fee,
        referral_fee,
        tariff_per_unit,
        margin,
        total_order_quantity,
        exchange_rate,
        allocated_account_cost,
        sku_master!amazon_us_monthly_data_sku_fkey (
          sku,
          product_name,
          brand_name,
          sales_price,
          supply_cost_won,
          amazon_account_name
        )
      `)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .order('sku', { ascending: true });

    // SKU 필터 적용
    if (skuFilter) {
      query = query.ilike('sku', `%${skuFilter}%`);
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
      console.error('Error fetching monthly SKU summary:', {
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

    // 계정별 Referral Fee Rate 조회 (한 번에 조회)
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

    // SKU별 데이터 정리 (집계 없이)
    const processedData = (data || []).map((row: any) => {
      const skuMaster = row.sku_master as any;
      const exchangeRate = Number(row.exchange_rate || 1);
      const supplyCostWon = Number(skuMaster?.supply_cost_won || 0);
      const supplyPriceUsd = exchangeRate > 0 ? supplyCostWon / exchangeRate : 0;
      const salesPrice = Number(skuMaster?.sales_price || 0);
      
      // 계정 마스터의 Referral Fee Rate로 재계산
      const accountName = skuMaster?.amazon_account_name;
      const referralFeeRate = accountName ? (accountRateMap.get(accountName) || 0.15) : 0.15;
      const referralFeePerUnit = salesPrice * referralFeeRate;
      
      // 총 비용 계산: 환불 + Total 공급가 + FBA Fee + 아마존 Fee + 물류비 + 계정단위 비용
      const totalOrderQuantity = Number(row.total_order_quantity || 0);
      const totalSupplyCost = supplyPriceUsd * totalOrderQuantity;
      const refunds = Number(row.refunds || 0);
      const totalFbaFee = Number(row.total_fba_fee || 0);
      const totalReferralFee = Number(row.total_referral_fee || 0);
      const transportationFee = Number(row.transportation_fee || 0);
      const allocatedAccountCost = Number(row.allocated_account_cost || 0);
      const totalCost = refunds + totalSupplyCost + totalFbaFee + totalReferralFee + transportationFee + allocatedAccountCost;
      
      // 마진 계산: 총 매출 - 총 비용
      const grossSales = Number(row.gross_sales || 0);
      const margin = grossSales - totalCost;
      
      return {
        year: row.year,
        month: row.month,
        sku: row.sku,
        product_name: skuMaster?.product_name || 'Unknown',
        brand_name: skuMaster?.brand_name || 'Unknown',
        sales_price: salesPrice,
        supply_price_usd: supplyPriceUsd,
        fba_fee_per_unit: Number(row.fba_fee || 0),
        referral_fee_per_unit: referralFeePerUnit,
        transportation_fee_per_unit: Number(row.transportation_fee || 0),
        tariff_per_unit: Number(row.tariff_per_unit || 0),
        gross_sales: grossSales,
        refunds: refunds,
        total_fba_fee: totalFbaFee,
        total_referral_fee: totalReferralFee,
        transportation_fee: transportationFee,
        allocated_account_cost: allocatedAccountCost,
        total_cost: totalCost,
        margin: margin,
        total_order_quantity: totalOrderQuantity,
      };
    });

    return NextResponse.json({ data: processedData });
  } catch (error: any) {
    console.error('Unexpected error in monthly SKU summary:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

