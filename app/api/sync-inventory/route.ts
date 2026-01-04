import { NextRequest, NextResponse } from 'next/server';
import { readSheetData } from '@/lib/googleSheets';
import { getServerSupabase } from '@/lib/serverSupabaseClient';

/**
 * 재고 동기화 API
 * 외부 구글 시트의 Inventory 탭에서 CCONMA 값을 가져와서
 * amazon_us_monthly_data 테이블에 업데이트
 * 
 * 매핑: 외부 시트의 'Internal Code' = sku_master.internal_code = amazon_us_monthly_data.sku
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { year, month } = body;

    if (!year || !month) {
      return NextResponse.json(
        { error: 'year and month are required' },
        { status: 400 }
      );
    }

    if (month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'month must be between 1 and 12' },
        { status: 400 }
      );
    }

    // 구글 시트에서 데이터 읽기
    const spreadsheetId = '1yJ9YKg5Wh0Hg4T-2Whvw47rbpMugmxG1sKfJq1L0WzY';
    const tabName = 'Inventory';

    console.log(`Reading inventory data from sheet ${spreadsheetId}, tab: ${tabName}`);
    const sheetData = await readSheetData(spreadsheetId, tabName);

    if (sheetData.length < 2) {
      return NextResponse.json(
        { error: 'No data found in the sheet (need at least 2 rows: header row + data row)' },
        { status: 404 }
      );
    }

    // 두 번째 행(인덱스 1)이 헤더
    const headers = sheetData[1].map((h: string) => h?.toString().trim() || '');
    
    // 헤더 로그 출력 (디버깅용)
    console.log('Sheet headers:', headers);
    
    // 헤더에서 필요한 컬럼 인덱스 찾기 (더 유연한 검색)
    const findColumnIndex = (searchTerms: string[]) => {
      return headers.findIndex((h: string) => {
        const lower = h.toLowerCase().trim();
        return searchTerms.some(term => lower.includes(term.toLowerCase()) || lower === term.toLowerCase());
      });
    };

    const internalCodeIdx = findColumnIndex(['internal code', 'internal_code', 'internalcode']);
    const cconmaIdx = findColumnIndex(['cconma']);
    const pendingInKrIdx = findColumnIndex(['pending in kr', 'pending_in_kr', 'pendinginkr']);
    const inAirIdx = findColumnIndex(['in air', 'in_air', 'inair']);
    const inOceanIdx = findColumnIndex(['in ocean', 'in_ocean', 'inocean']);
    const slGlovisIdx = findColumnIndex(['sl glovis', 'sl_glovis', 'slglovis']);
    const ctkUsaIdx = findColumnIndex(['ctk usa', 'ctk_usa', 'ctkusa']);

    if (internalCodeIdx === -1) {
      return NextResponse.json(
        { 
          error: 'Internal Code column not found in the sheet',
          availableHeaders: headers,
          hint: 'Please check if the column name contains "Internal" and "Code"'
        },
        { status: 400 }
      );
    }

    // 필수 컬럼이 아닌 경우 경고만 출력
    const optionalColumns = [
      { name: 'CCONMA', idx: cconmaIdx },
      { name: 'Pending in KR', idx: pendingInKrIdx },
      { name: 'In Air', idx: inAirIdx },
      { name: 'In Ocean', idx: inOceanIdx },
      { name: 'SL Glovis', idx: slGlovisIdx },
      { name: 'CTK USA', idx: ctkUsaIdx },
    ];

    const foundColumns = optionalColumns.filter(col => col.idx !== -1);
    const missingColumns = optionalColumns.filter(col => col.idx === -1);

    console.log(`Found columns: Internal Code at index ${internalCodeIdx} (${headers[internalCodeIdx]})`);
    foundColumns.forEach(col => {
      console.log(`  - ${col.name} at index ${col.idx} (${headers[col.idx]})`);
    });
    if (missingColumns.length > 0) {
      console.warn(`Missing optional columns: ${missingColumns.map(col => col.name).join(', ')}`);
    }

    // 숫자 값 파싱 헬퍼 함수
    const parseNumber = (value: any): number | null => {
      if (value === undefined || value === null || value === '') {
        return null;
      }
      const parsed = parseFloat(value.toString().replace(/,/g, ''));
      return isNaN(parsed) ? null : parsed;
    };

    // 데이터 행 처리 (3번째 행부터 시작, 인덱스 2)
    const updates: {
      internalCode: string;
      cconma?: number;
      pendingInKr?: number;
      inAir?: number;
      inOcean?: number;
      slGlovis?: number;
      ctkUsa?: number;
    }[] = [];
    const errors: string[] = [];

    for (let i = 2; i < sheetData.length; i++) {
      const row = sheetData[i];
      if (!row || row.length === 0) continue;

      const internalCode = row[internalCodeIdx]?.toString().trim();

      if (!internalCode) {
        continue; // Internal Code가 없으면 건너뛰기
      }

      // 모든 컬럼 값 파싱
      const updateData: typeof updates[0] = { internalCode };

      if (cconmaIdx !== -1) {
        const value = parseNumber(row[cconmaIdx]);
        if (value !== null) updateData.cconma = value;
      }

      if (pendingInKrIdx !== -1) {
        const value = parseNumber(row[pendingInKrIdx]);
        if (value !== null) updateData.pendingInKr = value;
      }

      if (inAirIdx !== -1) {
        const value = parseNumber(row[inAirIdx]);
        if (value !== null) updateData.inAir = value;
      }

      if (inOceanIdx !== -1) {
        const value = parseNumber(row[inOceanIdx]);
        if (value !== null) updateData.inOcean = value;
      }

      if (slGlovisIdx !== -1) {
        const value = parseNumber(row[slGlovisIdx]);
        if (value !== null) updateData.slGlovis = value;
      }

      if (ctkUsaIdx !== -1) {
        const value = parseNumber(row[ctkUsaIdx]);
        if (value !== null) updateData.ctkUsa = value;
      }

      // 최소한 하나의 값이라도 있어야 업데이트 대상
      const hasAnyValue = updateData.cconma !== undefined ||
                         updateData.pendingInKr !== undefined ||
                         updateData.inAir !== undefined ||
                         updateData.inOcean !== undefined ||
                         updateData.slGlovis !== undefined ||
                         updateData.ctkUsa !== undefined;

      if (hasAnyValue) {
        updates.push(updateData);
      }
    }

    console.log(`Found ${updates.length} rows with valid Internal Code and CCONMA values`);

    // Supabase 클라이언트 가져오기
    const serverSupabase = getServerSupabase();
    if (!serverSupabase) {
      return NextResponse.json(
        { error: 'Failed to initialize Supabase client' },
        { status: 500 }
      );
    }

    // Internal Code로 SKU 찾기 및 업데이트
    let updatedCount = 0;
    let notFoundCount = 0;

    for (const updateData of updates) {
      const { internalCode, cconma, pendingInKr, inAir, inOcean, slGlovis, ctkUsa } = updateData;
      
      try {
        // 1. internal_code로 sku_master에서 SKU 찾기
        const { data: skuMasterData, error: skuError } = await serverSupabase
          .from('sku_master')
          .select('sku')
          .eq('internal_code', internalCode)
          .eq('channel', 'amazon_us')
          .limit(1)
          .single();

        if (skuError || !skuMasterData) {
          console.warn(`SKU not found for internal_code: ${internalCode}`);
          notFoundCount++;
          continue;
        }

        const sku = skuMasterData.sku;

        // 2. amazon_us_monthly_data에서 해당 SKU, year, month의 레코드 찾기
        const { data: monthlyData, error: monthlyError } = await serverSupabase
          .from('amazon_us_monthly_data')
          .select('id')
          .eq('sku', sku)
          .eq('year', year)
          .eq('month', month)
          .limit(1)
          .single();

        if (monthlyError || !monthlyData) {
          console.warn(`Monthly data not found for SKU: ${sku}, year: ${year}, month: ${month}`);
          notFoundCount++;
          continue;
        }

        // 3. 모든 재고 값 업데이트 (있는 값만 업데이트)
        const updateFields: any = {};
        if (cconma !== undefined) updateFields.cconma = cconma;
        if (pendingInKr !== undefined) updateFields.pending_in_kr = pendingInKr;
        if (inAir !== undefined) updateFields.in_air = inAir;
        if (inOcean !== undefined) updateFields.in_ocean = inOcean;
        if (slGlovis !== undefined) updateFields.sl_glovis = slGlovis;
        if (ctkUsa !== undefined) updateFields.ctk_usa = ctkUsa;

        const { error: updateError } = await serverSupabase
          .from('amazon_us_monthly_data')
          .update(updateFields)
          .eq('id', monthlyData.id);

        if (updateError) {
          console.error(`Failed to update inventory for SKU ${sku}:`, updateError);
          errors.push(`SKU ${sku}: ${updateError.message}`);
        } else {
          updatedCount++;
          const updatedFields = Object.keys(updateFields).join(', ');
          console.log(`Updated inventory for SKU ${sku}: ${updatedFields}`);
        }
      } catch (error: any) {
        console.error(`Error processing internal_code ${internalCode}:`, error);
        errors.push(`Internal Code ${internalCode}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `재고 동기화 완료: ${updatedCount}개 업데이트, ${notFoundCount}개 찾을 수 없음`,
      updatedCount,
      notFoundCount,
      totalProcessed: updates.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Inventory sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync inventory data' },
      { status: 500 }
    );
  }
}

