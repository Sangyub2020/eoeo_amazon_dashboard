import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/serverSupabaseClient';
import { SKUMonthlyData, AmazonUSMonthlyData, Channel } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const serverSupabase = getServerSupabase();
    if (!serverSupabase) {
      return NextResponse.json(
        { error: 'Supabase client is not configured.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { channel, skus, year, month, exchange_rate } = body;

    if (!channel || !Array.isArray(skus) || skus.length === 0 || !year || !month || !exchange_rate) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 해당 채널의 SKU 마스터 정보 가져오기
    const { data: skuMasterData, error: skuError } = await serverSupabase
      .from('sku_master')
      .select(`
        *,
        product_master (
          internal_code,
          brand_name,
          company_name
        )
      `)
      .eq('channel', channel)
      .in('sku', skus);

    if (skuError) {
      return NextResponse.json(
        { error: `SKU 마스터 조회 실패: ${skuError.message}` },
        { status: 500 }
      );
    }

    if (!skuMasterData || skuMasterData.length === 0) {
      return NextResponse.json(
        { error: '선택한 SKU를 찾을 수 없습니다.' },
        { status: 400 }
      );
    }

    // 채널별 테이블 이름
    const tableName = channel === 'amazon_us' ? 'amazon_us_monthly_data' 
      : 'tiktok_shop_monthly_data';

    // 해당 연도/월의 기존 데이터 확인 (SKU 기준)
    const skuList = skuMasterData.map(s => s.sku);
    const { data: existingMonthlyData, error: existingError } = await serverSupabase
      .from(tableName)
      .select('sku, year, month')
      .eq('year', year)
      .eq('month', month)
      .in('sku', skuList);

    // 기존 SKU 목록 (중복 체크용)
    const existingSkus = new Set<string>();
    if (!existingError && existingMonthlyData) {
      existingMonthlyData.forEach(item => {
        existingSkus.add(item.sku);
      });
    }

    // 새로 생성할 데이터 준비
    let monthlyDataList: any[] = [];
    let createdCount = 0;
    let skippedCount = 0;

    for (const skuMaster of skuMasterData) {
      // 해당 SKU가 이미 해당 연도/월에 데이터가 있으면 스킵
      if (existingSkus.has(skuMaster.sku)) {
        skippedCount++;
        continue;
      }

      // Amazon US의 경우 새로운 간소화된 구조 사용
      if (channel === 'amazon_us') {
        const monthlyData: Partial<AmazonUSMonthlyData> = {
          sku: skuMaster.sku,
          year,
          month,
          exchange_rate: exchange_rate,
          // 기본값 설정 (나중에 업데이트 가능)
          fba_inventory: 0,
          // inbound_total은 계산 필드이므로 저장하지 않음
          inbound_working: 0,
          inbound_shipped: 0,
          inbound_receiving: 0,
          reserved_orders: 0,
          reserved_fc_transfer: 0,
          reserved_fc_processing: 0,
          fba_fee: 0,
          referral_fee: 0,
          transportation_fee: 0,
          tariff_per_unit: 0,
          margin: undefined, // 나중에 계산
          total_order_quantity: 0,
        };
        monthlyDataList.push(monthlyData);
      } else {
        // 다른 채널의 경우 기존 구조 유지 (추후 정의)
        const monthlyData: Partial<SKUMonthlyData> = {
          sku: skuMaster.sku,
          year,
          month,
          monthly_exchange_rate: exchange_rate,
          // 기본값 설정 (나중에 업데이트 가능)
          total_order_quantity: 0,
        };
        monthlyDataList.push(monthlyData);
      }
      
      createdCount++;
    }

    if (monthlyDataList.length === 0) {
      return NextResponse.json(
        { 
          success: true,
          message: `모든 SKU가 이미 해당 연도/월에 데이터가 있습니다. (${skippedCount}개 중복)`,
          created_count: 0,
          skipped_count: skippedCount
        },
        { status: 200 }
      );
    }

    // 데이터 일괄 삽입 (채널별 테이블 사용)
    const { data: insertedData, error: insertError } = await serverSupabase
      .from(tableName)
      .upsert(monthlyDataList, {
        onConflict: 'sku,year,month',
      })
      .select(`
        *,
        sku_master (
          sku,
          internal_code,
          product_name,
          channel
        )
      `);

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: `데이터 생성 실패: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${createdCount}개의 월별 데이터가 생성되었습니다.${skippedCount > 0 ? ` (${skippedCount}개는 중복으로 제외됨)` : ''}`,
      created_count: createdCount,
      skipped_count: skippedCount,
      data: insertedData || [],
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || '데이터 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}









