import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/multiSupabaseClient';

const supabase = getServerSupabase('primary');

// 안분 재설정 (안분된 비용을 초기화하고 안분 상태를 해제)
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { account_name, year, month } = body;

    // 필수 필드 검증
    if (!account_name || !year || !month) {
      return NextResponse.json(
        { error: 'account_name, year, month are required' },
        { status: 400 }
      );
    }

    // 계정 비용 조회
    const { data: accountCost, error: costError } = await supabase
      .from('amazon_us_account_monthly_costs')
      .select('*')
      .eq('account_name', account_name)
      .eq('year', parseInt(year))
      .eq('month', parseInt(month))
      .single();

    if (costError || !accountCost) {
      return NextResponse.json(
        { error: 'Account cost not found' },
        { status: 404 }
      );
    }

    // 해당 계정의 SKU 조회
    const { data: skuData, error: skuError } = await supabase
      .from('amazon_us_monthly_data')
      .select(`
        sku,
        sku_master!amazon_us_monthly_data_sku_fkey (
          amazon_account_name
        )
      `)
      .eq('year', parseInt(year))
      .eq('month', parseInt(month));

    if (skuError) {
      console.error('Error fetching SKU data:', skuError);
      return NextResponse.json(
        { error: skuError.message },
        { status: 500 }
      );
    }

    // 해당 계정의 SKU만 필터링
    const accountSkus = (skuData || []).filter(
      (item: any) => item.sku_master?.amazon_account_name === account_name
    );

    // 안분 금액 초기화
    if (accountSkus.length > 0) {
      const { error: resetError } = await supabase
        .from('amazon_us_monthly_data')
        .update({ allocated_account_cost: 0 })
        .in('sku', accountSkus.map((item: any) => item.sku))
        .eq('year', parseInt(year))
        .eq('month', parseInt(month));

      if (resetError) {
        console.error('Error resetting allocated costs:', resetError);
        return NextResponse.json(
          { error: resetError.message },
          { status: 500 }
        );
      }
    }

    // 안분 상태 해제
    const { error: updateCostError } = await supabase
      .from('amazon_us_account_monthly_costs')
      .update({
        is_allocated: false,
        allocated_at: null,
      })
      .eq('id', accountCost.id);

    if (updateCostError) {
      console.error('Error updating allocation status:', updateCostError);
      return NextResponse.json(
        { error: updateCostError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully reset allocation for ${accountSkus.length} SKUs`,
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

