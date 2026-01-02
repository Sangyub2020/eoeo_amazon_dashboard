# Cursor 초기 프롬프트

다음 내용을 Cursor의 새 프로젝트에서 복사하여 사용하세요:

---

## 프로젝트 생성 프롬프트

Amazon 판매 대시보드 애플리케이션을 Railway 플랫폼에서 Next.js와 PostgreSQL로 구축해주세요.

### 프로젝트 목적

이공이공 온라인사업부의 Amazon 판매 데이터를 관리하는 대시보드입니다. 주요 기능은 다음과 같습니다:

1. **통합 대시보드**: 모든 마켓플레이스(Amazon US, TikTok Shop)의 월별 매출, 이익, 비용 현황
2. **마켓플레이스별 대시보드**: 각 채널별 상세 현황 (매출, 재고, 수수료, 마케팅 비용 등)
3. **SKU별 상세 데이터**: 월별, SKU별 매출과 비용 구조 분석
4. **Amazon SP-API 연동**: Amazon 주문 데이터, 재고 정보, 수수료 정보 자동 수집
5. **Google Sheets 동기화**: 외부 Google Sheets에서 데이터 동기화
6. **월별 데이터 생성**: 초기 월별 데이터 레코드 생성
7. **마스터 데이터 관리**: 제품 마스터, SKU 마스터, 계정 마스터 관리

### 기술 스택

- **프레임워크**: Next.js 16 (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS
- **차트**: Recharts
- **아이콘**: Lucide React
- **데이터베이스**: PostgreSQL (Railway)
- **배포 플랫폼**: Railway (앱 + DB 모두)
- **외부 API**: 
  - Amazon SP-API (주문, 재고, 수수료 조회)
  - Google Sheets API (데이터 동기화)

### 데이터베이스 구조

PostgreSQL 데이터베이스에 다음 테이블들을 생성해주세요:

#### 1. product_master (제품 마스터)
- `id` (UUID, Primary Key)
- `internal_code` (TEXT, UNIQUE) - 회사 내부 제품 코드
- `barcode` (TEXT, Optional)
- `product_name` (TEXT, NOT NULL)
- `company_name` (TEXT, Optional)
- `brand_name` (TEXT, Optional)
- `created_at`, `updated_at` (TIMESTAMP)

#### 2. sku_master (SKU 마스터)
- `id` (UUID, Primary Key)
- `sku` (TEXT, UNIQUE, NOT NULL) - 채널별 SKU
- `internal_code` (TEXT, Foreign Key → product_master.internal_code)
- `channel` (TEXT, CHECK: 'amazon_us' | 'tiktok_shop')
- `child_asin` (TEXT, Optional) - Amazon ASIN
- `product_name` (TEXT, Optional)
- `amazon_account_name` (TEXT, Optional) - Amazon 계정명
- `manager` (TEXT, Optional)
- `contract_type` (TEXT, Optional)
- `sales_price` (DECIMAL(12, 2), Optional)
- `supply_cost_won` (DECIMAL(12, 2), Optional)
- `transportation_mode` (TEXT, Optional)
- `is_brand_representative` (BOOLEAN, Default: false)
- `is_account_representative` (BOOLEAN, Default: false)
- `channel_specific_data` (JSONB, Optional)
- `created_at`, `updated_at` (TIMESTAMP)

#### 3. account_master (계정 마스터)
- `id` (UUID, Primary Key)
- `account_name` (TEXT, UNIQUE, NOT NULL) - 계정 이름
- `merchant_code` (TEXT, UNIQUE, NOT NULL) - Merchant Code
- `referral_fee_rate` (DECIMAL(5, 4), NOT NULL, Default: 0.15) - Referral 수수료율
- `sp_api_client_id` (TEXT, Optional) - Amazon SP-API Client ID
- `sp_api_client_secret` (TEXT, Optional) - Amazon SP-API Client Secret
- `sp_api_refresh_token` (TEXT, Optional) - Amazon SP-API Refresh Token
- `sp_api_base_url` (TEXT, Default: 'https://sellingpartnerapi-na.amazon.com')
- `created_at`, `updated_at` (TIMESTAMP)

#### 4. amazon_us_monthly_data (Amazon US 월별 데이터)
- `id` (UUID, Primary Key)
- `sku` (TEXT, Foreign Key → sku_master.sku, NOT NULL)
- `year` (INTEGER, NOT NULL)
- `month` (INTEGER, NOT NULL, CHECK: 1-12)
- `exchange_rate` (DECIMAL(10, 4), Optional) - 환율
- `fba_inventory` (INTEGER, Default: 0) - FBA 재고
- `inbound_working` (INTEGER, Default: 0)
- `inbound_shipped` (INTEGER, Default: 0)
- `inbound_receiving` (INTEGER, Default: 0)
- `reserved_orders` (INTEGER, Default: 0)
- `reserved_fc_transfer` (INTEGER, Default: 0)
- `reserved_fc_processing` (INTEGER, Default: 0)
- `fba_fee` (DECIMAL(12, 2), Default: 0) - FBA 수수료
- `referral_fee` (DECIMAL(12, 2), Default: 0) - Referral 수수료
- `transportation_fee` (DECIMAL(12, 2), Default: 0)
- `tariff_rate` (DECIMAL(5, 4), Optional) - 관세율
- `tariff_per_unit` (DECIMAL(12, 2), Optional) - 개당 관세
- `margin` (DECIMAL(12, 2), Optional) - 마진
- `total_order_quantity` (INTEGER, Default: 0) - 총 주문 수량
- `gross_sales` (DECIMAL(12, 2), Default: 0) - 총 매출
- `refunds` (DECIMAL(12, 2), Default: 0) - 환불 금액
- `cpc_cost` (DECIMAL(12, 2), Default: 0) - CPC 비용
- `cpc_sales` (DECIMAL(12, 2), Default: 0) - CPC 매출
- `self_dsp_cost` (DECIMAL(12, 2), Default: 0) - 자체 DSP 비용
- `support_dsp_cost` (DECIMAL(12, 2), Default: 0) - 지원 DSP 비용
- `self_dsp_sales` (DECIMAL(12, 2), Default: 0)
- `support_dsp_sales` (DECIMAL(12, 2), Default: 0)
- `monthly_storage_fee` (DECIMAL(12, 2), Default: 0) - 월별 보관비
- `fba_inventory_disposals` (DECIMAL(12, 2), Default: 0) - FBA 재고 폐기 비용
- `fba_inventory_removals` (DECIMAL(12, 2), Default: 0) - FBA 재고 제거 비용
- `monthly_subscription_fee` (DECIMAL(12, 2), Default: 0) - 월별 구독료
- `paid_services_fee` (DECIMAL(12, 2), Default: 0) - 유료 서비스 비용
- `profit_1` ~ `profit_14_final` (DECIMAL(12, 2), Optional) - 단계별 이익 계산
- `cost_1` ~ `cost_13` (DECIMAL(12, 2), Optional) - 단계별 비용
- `cost_1_ratio` ~ `cost_13_ratio` (DECIMAL(5, 2), Optional) - 비용 비율
- `support_amount_ratio` (DECIMAL(5, 2), Optional) - 지원금 비율
- `daily_sales` (JSONB, Optional) - 일별 판매량 (JSON 형식)
- `created_at`, `updated_at` (TIMESTAMP)
- UNIQUE CONSTRAINT: (sku, year, month)

#### 5. tiktok_shop_monthly_data (TikTok Shop 월별 데이터)
- `id` (UUID, Primary Key)
- `sku` (TEXT, Foreign Key → sku_master.sku, NOT NULL)
- `year` (INTEGER, NOT NULL)
- `month` (INTEGER, NOT NULL, CHECK: 1-12)
- `exchange_rate` (DECIMAL(10, 4), Optional)
- `total_order_quantity` (INTEGER, Default: 0)
- `gross_sales` (DECIMAL(12, 2), Default: 0)
- `refunds` (DECIMAL(12, 2), Default: 0)
- `supply_cost_usd` (DECIMAL(12, 2), Optional)
- `margin` (DECIMAL(12, 2), Optional)
- `margin_percentage` (DECIMAL(5, 2), Optional)
- `created_at`, `updated_at` (TIMESTAMP)
- UNIQUE CONSTRAINT: (sku, year, month)

#### 뷰 (Views)
- `monthly_summary_by_channel`: 채널별 월별 집계 뷰
- `sku_summary_view`: SKU별 집계 뷰

#### 인덱스
- 모든 Foreign Key에 인덱스 생성
- `(year, month)`, `(sku, year, month)` 조합에 인덱스 생성

#### RLS (Row Level Security)
- 모든 테이블에 RLS 활성화
- 공개 읽기 정책 (SELECT: USING (true))
- 공개 쓰기 정책 (INSERT, UPDATE, DELETE: WITH CHECK (true))

### 주요 기능 요구사항

#### 1. 대시보드 페이지
- **통합 대시보드** (`/dashboard`): 모든 채널의 월별 매출/이익 현황
- **Amazon US 대시보드** (`/dashboard/amazon-us`): Amazon US 상세 현황
- **TikTok Shop 대시보드** (`/dashboard/tiktok-shop`): TikTok Shop 상세 현황

#### 2. 관리 페이지
- **제품 마스터 관리** (`/admin/product-master`): 제품 정보 CRUD, 일괄 추가 (CSV 텍스트 붙여넣기)
- **SKU 마스터 관리** (`/admin/sku-master`): SKU 정보 CRUD, 일괄 추가 (탭 구분 텍스트 붙여넣기)
- **계정 마스터 관리** (`/admin/account-master`): Amazon 계정 정보 및 API 자격 증명 관리

#### 3. API 엔드포인트
- `POST /api/sync`: Google Sheets 데이터 동기화
- `POST /api/monthly-data/create`: 월별 데이터 초기 생성
- `POST /api/fetch-amazon-orders`: Amazon SP-API를 통한 주문 데이터 수집 (타임아웃 없이 실행 가능해야 함)
- `GET/POST /api/product-master`: 제품 마스터 CRUD
- `GET/POST /api/sku-master`: SKU 마스터 CRUD
- `GET/POST /api/account-master`: 계정 마스터 CRUD

#### 4. Amazon SP-API 연동
- Amazon SP-API를 사용하여 다음 데이터 수집:
  - 주문 데이터 (Orders API)
  - 재고 정보 (FBA Inventory API)
  - 수수료 예상치 (Fees Estimates API)
  - 환불 정보 (Financial Events API)
  - 주문 메트릭스 (Order Metrics API)
- 여러 Amazon 계정 지원 (account_master 테이블의 API 자격 증명 사용)
- Rate Limit 처리 및 재시도 로직 포함

#### 5. 데이터 처리
- 중복 데이터 처리: `internal_code` (제품 마스터), `sku` (SKU 마스터) 기준으로 중복 시 스킵
- 자동 제품 마스터 생성: SKU 마스터 추가 시 `internal_code`가 없으면 자동 생성
- 월별 데이터 중복 체크: `(sku, year, month)` 조합으로 중복 방지

### 배포 환경

- **플랫폼**: Railway
- **앱 서비스**: Next.js 애플리케이션
- **데이터베이스**: Railway PostgreSQL
- **환경 변수**: Railway Dashboard에서 관리
- **중요**: 타임아웃 제한 없이 장시간 실행 가능해야 함 (Amazon SP-API 호출이 오래 걸릴 수 있음)

### 환경 변수

다음 환경 변수들이 필요합니다:

```
# Database (Railway PostgreSQL)
DATABASE_URL=postgresql://...

# Amazon SP-API (기본값, 계정별로는 account_master에 저장)
AMAZON_SP_API_CLIENT_ID=...
AMAZON_SP_API_CLIENT_SECRET=...
AMAZON_SP_API_REFRESH_TOKEN=...
AMAZON_SP_API_BASE_URL=https://sellingpartnerapi-na.amazon.com

# Google Sheets
GOOGLE_SHEETS_CLIENT_EMAIL=...
GOOGLE_SHEETS_PRIVATE_KEY=...
GOOGLE_SHEETS_IDS=...
GOOGLE_SHEETS_EXCLUDE_TABS=... (선택사항)
```

### 프로젝트 구조

```
amazon-sales-dashboard/
├── app/
│   ├── api/
│   │   ├── sync/              # Google Sheets 동기화
│   │   ├── monthly-data/       # 월별 데이터 생성
│   │   ├── fetch-amazon-orders/ # Amazon SP-API 연동
│   │   ├── product-master/     # 제품 마스터 API
│   │   ├── sku-master/         # SKU 마스터 API
│   │   └── account-master/    # 계정 마스터 API
│   ├── dashboard/              # 대시보드 페이지
│   │   ├── page.tsx            # 통합 대시보드
│   │   ├── amazon-us/         # Amazon US 대시보드
│   │   └── tiktok-shop/       # TikTok Shop 대시보드
│   ├── admin/                  # 관리 페이지
│   │   ├── product-master/    # 제품 마스터 관리
│   │   ├── sku-master/        # SKU 마스터 관리
│   │   └── account-master/    # 계정 마스터 관리
│   └── layout.tsx
├── components/
│   ├── dashboard-sidebar.tsx   # 사이드바
│   ├── monthly-chart.tsx       # 월별 차트
│   ├── sku-table.tsx           # SKU 테이블
│   ├── stats-card.tsx          # 통계 카드
│   └── ui/                     # UI 컴포넌트
├── lib/
│   ├── db.ts                   # PostgreSQL 클라이언트 (Railway)
│   ├── types.ts                # TypeScript 타입 정의
│   ├── googleSheets.ts         # Google Sheets API
│   └── amazon-sp-api.ts       # Amazon SP-API 유틸리티
├── migrations/                 # 데이터베이스 마이그레이션
│   └── 001_initial_schema.sql
└── package.json
```

### 추가 요구사항

1. **타임아웃 없음**: Railway에서 실행되므로 타임아웃 제한 없이 장시간 실행 가능
2. **에러 처리**: 모든 API 호출에 적절한 에러 처리 및 로깅
3. **타입 안정성**: TypeScript를 사용하여 타입 안정성 보장
4. **반응형 디자인**: Tailwind CSS를 사용한 모던하고 반응형 UI
5. **데이터 검증**: 입력 데이터에 대한 적절한 검증 로직

### 시작하기

1. Next.js 16 프로젝트 생성 (TypeScript, Tailwind CSS 포함)
2. PostgreSQL 클라이언트 라이브러리 설치 (예: `pg` 또는 `@vercel/postgres`)
3. 데이터베이스 마이그레이션 파일 생성 및 실행
4. 기본 레이아웃 및 페이지 구조 생성
5. API 엔드포인트 구현
6. 컴포넌트 구현

이 구조로 프로젝트를 시작해주세요.

