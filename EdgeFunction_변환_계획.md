# Edge Function → Next.js API Route 변환 계획

## 📋 작업 개요

`supabase/functions/fetch-amazon-orders/index.ts` (2280줄)를 
`app/api/fetch-amazon-orders/route.ts`로 변환

## 🔄 주요 변경사항

### 1. Import 문 변경
```typescript
// 변경 전
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// 변경 후
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/serverSupabaseClient';
```

### 2. 환경 변수 접근 변경
```typescript
// 변경 전
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const clientId = Deno.env.get("AMAZON_SP_API_CLIENT_ID");

// 변경 후
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const clientId = process.env.AMAZON_SP_API_CLIENT_ID;
```

### 3. Supabase 클라이언트 생성 변경
```typescript
// 변경 전
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 변경 후
const serverSupabase = getServerSupabase();
if (!serverSupabase) {
  return NextResponse.json(
    { error: 'Supabase client not configured' },
    { status: 500 }
  );
}
```

### 4. 메인 핸들러 변경
```typescript
// 변경 전
Deno.serve(async (req: Request) => {
  // CORS 헤더
  const corsHeaders = { ... };
  
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  
  try {
    const requestBody = await req.json();
    // ...
    return new Response(JSON.stringify({ ... }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ ... }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// 변경 후
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // ...
    return NextResponse.json({ ... }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// OPTIONS는 Next.js가 자동 처리 (또는 별도 함수로)
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
```

### 5. SP_API_BASE_URL 처리
```typescript
// 변경 전 (파일 상단)
const SP_API_BASE_URL = Deno.env.get("AMAZON_SP_API_BASE_URL") || 
  "https://sellingpartnerapi-na.amazon.com";

// 변경 후 (함수 내부에서 사용, 계정별로 다를 수 있으므로)
const defaultBaseUrl = process.env.AMAZON_SP_API_BASE_URL || 
  "https://sellingpartnerapi-na.amazon.com";
```

### 6. CORS 헤더 제거
Next.js는 자동으로 CORS를 처리하므로, 명시적인 CORS 헤더는 필요 없습니다.
필요한 경우 `next.config.ts`에서 설정하거나, API Route에서 헤더를 추가할 수 있습니다.

## 📝 변환 대상 파일

- **원본**: `supabase/functions/fetch-amazon-orders/index.ts`
- **대상**: `app/api/fetch-amazon-orders/route.ts`

## ✅ 유지할 내용

- 모든 헬퍼 함수 (fetchAmazonOrders, fetchOrderItems, fetchFeesEstimates, fetchFBAInventory, fetchOrderMetrics, fetchRefundsFromFinancialEvents 등)
- AWS Signature V4 관련 함수들
- 비즈니스 로직 전체
- 에러 처리 로직

## ⚠️ 주의사항

1. **파일 크기**: 2280줄의 큰 파일이므로 변환 시 주의 필요
2. **환경 변수명**: 
   - `SUPABASE_URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - 나머지는 동일
3. **타임아웃**: Railway에서는 타임아웃이 없으므로 `maxOrdersToProcess` 제한을 늘릴 수 있음

## 🚀 다음 단계

1. 실제 변환 작업 시작
2. 변환된 파일 생성
3. 프론트엔드 호출 변경
4. 테스트

