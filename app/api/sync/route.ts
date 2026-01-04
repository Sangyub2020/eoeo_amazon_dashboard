import { NextRequest, NextResponse } from 'next/server';
import { readAllTabsFromSheets, readSpecificTabsFromSheets } from '@/lib/googleSheets';
import { getServerSupabase } from '@/lib/serverSupabaseClient';
import { SalesData } from '@/lib/types';

// 구글 시트 데이터를 파싱하여 Supabase에 저장
async function parseAndSaveSalesData(
  sheetData: { spreadsheetId: string; sheetName: string; data: any[][] }[]
) {
  const salesRecords: Omit<SalesData, 'id' | 'created_at' | 'updated_at'>[] = [];

  for (const { data, sheetName, spreadsheetId } of sheetData) {
    if (data.length === 0) continue;

    // 첫 번째 행은 헤더로 가정
    const headers = data[0].map((h: string) => h?.toLowerCase().trim() || '');
    
    // 마켓플레이스 판별 (탭 이름 또는 시트 ID에서)
    let marketplace: 'amazon_us' | 'tiktok_shop' = 'amazon_us';
    const sheetNameLower = sheetName.toLowerCase();
    const spreadsheetIdLower = spreadsheetId.toLowerCase();
    
    // 탭 이름에서 판별
    if (sheetNameLower.includes('tiktok') || sheetNameLower.includes('틱톡')) {
      marketplace = 'tiktok_shop';
    } else if (sheetNameLower.includes('amazon') || sheetNameLower.includes('아마존')) {
      marketplace = 'amazon_us';
    }
    // 시트 ID에서도 판별 시도 (탭 이름에 정보가 없는 경우)
    else if (spreadsheetIdLower.includes('tiktok') || spreadsheetIdLower.includes('틱톡')) {
      marketplace = 'tiktok_shop';
    } else if (spreadsheetIdLower.includes('amazon') || spreadsheetIdLower.includes('아마존')) {
      marketplace = 'amazon_us';
    }

    // 데이터 행 처리
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      try {
        // 헤더 인덱스 찾기
        const dateIdx = headers.findIndex((h: string) => 
          h.includes('date') || h.includes('날짜')
        );
        const skuIdx = headers.findIndex((h: string) => 
          h.includes('sku') || h.includes('상품코드')
        );
        const revenueIdx = headers.findIndex((h: string) => 
          h.includes('revenue') || h.includes('매출') || h.includes('sales')
        );
        const costIdx = headers.findIndex((h: string) => 
          h.includes('cost') || h.includes('비용') || h.includes('원가')
        );
        const profitIdx = headers.findIndex((h: string) => 
          h.includes('profit') || h.includes('이익')
        );
        const productNameIdx = headers.findIndex((h: string) => 
          h.includes('product') || h.includes('상품명') || h.includes('name')
        );
        const quantityIdx = headers.findIndex((h: string) => 
          h.includes('quantity') || h.includes('수량') || h.includes('qty')
        );

        if (dateIdx === -1 || skuIdx === -1) {
          console.warn(`Row ${i}: Missing required fields (date or sku)`);
          continue;
        }

        const dateStr = row[dateIdx];
        const sku = row[skuIdx]?.toString().trim();
        const revenue = parseFloat(row[revenueIdx] || '0') || 0;
        const cost = parseFloat(row[costIdx] || '0') || 0;
        const profit = profitIdx !== -1 
          ? (parseFloat(row[profitIdx] || '0') || 0)
          : revenue - cost;
        const productName = productNameIdx !== -1 ? row[productNameIdx]?.toString() : undefined;
        const quantity = quantityIdx !== -1 ? parseInt(row[quantityIdx] || '0') : undefined;

        // 날짜 파싱 (다양한 형식 지원)
        let date: string;
        if (dateStr instanceof Date) {
          date = dateStr.toISOString().split('T')[0];
        } else {
          const dateObj = new Date(dateStr);
          if (isNaN(dateObj.getTime())) {
            console.warn(`Row ${i}: Invalid date format: ${dateStr}`);
            continue;
          }
          date = dateObj.toISOString().split('T')[0];
        }

        if (!sku) {
          console.warn(`Row ${i}: SKU is empty`);
          continue;
        }

        salesRecords.push({
          marketplace,
          date,
          sku,
          product_name: productName,
          revenue,
          cost,
          profit,
          quantity,
          currency: 'USD',
        });
      } catch (error) {
        console.error(`Error parsing row ${i}:`, error);
        continue;
      }
    }
  }

  // Supabase에 저장 (upsert 사용)
  const serverSupabase = getServerSupabase();
  if (salesRecords.length > 0 && serverSupabase) {
    const { error } = await serverSupabase
      .from('sales_data')
      .upsert(salesRecords, {
        onConflict: 'marketplace,date,sku',
      });

    if (error) {
      throw error;
    }
  }

  return salesRecords.length;
}

export async function POST(request: NextRequest) {
  try {
    // 요청 본문 파싱 (선택사항)
    let requestBody: {
      spreadsheetIds?: string[]; // 요청 본문에서 시트 ID 직접 전달 가능
      tabs?: { spreadsheetId: string; tabName: string }[];
      includeTabs?: string[];
      excludeTabs?: string[];
    } = {};

    try {
      const body = await request.json();
      requestBody = body;
    } catch {
      // 요청 본문이 없거나 JSON이 아닌 경우 무시 (기존 동작 유지)
    }

    // 시트 ID 결정: 요청 본문 우선, 없으면 환경변수 사용
    let spreadsheetIds: string[] = [];
    
    if (requestBody.spreadsheetIds && requestBody.spreadsheetIds.length > 0) {
      // 요청 본문에 시트 ID가 있으면 우선 사용
      spreadsheetIds = requestBody.spreadsheetIds.map((id) => id.trim()).filter((id) => id.length > 0);
      console.log(`Using spreadsheet IDs from request body: ${spreadsheetIds.length} sheets`);
    } else {
      // 환경변수에서 가져오기 (기본값)
      spreadsheetIds = process.env.GOOGLE_SHEETS_IDS?.split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0) || [];
      
      if (spreadsheetIds.length > 0) {
        console.log(`Using spreadsheet IDs from environment: ${spreadsheetIds.length} sheets`);
      }
    }

    // 시트 ID가 하나도 없으면 에러
    if (spreadsheetIds.length === 0 && (!requestBody.tabs || requestBody.tabs.length === 0)) {
      return NextResponse.json(
        { 
          error: 'Google Sheets IDs are not configured. Provide spreadsheetIds in request body or set GOOGLE_SHEETS_IDS environment variable.',
          hint: 'You can pass spreadsheetIds in the request body like: { "spreadsheetIds": ["sheet_id_1", "sheet_id_2"] }'
        },
        { status: 400 }
      );
    }

    let sheetData: { spreadsheetId: string; sheetName: string; data: any[][] }[] = [];

    // 특정 탭만 읽기 모드 (tabs 배열이 제공된 경우)
    if (requestBody.tabs && requestBody.tabs.length > 0) {
      console.log(`Reading specific tabs: ${requestBody.tabs.length} tabs`);
      sheetData = await readSpecificTabsFromSheets(requestBody.tabs);
    }
    // 포함할 탭 목록이 제공된 경우
    else if (requestBody.includeTabs && requestBody.includeTabs.length > 0) {
      const excludeTabs =
        requestBody.excludeTabs ||
        process.env.GOOGLE_SHEETS_EXCLUDE_TABS?.split(',')
          .map((name) => name.trim())
          .filter((name) => name.length > 0) ||
        [];

      console.log(`Starting sync for ${spreadsheetIds.length} spreadsheets...`);
      console.log(`Including tabs: ${requestBody.includeTabs.join(', ')}`);
      console.log(`Excluding tabs: ${excludeTabs.join(', ') || 'none'}`);

      sheetData = await readAllTabsFromSheets(
        spreadsheetIds,
        excludeTabs,
        requestBody.includeTabs
      );
    }
    // 기본 모드: 모든 탭 읽기 (기존 동작)
    else {
      const excludeTabs =
        requestBody.excludeTabs ||
        process.env.GOOGLE_SHEETS_EXCLUDE_TABS?.split(',')
          .map((name) => name.trim())
          .filter((name) => name.length > 0) ||
        [];

      console.log(`Starting sync for ${spreadsheetIds.length} spreadsheets...`);
      console.log(`Excluding tabs: ${excludeTabs.join(', ') || 'none'}`);

      sheetData = await readAllTabsFromSheets(spreadsheetIds, excludeTabs);
    }

    console.log(`Read data from ${sheetData.length} tabs`);

    // 데이터 파싱 및 저장
    const recordCount = await parseAndSaveSalesData(sheetData);

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${recordCount} records from ${sheetData.length} tabs`,
      recordCount,
      tabsProcessed: sheetData.length,
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync data' },
      { status: 500 }
    );
  }
}

