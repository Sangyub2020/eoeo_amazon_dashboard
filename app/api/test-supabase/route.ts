import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 연결 직접 테스트
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing environment variables',
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseServiceRoleKey,
      });
    }

    // Supabase 클라이언트 생성
    const testClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 간단한 쿼리 테스트 (product_master 테이블)
    let productMasterTest = null;
    let productMasterError = null;
    try {
      const { data, error } = await testClient
        .from('product_master')
        .select('count')
        .limit(1);
      productMasterTest = { data, error: error ? {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      } : null };
    } catch (e: any) {
      productMasterError = {
        message: e.message,
        stack: e.stack,
      };
    }

    // monthly_summary_by_channel 뷰 테스트
    let monthlySummaryTest = null;
    let monthlySummaryError = null;
    try {
      const { data, error } = await testClient
        .from('monthly_summary_by_channel')
        .select('*')
        .limit(1);
      monthlySummaryTest = { data, error: error ? {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      } : null };
    } catch (e: any) {
      monthlySummaryError = {
        message: e.message,
        stack: e.stack,
      };
    }

    return NextResponse.json({
      success: true,
      url: supabaseUrl.substring(0, 50) + '...', // URL 일부만 표시
      keyLength: supabaseServiceRoleKey.length,
      keyPrefix: supabaseServiceRoleKey.substring(0, 20) + '...',
      tests: {
        product_master: {
          success: !productMasterError && !productMasterTest?.error,
          error: productMasterError || productMasterTest?.error,
          dataCount: productMasterTest?.data?.length || 0,
        },
        monthly_summary_by_channel: {
          success: !monthlySummaryError && !monthlySummaryTest?.error,
          error: monthlySummaryError || monthlySummaryTest?.error,
          dataCount: monthlySummaryTest?.data?.length || 0,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}

