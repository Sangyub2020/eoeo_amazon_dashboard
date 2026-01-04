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
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear();
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : new Date().getMonth() + 1;

    // 최신 월의 재고 정보 조회
    let query = supabase
      .from('amazon_us_monthly_data')
      .select(`
        sku,
        year,
        month,
        fba_inventory,
        inbound_working,
        inbound_shipped,
        inbound_receiving,
        reserved_orders,
        reserved_fc_transfer,
        reserved_fc_processing,
        researching_total,
        researching_short_term,
        researching_mid_term,
        researching_long_term,
        unfulfillable_total,
        unfulfillable_customer_damaged,
        unfulfillable_warehouse_damaged,
        unfulfillable_distributor_damaged,
        unfulfillable_carrier_damaged,
        unfulfillable_defective,
        unfulfillable_expired,
        pending_in_kr,
        in_air,
        in_ocean,
        sl_glovis,
        cconma,
        ctk_usa,
        sku_master!amazon_us_monthly_data_sku_fkey (
          sku,
          product_name,
          brand_name,
          product_master (
            product_name,
            brand_name
          )
        )
      `)
      .eq('year', year)
      .eq('month', month);

    // 브랜드 필터 적용
    if (brandFilter) {
      const { data: skuList } = await supabase
        .from('sku_master')
        .select('sku')
        .eq('channel', 'amazon_us')
        .ilike('brand_name', `%${brandFilter}%`);

      if (skuList && skuList.length > 0) {
        const skus = skuList.map((s) => s.sku);
        query = query.in('sku', skus);
      } else {
        return NextResponse.json({ data: [] });
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching inventory summary:', {
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

    // 제품별로 데이터 변환
    interface ProductSummary {
      brand_name: string;
      product_name: string;
      sku: string;
      fba_inventory: number;
      inbound_working: number;
      inbound_shipped: number;
      inbound_receiving: number;
      reserved_orders: number;
      reserved_fc_transfer: number;
      reserved_fc_processing: number;
      researching_total: number;
      researching_short_term: number;
      researching_mid_term: number;
      researching_long_term: number;
      unfulfillable_total: number;
      unfulfillable_customer_damaged: number;
      unfulfillable_warehouse_damaged: number;
      unfulfillable_distributor_damaged: number;
      unfulfillable_carrier_damaged: number;
      unfulfillable_defective: number;
      unfulfillable_expired: number;
      pending_in_kr: number;
      in_air: number;
      in_ocean: number;
      sl_glovis: number;
      cconma: number;
      ctk_usa: number;
    }

    const result: ProductSummary[] = [];

    if (data) {
      for (const row of data) {
        const skuMaster = row.sku_master as any;
        const brandName = skuMaster?.brand_name || skuMaster?.product_master?.brand_name || 'Unknown';
        const productName = skuMaster?.product_name || skuMaster?.product_master?.product_name || row.sku;
        const sku = row.sku;

        result.push({
          brand_name: brandName,
          product_name: productName,
          sku: sku,
          fba_inventory: Number(row.fba_inventory || 0),
          inbound_working: Number(row.inbound_working || 0),
          inbound_shipped: Number(row.inbound_shipped || 0),
          inbound_receiving: Number(row.inbound_receiving || 0),
          reserved_orders: Number(row.reserved_orders || 0),
          reserved_fc_transfer: Number(row.reserved_fc_transfer || 0),
          reserved_fc_processing: Number(row.reserved_fc_processing || 0),
          researching_total: Number(row.researching_total || 0),
          researching_short_term: Number(row.researching_short_term || 0),
          researching_mid_term: Number(row.researching_mid_term || 0),
          researching_long_term: Number(row.researching_long_term || 0),
          unfulfillable_total: Number(row.unfulfillable_total || 0),
          unfulfillable_customer_damaged: Number(row.unfulfillable_customer_damaged || 0),
          unfulfillable_warehouse_damaged: Number(row.unfulfillable_warehouse_damaged || 0),
          unfulfillable_distributor_damaged: Number(row.unfulfillable_distributor_damaged || 0),
          unfulfillable_carrier_damaged: Number(row.unfulfillable_carrier_damaged || 0),
          unfulfillable_defective: Number(row.unfulfillable_defective || 0),
          unfulfillable_expired: Number(row.unfulfillable_expired || 0),
          pending_in_kr: Number(row.pending_in_kr || 0),
          in_air: Number(row.in_air || 0),
          in_ocean: Number(row.in_ocean || 0),
          sl_glovis: Number(row.sl_glovis || 0),
          cconma: Number(row.cconma || 0),
          ctk_usa: Number(row.ctk_usa || 0),
        });
      }
    }

    // 브랜드명, 제품명, SKU 순으로 정렬
    result.sort((a, b) => {
      const brandCompare = a.brand_name.localeCompare(b.brand_name);
      if (brandCompare !== 0) return brandCompare;
      const productCompare = a.product_name.localeCompare(b.product_name);
      if (productCompare !== 0) return productCompare;
      return a.sku.localeCompare(b.sku);
    });

    return NextResponse.json({ 
      data: result,
      year,
      month,
    });
  } catch (error: any) {
    console.error('Unexpected error in inventory summary:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

