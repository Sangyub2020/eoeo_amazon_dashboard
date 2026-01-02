# 이공이공 온라인사업부 대시보드

이공이공 온라인사업부의 모든 매출과 손익 및 비용, 디테일한 SKU별 현황을 볼 수 있는 대시보드입니다.

## 📋 프로젝트 개요

구글 시트 API를 통해 외부 시트로부터 데이터를 동기화하여 다음 정보를 제공합니다:

- **통합 대시보드**: 모든 마켓플레이스의 월별 매출과 이익 현황
- **마켓플레이스별 대시보드**: Amazon US, TikTok Shop, Shopify 각각의 상세 현황
- **SKU별 상세 데이터**: 월별, SKU별 매출과 비용 구조

## 🚀 시작하기

### 1. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google Sheets 설정
GOOGLE_SHEETS_CLIENT_EMAIL=your_google_service_account_email
GOOGLE_SHEETS_PRIVATE_KEY=your_google_service_account_private_key

# Google Sheets ID 목록 (쉼표로 구분)
GOOGLE_SHEETS_IDS=sheet_id_1,sheet_id_2,sheet_id_3

# 각 시트의 시트 이름 (쉼표로 구분, 순서는 GOOGLE_SHEETS_IDS와 동일)
GOOGLE_SHEETS_NAMES=Sheet1,Sheet2,Sheet3
```

### 2. 필요한 정보 수집

프로젝트를 시작하기 전에 다음 정보를 준비해야 합니다:

#### Supabase 정보
- Supabase 프로젝트 URL
- Supabase Anon Key
- Supabase Service Role Key (서버 사이드용)

#### Google Sheets 정보
- 구글 시트 ID 목록 (여러 개 가능)
- 각 시트의 시트 이름 (Tab 이름)
- Google Service Account 이메일
- Google Service Account Private Key

#### 아마존 데이터 구조 정보
- 구글 시트에 어떤 컬럼들이 있는지
- 매출 데이터는 어떤 형식인지
- 이익 데이터는 어떤 형식인지
- 날짜 형식은 어떤지
- 통화는 어떤 것들이 있는지

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3001](http://localhost:3001)을 열어 확인하세요.

## 📦 설치된 패키지

- **Next.js 16** - React 프레임워크
- **TypeScript** - 타입 안정성
- **Tailwind CSS** - 스타일링
- **Supabase** - 백엔드 및 인증
- **Google APIs** - 구글 시트 연동
- **Recharts** - 차트 라이브러리
- **Lucide React** - 아이콘
- **date-fns** - 날짜 처리

## 📁 프로젝트 구조

```
amazon-sales-dashboard/
├── app/
│   ├── api/
│   │   └── sync/          # 구글 시트 동기화 API
│   ├── dashboard/         # 대시보드 페이지들
│   │   ├── layout.tsx     # 대시보드 레이아웃 (사이드바 포함)
│   │   ├── page.tsx       # Home (통합 대시보드)
│   │   ├── amazon-us/     # Amazon US 페이지
│   │   ├── tiktok-shop/   # TikTok Shop 페이지
│   │   └── shopify/       # Shopify 페이지
│   ├── layout.tsx         # 루트 레이아웃
│   ├── page.tsx           # 홈 (대시보드로 리다이렉트)
│   └── globals.css        # 전역 스타일
├── components/
│   ├── dashboard-sidebar.tsx  # 사이드바 네비게이션
│   ├── monthly-chart.tsx      # 월별 차트 컴포넌트
│   ├── sku-table.tsx          # SKU별 데이터 테이블
│   ├── stats-card.tsx         # 통계 카드 컴포넌트
│   └── ui/                    # UI 컴포넌트들
├── lib/
│   ├── supabaseClient.ts      # Supabase 클라이언트
│   ├── serverSupabaseClient.ts # 서버용 Supabase 클라이언트
│   ├── googleSheets.ts        # 구글 시트 API 연동
│   ├── api.ts                 # 데이터 조회 API
│   └── types.ts               # TypeScript 타입 정의
├── supabase/
│   └── migrations/            # 데이터베이스 마이그레이션
└── package.json
```

## 🗄️ 데이터베이스 설정

### Supabase 마이그레이션 실행

1. Supabase 프로젝트에 접속
2. SQL Editor에서 `supabase/migrations/001_initial_schema.sql` 파일의 내용을 실행
3. 또는 Supabase CLI를 사용하여 마이그레이션 실행

### 데이터 동기화

대시보드 상단의 "구글 시트 동기화" 버튼을 클릭하거나, API 엔드포인트를 직접 호출:

```bash
curl -X POST http://localhost:3001/api/sync
```

## ✨ 주요 기능

- ✅ **통합 대시보드**: 모든 마켓플레이스의 통합 월별 매출/이익 현황
- ✅ **마켓플레이스별 대시보드**: Amazon US, TikTok Shop, Shopify 각각의 상세 현황
- ✅ **월별 차트**: 매출, 비용, 이익 추이를 시각화
- ✅ **SKU별 상세 데이터**: 월별, SKU별 매출과 비용 구조 테이블
- ✅ **구글 시트 동기화**: 원클릭으로 최신 데이터 동기화

## 📝 스크립트

- `npm run dev` - 개발 서버 실행
- `npm run build` - 프로덕션 빌드
- `npm run start` - 프로덕션 서버 실행
- `npm run lint` - ESLint 실행

## 📄 라이선스

ISC

