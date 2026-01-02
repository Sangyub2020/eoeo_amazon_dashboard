import { google } from 'googleapis';

// Google Sheets API 클라이언트 생성
export async function getGoogleSheetsClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  return google.sheets({ version: 'v4', auth });
}

// 구글 시트에서 데이터 읽기
export async function readSheetData(
  spreadsheetId: string,
  range: string
): Promise<any[][]> {
  try {
    const sheets = await getGoogleSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return response.data.values || [];
  } catch (error) {
    console.error('Error reading sheet data:', error);
    throw error;
  }
}

// 시트의 모든 탭 목록 가져오기
export async function getAllSheetTabs(
  spreadsheetId: string
): Promise<string[]> {
  try {
    const sheets = await getGoogleSheetsClient();
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    return (
      response.data.sheets?.map((sheet) => sheet.properties?.title || '') || []
    );
  } catch (error) {
    console.error(`Error getting sheet tabs for ${spreadsheetId}:`, error);
    throw error;
  }
}

// 여러 시트에서 데이터 읽기 (기존 방식 - 특정 탭만)
export async function readMultipleSheets(
  spreadsheetIds: string[],
  sheetNames: string[]
): Promise<{ spreadsheetId: string; sheetName: string; data: any[][] }[]> {
  const results = [];

  for (let i = 0; i < spreadsheetIds.length; i++) {
    const spreadsheetId = spreadsheetIds[i];
    const sheetName = sheetNames[i];

    try {
      const data = await readSheetData(spreadsheetId, sheetName);
      results.push({ spreadsheetId, sheetName, data });
    } catch (error) {
      console.error(
        `Error reading sheet ${spreadsheetId}/${sheetName}:`,
        error
      );
    }
  }

  return results;
}

// 여러 시트의 모든 탭에서 데이터 읽기 (자동 감지)
export async function readAllTabsFromSheets(
  spreadsheetIds: string[],
  excludeTabs?: string[] // 제외할 탭 이름 목록 (예: ['Summary', 'Template'])
): Promise<{ spreadsheetId: string; sheetName: string; data: any[][] }[]> {
  const results = [];
  const excludeSet = new Set(
    (excludeTabs || []).map((name) => name.toLowerCase())
  );

  for (const spreadsheetId of spreadsheetIds) {
    try {
      // 시트의 모든 탭 가져오기
      const tabs = await getAllSheetTabs(spreadsheetId);
      console.log(
        `Found ${tabs.length} tabs in spreadsheet ${spreadsheetId}:`,
        tabs
      );

      // 각 탭에서 데이터 읽기
      for (const tabName of tabs) {
        // 제외 목록에 있는 탭은 건너뛰기
        if (excludeSet.has(tabName.toLowerCase())) {
          console.log(`Skipping excluded tab: ${tabName}`);
          continue;
        }

        try {
          const data = await readSheetData(spreadsheetId, tabName);
          if (data.length > 0) {
            results.push({ spreadsheetId, sheetName: tabName, data });
            console.log(
              `✓ Read ${data.length} rows from ${spreadsheetId}/${tabName}`
            );
          } else {
            console.log(
              `⚠ Empty tab skipped: ${spreadsheetId}/${tabName}`
            );
          }
        } catch (error) {
          console.error(
            `Error reading tab ${spreadsheetId}/${tabName}:`,
            error
          );
          // 개별 탭 오류는 무시하고 계속 진행
        }
      }
    } catch (error) {
      console.error(`Error processing spreadsheet ${spreadsheetId}:`, error);
      // 개별 시트 오류는 무시하고 계속 진행
    }
  }

  return results;
}

