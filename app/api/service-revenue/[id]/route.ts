import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/multiSupabaseClient';

// 서비스 매출 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getServerSupabase('secondary');
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client is not configured. Please check NEXT_PUBLIC_SUPABASE_URL_2 and SUPABASE_SERVICE_ROLE_KEY_2 environment variables.' },
        { status: 500 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    
    // camelCase를 snake_case로 변환
    const updateData: any = {};
    if (body.category !== undefined) updateData.category = body.category;
    if (body.vendorCode !== undefined) updateData.vendor_code = body.vendorCode;
    if (body.companyName !== undefined) updateData.company_name = body.companyName;
    if (body.brandNames !== undefined) updateData.brand_names = body.brandNames;
    if (body.businessRegistrationNumber !== undefined) updateData.business_registration_number = body.businessRegistrationNumber;
    if (body.invoiceEmail !== undefined) updateData.invoice_email = body.invoiceEmail;
    if (body.projectCode !== undefined) updateData.project_code = body.projectCode;
    if (body.project !== undefined) updateData.project = body.project;
    if (body.projectCategory !== undefined) updateData.project_category = body.projectCategory;
    if (body.projectName !== undefined) updateData.project_name = body.projectName;
    if (body.eoeoManager !== undefined) updateData.eoeo_manager = body.eoeoManager;
    if (body.contractLink !== undefined) updateData.contract_link = body.contractLink;
    if (body.estimateLink !== undefined) updateData.estimate_link = body.estimateLink;
    if (body.attributionYearMonth !== undefined) updateData.attribution_year_month = body.attributionYearMonth;
    if (body.advanceBalance !== undefined) updateData.advance_balance = body.advanceBalance;
    if (body.ratio !== undefined) updateData.ratio = body.ratio;
    if (body.expectedDepositDate !== undefined) updateData.expected_deposit_date = body.expectedDepositDate;
    if (body.oneTimeExpenseAmount !== undefined) updateData.one_time_expense_amount = body.oneTimeExpenseAmount;
    if (body.expectedDepositAmount !== undefined) updateData.expected_deposit_amount = body.expectedDepositAmount;
    if (body.expectedDepositCurrency !== undefined) updateData.expected_deposit_currency = body.expectedDepositCurrency;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.depositDate !== undefined) updateData.deposit_date = body.depositDate;
    if (body.depositAmount !== undefined) updateData.deposit_amount = body.depositAmount;
    if (body.depositCurrency !== undefined) updateData.deposit_currency = body.depositCurrency;
    if (body.createdDate !== undefined) updateData.created_date = body.createdDate;
    if (body.invoiceCopy !== undefined) updateData.invoice_copy = body.invoiceCopy;
    if (body.invoiceAttachmentStatus !== undefined) updateData.invoice_attachment_status = body.invoiceAttachmentStatus;
    if (body.issueNotes !== undefined) updateData.issue_notes = body.issueNotes;
    if (body.taxStatus !== undefined) updateData.tax_status = body.taxStatus;
    if (body.invoiceSupplyPrice !== undefined) updateData.invoice_supply_price = body.invoiceSupplyPrice;

    const { data, error } = await supabase
      .from('income_records')
      .update(updateData)
      .eq('id', id)
      .eq('team', 'online_commerce')
      .select()
      .single();

    if (error) {
      console.error('Error updating service revenue:', error);
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

// 서비스 매출 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getServerSupabase('secondary');
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client is not configured. Please check NEXT_PUBLIC_SUPABASE_URL_2 and SUPABASE_SERVICE_ROLE_KEY_2 environment variables.' },
        { status: 500 }
      );
    }

    const { id } = await params;
    const { error } = await supabase
      .from('income_records')
      .delete()
      .eq('id', id)
      .eq('team', 'online_commerce');

    if (error) {
      console.error('Error deleting service revenue:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


