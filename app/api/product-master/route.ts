import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/serverSupabaseClient';
import { ProductMaster } from '@/lib/types';

// 환경 변수 확인
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase environment variables');
}

// 제품 마스터 정보 조회
export async function GET(request: NextRequest) {
  try {
    const serverSupabase = getServerSupabase();
    if (!serverSupabase) {
      return NextResponse.json(
        { error: 'Supabase client is not configured. Please check environment variables.' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const internalCode = searchParams.get('internal_code');

    let query = serverSupabase
      .from('product_master')
      .select('*')
      .order('internal_code', { ascending: true });

    if (internalCode) {
      query = query.ilike('internal_code', `%${internalCode}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch product master' },
      { status: 500 }
    );
  }
}

// 제품 마스터 정보 추가/업데이트
export async function POST(request: NextRequest) {
  try {
    // Supabase 클라이언트 확인
    const serverSupabase = getServerSupabase();
    if (!serverSupabase) {
      console.error('Supabase client is not initialized');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const body = await request.json();
    
    if (!body) {
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      );
    }

    const productData = Array.isArray(body) ? body : [body];

    // 필수 필드 검증 및 데이터 정리
    const validatedProducts: ProductMaster[] = [];
    const errors: string[] = [];

    for (let i = 0; i < productData.length; i++) {
      const product = productData[i];
      
      // 빈 문자열을 undefined로 변환
      const cleanProduct: any = {};
      for (const key in product) {
        const value = product[key];
        cleanProduct[key] = value === '' || value === null ? undefined : value;
      }

      if (!cleanProduct.internal_code || cleanProduct.internal_code.trim() === '') {
        errors.push(`Row ${i + 1}: internal_code is required`);
        continue;
      }
      
      if (!cleanProduct.product_name || cleanProduct.product_name.trim() === '') {
        errors.push(`Row ${i + 1}: product_name is required`);
        continue;
      }

      validatedProducts.push({
        internal_code: cleanProduct.internal_code.trim(),
        barcode: cleanProduct.barcode?.trim() || undefined,
        product_name: cleanProduct.product_name.trim(),
        company_name: cleanProduct.company_name?.trim() || undefined,
        brand_name: cleanProduct.brand_name?.trim() || undefined,
      });
    }

    if (errors.length > 0 && validatedProducts.length === 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    if (validatedProducts.length === 0) {
      return NextResponse.json(
        { error: 'No valid products to insert' },
        { status: 400 }
      );
    }

    // 기존 데이터 확인 (중복 체크)
    const internalCodes = validatedProducts.map(p => p.internal_code);
    const { data: existingProducts, error: checkError } = await serverSupabase
      .from('product_master')
      .select('internal_code')
      .in('internal_code', internalCodes);

    if (checkError) {
      console.error('Error checking existing products:', checkError);
      return NextResponse.json(
        { 
          error: 'Failed to check existing products',
          details: checkError
        },
        { status: 500 }
      );
    }

    // 중복되지 않은 제품만 필터링
    const existingCodes = new Set(existingProducts?.map(p => p.internal_code) || []);
    const newProducts = validatedProducts.filter(p => !existingCodes.has(p.internal_code));
    const skippedProducts = validatedProducts.filter(p => existingCodes.has(p.internal_code));

    // 새로 추가할 제품이 없으면
    if (newProducts.length === 0) {
      return NextResponse.json({
        success: true,
        message: `모든 제품이 이미 존재합니다. (${validatedProducts.length}개 중복)`,
        data: [],
        skipped: skippedProducts.length,
        warnings: errors.length > 0 ? errors : undefined,
      });
    }

    // 새 제품만 추가 (일괄 insert, 중복 에러는 무시)
    const { data, error } = await serverSupabase
      .from('product_master')
      .insert(newProducts)
      .select();

    if (error) {
      // 중복 키 에러 (23505)인 경우, 중복된 항목을 찾아서 스킵하고 나머지만 추가
      if (error.code === '23505' || error.message?.includes('duplicate key')) {
        console.log('중복 키 에러 발생, 개별 처리로 전환');
        
        // 개별 insert로 전환 (중복은 스킵)
        const insertedProducts: any[] = [];
        const insertErrors: string[] = [];
        
        for (const product of newProducts) {
          try {
            const { data: inserted, error: insertError } = await serverSupabase
              .from('product_master')
              .insert(product)
              .select()
              .single();

            if (insertError) {
              // 중복 키 에러는 스킵
              if (insertError.code === '23505') {
                skippedProducts.push(product);
                continue;
              }
              insertErrors.push(`${product.internal_code}: ${insertError.message}`);
            } else if (inserted) {
              insertedProducts.push(inserted);
            }
          } catch (err: any) {
            // 중복 에러는 스킵
            if (err.code === '23505' || err.message?.includes('duplicate')) {
              skippedProducts.push(product);
            } else {
              insertErrors.push(`${product.internal_code}: ${err.message}`);
            }
          }
        }

        // 결과 반환
        const totalAdded = insertedProducts.length;
        const totalSkipped = skippedProducts.length;
        
        let message = `${totalAdded}개의 제품이 추가되었습니다.`;
        if (totalSkipped > 0) {
          message += ` (${totalSkipped}개는 중복으로 제외됨)`;
        }
        if (insertErrors.length > 0) {
          message += ` (${insertErrors.length}개 추가 실패)`;
        }
        if (errors.length > 0) {
          message += ` (${errors.length}개 행 건너뜀)`;
        }

        return NextResponse.json({
          success: true,
          message,
          data: insertedProducts,
          added: totalAdded,
          skipped: totalSkipped,
          warnings: errors.length > 0 ? errors : undefined,
          insertErrors: insertErrors.length > 0 ? insertErrors : undefined,
        });
      }
      
      // 다른 에러는 그대로 반환
      console.error('Supabase error:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { 
          error: error.message || 'Failed to insert product master',
          details: error
        },
        { status: 500 }
      );
    }

    // 결과 메시지 구성
    const totalSkipped = skippedProducts.length;
    const totalAdded = data?.length || 0;
    
    let message = `${totalAdded}개의 제품이 추가되었습니다.`;
    if (totalSkipped > 0) {
      message += ` (${totalSkipped}개는 중복으로 제외됨)`;
    }
    if (errors.length > 0) {
      message += ` (${errors.length}개 행 건너뜀)`;
    }

    return NextResponse.json({
      success: true,
      message,
      data: data || [],
      added: totalAdded,
      skipped: totalSkipped,
      warnings: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to upsert product master',
        details: error.stack
      },
      { status: 500 }
    );
  }
}

// 제품 마스터 정보 삭제
export async function DELETE(request: NextRequest) {
  try {
    const serverSupabase = getServerSupabase();
    if (!serverSupabase) {
      return NextResponse.json(
        { error: 'Supabase client is not configured. Please check environment variables.' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const internalCode = searchParams.get('internal_code');

    if (!internalCode) {
      return NextResponse.json(
        { error: 'internal_code parameter is required' },
        { status: 400 }
      );
    }

    const { error } = await serverSupabase
      .from('product_master')
      .delete()
      .eq('internal_code', internalCode);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Product ${internalCode} deleted successfully`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete product master' },
      { status: 500 }
    );
  }
}

