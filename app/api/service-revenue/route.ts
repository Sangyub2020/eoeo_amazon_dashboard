import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/multiSupabaseClient';

// 서비스 매출 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = getServerSupabase('secondary');
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client is not configured. Please check NEXT_PUBLIC_SUPABASE_URL_2 and SUPABASE_SERVICE_ROLE_KEY_2 environment variables.' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const team = searchParams.get('team') || 'online_commerce';
    const depositStatus = searchParams.get('depositStatus');
    const search = searchParams.get('search');

    let query = supabase
      .from('income_records')
      .select('*')
      .eq('team', team)
      .order('created_at', { ascending: false });

    // depositStatus 필터는 클라이언트 사이드에서 처리
    // (자동 계산된 값이므로 DB 쿼리로는 필터링 불가)

    if (search) {
      query = query.or(`company_name.ilike.%${search}%,project_name.ilike.%${search}%,vendor_code.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching service revenue:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // snake_case를 camelCase로 변환 (income_records 테이블 구조에 맞춤)
    const transformedData = (data || []).map((item: any) => {
      // 입금여부 자동 계산
      let depositStatus: '입금완료' | '입금예정' | '입금지연' | undefined;
      if (item.deposit_amount && item.deposit_amount > 0) {
        depositStatus = '입금완료';
      } else if (item.expected_deposit_date) {
        const expectedDate = new Date(item.expected_deposit_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expectedDate.setHours(0, 0, 0, 0);
        depositStatus = expectedDate < today ? '입금지연' : '입금예정';
      }

      return {
        id: item.id,
        category: item.category,
        vendorCode: item.vendor_code,
        companyName: item.company_name,
        brandNames: Array.isArray(item.brand_names) ? item.brand_names : (item.brand_names ? [item.brand_names] : []),
        businessRegistrationNumber: item.business_registration_number,
        invoiceEmail: item.invoice_email,
        projectCode: item.project_code,
        project: item.project,
        projectCategory: item.project_category,
        projectName: item.project_name,
        eoeoManager: item.eoeo_manager,
        contractLink: item.contract_link,
        estimateLink: item.estimate_link,
        attributionYearMonth: item.attribution_year_month,
        advanceBalance: item.advance_balance,
        ratio: item.ratio,
        expectedDepositDate: item.expected_deposit_date,
        depositStatus: depositStatus || item.deposit_status,
        oneTimeExpenseAmount: item.one_time_expense_amount ? Number(item.one_time_expense_amount) : undefined,
        expectedDepositAmount: item.expected_deposit_amount ? Number(item.expected_deposit_amount) : undefined,
        expectedDepositCurrency: item.expected_deposit_currency || 'KRW',
        description: item.description,
        depositDate: item.deposit_date,
        depositAmount: item.deposit_amount ? Number(item.deposit_amount) : undefined,
        depositCurrency: item.deposit_currency || 'KRW',
        createdDate: item.created_date,
        invoiceCopy: item.invoice_copy,
        invoiceAttachmentStatus: item.invoice_attachment_status,
        issueNotes: item.issue_notes,
        taxStatus: item.tax_status,
        invoiceSupplyPrice: item.invoice_supply_price ? Number(item.invoice_supply_price) : undefined,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      };
    });

    // depositStatus 필터 적용 (클라이언트 사이드 필터링)
    let filteredData = transformedData;
    if (depositStatus) {
      filteredData = transformedData.filter((item) => item.depositStatus === depositStatus);
    }

    return NextResponse.json({ success: true, data: filteredData });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// 서비스 매출 등록
export async function POST(request: NextRequest) {
  try {
    const supabase = getServerSupabase('secondary');
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client is not configured. Please check NEXT_PUBLIC_SUPABASE_URL_2 and SUPABASE_SERVICE_ROLE_KEY_2 environment variables.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    
    // camelCase를 snake_case로 변환
    const insertData = {
      category: body.category,
      vendor_code: body.vendorCode,
      company_name: body.companyName,
      brand_names: body.brandNames || [],
      business_registration_number: body.businessRegistrationNumber,
      invoice_email: body.invoiceEmail,
      project_code: body.projectCode,
      project: body.project,
      project_category: body.projectCategory,
      project_name: body.projectName,
      eoeo_manager: body.eoeoManager,
      contract_link: body.contractLink,
      estimate_link: body.estimateLink,
      attribution_year_month: body.attributionYearMonth,
      advance_balance: body.advanceBalance,
      ratio: body.ratio,
      expected_deposit_date: body.expectedDepositDate,
      one_time_expense_amount: body.oneTimeExpenseAmount,
      expected_deposit_amount: body.expectedDepositAmount,
      expected_deposit_currency: body.expectedDepositCurrency,
      description: body.description,
      deposit_date: body.depositDate,
      deposit_amount: body.depositAmount,
      deposit_currency: body.depositCurrency,
      created_date: body.createdDate,
      invoice_copy: body.invoiceCopy,
      invoice_attachment_status: body.invoiceAttachmentStatus,
      issue_notes: body.issueNotes,
      tax_status: body.taxStatus,
      invoice_supply_price: body.invoiceSupplyPrice,
    };

    const insertDataWithTeam = {
      ...insertData,
      team: 'online_commerce',
    };

    const { data, error } = await supabase
      .from('income_records')
      .insert(insertDataWithTeam)
      .select()
      .single();

    if (error) {
      console.error('Error creating service revenue:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

