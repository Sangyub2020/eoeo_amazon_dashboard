# Seller Central에서 IAM 키 확인하는 방법 (여러 계정 관리)

## 🎯 목표

여러 브랜드의 Amazon Seller Central 계정을 관리하는 경우, AWS 콘솔에 직접 접속하지 않고 Seller Central에서 직접 IAM 키를 확인하는 방법입니다.

## 📋 방법 1: SP-API 앱 생성 (가장 추천! ⭐)

SP-API 앱을 만들면 IAM 역할이 자동으로 생성되고, Access Key 없이도 사용할 수 있습니다.

### Step 1: Seller Central에서 SP-API 앱 생성

1. [Amazon Seller Central](https://sellercentral.amazon.com) 접속
2. **Apps & Services** → **Develop Apps** 클릭
   - 또는 **Settings** → **User Permissions** → **API Access** → **Develop Apps**

3. **프로그램 선택 화면이 나타나면**:
   - **Program : Sell with Amazon** 선택 ⭐ (SP-API를 사용하려면 이것을 선택해야 합니다!)
   - "Solution Provider Portal"은 선택하지 마세요 (다른 용도입니다)
   - 계정 선택: "Tangerine Stories" 선택
   - **Continue** 또는 **Next** 클릭

4. **SPP(Solution Provider Portal) 온보딩 화면이 나타나면**:
   - 이미 SPP 계정이 있다는 메시지가 보일 수 있습니다
   - **"You already have SPP account(s), please continue to Home Page"** 메시지가 보이면:
     - **Home Page로 이동** 클릭
     - 또는 왼쪽 상단의 **Home** 또는 **Dashboard** 클릭
   - 기존 개발자 프로필 통합은 선택사항입니다 (나중에 할 수도 있음)
   - 바로 앱을 만들 수 있습니다

5. **앱 생성 화면으로 이동**:
   - SPP Home Page에서 **Apps** 또는 **Develop Apps** 메뉴 클릭
   - 또는 직접 **Add new app client** 또는 **Create app** 클릭

6. 앱 정보 입력:
   - **App name**: 예) "Sales Dashboard API"
   - **OAuth redirect URI**: `https://your-domain.com` (임시로 입력해도 됨)
     - 예: `https://localhost:3000` 또는 실제 도메인
7. **Save** 클릭

### Step 2: 필요한 정보 확인

앱 목록 화면에서 필요한 정보를 확인합니다:

#### 2-1. LWA Credentials 확인 (Client ID, Secret)

1. 앱 목록에서 **"LWA credentials"** 열의 **"View"** 버튼 클릭
2. 다음 정보 확인:
   - **Client ID**: 복사하여 저장
   - **Client Secret**: **Show** 클릭하여 표시 후 복사 (한 번만 표시됨!)
   - ⚠️ **중요**: Secret은 즉시 안전한 곳에 저장하세요!

#### 2-2. IAM Role ARN 확인

**⚠️ 중요**: Edit App 페이지에는 IAM Role ARN이 표시되지 않습니다. 다음 방법으로 확인하세요:

**방법 1: View 페이지에서 확인 (가장 가능성 높음) ⭐**

1. 앱 목록 화면으로 돌아가기
2. **"LWA credentials"** 열의 **"View"** 버튼 클릭
3. Client ID와 Secret이 표시됩니다
4. 페이지를 **아래로 끝까지 스크롤** (또는 Ctrl+F로 "IAM" 또는 "ARN" 검색)
5. 다음 섹션들을 확인:
   - **IAM Role ARN** 섹션
   - **IAM ARN** 섹션
   - **Security** 섹션
   - **Application details** 섹션
   - 형식: `arn:aws:iam::123456789012:role/SellingPartnerAPI-Role`
   - 또는 `arn:aws:iam::123456789012:role/SP-API-Role-xxxxx` 형식

**⚠️ 중요: Draft 상태인 경우**

만약 View 페이지에 IAM Role ARN이 보이지 않고 앱 상태가 **"Draft"**라면:
- IAM Role ARN은 앱이 **활성화(Published)**되면 자동으로 생성됩니다
- 아래 "방법 2"를 따라 앱을 활성화하세요
- 또는 "Add Authorizations" 섹션에서 Refresh Token을 생성한 후 다시 확인해보세요

**💡 팁**: 
- 브라우저에서 Ctrl+F (또는 Cmd+F)를 눌러 "IAM" 또는 "ARN"을 검색하면 빠르게 찾을 수 있습니다
- 페이지가 길 수 있으니 끝까지 스크롤하세요

**방법 2: 앱 활성화 (Draft 상태인 경우) ⭐**

**현재 앱이 "Draft" 상태라면 IAM Role ARN이 아직 생성되지 않았을 수 있습니다.**

#### Step 1: 앱 정보 확인 및 저장

1. 앱 목록에서 **"Action"** 열의 **"Edit App"** 클릭
2. 모든 필수 정보가 입력되었는지 확인:
   - ✅ Roles 선택됨 (최소 1개 이상)
   - ✅ OAuth Login URI 입력됨
   - ✅ OAuth Redirect URI 입력됨
3. **Save and exit** 클릭

#### Step 2: 앱 활성화 방법

앱 목록으로 돌아가서 다음 중 하나를 시도:

**옵션 A: 자동 활성화**
- 앱을 저장하면 자동으로 "Published" 또는 "Active" 상태로 변경될 수 있습니다
- 앱 목록에서 Status 열 확인

**옵션 B: Publish/Activate 버튼**
- 앱 목록에서 **"Publish"**, **"Activate"**, 또는 **"Submit"** 버튼이 있는지 확인
- 있다면 클릭하여 활성화

**옵션 C: 앱 상세 페이지에서 활성화**
- 앱 이름("Tangerien Dashboard Project") 클릭
- 상세 페이지에서 **"Publish"** 또는 **"Activate"** 버튼 확인
- 있다면 클릭

**옵션 D: View 페이지에서 활성화**
- **"View"** 버튼 클릭
- 페이지에서 **"Publish"**, **"Activate"**, 또는 **"Submit for Review"** 버튼 확인
- 있다면 클릭

#### Step 3: Refresh Token 생성 (선택사항이지만 권장)

"Add Authorizations" 섹션이 보인다면:

1. **"Authorize app"** 버튼 클릭
2. 필요한 마켓플레이스 선택 (예: United States)
3. 권한 동의 화면에서 **"Authorize"** 클릭
4. Refresh Token이 생성됩니다
5. 생성된 Refresh Token 복사하여 저장

**참고**: 
- Refresh Token 생성은 IAM Role ARN과 직접 관련이 없을 수 있지만, 앱 활성화에 도움이 될 수 있습니다
- Refresh Token은 나중에 SP-API 호출에 필요합니다

#### Step 4: IAM Role ARN 확인

1. 앱이 활성화되면 (Status가 "Published" 또는 "Active"로 변경)
2. 다시 **View** 버튼 클릭
3. 페이지를 아래로 스크롤하여 **IAM Role ARN** 확인
   - Client ID, Secret 아래에 표시됩니다
   - 또는 **Application details** 섹션에 있을 수 있습니다

**참고**: 
- 일부 경우 앱이 자동으로 활성화되거나, 시간이 걸릴 수 있습니다
- 몇 분 후 다시 확인해보세요
- 앱이 활성화되면 View 페이지에 IAM Role ARN이 표시됩니다
- **"Add Authorizations" 섹션은 Refresh Token 생성용이므로, IAM Role ARN과는 별개입니다**

**방법 3: 앱 상세 페이지에서 확인**
1. 앱 목록에서 앱 이름("Tangerien Dashboard Project") 클릭
2. 상세 페이지에서 **IAM Role ARN** 확인
3. 또는 **Application details** 섹션 확인

**방법 3-1: View 페이지의 다른 탭 확인**
1. **"View"** 버튼 클릭
2. 페이지 상단에 탭이 있는지 확인:
   - **Credentials** 탭
   - **Application details** 탭
   - **Security** 탭
   - **IAM** 탭
3. 각 탭을 클릭하여 IAM Role ARN 확인

**방법 4: IAM Role ARN이 보이지 않는 경우 (대안)**

만약 위 방법으로도 찾을 수 없다면:

**옵션 A: IAM 사용자 방식 사용**
- AWS 콘솔에서 IAM 사용자 생성 (가이드 참고)
- Access Key ID와 Secret Access Key 사용
- Edge Function에서 `AMAZON_USE_IAM_ROLE=false`로 설정

**옵션 B: 앱 승인 대기**
- 일부 앱은 Amazon 승인이 필요할 수 있습니다
- 몇 시간 또는 며칠 후 다시 확인

**옵션 C: Amazon 지원팀 문의**
- Developer Support에 문의하여 IAM Role ARN 확인

**참고**: 
- IAM Role ARN은 앱이 활성화되면 자동으로 생성됩니다
- "Draft" 상태에서는 아직 생성되지 않았을 수 있습니다
- ARN 형식: `arn:aws:iam::[계정번호]:role/[역할이름]`

**참고**: 
- 앱 상태가 "Draft"인 경우, 앱을 활성화해야 할 수도 있습니다
- IAM Role ARN은 앱 생성 시 자동으로 생성되므로 별도 설정이 필요 없습니다

### Step 3: 앱 저장 및 활성화 (IAM Role ARN 생성)

1. Edit App 페이지에서:
   - **The Restricted Data Token (RDT)** 질문:
     - ✅ **"No, I will not delegate access to PII to another developer's application."** 선택
     - (대부분의 경우 "No" 선택)
   
   - **Roles** 선택 (필요한 권한 선택):
     - ✅ **Inventory and Order Tracking** (주문 데이터 가져오기)
     - ✅ **Finance and Accounting** (재무 데이터)
     - 필요에 따라 다른 권한도 선택
   
   - **OAuth Login URI** 입력 (Required):
     - ⚠️ **중요**: `localhost`는 허용되지 않습니다!
     - 실제 도메인이 필요합니다. 다음 중 하나를 사용:
       - **옵션 1**: 실제 도메인 사용 (예: `https://yourdomain.com/login`)
       - **옵션 2**: 임시 도메인 사용 (예: `https://example.com/login`)
         - 나중에 변경 가능하므로 일단 임시로 입력해도 됩니다
       - **옵션 3**: ngrok 같은 터널링 서비스 사용
         - 예: `https://abc123.ngrok.io/login`
   
   - **OAuth Redirect URI** 입력:
     - ⚠️ **중요**: `localhost`는 허용되지 않습니다!
     - 실제 도메인이 필요합니다. 다음 중 하나를 사용:
       - **옵션 1**: 실제 도메인 사용 (예: `https://yourdomain.com/callback`)
       - **옵션 2**: 임시 도메인 사용 (예: `https://example.com/callback`)
         - 나중에 변경 가능하므로 일단 임시로 입력해도 됩니다
       - **옵션 3**: ngrok 같은 터널링 서비스 사용
         - 예: `https://abc123.ngrok.io/callback`
   
   **참고**: 
   - OAuth Login URI와 Redirect URI는 같은 도메인을 사용하는 것이 좋습니다
   - 예: Login URI: `https://example.com/login`, Redirect URI: `https://example.com/callback`
   
   - **Save and exit** 클릭
2. 앱이 저장되면 IAM Role ARN이 자동 생성됩니다

**참고**: 
- OAuth Redirect URI는 나중에 수정 가능합니다
- 실제로 OAuth 리다이렉트를 사용하지 않는다면, 임시 도메인을 입력해도 됩니다
- Refresh Token 생성 시에는 이 URI가 사용됩니다

### Step 4: Refresh Token 생성

1. 앱 목록에서 **"View"** 버튼 클릭
2. **Authorize** 또는 **Generate refresh token** 버튼 클릭
3. 필요한 권한 선택 (Orders, Inventory 등)
4. **Generate** 클릭
5. 생성된 **Refresh Token** 복사

### Step 4: Supabase Secrets 설정

```
AMAZON_SP_API_CLIENT_ID=앱에서_확인한_Client_ID
AMAZON_SP_API_CLIENT_SECRET=앱에서_확인한_Client_Secret
AMAZON_SP_API_REFRESH_TOKEN=생성한_Refresh_Token
AMAZON_USE_IAM_ROLE=true
AMAZON_IAM_ROLE_ARN=앱에서_확인한_IAM_Role_ARN
```

**✅ 장점**: 
- AWS 콘솔 접속 불필요
- 여러 계정 관리 시 각 계정마다 앱 생성 가능
- IAM 역할이 자동으로 생성되어 관리가 쉬움

## 📋 방법 2: Seller Central에서 직접 IAM 사용자 확인

일부 계정에서는 다음 경로에서 IAM 사용자 정보를 확인할 수 있습니다:

### 경로 1: Settings → User Permissions

1. **Settings** → **User Permissions** 클릭
2. **IAM User Access** 섹션 확인
3. 기존 IAM 사용자가 있다면:
   - **View** 또는 **Show** 클릭하여 Access Key 확인
4. 없다면:
   - **Create IAM User** 클릭
   - 사용자 이름 입력
   - 생성된 Access Key 복사

### 경로 2: Reports → FBA

1. **Reports** → **Fulfillment by Amazon** 클릭
2. **IAM User Access** 섹션 확인
3. Access Key 확인 또는 생성

### 경로 3: Settings → Account Info

1. **Settings** → **Account Info** 클릭
2. **User Permissions** 섹션 확인
3. **IAM User Access** 확인

## 🔍 찾을 수 없는 경우

만약 위 경로에서도 찾을 수 없다면:

1. **계정 권한 확인**: 
   - 현재 사용자가 IAM 사용자를 생성할 권한이 있는지 확인
   - 관리자 권한이 필요할 수 있습니다

2. **계정 유형 확인**:
   - Professional Seller 계정인지 확인
   - 일부 계정 유형에서는 IAM 기능이 제한될 수 있습니다

3. **대안: SP-API 앱 사용**:
   - 위의 "방법 1: SP-API 앱 생성"을 사용하세요
   - 이 방법이 더 간단하고 여러 계정 관리에 적합합니다

## 💡 여러 브랜드 계정 관리 팁

### 각 브랜드마다 별도 앱 생성

1. 각 브랜드의 Seller Central 계정에 로그인
2. 각 계정마다 SP-API 앱 생성
3. 각 앱의 정보를 Supabase Secrets에 저장:
   ```
   # 브랜드 A
   AMAZON_SP_API_CLIENT_ID_BRAND_A=...
   AMAZON_SP_API_CLIENT_SECRET_BRAND_A=...
   AMAZON_SP_API_REFRESH_TOKEN_BRAND_A=...
   AMAZON_IAM_ROLE_ARN_BRAND_A=...
   
   # 브랜드 B
   AMAZON_SP_API_CLIENT_ID_BRAND_B=...
   ...
   ```

### 또는 Edge Function에 브랜드 선택 파라미터 추가

Edge Function을 수정하여 요청 시 브랜드를 선택할 수 있도록 할 수 있습니다.

## 📚 참고 자료

- [Amazon SP-API Developer Guide](https://developer-docs.amazon.com/sp-api/)
- [Creating and managing SP-API applications](https://developer-docs.amazon.com/sp-api/docs/registering-your-application)

