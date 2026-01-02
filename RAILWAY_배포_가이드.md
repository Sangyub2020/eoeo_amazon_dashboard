# Railway 배포 가이드

## 📋 개요

Railway를 사용하여 Next.js 애플리케이션을 배포하면 타임아웃 제한 없이 Amazon 주문 데이터를 가져올 수 있습니다.

## 🚀 배포 단계

### 1단계: Railway 계정 생성

1. **Railway 웹사이트 접속**
   - https://railway.app 접속
   - "Start a New Project" 클릭

2. **GitHub로 로그인**
   - "Login with GitHub" 클릭
   - GitHub 계정으로 로그인

### 2단계: 프로젝트 연결

1. **새 프로젝트 생성**
   - Dashboard에서 "New Project" 클릭
   - "Deploy from GitHub repo" 선택

2. **저장소 선택**
   - GitHub 저장소 목록에서 프로젝트 선택
   - Railway가 자동으로 코드를 가져옵니다

3. **자동 감지**
   - Railway가 Next.js 프로젝트를 자동으로 감지합니다
   - 빌드 및 배포가 자동으로 시작됩니다

### 3단계: 환경 변수 설정

1. **환경 변수 메뉴**
   - 프로젝트 Dashboard에서 "Variables" 탭 클릭

2. **필수 환경 변수 추가**
   - 현재 Vercel에 설정된 환경 변수를 모두 복사
   - 다음 변수들을 추가합니다:

   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   AMAZON_SP_API_CLIENT_ID=your-client-id
   AMAZON_SP_API_CLIENT_SECRET=your-client-secret
   AMAZON_SP_API_REFRESH_TOKEN=your-refresh-token
   AMAZON_SP_API_BASE_URL=https://sellingpartnerapi-na.amazon.com
   GOOGLE_SHEETS_IDS=your-sheets-ids
   GOOGLE_CLIENT_EMAIL=your-client-email
   GOOGLE_PRIVATE_KEY=your-private-key
   ```

3. **환경 변수 추가 방법**
   - "New Variable" 클릭
   - Name: 변수 이름 입력
   - Value: 변수 값 입력
   - "Add" 클릭

### 4단계: 배포 확인

1. **배포 상태 확인**
   - Dashboard에서 "Deployments" 탭 확인
   - "Success" 상태가 되면 배포 완료

2. **로그 확인**
   - "View Logs" 클릭하여 빌드 및 실행 로그 확인
   - 에러가 있으면 로그에서 확인 가능

3. **URL 확인**
   - Dashboard 상단에 표시된 URL로 접속
   - 예: https://your-project.railway.app

### 5단계: 도메인 설정 (선택사항)

1. **Custom Domain 추가**
   - "Settings" → "Networking" → "Custom Domain"
   - 원하는 도메인 입력
   - DNS 설정 안내에 따라 CNAME 레코드 추가

## ⚙️ Railway 설정

### 포트 설정

Railway는 자동으로 `PORT` 환경 변수를 제공합니다. Next.js가 이를 자동으로 인식하므로 별도 설정이 필요 없습니다.

### 빌드 명령어

Railway는 `package.json`의 `build` 스크립트를 자동으로 실행합니다:
```json
"build": "next build"
```

### 실행 명령어

Railway는 `package.json`의 `start` 스크립트를 자동으로 실행합니다:
```json
"start": "next start"
```

## 🔍 문제 해결

### 빌드 실패

1. **로그 확인**
   - Dashboard → Deployments → 실패한 배포 → View Logs
   - 에러 메시지 확인

2. **환경 변수 확인**
   - 모든 필수 환경 변수가 설정되었는지 확인
   - 변수 이름이 정확한지 확인 (대소문자 구분)

3. **의존성 문제**
   - 로컬에서 `npm install` 후 `npm run build` 실행하여 테스트

### 배포는 성공했지만 앱이 동작하지 않음

1. **환경 변수 확인**
   - 모든 환경 변수가 올바르게 설정되었는지 확인
   - 특히 Supabase 관련 변수 확인

2. **로그 확인**
   - "View Logs"에서 런타임 에러 확인

3. **URL 접속 확인**
   - 제공된 Railway URL로 접속 시도

## 💰 비용

- **무료 플랜**: 제한적 (월 $5 크레딧)
- **Pro 플랜**: $20/월 (더 많은 리소스)
- **사용량 기반**: 실제 사용한 만큼만 과금

## 📝 참고사항

1. **타임아웃 제한 없음**
   - Railway는 타임아웃 제한이 없어 긴 작업도 처리 가능

2. **자동 배포**
   - GitHub에 푸시하면 자동으로 재배포됩니다

3. **환경 변수 보안**
   - Railway Dashboard에서만 환경 변수를 관리하세요
   - 코드에 직접 작성하지 마세요

4. **로그 확인**
   - 문제 발생 시 Dashboard → Logs에서 상세 로그 확인 가능

## 🔄 Vercel과 Railway 동시 사용

Vercel과 Railway를 동시에 사용할 수 있습니다:
- **Vercel**: 프론트엔드 배포 (웹사이트)
- **Railway**: API 배포 (타임아웃 없는 작업)

또는 전체 애플리케이션을 Railway로만 배포할 수도 있습니다.

