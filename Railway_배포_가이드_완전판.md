# Railway 배포 가이드 (완전판)

이 가이드는 Amazon Sales Dashboard 프로젝트를 Railway에 배포하는 방법을 단계별로 설명합니다.

## 📋 사전 준비사항

1. **GitHub 계정** (프로젝트가 GitHub에 있어야 함)
2. **Railway 계정** ([railway.app](https://railway.app)에서 가입)
3. **Supabase 프로젝트** (데이터베이스는 Supabase 사용)
4. **필요한 환경 변수 목록** (아래 참고)

---

## 🚀 1단계: Railway 프로젝트 생성

### 1.1 Railway 로그인 및 프로젝트 생성

1. [Railway](https://railway.app) 접속
2. "Start a New Project" 클릭
3. "Deploy from GitHub repo" 선택
4. GitHub 계정 연결 (처음인 경우)
5. `amazon-sales-dashboard` 저장소 선택
6. 프로젝트 이름 입력 (예: "amazon-sales-dashboard")

### 1.2 서비스 생성

Railway는 자동으로 Next.js 프로젝트를 감지하고 서비스를 생성합니다. 생성된 서비스를 확인하세요.

---

## 🔧 2단계: 환경 변수 설정

Railway 대시보드에서 환경 변수를 설정해야 합니다.

### 2.1 환경 변수 추가 방법

1. Railway 프로젝트 대시보드에서 서비스 선택
2. "Variables" 탭 클릭
3. "Raw Editor" 클릭 (한 번에 여러 변수 추가 가능)
4. 아래 환경 변수 목록을 복사하여 붙여넣기

### 2.2 필수 환경 변수 목록

```env
# Supabase 설정 (필수)
NEXT_PUBLIC_SUPABASE_URL=https://yjxrrczopfpymwlbhzjy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqeHJyY3pvcGZweW13bGJoemp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MDI3NDksImV4cCI6MjA4MDQ3ODc0OX0.SM-UY8W9YmIyF324bzPPoWZyD6t0pujbbC0WC27L6Qw
SUPABASE_SERVICE_ROLE_KEY=여기에_Service_Role_Key_입력

# Google Sheets 설정 (필수)
GOOGLE_SHEETS_CLIENT_EMAIL=your_google_service_account_email@project-id.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_IDS=sheet_id_1,sheet_id_2,sheet_id_3
GOOGLE_SHEETS_EXCLUDE_TABS=Summary,Template,Instructions

# Amazon SP-API 설정 (필수 - 기본 계정용)
AMAZON_SP_API_CLIENT_ID=your_amazon_sp_api_client_id
AMAZON_SP_API_CLIENT_SECRET=your_amazon_sp_api_client_secret
AMAZON_SP_API_REFRESH_TOKEN=your_amazon_sp_api_refresh_token
AMAZON_SP_API_BASE_URL=https://sellingpartnerapi-na.amazon.com

# Amazon AWS 설정 (선택사항 - Signature V4용)
AMAZON_AWS_ACCESS_KEY_ID=your_aws_access_key_id
AMAZON_AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key

# Node.js 환경 설정
NODE_ENV=production
PORT=3000
```

### 2.3 환경 변수 값 가져오기

#### Supabase Service Role Key

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택: **Marketing Dashboard** (ID: yjxrrczopfpymwlbhzjy)
3. Settings → API
4. **service_role secret** 키 복사
5. ⚠️ **주의**: 이 키는 절대 공개하지 마세요!

#### Google Sheets 정보

- **GOOGLE_SHEETS_CLIENT_EMAIL**: Google Service Account 이메일
- **GOOGLE_SHEETS_PRIVATE_KEY**: Service Account Private Key (전체 포함, 따옴표로 감싸기)
- **GOOGLE_SHEETS_IDS**: 구글 시트 ID 목록 (쉼표로 구분)

#### Amazon SP-API 정보

- **AMAZON_SP_API_CLIENT_ID**: Amazon SP-API Client ID (LWA)
- **AMAZON_SP_API_CLIENT_SECRET**: Amazon SP-API Client Secret (LWA)
- **AMAZON_SP_API_REFRESH_TOKEN**: Amazon SP-API Refresh Token (LWA)
- **AMAZON_SP_API_BASE_URL**: API 엔드포인트 URL (기본값: `https://sellingpartnerapi-na.amazon.com`)

> **참고**: 여러 Amazon 계정을 사용하는 경우, `account_master` 테이블에 각 계정의 API 정보를 별도로 저장할 수 있습니다. 기본값은 환경 변수에서 가져옵니다.

### 2.4 환경 변수 설정 확인

모든 환경 변수를 추가한 후:

1. "Save" 클릭
2. "Deployments" 탭에서 최신 배포 확인
3. 배포가 자동으로 트리거됩니다

---

## 🏗️ 3단계: 빌드 설정 확인

Railway는 Next.js 프로젝트를 자동으로 감지하지만, 필요시 수동 설정할 수 있습니다.

### 3.1 자동 감지 (권장)

Railway가 자동으로 다음을 감지합니다:
- **Build Command**: `npm run build` (또는 `npm ci && npm run build`)
- **Start Command**: `npm start`
- **Node.js Version**: `package.json`의 `engines` 필드 또는 `.nvmrc` 파일

### 3.2 수동 설정 (필요시)

1. 서비스 → "Settings" 탭
2. "Build & Deploy" 섹션
3. 다음 설정 확인:
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`
   - **Root Directory**: `.` (루트 디렉토리)

---

## 📦 4단계: 배포 확인

### 4.1 배포 상태 확인

1. Railway 대시보드 → "Deployments" 탭
2. 최신 배포의 상태 확인:
   - ✅ **Success**: 배포 성공
   - ⏳ **Building**: 빌드 중
   - ❌ **Failed**: 빌드 실패 (로그 확인 필요)

### 4.2 배포 로그 확인

배포가 실패한 경우:

1. "Deployments" 탭에서 실패한 배포 클릭
2. "View Logs" 클릭
3. 에러 메시지 확인
4. 주로 환경 변수 누락 또는 빌드 에러

### 4.3 배포 URL 확인

1. 서비스 → "Settings" 탭
2. "Domains" 섹션에서 도메인 확인
3. 기본 도메인 형식: `https://[service-name].up.railway.app`
4. 또는 "Generate Domain" 클릭하여 커스텀 도메인 생성

---

## 🧪 5단계: 배포 후 테스트

### 5.1 기본 동작 확인

배포된 URL로 접속하여 다음을 확인:

1. **홈페이지 로딩**: `https://[your-domain]/`
2. **대시보드 페이지**: `https://[your-domain]/dashboard`
3. **API Route 테스트**: `https://[your-domain]/api/test`

### 5.2 Supabase 연결 확인

1. `https://[your-domain]/api/test-supabase` 접속
2. 응답에서 `connected: true` 확인

### 5.3 Amazon API 연결 확인

1. Amazon US 대시보드 페이지 접속
2. "주문 데이터 가져오기" 버튼 클릭
3. API Route가 정상 작동하는지 확인

---

## ⚙️ 6단계: 고급 설정 (선택사항)

### 6.1 커스텀 도메인 설정

1. Railway 대시보드 → 서비스 → "Settings" → "Domains"
2. "Custom Domain" 섹션에서 도메인 추가
3. DNS 설정 (Railway가 제공하는 지침 따르기)

### 6.2 환경별 변수 설정

Railway는 Environment별로 변수를 설정할 수 있습니다:

1. 프로젝트 대시보드 → "Environments" 탭
2. Environment 생성 (예: "staging", "production")
3. 각 Environment별로 환경 변수 설정

### 6.3 리소스 제한 설정

Railway는 무료 플랜에서도 제한이 있으므로 확인:

1. 서비스 → "Settings" → "Resources"
2. 메모리 및 CPU 할당 확인
3. 필요시 플랜 업그레이드

---

## 🔍 7단계: 문제 해결

### 7.1 빌드 실패

**증상**: 배포가 실패하고 로그에 빌드 에러가 표시됨

**해결 방법**:
1. 로컬에서 `npm run build` 실행하여 에러 확인
2. TypeScript 타입 에러 확인: `npx tsc --noEmit`
3. 환경 변수 누락 확인

### 7.2 런타임 에러

**증상**: 배포는 성공하지만 앱이 작동하지 않음

**해결 방법**:
1. Railway 로그 확인 (서비스 → "Deployments" → "View Logs")
2. 환경 변수 값 확인 (특히 문자열 따옴표)
3. Supabase 연결 확인

### 7.3 API Route 타임아웃

**증상**: Amazon 주문 데이터 가져오기가 타임아웃됨

**해결 방법**:
- Railway는 타임아웃이 없으므로 이 문제는 발생하지 않아야 합니다
- 만약 발생한다면, 배치 처리 크기 조정 (`maxOrdersToProcess` 값 조정)

### 7.4 환경 변수 인코딩 문제

**증상**: Google Sheets Private Key나 다른 환경 변수가 제대로 인식되지 않음

**해결 방법**:
1. Private Key의 줄바꿈 문자(`\n`)가 포함되어 있는지 확인
2. Railway의 Raw Editor에서 전체 값을 따옴표로 감싸기
3. 예: `GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"`

---

## 📊 8단계: 모니터링 및 로그

### 8.1 실시간 로그 확인

1. Railway 대시보드 → 서비스
2. "Deployments" 탭 → 최신 배포 클릭
3. "View Logs" 클릭하여 실시간 로그 확인

### 8.2 메트릭스 확인

1. 서비스 → "Metrics" 탭
2. CPU, 메모리, 네트워크 사용량 확인
3. 트래픽 패턴 분석

---

## 🔄 9단계: 자동 배포 설정

Railway는 GitHub에 Push할 때마다 자동으로 배포됩니다.

### 9.1 자동 배포 확인

1. 서비스 → "Settings" → "Source"
2. "Auto-Deploy" 옵션이 활성화되어 있는지 확인
3. 특정 브랜치만 배포하려면 "Branch" 설정

### 9.2 배포 브랜치 설정

1. "Settings" → "Source" → "Branch"
2. 배포할 브랜치 선택 (예: `main`, `master`)

---

## 🎯 체크리스트

배포 전 확인사항:

- [ ] GitHub 저장소에 코드 Push 완료
- [ ] Railway 프로젝트 생성 완료
- [ ] 모든 환경 변수 설정 완료
- [ ] Supabase Service Role Key 설정 완료
- [ ] Google Sheets 정보 설정 완료
- [ ] Amazon SP-API 정보 설정 완료
- [ ] 로컬에서 `npm run build` 성공
- [ ] TypeScript 타입 에러 없음

배포 후 확인사항:

- [ ] 배포 상태가 "Success"
- [ ] 홈페이지 정상 로딩
- [ ] 대시보드 페이지 접근 가능
- [ ] API Route 정상 작동 (`/api/test`)
- [ ] Supabase 연결 확인 (`/api/test-supabase`)
- [ ] Amazon 주문 데이터 가져오기 기능 테스트

---

## 📚 추가 자료

- [Railway 공식 문서](https://docs.railway.app)
- [Next.js 배포 가이드](https://nextjs.org/docs/deployment)
- [Supabase 설정 가이드](./SUPABASE_환경변수_확인.md)
- [환경 변수 설정 가이드](./환경변수_설정_가이드.md)

---

## 💡 팁

1. **환경 변수 관리**: Railway의 Raw Editor를 사용하면 한 번에 여러 변수를 쉽게 추가할 수 있습니다.

2. **로그 모니터링**: 배포 후 첫 몇 시간은 로그를 모니터링하여 예상치 못한 에러를 확인하세요.

3. **백업**: 중요한 환경 변수는 안전한 곳에 백업하세요 (1Password, LastPass 등).

4. **비용 관리**: Railway의 무료 플랜은 제한이 있으므로, 트래픽이 많아지면 플랜을 확인하세요.

5. **성능 최적화**: Next.js의 빌드 최적화 기능을 활용하여 배포 속도를 높이세요.

