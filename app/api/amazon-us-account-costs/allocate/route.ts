import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/multiSupabaseClient';

const supabase = getServerSupabase('primary');

// 계정 비용 안분 실행
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { account_name, year, month, allocation_method = 'sales_ratio' } = body;

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

    if (accountCost.total_account_cost === 0) {
      return NextResponse.json(
        { error: 'Total account cost is zero. Nothing to allocate.' },
        { status: 400 }
      );
    }

    // 해당 계정의 SKU별 매출 조회
    const { data: skuData, error: skuError } = await supabase
      .from('amazon_us_monthly_data')
      .select(`
        sku,
        gross_sales,
        total_order_quantity,
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

    // 디버깅: 전체 SKU 데이터 확인
    console.log(`Total SKUs found for ${year}-${month}:`, skuData?.length || 0);
    if (skuData && skuData.length > 0) {
      const accountNames = [...new Set(skuData.map((item: any) => item.sku_master?.amazon_account_name).filter(Boolean))];
      console.log(`Account names found in SKU data:`, accountNames);
      console.log(`Looking for account:`, account_name);
    }

    // 해당 계정의 SKU만 필터링 (대소문자 및 공백 무시)
    const normalizeAccountName = (name: string | null | undefined): string => {
      if (!name) return '';
      return name.trim().toLowerCase().replace(/\s+/g, ' ');
    };
    
    const normalizedAccountName = normalizeAccountName(account_name);
    const accountSkus = (skuData || []).filter(
      (item: any) => normalizeAccountName(item.sku_master?.amazon_account_name) === normalizedAccountName
    );

    if (accountSkus.length === 0) {
      // 더 상세한 에러 메시지 제공
      const totalSkus = skuData?.length || 0;
      const availableAccounts = skuData 
        ? [...new Set(skuData.map((item: any) => item.sku_master?.amazon_account_name).filter(Boolean))]
        : [];
      
      let errorMessage = `No SKUs found for account "${account_name}" in ${year}-${month}.`;
      if (totalSkus > 0) {
        errorMessage += ` Found ${totalSkus} SKUs for other accounts.`;
        if (availableAccounts.length > 0) {
          errorMessage += ` Available accounts: ${availableAccounts.join(', ')}.`;
        }
      } else {
        errorMessage += ` No SKU data exists for ${year}-${month} at all.`;
      }
      errorMessage += ` Please check if SKU master data has the correct amazon_account_name.`;
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 404 }
      );
    }

    // 안분 기준 계산
    let totalBase = 0;
    if (allocation_method === 'sales_ratio') {
      totalBase = accountSkus.reduce((sum, item) => sum + (item.gross_sales || 0), 0);
    } else if (allocation_method === 'quantity_ratio') {
      totalBase = accountSkus.reduce((sum, item) => sum + (item.total_order_quantity || 0), 0);
    } else {
      return NextResponse.json(
        { error: 'Invalid allocation_method. Use "sales_ratio" or "quantity_ratio"' },
        { status: 400 }
      );
    }

    if (totalBase === 0) {
      return NextResponse.json(
        { error: `Total ${allocation_method === 'sales_ratio' ? 'sales' : 'quantity'} is zero. Cannot allocate.` },
        { status: 400 }
      );
    }

    // 기존 안분 금액 초기화
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

    // 각 SKU별 안분 금액 계산 및 업데이트
    const allocationResults = [];
    for (const skuItem of accountSkus) {
      const baseValue = allocation_method === 'sales_ratio' 
        ? (skuItem.gross_sales || 0)
        : (skuItem.total_order_quantity || 0);
      
      const allocationRatio = baseValue / totalBase;
      const allocatedAmount = accountCost.total_account_cost * allocationRatio;

      const { error: updateError } = await supabase
        .from('amazon_us_monthly_data')
        .update({ allocated_account_cost: allocatedAmount })
        .eq('sku', skuItem.sku)
        .eq('year', parseInt(year))
        .eq('month', parseInt(month));

      if (updateError) {
        console.error(`Error updating SKU ${skuItem.sku}:`, updateError);
        continue;
      }

      allocationResults.push({
        sku: skuItem.sku,
        base_value: baseValue,
        allocation_ratio: allocationRatio,
        allocated_amount: allocatedAmount,
      });
    }

    // 안분 완료 상태 업데이트
    const { error: updateCostError } = await supabase
      .from('amazon_us_account_monthly_costs')
      .update({
        is_allocated: true,
        allocated_at: new Date().toISOString(),
        allocation_method,
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
      message: `Successfully allocated ${accountCost.total_account_cost} to ${allocationResults.length} SKUs`,
      allocation_method,
      total_cost: accountCost.total_account_cost,
      total_base: totalBase,
      results: allocationResults,
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

