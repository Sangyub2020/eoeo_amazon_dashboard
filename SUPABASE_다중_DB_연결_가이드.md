# Supabase 다중 DB 연결 가이드

이 프로젝트는 여러 개의 Supabase 데이터베이스를 동시에 연결하여 사용할 수 있습니다.

## 환경 변수 설정

### 기본 DB (Primary)
기존 설정과 동일합니다:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 두 번째 DB (Secondary)
두 번째 DB를 사용하려면 다음 환경 변수를 추가하세요:
```env
NEXT_PUBLIC_SUPABASE_URL_2=your_second_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY_2=your_second_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY_2=your_second_supabase_service_role_key
```

## 사용 방법

### 1. 서버 사이드에서 사용 (API Routes, Server Components)

#### 기본 DB 사용
```typescript
import { getServerSupabase } from '@/lib/multiSupabaseClient';

// 기본 DB (primary)
const supabase = getServerSupabase(); // 또는 getServerSupabase('primary')
const { data, error } = await supabase.from('table_name').select('*');
```

#### 두 번째 DB 사용
```typescript
import { getServerSupabase } from '@/lib/multiSupabaseClient';

// 두 번째 DB
const supabase = getServerSupabase('secondary');
const { data, error } = await supabase.from('table_name').select('*');
```

### 2. 클라이언트 사이드에서 사용 (Client Components)

#### 기본 DB 사용
```typescript
'use client';
import { getSupabase } from '@/lib/multiSupabaseClient';

const supabase = getSupabase(); // 또는 getSupabase('primary')
const { data, error } = await supabase.from('table_name').select('*');
```

#### 두 번째 DB 사용
```typescript
'use client';
import { getSupabase } from '@/lib/multiSupabaseClient';

const supabase = getSupabase('secondary');
const { data, error } = await supabase.from('table_name').select('*');
```

### 3. 동시에 여러 DB 사용

```typescript
import { getServerSupabase } from '@/lib/multiSupabaseClient';

// 기본 DB에서 데이터 가져오기
const primarySupabase = getServerSupabase('primary');
const { data: primaryData } = await primarySupabase
  .from('products')
  .select('*');

// 두 번째 DB에서 데이터 가져오기
const secondarySupabase = getServerSupabase('secondary');
const { data: secondaryData } = await secondarySupabase
  .from('orders')
  .select('*');

// 두 데이터를 결합하여 사용
const combinedData = { products: primaryData, orders: secondaryData };
```

### 4. 커스텀 URL과 키로 연결

환경 변수에 없는 DB를 동적으로 연결하려면:

```typescript
import { createCustomSupabaseClient } from '@/lib/multiSupabaseClient';

const customSupabase = createCustomSupabaseClient(
  'https://your-project.supabase.co',
  'your-anon-key-or-service-role-key'
);

const { data, error } = await customSupabase.from('table_name').select('*');
```

## 실제 사용 예시

### API Route에서 두 DB 동시 사용

```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/multiSupabaseClient';

export async function GET(request: NextRequest) {
  try {
    // 기본 DB에서 제품 정보 가져오기
    const primarySupabase = getServerSupabase('primary');
    const { data: products, error: productsError } = await primarySupabase
      .from('product_master')
      .select('*');

    if (productsError) {
      throw productsError;
    }

    // 두 번째 DB에서 주문 정보 가져오기
    const secondarySupabase = getServerSupabase('secondary');
    const { data: orders, error: ordersError } = await secondarySupabase
      .from('orders')
      .select('*');

    if (ordersError) {
      throw ordersError;
    }

    return NextResponse.json({
      products,
      orders,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### Server Component에서 사용

```typescript
// app/dashboard/page.tsx
import { getServerSupabase } from '@/lib/multiSupabaseClient';

export default async function DashboardPage() {
  // 기본 DB
  const primarySupabase = getServerSupabase('primary');
  const { data: primaryData } = await primarySupabase
    .from('monthly_data')
    .select('*');

  // 두 번째 DB
  const secondarySupabase = getServerSupabase('secondary');
  const { data: secondaryData } = await secondarySupabase
    .from('service_revenue')
    .select('*');

  return (
    <div>
      {/* 데이터 표시 */}
    </div>
  );
}
```

## 기존 코드와의 호환성

기존 코드는 그대로 작동합니다. `getServerSupabase()`를 호출하면 기본적으로 'primary' DB에 연결됩니다.

### 기존 코드 (변경 불필요)
```typescript
import { getServerSupabase } from '@/lib/serverSupabaseClient';
const supabase = getServerSupabase(); // 기본 DB 사용
```

### 새로운 코드 (다중 DB 지원)
```typescript
import { getServerSupabase } from '@/lib/multiSupabaseClient';
const supabase = getServerSupabase('primary'); // 명시적으로 지정 가능
const supabase2 = getServerSupabase('secondary'); // 두 번째 DB 사용
```

## 주의사항

1. **환경 변수 설정**: 각 DB마다 별도의 URL과 키를 설정해야 합니다.
2. **RLS 정책**: 각 DB는 독립적인 Row Level Security 정책을 가집니다.
3. **마이그레이션**: 각 DB는 독립적인 마이그레이션을 관리합니다.
4. **에러 처리**: DB 연결 실패 시 `null`을 반환하므로 항상 null 체크를 해야 합니다.

## 마이그레이션 가이드

기존 코드를 다중 DB를 사용하도록 변경하려면:

1. `lib/serverSupabaseClient.ts` 대신 `lib/multiSupabaseClient.ts`를 import
2. 필요시 DB 이름을 명시적으로 지정 (`'primary'` 또는 `'secondary'`)

```typescript
// 변경 전
import { getServerSupabase } from '@/lib/serverSupabaseClient';
const supabase = getServerSupabase();

// 변경 후 (기본 DB 사용 - 동일하게 작동)
import { getServerSupabase } from '@/lib/multiSupabaseClient';
const supabase = getServerSupabase('primary');
```

