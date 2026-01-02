import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// GET: 계정 마스터 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('account_master')
      .select('*')
      .order('account_name', { ascending: true });

    if (error) {
      console.error('계정 마스터 조회 실패:', error);
      return NextResponse.json(
        { error: '계정 마스터 조회 실패', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('계정 마스터 조회 중 오류:', error);
    return NextResponse.json(
      { error: '서버 오류', details: error.message },
      { status: 500 }
    );
  }
}

// POST: 계정 마스터 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      account_name, 
      merchant_code, 
      referral_fee_rate,
      sp_api_client_id,
      sp_api_client_secret,
      sp_api_refresh_token,
      sp_api_base_url
    } = body;

    // 유효성 검사
    if (!account_name || !merchant_code) {
      return NextResponse.json(
        { error: '계정 이름과 Merchant Code는 필수입니다.' },
        { status: 400 }
      );
    }

    if (referral_fee_rate === undefined || referral_fee_rate === null) {
      return NextResponse.json(
        { error: 'Referral 수수료율은 필수입니다.' },
        { status: 400 }
      );
    }

    const rate = parseFloat(referral_fee_rate);
    if (isNaN(rate) || rate < 0 || rate > 1) {
      return NextResponse.json(
        { error: 'Referral 수수료율은 0과 1 사이의 값이어야 합니다.' },
        { status: 400 }
      );
    }

    const insertData: any = {
      account_name,
      merchant_code,
      referral_fee_rate: rate,
    };
    
    // API 정보가 제공된 경우에만 추가 (빈 문자열은 null로 처리)
    if (sp_api_client_id && sp_api_client_id.trim() !== '') {
      insertData.sp_api_client_id = sp_api_client_id.trim();
    }
    if (sp_api_client_secret && sp_api_client_secret.trim() !== '') {
      insertData.sp_api_client_secret = sp_api_client_secret.trim();
    }
    if (sp_api_refresh_token && sp_api_refresh_token.trim() !== '') {
      insertData.sp_api_refresh_token = sp_api_refresh_token.trim();
    }
    if (sp_api_base_url && sp_api_base_url.trim() !== '') {
      insertData.sp_api_base_url = sp_api_base_url.trim();
    }

    console.log('계정 마스터 생성 시도:', JSON.stringify(insertData, null, 2));
    
    const { data, error } = await supabase
      .from('account_master')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('계정 마스터 생성 실패:', {
        error: error,
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        insertData: insertData
      });
      
      // 중복 키 에러 처리
      if (error.code === '23505') {
        return NextResponse.json(
          { error: '이미 존재하는 계정 이름 또는 Merchant Code입니다.' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { 
          error: '계정 마스터 생성 실패', 
          details: error.message,
          code: error.code,
          hint: error.hint
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    console.error('계정 마스터 생성 중 오류:', error);
    return NextResponse.json(
      { error: '서버 오류', details: error.message },
      { status: 500 }
    );
  }
}

// PUT: 계정 마스터 수정
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      id, 
      account_name, 
      merchant_code, 
      referral_fee_rate,
      sp_api_client_id,
      sp_api_client_secret,
      sp_api_refresh_token,
      sp_api_base_url
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID는 필수입니다.' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (account_name !== undefined) updateData.account_name = account_name;
    if (merchant_code !== undefined) updateData.merchant_code = merchant_code;
    if (referral_fee_rate !== undefined) {
      const rate = parseFloat(referral_fee_rate);
      if (isNaN(rate) || rate < 0 || rate > 1) {
        return NextResponse.json(
          { error: 'Referral 수수료율은 0과 1 사이의 값이어야 합니다.' },
          { status: 400 }
        );
      }
      updateData.referral_fee_rate = rate;
    }
    // API 정보 업데이트 (빈 문자열은 null로 처리)
    if (sp_api_client_id !== undefined) {
      updateData.sp_api_client_id = (sp_api_client_id && sp_api_client_id.trim() !== '') ? sp_api_client_id.trim() : null;
    }
    if (sp_api_client_secret !== undefined) {
      updateData.sp_api_client_secret = (sp_api_client_secret && sp_api_client_secret.trim() !== '') ? sp_api_client_secret.trim() : null;
    }
    if (sp_api_refresh_token !== undefined) {
      updateData.sp_api_refresh_token = (sp_api_refresh_token && sp_api_refresh_token.trim() !== '') ? sp_api_refresh_token.trim() : null;
    }
    if (sp_api_base_url !== undefined) {
      updateData.sp_api_base_url = (sp_api_base_url && sp_api_base_url.trim() !== '') ? sp_api_base_url.trim() : 'https://sellingpartnerapi-na.amazon.com';
    }

    const { data, error } = await supabase
      .from('account_master')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('계정 마스터 수정 실패:', error);
      
      if (error.code === '23505') {
        return NextResponse.json(
          { error: '이미 존재하는 계정 이름 또는 Merchant Code입니다.' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: '계정 마스터 수정 실패', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('계정 마스터 수정 중 오류:', error);
    return NextResponse.json(
      { error: '서버 오류', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: 계정 마스터 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID는 필수입니다.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('account_master')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('계정 마스터 삭제 실패:', error);
      return NextResponse.json(
        { error: '계정 마스터 삭제 실패', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('계정 마스터 삭제 중 오류:', error);
    return NextResponse.json(
      { error: '서버 오류', details: error.message },
      { status: 500 }
    );
  }
}





