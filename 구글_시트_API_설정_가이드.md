# 구글 시트 API 설정 가이드

이 가이드는 외부 구글 시트의 데이터를 Supabase로 가져오기 위한 구글 시트 API 설정 방법을 설명합니다.

## 📋 목차

1. [Google Cloud Console 설정](#1-google-cloud-console-설정)
2. [Service Account 생성](#2-service-account-생성)
3. [구글 시트 공유 설정](#3-구글-시트-공유-설정)
4. [환경 변수 설정](#4-환경-변수-설정)
5. [테스트 및 확인](#5-테스트-및-확인)

---

## 1. Google Cloud Console 설정

### 1.1 프로젝트 생성 또는 선택

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 상단의 프로젝트 선택 드롭다운 클릭
3. **새 프로젝트** 클릭 또는 기존 프로젝트 선택
4. 프로젝트 이름 입력 (예: `amazon-sales-dashboard`)
5. **만들기** 클릭

### 1.2 Google Sheets API 활성화

1. 왼쪽 메뉴에서 **API 및 서비스** → **라이브러리** 클릭
2. 검색창에 "Google Sheets API" 입력
3. **Google Sheets API** 선택
4. **사용 설정** 버튼 클릭

---

## 2. Service Account 생성

### 2.1 Service Account 생성

1. 왼쪽 메뉴에서 **API 및 서비스** → **사용자 인증 정보** 클릭
2. 상단의 **+ 사용자 인증 정보 만들기** 클릭
3. **서비스 계정** 선택
4. 서비스 계정 정보 입력:
   - **서비스 계정 이름**: `google-sheets-reader` (원하는 이름)
   - **서비스 계정 ID**: 자동 생성됨
   - **설명**: "구글 시트 데이터 읽기용 서비스 계정" (선택사항)
5. **만들고 계속하기** 클릭

### 2.2 역할 부여 (선택사항)

1. **역할 선택** (선택사항, 건너뛰어도 됨)
2. **계속** 클릭
3. **완료** 클릭

### 2.3 키 생성

1. 생성된 서비스 계정을 클릭
2. **키** 탭 클릭
3. **키 추가** → **새 키 만들기** 클릭
4. 키 유형: **JSON** 선택
5. **만들기** 클릭
6. JSON 파일이 자동으로 다운로드됩니다 (⚠️ 이 파일을 안전하게 보관하세요!)

### 2.4 JSON 파일에서 정보 추출

다운로드한 JSON 파일을 열면 다음과 같은 정보가 있습니다:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

필요한 정보:
- **client_email**: `GOOGLE_SHEETS_CLIENT_EMAIL`에 사용
- **private_key**: `GOOGLE_SHEETS_PRIVATE_KEY`에 사용

---

## 3. 구글 시트 공유 설정

### 3.1 구글 시트 ID 확인

1. 읽고 싶은 구글 시트를 엽니다
2. URL을 확인합니다:
   ```
   https://docs.google.com/spreadsheets/d/[시트ID]/edit
   ```
3. `[시트ID]` 부분을 복사합니다 (예: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`)

### 3.2 Service Account에 시트 공유

1. 구글 시트에서 **공유** 버튼 클릭
2. Service Account의 이메일 주소 입력 (JSON 파일의 `client_email` 값)
3. 권한: **뷰어** 선택 (읽기 전용)
4. **알림 보내기** 체크 해제 (선택사항)
5. **공유** 클릭

> **중요**: 읽고 싶은 모든 구글 시트에 Service Account 이메일을 공유해야 합니다!

---

## 4. 환경 변수 설정

> **💡 중요**: 시트 ID는 환경변수에 설정할 필요가 없습니다! API 호출 시 요청 본문으로 직접 전달할 수 있습니다. 환경변수는 자주 사용하는 기본 시트용으로만 사용하세요.

### 4.1 로컬 개발 환경 (.env.local)

프로젝트 루트에 `.env.local` 파일을 생성하거나 수정합니다:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google Sheets 인증 정보 (필수)
GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Google Sheets ID 목록 (선택사항 - 자주 사용하는 기본 시트용)
# 요청 본문으로 시트 ID를 전달하면 이 환경변수는 무시됩니다
GOOGLE_SHEETS_IDS=sheet_id_1,sheet_id_2,sheet_id_3

# 제외할 탭 이름 (선택사항, 쉼표로 구분)
GOOGLE_SHEETS_EXCLUDE_TABS=Summary,Template,Instructions
```

**시트 ID 전달 방법:**
- ✅ **권장**: API 호출 시 요청 본문에 `spreadsheetIds` 배열로 전달 (환경변수 수정 불필요)
- ⚙️ **선택**: 환경변수에 기본 시트 ID 설정 (자주 사용하는 시트용)

### 4.2 Private Key 설정 주의사항

`GOOGLE_SHEETS_PRIVATE_KEY`는 JSON 파일의 `private_key` 값을 그대로 사용하되:

1. **따옴표로 감싸기**: 전체 키를 큰따옴표(`"`)로 감싸야 합니다
2. **줄바꿈 문자 유지**: `\n`이 그대로 포함되어야 합니다
3. **예시**:
   ```env
   GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
   ```

### 4.3 프로덕션 환경 (Railway/Vercel 등)

배포 환경에서도 동일한 환경 변수를 설정해야 합니다:

1. Railway/Vercel 대시보드 접속
2. 프로젝트 선택
3. **Variables** 또는 **Environment Variables** 탭 클릭
4. 위의 환경 변수들을 모두 추가
5. **Save** 클릭

---

## 5. 테스트 및 확인

### 5.1 API 엔드포인트 테스트

프로젝트를 실행한 후 다음 API를 호출하여 테스트합니다:

```bash
# 개발 서버 실행
npm run dev

# 다른 터미널에서 테스트
curl -X POST http://localhost:3001/api/sync
```

또는 브라우저에서:
- 개발자 도구 → Network 탭
- `/api/sync` 엔드포인트를 POST로 호출

### 5.2 예상 응답

성공 시:
```json
{
  "success": true,
  "message": "Successfully synced 150 records from 5 tabs",
  "recordCount": 150,
  "tabsProcessed": 5
}
```

오류 시:
```json
{
  "error": "Error message here"
}
```

### 5.3 일반적인 오류 해결

#### 오류: "The caller does not have permission"
- **원인**: Service Account에 구글 시트가 공유되지 않음
- **해결**: 구글 시트의 공유 설정에서 Service Account 이메일을 추가

#### 오류: "Invalid credentials"
- **원인**: 환경 변수의 `GOOGLE_SHEETS_CLIENT_EMAIL` 또는 `GOOGLE_SHEETS_PRIVATE_KEY`가 잘못됨
- **해결**: JSON 파일에서 정확한 값을 복사했는지 확인

#### 오류: "Unable to parse range"
- **원인**: 시트 ID가 잘못되었거나 시트에 접근할 수 없음
- **해결**: 시트 ID 확인 및 공유 설정 확인

### 5.4 Supabase 데이터 확인

1. Supabase 대시보드 접속
2. **Table Editor** 클릭
3. `sales_data` 테이블 확인
4. 데이터가 정상적으로 저장되었는지 확인

---

## 6. API 호출 방법 (시트 ID 전달)

### 6.1 방법 1: 요청 본문으로 시트 ID 직접 전달 (권장)

**환경변수 수정 없이** API 호출 시 시트 ID를 직접 전달할 수 있습니다:

**요청 예시:**
```bash
curl -X POST http://localhost:3001/api/sync \
  -H "Content-Type: application/json" \
  -d '{
    "spreadsheetIds": ["sheet_id_1", "sheet_id_2", "sheet_id_3"]
  }'
```

**JavaScript/TypeScript 예시:**
```typescript
const response = await fetch('/api/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    spreadsheetIds: ['sheet_id_1', 'sheet_id_2', 'sheet_id_3']
  })
});
```

이 방법을 사용하면 **환경변수를 수정할 필요 없이** 원하는 시트를 동적으로 조회할 수 있습니다!

---

## 7. 특정 탭만 읽기 (호출 단에서 제어)

API 호출 시 요청 본문으로 특정 탭만 지정할 수 있습니다. 환경 변수 설정 없이 호출 단에서 제어할 수 있습니다.

### 7.1 방법 1: 특정 시트의 특정 탭만 읽기 (시트 ID 포함)

가장 정확한 방법입니다. 시트 ID와 탭 이름을 명시적으로 지정합니다. **환경변수에 시트 ID를 추가할 필요 없습니다!**

**요청 예시:**
```bash
curl -X POST http://localhost:3001/api/sync \
  -H "Content-Type: application/json" \
  -d '{
    "tabs": [
      { "spreadsheetId": "sheet_id_1", "tabName": "January" },
      { "spreadsheetId": "sheet_id_1", "tabName": "February" },
      { "spreadsheetId": "sheet_id_2", "tabName": "Sales" }
    ]
  }'
```

**JavaScript/TypeScript 예시:**
```typescript
const response = await fetch('/api/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tabs: [
      { spreadsheetId: 'sheet_id_1', tabName: 'January' },
      { spreadsheetId: 'sheet_id_1', tabName: 'February' },
      { spreadsheetId: 'sheet_id_2', tabName: 'Sales' }
    ]
  })
});
```

### 7.2 방법 2: 모든 시트에서 특정 탭만 읽기

모든 시트에서 동일한 탭 이름만 읽고 싶을 때 사용합니다. 시트 ID는 요청 본문 또는 환경변수에서 가져옵니다.

**요청 예시 (시트 ID 포함):**
```bash
curl -X POST http://localhost:3001/api/sync \
  -H "Content-Type: application/json" \
  -d '{
    "spreadsheetIds": ["sheet_id_1", "sheet_id_2"],
    "includeTabs": ["January", "February", "March"]
  }'
```

**요청 예시 (환경변수 사용):**
```bash
# 환경변수 GOOGLE_SHEETS_IDS에 설정된 시트들에서 특정 탭만 읽기
curl -X POST http://localhost:3001/api/sync \
  -H "Content-Type: application/json" \
  -d '{
    "includeTabs": ["January", "February", "March"]
  }'
```

**JavaScript/TypeScript 예시:**
```typescript
const response = await fetch('/api/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    includeTabs: ['January', 'February', 'March']
  })
});
```

### 7.3 방법 3: 기본 동작 (모든 탭 읽기)

**시트 ID를 요청 본문으로 전달:**
```bash
curl -X POST http://localhost:3001/api/sync \
  -H "Content-Type: application/json" \
  -d '{
    "spreadsheetIds": ["sheet_id_1", "sheet_id_2"]
  }'
```

**환경변수 사용 (요청 본문 없이):**
```bash
# 환경변수 GOOGLE_SHEETS_IDS에 설정된 시트들의 모든 탭 읽기
curl -X POST http://localhost:3001/api/sync
```

**제외할 탭 지정:**
```bash
curl -X POST http://localhost:3001/api/sync \
  -H "Content-Type: application/json" \
  -d '{
    "spreadsheetIds": ["sheet_id_1"],
    "excludeTabs": ["Summary", "Template", "Instructions"]
  }'
```

### 7.4 응답 형식

모든 방법에서 동일한 응답 형식을 받습니다:

```json
{
  "success": true,
  "message": "Successfully synced 150 records from 3 tabs",
  "recordCount": 150,
  "tabsProcessed": 3
}
```

### 7.5 사용 시나리오 예시

#### 시나리오 1: 새로운 시트를 동적으로 조회 (환경변수 수정 불필요!)
```typescript
// 사용자가 입력한 시트 ID로 즉시 조회
const userSheetId = 'new_sheet_id_from_user';
await fetch('/api/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    spreadsheetIds: [userSheetId]
  })
});
```

#### 시나리오 2: 월별 데이터만 동기화 (시트 ID 포함)
```typescript
// 현재 월과 이전 월만 동기화
const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  .toLocaleString('en-US', { month: 'long' });

await fetch('/api/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    spreadsheetIds: ['sheet_id_1', 'sheet_id_2'],
    includeTabs: [currentMonth, lastMonth]
  })
});
```

#### 시나리오 3: 특정 시트의 특정 탭만 동기화
```typescript
// Amazon 시트의 Sales 탭만 동기화 (환경변수 수정 불필요!)
await fetch('/api/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tabs: [
      { spreadsheetId: 'amazon_sheet_id', tabName: 'Sales' }
    ]
  })
});
```

#### 시나리오 4: 여러 시트의 여러 탭 동기화
```typescript
// 여러 시트의 여러 탭을 한 번에 동기화
await fetch('/api/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tabs: [
      { spreadsheetId: 'sheet_1', tabName: 'Q1' },
      { spreadsheetId: 'sheet_1', tabName: 'Q2' },
      { spreadsheetId: 'sheet_2', tabName: 'Q1' },
      { spreadsheetId: 'sheet_2', tabName: 'Q2' }
    ]
  })
});
```

---

## 8. 추가 설정 (선택사항)

### 8.1 환경 변수로 제외할 탭 설정

특정 탭을 항상 제외하려면 환경 변수에 설정:

```env
GOOGLE_SHEETS_EXCLUDE_TABS=Summary,Template,Instructions,Test
```

### 8.2 데이터 구조 커스터마이징

`app/api/sync/route.ts` 파일의 `parseAndSaveSalesData` 함수를 수정하여:
- 다른 컬럼 매핑
- 다른 데이터 형식 처리
- 다른 테이블에 저장

---

## 9. 자동 동기화 설정 (선택사항)

### 9.1 Cron Job 설정 (Railway)

Railway에서 주기적으로 동기화하려면:

1. Railway 대시보드 → 프로젝트 선택
2. **Settings** → **Cron Jobs** 클릭
3. 새 Cron Job 추가:
   - **Schedule**: `0 */6 * * *` (6시간마다)
   - **Command**: `curl -X POST https://your-app.railway.app/api/sync`

### 9.2 Vercel Cron Jobs

`vercel.json` 파일에 추가:

```json
{
  "crons": [
    {
      "path": "/api/sync",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

---

## 📚 참고 자료

- [Google Sheets API 문서](https://developers.google.com/sheets/api)
- [Service Account 인증 가이드](https://cloud.google.com/iam/docs/service-accounts)
- [프로젝트 README](./README.md)

---

## ✅ 체크리스트

설정 완료 후 다음을 확인하세요:

- [ ] Google Cloud Console에서 프로젝트 생성
- [ ] Google Sheets API 활성화
- [ ] Service Account 생성 및 JSON 키 다운로드
- [ ] 구글 시트에 Service Account 이메일 공유
- [ ] `.env.local` 파일에 인증 정보 설정 (`GOOGLE_SHEETS_CLIENT_EMAIL`, `GOOGLE_SHEETS_PRIVATE_KEY`)
- [ ] (선택사항) `.env.local` 파일에 기본 시트 ID 설정 (`GOOGLE_SHEETS_IDS`) - 자주 사용하는 시트용
- [ ] API 테스트 성공 (요청 본문으로 시트 ID 전달 테스트)
- [ ] Supabase에 데이터 저장 확인
- [ ] 프로덕션 환경 변수 설정 (배포 시)

---

**문제가 발생하면**: 프로젝트의 `app/api/sync/route.ts` 파일과 `lib/googleSheets.ts` 파일을 확인하거나, 콘솔 로그를 확인하세요.

