import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/serverSupabaseClient';

// 테스트용 API - 환경 변수 및 Supabase 연결 확인
export async function GET(request: NextRequest) {
  try {
    const envCheck = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasClientEmail: !!process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.GOOGLE_SHEETS_PRIVATE_KEY,
      hasSheetIds: !!process.env.GOOGLE_SHEETS_IDS,
    };

    let supabaseTest = null;
    const serverSupabase = getServerSupabase();
    if (serverSupabase) {
      try {
        const { data, error } = await serverSupabase
          .from('product_master')
          .select('count')
          .limit(1);
        supabaseTest = {
          connected: !error,
          error: error?.message || null,
        };
      } catch (err: any) {
        supabaseTest = {
          connected: false,
          error: err.message,
        };
      }
    }

    return NextResponse.json({
      success: true,
      environment: envCheck,
      supabase: supabaseTest,
      serverSupabaseExists: !!serverSupabase,
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












