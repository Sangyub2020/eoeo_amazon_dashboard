# Amazon SP-API 설정 가이드

## 📋 개요

Amazon SP-API를 사용하여 주문 데이터를 가져오기 위한 설정 가이드입니다.

## 🔑 필요한 자격 증명

**⚠️ 중요 업데이트 (2023년 10월 2일)**: SP-API는 더 이상 AWS IAM이나 AWS Signature Version 4를 요구하지 않습니다!

**필수 정보**:
1. **Amazon SP-API Client ID**
2. **Amazon SP-API Client Secret**
3. **Amazon SP-API Refresh Token**

**선택사항** (호환성을 위해 유지 가능):
4. **AWS IAM Access Key ID** (더 이상 필요 없음)
5. **AWS IAM Secret Access Key** (더 이상 필요 없음)
6. **IAM Role ARN** (더 이상 필요 없음)

## 🔍 AWS IAM Access/Secret Key 확인 방법

### ⚡ 중요: AWS 별도 가입 불필요!

**Amazon Seller Central 계정이 있으면 AWS 계정도 자동으로 연결되어 있습니다!**
- 별도로 AWS에 가입할 필요 없습니다
- Amazon Seller Central 계정으로 AWS 콘솔에 로그인할 수 있습니다
- 두 가지 방법이 있습니다:
  1. **AWS 콘솔 직접 접속** (아래 방법 1)
  2. **Amazon Seller Central에서 IAM 사용자 생성** (아래 방법 2 - 더 쉬움!)

### 방법 1: AWS 콘솔 직접 접속 (가장 확실한 방법! ⭐)

#### Step 1: AWS 콘솔 접속
1. [AWS Management Console](https://console.aws.amazon.com) 접속
2. **Amazon Seller Central과 동일한 이메일/비밀번호로 로그인**
   - 처음 접속하면 "Create a new AWS account" 또는 "Sign in to your account" 화면이 나올 수 있습니다
   - **"Sign in to your account"** 선택하고 Seller Central 계정으로 로그인
   - 또는 "Create a new AWS account"를 선택해도, Seller Central 계정과 연결된 AWS 계정이 자동으로 활성화됩니다

#### Step 2: IAM 서비스로 이동
1. 상단 검색창에 **"IAM"** 입력
2. **IAM (Identity and Access Management)** 선택

#### Step 3: IAM 사용자 생성 (처음이라면)

**이미 IAM 사용자가 있다면 Step 4로 건너뛰세요.**

1. 왼쪽 메뉴에서 **Users** 클릭
2. **Create user** 버튼 클릭
3. **User name** 입력 (예: `sp-api-user`)
4. **Next** 클릭
5. **Set permissions** 화면에서:
   - **Attach policies directly** 선택
   - 검색창에 "sellingpartner" 입력
   - `AmazonSellingPartnerAPIReadOnly` 정책 선택 (또는 필요한 권한에 맞는 정책)
   - **Next** 클릭
6. **Create user** 클릭

#### Step 4: Access Key 생성
1. 생성한 IAM 사용자 이름 클릭 (또는 Users 목록에서 선택)
2. **Security credentials** 탭 클릭
3. **Access keys** 섹션으로 스크롤
4. **Create access key** 버튼 클릭
5. **Use case** 선택: **Application running outside AWS**
6. **Next** 클릭
7. **Create access key** 클릭
8. ⚠️ **중요**: 다음 정보를 즉시 복사하세요!
   - **Access Key ID**: `AKIA...`로 시작하는 값
   - **Secret Access Key**: 긴 문자열 (이 창을 닫으면 다시 볼 수 없습니다!)
   - `.csv` 파일로 다운로드하거나 안전한 곳에 저장하세요
9. **Done** 클릭

### 방법 2: Seller Central에서 SP-API 앱 생성 (여러 계정 관리 시 추천! ⭐)

**여러 브랜드 계정을 관리하는 경우 이 방법이 가장 실용적입니다!**

SP-API 앱을 만들면 자동으로 IAM 역할이 생성되고, Access Key 없이도 사용할 수 있습니다.

#### Step 1: SP-API 앱 생성
1. [Amazon Seller Central](https://sellercentral.amazon.com) 접속
2. **Apps & Services** → **Develop Apps** 클릭
   - 또는 **Settings** → **User Permissions** → **API Access** → **Develop Apps**

3. **프로그램 선택 화면이 나타나면**:
   - ⭐ **Program : Sell with Amazon** 선택 (SP-API를 사용하려면 이것을 선택해야 합니다!)
   - "Solution Provider Portal"은 선택하지 마세요 (다른 용도입니다)
   - 계정 선택: 드롭다운에서 해당 계정 선택 (예: "Tangerine Stories")
   - **Continue** 또는 **Next** 클릭

4. **SPP(Solution Provider Portal) 온보딩 화면이 나타나면**:
   - 이미 SPP 계정이 있다는 메시지가 보일 수 있습니다
   - **"You already have SPP account(s), please continue to Home Page"** 메시지가 보이면:
     - **Home Page로 이동** 클릭
     - 또는 왼쪽 상단의 **Home** 또는 **Dashboard** 클릭
   - 기존 개발자 프로필 통합(Step 2)은 선택사항입니다 - 나중에 해도 됩니다
   - 바로 앱을 만들 수 있습니다

5. **앱 생성 화면으로 이동**:
   - SPP Home Page에서 **Apps** 또는 **Develop Apps** 메뉴 클릭
   - 또는 직접 **Add new app client** 또는 **Create app** 클릭

6. 앱 정보 입력:
   - **App name**: 예) "Sales Dashboard API"
   - **The Restricted Data Token (RDT)**: "No" 선택 (대부분의 경우)
   - **OAuth Login URI** (Required): ⚠️ **localhost는 허용되지 않습니다!**
     - 실제 도메인 필요: `https://yourdomain.com/login`
     - 또는 임시 도메인: `https://example.com/login` (나중에 변경 가능)
     - 또는 ngrok: `https://abc123.ngrok.io/login`
   - **OAuth Redirect URI**: ⚠️ **localhost는 허용되지 않습니다!**
     - 실제 도메인 필요: `https://yourdomain.com/callback`
     - 또는 임시 도메인: `https://example.com/callback` (나중에 변경 가능)
     - 또는 ngrok: `https://abc123.ngrok.io/callback`
   - **참고**: Login URI와 Redirect URI는 같은 도메인 사용 권장
7. **Save** 클릭

#### Step 2: 필요한 정보 확인

앱 목록 화면에서 다음 정보를 확인합니다:

**2-1. LWA Credentials 확인**:
1. 앱 목록에서 **"LWA credentials"** 열의 **"View"** 버튼 클릭
2. **Client ID**와 **Client Secret** 확인 및 복사
   - Secret은 **Show** 클릭하여 표시 (한 번만 표시됨!)

**2-2. IAM Role ARN 확인**:
IAM Role ARN은 다음 위치에서 확인할 수 있습니다:

1. **Edit App 페이지**:
   - "Action" 열의 "Edit App" 클릭
   - "IAM ARN", "IAM Role ARN", "Security" 또는 "Credentials" 섹션 확인

2. **View 페이지**:
   - "LWA credentials" 열의 "View" 버튼 클릭
   - 페이지 하단의 "IAM Role ARN" 섹션 확인

3. **앱 상세 페이지**:
   - 앱 이름 클릭하여 상세 페이지로 이동
   - "App details" 또는 "Security" 탭 확인

- 형식: `arn:aws:iam::123456789012:role/SellingPartnerAPI-Role`
- 자동으로 생성되어 있습니다!

#### Step 3: IAM 역할에 권한 부여 (필요시)
- SP-API 앱을 만들면 기본 권한이 자동으로 부여됩니다
- 추가 권한이 필요하면 AWS 콘솔에서 IAM 역할에 정책을 추가해야 합니다

### 방법 2-1: Seller Central에서 직접 IAM 사용자 확인 (가능한 경우)

일부 계정에서는 다음 경로에서 확인할 수 있습니다:

1. **Settings** → **Account Info** → **User Permissions**
2. **Settings** → **User Permissions** → **IAM User Access**
3. **Reports** → **Fulfillment by Amazon** → **IAM User Access**

**참고**: 이 옵션이 보이지 않을 수 있습니다. 계정 유형이나 권한에 따라 다를 수 있습니다.

### 기존 IAM 사용자의 Access Key 확인

이미 IAM 사용자가 있고 Access Key만 확인하고 싶다면:

1. AWS 콘솔 → IAM → **Users**
2. 해당 IAM 사용자 선택
3. **Security credentials** 탭 클릭
4. **Access keys** 섹션에서:
   - 기존 키가 있으면: **Show** 클릭 (Secret Key는 처음 생성 시에만 표시됨)
   - Secret Key를 잊어버렸다면: 기존 키 삭제 후 새로 생성해야 함
   - 키가 없다면: **Create access key** 클릭하여 생성

### ⚠️ 주의사항
- **Secret Access Key는 한 번만 표시됩니다!** 반드시 안전한 곳에 저장하세요.
- Access Key는 정기적으로 로테이션하는 것이 좋습니다.
- Secret Key를 잃어버렸다면 새로 생성해야 합니다 (기존 키는 삭제 가능).

### 📝 Amazon SP-API와 AWS IAM의 관계
Amazon SP-API는 AWS 인프라를 사용하므로, SP-API 호출 시 AWS IAM 자격 증명이 필요합니다:
- **Access Key ID**: IAM 사용자 식별자
- **Secret Access Key**: API 호출 서명에 사용되는 비밀 키

### 💡 요약
- ✅ **별도 AWS 가입 불필요**: Amazon Seller Central 계정이면 충분
- ✅ **AWS 콘솔 방법 추천**: 가장 확실하고 단계가 명확함
- ✅ **Seller Central에서 안 보이면**: AWS 콘솔 방법 사용 (동일한 계정으로 로그인)

## 📝 환경 변수 설정

### 1. Supabase Secrets 설정

Supabase Dashboard에서 다음 Secrets를 설정해야 합니다:

1. [Supabase Dashboard](https://supabase.com) 접속
2. 프로젝트 선택
3. 왼쪽 메뉴 → **Settings** → **Edge Functions** → **Secrets** 클릭
4. 다음 Secrets 추가:

**⚠️ 중요**: 2023년 10월 2일부터 SP-API는 AWS IAM이나 AWS Signature Version 4를 더 이상 요구하지 않습니다!

**최소 필수 설정** (이것만으로 충분합니다!):

```
AMAZON_SP_API_CLIENT_ID=your_client_id_here
AMAZON_SP_API_CLIENT_SECRET=your_client_secret_here
AMAZON_SP_API_REFRESH_TOKEN=your_refresh_token_here
AMAZON_SP_API_BASE_URL=https://sellingpartnerapi-na.amazon.com
```

**선택사항** (호환성을 위해 유지 가능하지만 더 이상 필요 없음):

```
AMAZON_AWS_ACCESS_KEY_ID=your_aws_access_key_id_here (선택사항)
AMAZON_AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here (선택사항)
AMAZON_USE_IAM_ROLE=true (선택사항)
AMAZON_IAM_ROLE_ARN=arn:aws:iam::123456789012:role/SellingPartnerAPI-Role (선택사항)
```

**참고**: 
- `AMAZON_SP_API_BASE_URL`은 선택사항입니다. 기본값은 `https://sellingpartnerapi-na.amazon.com` (US)입니다.
- **IAM Role ARN을 찾지 못해도 문제없습니다!** 더 이상 필요하지 않습니다.
- Client ID, Secret, Refresh Token만 있으면 SP-API를 사용할 수 있습니다.

### 2. 로컬 개발용 .env.local (선택사항)

로컬에서 테스트할 경우 `.env.local` 파일에 추가:

```env
# Amazon SP-API 설정 (로컬 테스트용, 실제로는 Supabase Secrets에 저장)
AMAZON_SP_API_CLIENT_ID=your_client_id_here
AMAZON_SP_API_CLIENT_SECRET=your_client_secret_here
AMAZON_SP_API_REFRESH_TOKEN=your_refresh_token_here
AMAZON_AWS_ACCESS_KEY_ID=your_aws_access_key_id_here
AMAZON_AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here
```

**⚠️ 주의**: 실제 프로덕션에서는 이 값들을 Supabase Secrets에 저장하고, `.env.local`에는 저장하지 마세요!

## 🚀 Edge Function 배포

### Supabase CLI 사용

```bash
# Supabase CLI 설치 (아직 안 했다면)
npm install -g supabase

# Supabase 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref your-project-ref

# Edge Function 배포
supabase functions deploy fetch-amazon-orders
```

### 또는 Supabase Dashboard 사용

1. [Supabase Dashboard](https://supabase.com) 접속
2. 프로젝트 선택
3. 왼쪽 메뉴 → **Edge Functions** 클릭
4. **Create a new function** 클릭
5. Function 이름: `fetch-amazon-orders`
6. `supabase/functions/fetch-amazon-orders/index.ts` 파일 내용 복사하여 붙여넣기
7. **Deploy** 클릭

## 📍 Marketplace ID 참고

주요 Marketplace ID:
- **US**: `ATVPDKIKX0DER`
- **CA**: `A2EUQ1WTGCTBG2`
- **UK**: `A1F83G8C2ARO7P`
- **DE**: `A1PA6795UKMFR9`
- **FR**: `A13V1IB3VIYZZH`
- **IT**: `APJ6JRA9NG5V4`
- **ES**: `A1RKKUPIHCS9HS`
- **JP**: `A1VC38T7YXB528`

## 🧪 테스트

1. 대시보드에서 **Amazon US** 페이지로 이동
2. 하단의 **Amazon 주문 데이터 가져오기** 섹션 확인
3. **주문 데이터 가져오기** 버튼 클릭
4. 주문 목록이 테이블에 표시되는지 확인

## 🔍 문제 해결

### Edge Function 호출 실패

1. **Supabase Secrets 확인**: 모든 필수 Secrets가 설정되어 있는지 확인
2. **함수 배포 확인**: Edge Function이 정상적으로 배포되었는지 확인
3. **브라우저 콘솔 확인**: 개발자 도구에서 에러 메시지 확인

### LWA Token 발급 실패

- Client ID, Client Secret, Refresh Token이 올바른지 확인
- Refresh Token이 만료되지 않았는지 확인

### SP-API 호출 실패

- AWS IAM Access Key와 Secret Key가 올바른지 확인
- IAM 사용자에게 SP-API 접근 권한이 있는지 확인
- Marketplace ID가 올바른지 확인

## 📚 참고 자료

- [Amazon SP-API 문서](https://developer-docs.amazon.com/sp-api/)
- [LWA (Login with Amazon) 문서](https://developer.amazon.com/docs/login-with-amazon/authorization-code-grant.html)
- [AWS Signature V4 문서](https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html)


