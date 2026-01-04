import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/multiSupabaseClient';

const supabase = getServerSupabase('primary');

// 계정 비용 목록 조회
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client is not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const accountName = searchParams.get('account_name');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    let query = supabase
      .from('amazon_us_account_monthly_costs')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (accountName) {
      query = query.eq('account_name', accountName);
    }
    if (year) {
      query = query.eq('year', parseInt(year));
    }
    if (month) {
      query = query.eq('month', parseInt(month));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching account costs:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// 계정 비용 생성
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      account_name,
      year,
      month,
      premium_service_fee = 0,
      inbound_placement_fee = 0,
      monthly_storage_fee = 0,
      longterm_storage_fee = 0,
      fba_removal_order_disposal_fee = 0,
      fba_removal_order_return_fee = 0,
      subscription_fee = 0,
      paid_services_fee = 0,
      other_account_fees = 0,
      description,
      notes,
    } = body;

    // 필수 필드 검증
    if (!account_name || !year || !month) {
      return NextResponse.json(
        { error: 'account_name, year, month are required' },
        { status: 400 }
      );
    }

    // 총 비용 계산
    const total_account_cost =
      premium_service_fee +
      inbound_placement_fee +
      monthly_storage_fee +
      longterm_storage_fee +
      fba_removal_order_disposal_fee +
      fba_removal_order_return_fee +
      subscription_fee +
      paid_services_fee +
      other_account_fees;

    const { data, error } = await supabase
      .from('amazon_us_account_monthly_costs')
      .insert({
        account_name,
        year: parseInt(year),
        month: parseInt(month),
        premium_service_fee,
        inbound_placement_fee,
        monthly_storage_fee,
        longterm_storage_fee,
        fba_removal_order_disposal_fee,
        fba_removal_order_return_fee,
        subscription_fee,
        paid_services_fee,
        other_account_fees,
        total_account_cost,
        description,
        notes,
        is_allocated: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating account cost:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

