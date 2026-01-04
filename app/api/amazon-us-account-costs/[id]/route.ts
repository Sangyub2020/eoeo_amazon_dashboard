import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/multiSupabaseClient';

const supabase = getServerSupabase('primary');

// 계정 비용 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client is not configured' },
        { status: 500 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const {
      premium_service_fee,
      inbound_placement_fee,
      monthly_storage_fee,
      longterm_storage_fee,
      fba_removal_order_disposal_fee,
      fba_removal_order_return_fee,
      subscription_fee,
      paid_services_fee,
      other_account_fees,
      description,
      notes,
    } = body;

    // 기존 데이터 조회
    const { data: existingData, error: fetchError } = await supabase
      .from('amazon_us_account_monthly_costs')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingData) {
      return NextResponse.json(
        { error: 'Account cost not found' },
        { status: 404 }
      );
    }

    // 안분이 완료된 경우 수정 제한 (재안분 필요)
    if (existingData.is_allocated) {
      return NextResponse.json(
        { error: 'Cannot modify allocated cost. Please reset allocation first.' },
        { status: 400 }
      );
    }

    // 업데이트할 데이터 구성
    const updateData: any = {};
    if (premium_service_fee !== undefined) updateData.premium_service_fee = premium_service_fee;
    if (inbound_placement_fee !== undefined) updateData.inbound_placement_fee = inbound_placement_fee;
    if (monthly_storage_fee !== undefined) updateData.monthly_storage_fee = monthly_storage_fee;
    if (longterm_storage_fee !== undefined) updateData.longterm_storage_fee = longterm_storage_fee;
    if (fba_removal_order_disposal_fee !== undefined) updateData.fba_removal_order_disposal_fee = fba_removal_order_disposal_fee;
    if (fba_removal_order_return_fee !== undefined) updateData.fba_removal_order_return_fee = fba_removal_order_return_fee;
    if (subscription_fee !== undefined) updateData.subscription_fee = subscription_fee;
    if (paid_services_fee !== undefined) updateData.paid_services_fee = paid_services_fee;
    if (other_account_fees !== undefined) updateData.other_account_fees = other_account_fees;
    if (description !== undefined) updateData.description = description;
    if (notes !== undefined) updateData.notes = notes;

    // 총 비용 재계산
    const finalPremiumServiceFee = premium_service_fee !== undefined ? premium_service_fee : existingData.premium_service_fee;
    const finalInboundPlacementFee = inbound_placement_fee !== undefined ? inbound_placement_fee : existingData.inbound_placement_fee;
    const finalMonthlyStorageFee = monthly_storage_fee !== undefined ? monthly_storage_fee : existingData.monthly_storage_fee;
    const finalLongtermStorageFee = longterm_storage_fee !== undefined ? longterm_storage_fee : existingData.longterm_storage_fee;
    const finalFbaRemovalOrderDisposalFee = fba_removal_order_disposal_fee !== undefined ? fba_removal_order_disposal_fee : existingData.fba_removal_order_disposal_fee;
    const finalFbaRemovalOrderReturnFee = fba_removal_order_return_fee !== undefined ? fba_removal_order_return_fee : existingData.fba_removal_order_return_fee;
    const finalSubscriptionFee = subscription_fee !== undefined ? subscription_fee : existingData.subscription_fee;
    const finalPaidServicesFee = paid_services_fee !== undefined ? paid_services_fee : existingData.paid_services_fee;
    const finalOtherAccountFees = other_account_fees !== undefined ? other_account_fees : existingData.other_account_fees;

    updateData.total_account_cost =
      finalPremiumServiceFee +
      finalInboundPlacementFee +
      finalMonthlyStorageFee +
      finalLongtermStorageFee +
      finalFbaRemovalOrderDisposalFee +
      finalFbaRemovalOrderReturnFee +
      finalSubscriptionFee +
      finalPaidServicesFee +
      finalOtherAccountFees;

    const { data, error } = await supabase
      .from('amazon_us_account_monthly_costs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating account cost:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// 계정 비용 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client is not configured' },
        { status: 500 }
      );
    }

    const { id } = await params;

    // 기존 데이터 조회
    const { data: existingData, error: fetchError } = await supabase
      .from('amazon_us_account_monthly_costs')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingData) {
      return NextResponse.json(
        { error: 'Account cost not found' },
        { status: 404 }
      );
    }

    // 안분이 완료된 경우 삭제 전 경고
    if (existingData.is_allocated) {
      return NextResponse.json(
        { error: 'Cannot delete allocated cost. Please reset allocation first.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('amazon_us_account_monthly_costs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting account cost:', error);
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

