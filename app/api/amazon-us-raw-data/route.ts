import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/serverSupabaseClient';

const PAGE_SIZE = 100;

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
    const page = parseInt(searchParams.get('page') || '1', 10);
    const searchType = searchParams.get('searchType') || ''; // 'sku' | 'brand' | 'product_name'
    const searchValue = searchParams.get('searchValue') || '';
    const selectedColumns = searchParams.get('columns')?.split(',') || [];

    // 기본 조인 쿼리 (sku_master와 product_master 조인)
    let query = supabase
      .from('amazon_us_monthly_data')
      .select(`
        *,
        sku_master!amazon_us_monthly_data_sku_fkey (
          sku,
          product_name,
          brand_name,
          internal_code,
          product_master (
            product_name,
            brand_name,
            company_name
          )
        )
      `, { count: 'exact' });

    // 검색 필터 적용
    // Supabase의 nested join 필터링이 제한적이므로, 브랜드/제품명 검색 시 먼저 SKU를 찾은 후 필터링
    let skuFilter: string[] | null = null;
    if (searchValue) {
      if (searchType === 'sku') {
        query = query.ilike('sku', `%${searchValue}%`);
      } else if (searchType === 'brand' || searchType === 'product_name') {
        // 브랜드명 또는 제품명으로 검색할 경우, 먼저 sku_master에서 해당 SKU 찾기
        // Supabase는 nested join 필터링이 제한적이므로, 먼저 product_master를 조인한 sku_master에서 찾기
        const skuQuery = supabase
          .from('sku_master')
          .select(`
            sku,
            brand_name,
            product_name,
            product_master!sku_master_internal_code_fkey (
              brand_name,
              product_name
            )
          `)
          .eq('channel', 'amazon_us');

        const { data: skuData } = await skuQuery;
        
        // 클라이언트 사이드에서 필터링 (더 간단하고 확실함)
        let matchedSkus: string[] = [];
        if (skuData) {
          matchedSkus = skuData
            .filter((item: any) => {
              const brandMatch = searchType === 'brand' && (
                item.brand_name?.toLowerCase().includes(searchValue.toLowerCase()) ||
                item.product_master?.brand_name?.toLowerCase().includes(searchValue.toLowerCase())
              );
              const productMatch = searchType === 'product_name' && (
                item.product_name?.toLowerCase().includes(searchValue.toLowerCase()) ||
                item.product_master?.product_name?.toLowerCase().includes(searchValue.toLowerCase())
              );
              return brandMatch || productMatch;
            })
            .map((item: any) => item.sku);
        }

        if (matchedSkus.length > 0) {
          query = query.in('sku', matchedSkus);
        } else {
          // 매칭되는 SKU가 없으면 빈 결과 반환
          return NextResponse.json({
            data: [],
            pagination: {
              page: 1,
              pageSize: PAGE_SIZE,
              total: 0,
              totalPages: 0,
            },
          });
        }
      }
    }

    // 정렬 (최신순)
    query = query.order('year', { ascending: false })
      .order('month', { ascending: false })
      .order('sku', { ascending: true });

    // 페이지네이션
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching raw data:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // 선택된 열만 필터링 (프론트엔드에서 처리하거나 여기서 처리 가능)
    // 일단 모든 데이터 반환하고 프론트엔드에서 필터링

    const totalPages = Math.ceil((count || 0) / PAGE_SIZE);

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total: count || 0,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('Unexpected error in GET /api/amazon-us-raw-data:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

