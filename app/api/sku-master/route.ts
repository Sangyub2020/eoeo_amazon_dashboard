import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/serverSupabaseClient';
import { SKUMaster, Channel } from '@/lib/types';

// SKU 마스터 정보 조회
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
    const sku = searchParams.get('sku');
    const internalCode = searchParams.get('internal_code');
    const channel = searchParams.get('channel') as Channel | null;

    let query = serverSupabase
      .from('sku_master')
      .select(`
        *,
        product_master (
          internal_code,
          product_name,
          brand_name,
          company_name
        )
      `)
      .order('sku', { ascending: true });

    if (sku) {
      query = query.ilike('sku', `%${sku}%`);
    }
    if (internalCode) {
      query = query.eq('internal_code', internalCode);
    }
    if (channel && channel !== 'all') {
      query = query.eq('channel', channel);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch SKU master' },
      { status: 500 }
    );
  }
}

// SKU 마스터 정보 추가/업데이트
export async function POST(request: NextRequest) {
  try {
    const serverSupabase = getServerSupabase();
    if (!serverSupabase) {
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

    const skuData = Array.isArray(body) ? body : [body];

    // 필수 필드 검증 및 데이터 정리
    const validatedSKUs: SKUMaster[] = [];
    const errors: string[] = [];

    for (let i = 0; i < skuData.length; i++) {
      const sku = skuData[i];
      
      // 빈 문자열을 undefined로 변환
      const cleanSKU: any = {};
      for (const key in sku) {
        const value = sku[key];
        cleanSKU[key] = value === '' || value === null ? undefined : value;
      }

      // 필수 필드 확인
      if (!cleanSKU.sku || cleanSKU.sku.trim() === '') {
        errors.push(`Row ${i + 1}: sku is required`);
        continue;
      }
      
      if (!cleanSKU.channel || !['amazon_us', 'tiktok_shop'].includes(cleanSKU.channel)) {
        errors.push(`Row ${i + 1}: channel must be one of: amazon_us, tiktok_shop`);
        continue;
      }

      // 숫자 필드 변환
      const validatedSKU: SKUMaster = {
        sku: cleanSKU.sku.trim(),
        channel: cleanSKU.channel,
        internal_code: cleanSKU.internal_code?.trim() || undefined,
        product_name: cleanSKU.product_name?.trim() || undefined,
        child_asin: cleanSKU.child_asin?.trim() || undefined,
        manager: cleanSKU.manager?.trim() || undefined,
        contract_type: cleanSKU.contract_type?.trim() || undefined,
        amazon_account_name: cleanSKU.amazon_account_name?.trim() || undefined,
        rank: cleanSKU.rank !== undefined && cleanSKU.rank !== null && cleanSKU.rank !== '' 
          ? (isNaN(Number(cleanSKU.rank)) ? undefined : Number(cleanSKU.rank))
          : undefined,
        sales_price: cleanSKU.sales_price !== undefined && cleanSKU.sales_price !== null && cleanSKU.sales_price !== '' 
          ? (isNaN(Number(cleanSKU.sales_price)) ? undefined : Number(cleanSKU.sales_price))
          : undefined,
        supply_cost_won: cleanSKU.supply_cost_won !== undefined && cleanSKU.supply_cost_won !== null && cleanSKU.supply_cost_won !== '' 
          ? (isNaN(Number(cleanSKU.supply_cost_won)) ? undefined : Number(cleanSKU.supply_cost_won))
          : undefined,
        transportation_mode: cleanSKU.transportation_mode?.trim() || undefined,
        is_brand_representative: cleanSKU.is_brand_representative === true || cleanSKU.is_brand_representative === 'true',
        is_account_representative: cleanSKU.is_account_representative === true || cleanSKU.is_account_representative === 'true',
        channel_specific_data: cleanSKU.channel_specific_data || undefined,
      };

      validatedSKUs.push(validatedSKU);
    }

    if (errors.length > 0 && validatedSKUs.length === 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    if (validatedSKUs.length === 0) {
      return NextResponse.json(
        { error: 'No valid SKUs to insert' },
        { status: 400 }
      );
    }

    // 기존 데이터 확인 (중복 체크) - sku 기준
    const skus = validatedSKUs.map(s => s.sku);
    const { data: existingSKUs, error: checkError } = await serverSupabase
      .from('sku_master')
      .select('sku')
      .in('sku', skus);

    if (checkError) {
      console.error('Error checking existing SKUs:', checkError);
      return NextResponse.json(
        { 
          error: 'Failed to check existing SKUs',
          details: checkError
        },
        { status: 500 }
      );
    }

    // 중복되지 않은 SKU만 필터링
    const existingSkuCodes = new Set(existingSKUs?.map(s => s.sku) || []);
    const newSKUs = validatedSKUs.filter(s => !existingSkuCodes.has(s.sku));
    const skippedSKUs = validatedSKUs.filter(s => existingSkuCodes.has(s.sku));

    // 새로 추가할 SKU가 없으면
    if (newSKUs.length === 0) {
      return NextResponse.json({
        success: true,
        message: `모든 SKU가 이미 존재합니다. (${validatedSKUs.length}개 중복)`,
        data: [],
        skipped: skippedSKUs.length,
        warnings: errors.length > 0 ? errors : undefined,
      });
    }

    // internal_code가 있지만 product_master에 없으면 자동으로 추가
    const internalCodesToCheck = newSKUs
      .map(s => s.internal_code)
      .filter((code): code is string => !!code);
    
    if (internalCodesToCheck.length > 0) {
      // 기존 제품 마스터 확인
      const { data: existingProducts, error: productCheckError } = await serverSupabase
        .from('product_master')
        .select('internal_code')
        .in('internal_code', internalCodesToCheck);

      if (productCheckError) {
        console.error('Error checking existing products:', productCheckError);
        // 에러가 있어도 계속 진행 (제품 마스터가 없을 수도 있음)
      } else {
        const existingProductCodes = new Set(existingProducts?.map(p => p.internal_code) || []);
        const missingInternalCodes = internalCodesToCheck.filter(code => !existingProductCodes.has(code));

        // 없는 internal_code가 있으면 제품 마스터에 자동 추가
        if (missingInternalCodes.length > 0) {
          const productsToAdd = missingInternalCodes.map(internalCode => {
            // SKU에서 제품명 가져오기 (없으면 internal_code 사용)
            const sku = newSKUs.find(s => s.internal_code === internalCode);
            return {
              internal_code: internalCode,
              product_name: sku?.product_name || internalCode, // 제품명이 없으면 internal_code 사용
            };
          });

          const { error: productInsertError } = await serverSupabase
            .from('product_master')
            .insert(productsToAdd);

          if (productInsertError) {
            console.warn('Failed to auto-create product master entries:', productInsertError);
            // 에러가 있어도 계속 진행 (제품 마스터 추가 실패해도 SKU는 추가 시도)
          } else {
            console.log(`Auto-created ${missingInternalCodes.length} product master entries:`, missingInternalCodes);
          }
        }
      }
    }

    // 새 SKU만 추가 (일괄 insert, 중복 에러는 무시)
    const { data, error } = await serverSupabase
      .from('sku_master')
      .insert(newSKUs)
      .select(`
        *,
        product_master (
          internal_code,
          product_name,
          brand_name,
          company_name
        )
      `);

    if (error) {
      // 중복 키 에러 (23505)인 경우, 중복된 항목을 찾아서 스킵하고 나머지만 추가
      if (error.code === '23505' || error.message?.includes('duplicate key')) {
        console.log('중복 키 에러 발생, 개별 처리로 전환');
        
        // 개별 insert로 전환 (중복은 스킵)
        const insertedSKUs: any[] = [];
        const insertErrors: string[] = [];
        
        for (const sku of newSKUs) {
          try {
            const { data: inserted, error: insertError } = await serverSupabase
              .from('sku_master')
              .insert(sku)
              .select(`
                *,
                product_master (
                  internal_code,
                  product_name,
                  brand_name,
                  company_name
                )
              `)
              .single();

            if (insertError) {
              // 중복 키 에러는 스킵
              if (insertError.code === '23505') {
                skippedSKUs.push(sku);
                continue;
              }
              insertErrors.push(`${sku.sku}: ${insertError.message}`);
            } else if (inserted) {
              insertedSKUs.push(inserted);
            }
          } catch (err: any) {
            // 중복 에러는 스킵
            if (err.code === '23505' || err.message?.includes('duplicate')) {
              skippedSKUs.push(sku);
            } else {
              insertErrors.push(`${sku.sku}: ${err.message}`);
            }
          }
        }

        // 결과 반환
        const totalAdded = insertedSKUs.length;
        const totalSkipped = skippedSKUs.length;
        
        let message = `${totalAdded}개의 SKU가 추가되었습니다.`;
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
          data: insertedSKUs,
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
          error: error.message || 'Failed to insert SKU master',
          details: error
        },
        { status: 500 }
      );
    }

    // 결과 메시지 구성
    const totalSkipped = skippedSKUs.length;
    const totalAdded = data?.length || 0;
    
    let message = `${totalAdded}개의 SKU가 추가되었습니다.`;
    if (totalSkipped > 0) {
      message += ` (${totalSkipped}개는 중복으로 제외됨)`;
    }
    if (errors.length > 0) {
      message += ` (${errors.length}개 행 건너뜀)`;
    }

    return NextResponse.json({
      success: true,
      message,
      data,
      added: totalAdded,
      skipped: totalSkipped,
      warnings: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to upsert SKU master',
        details: error.stack
      },
      { status: 500 }
    );
  }
}

// SKU 마스터 정보 삭제
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
    const sku = searchParams.get('sku');

    if (!sku) {
      return NextResponse.json(
        { error: 'sku parameter is required' },
        { status: 400 }
      );
    }

    const { error } = await serverSupabase
      .from('sku_master')
      .delete()
      .eq('sku', sku);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `SKU ${sku} deleted successfully`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete SKU master' },
      { status: 500 }
    );
  }
}
