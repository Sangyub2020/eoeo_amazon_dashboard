# Railway 마이그레이션 계획

## 🎯 목표

현재 구조를 최대한 유지하면서 타임아웃 문제만 해결:
- **Supabase**: DB로만 사용 (변경 없음)
- **Railway**: Edge Function 대신 API 실행 (타임아웃 없음)

---

## 📋 현재 구조

```
[Vercel]
  └─ Next.js 앱 (프론트엔드 + API Routes)
      ↓
[Supabase]
  ├─ PostgreSQL DB ✅
  └─ Edge Functions ❌ (타임아웃 60초)
```

---

## 🚀 변경 후 구조 (2가지 옵션)

### 옵션 1: Railway에 전체 앱 배포 (권장)

```
[Railway]
  └─ Next.js 앱 (전체)
      ├─ 프론트엔드 ✅
      ├─ 기존 API Routes ✅
      └─ 새로운 API Route (Edge Function → 변환) ✅
      ↓
[Supabase]
  └─ PostgreSQL DB ✅
```

**장점:**
- ✅ 하나의 플랫폼에서 모든 것 관리
- ✅ 타임아웃 없음
- ✅ 배포 단순화
- ✅ 환경 변수 관리 단순화

**단점:**
- ❌ Vercel에서 Railway로 완전 이전 필요
- ❌ 배포 URL 변경

---

### 옵션 2: Railway에 API 서버만 별도 배포

```
[Vercel]
  └─ Next.js 앱 (프론트엔드 + 기존 API)
      ↓
[Railway]
  └─ Next.js API 서버 (Edge Function 대체)
      ↓
[Supabase]
  └─ PostgreSQL DB ✅
```

**장점:**
- ✅ Vercel 유지 가능 (프론트엔드)
- ✅ 최소한의 변경

**단점:**
- ❌ 두 플랫폼 관리 (복잡)
- ❌ CORS 설정 필요
- ❌ 환경 변수 중복 관리

---

## 💡 추천: 옵션 1 (Railway에 전체 앱 배포)

현재 상황에서는 옵션 1을 권장합니다:
1. 타임아웃 문제 해결
2. 배포 단순화
3. 하나의 플랫폼에서 모든 것 관리

---

## 📝 작업 단계

### 1단계: Edge Function → Next.js API Route 변환

**대상 파일:**
- `supabase/functions/fetch-amazon-orders/index.ts`
  → `app/api/fetch-amazon-orders/route.ts`

**변경 사항:**
- `Deno.serve()` → Next.js API Route 핸들러
- `Deno.env.get()` → `process.env`
- `createClient()` (Supabase) → `getServerSupabase()` 사용
- CORS 헤더는 Next.js가 자동 처리

### 2단계: 프론트엔드 호출 변경

**대상 파일:**
- `components/amazon-orders-fetcher.tsx`

**변경 사항:**
```typescript
// 변경 전
const { data, error } = await supabase.functions.invoke('fetch-amazon-orders', { body: ... });

// 변경 후
const response = await fetch('/api/fetch-amazon-orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ... })
});
const data = await response.json();
```

### 3단계: Railway 배포 설정

1. **Railway 프로젝트 생성**
   - Railway Dashboard에서 새 프로젝트 생성
   - GitHub 저장소 연결

2. **환경 변수 설정**
   - `DATABASE_URL`: Supabase PostgreSQL 연결 문자열
   - `NEXT_PUBLIC_SUPABASE_URL`: Supabase URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Role Key
   - `AMAZON_SP_API_CLIENT_ID`: Amazon SP-API 자격 증명
   - `AMAZON_SP_API_CLIENT_SECRET`
   - `AMAZON_SP_API_REFRESH_TOKEN`
   - `AMAZON_SP_API_BASE_URL`
   - `GOOGLE_SHEETS_CLIENT_EMAIL`
   - `GOOGLE_SHEETS_PRIVATE_KEY`
   - `GOOGLE_SHEETS_IDS`

3. **배포 확인**
   - Railway가 자동으로 빌드 및 배포
   - 제공된 URL로 접속 확인

### 4단계: Vercel에서 제거 (선택사항)

- Railway 배포가 안정화되면 Vercel 배포 제거
- 또는 Vercel을 백업/스테이징 환경으로 유지

---

## 🔧 필요한 코드 변경

### 1. Edge Function → API Route 변환

Edge Function의 주요 특징:
- `Deno.serve(async (req: Request) => { ... })`
- `Deno.env.get()`
- `createClient(supabaseUrl, serviceRoleKey)`

Next.js API Route로 변환:
```typescript
// app/api/fetch-amazon-orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/serverSupabaseClient';

export async function POST(request: NextRequest) {
  try {
    const serverSupabase = getServerSupabase();
    if (!serverSupabase) {
      return NextResponse.json(
        { error: 'Supabase client not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    // Edge Function 로직 그대로 사용
    // ...
    
    return NextResponse.json({ success: true, ... });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### 2. 프론트엔드 호출 변경

```typescript
// components/amazon-orders-fetcher.tsx
const handleFetchOrders = async () => {
  setIsLoading(true);
  setError(null);
  
  try {
    const response = await fetch('/api/fetch-amazon-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...requestParams,
        sku: targetSku || undefined,
        year: targetYear || undefined,
        month: targetMonth || undefined,
        saveToDatabase: saveToDatabase,
        fetchInventory: fetchInventory,
        fetchOrderList: fetchOrderList,
        maxPages: 1000,
        maxOrdersToProcess: 100, // 타임아웃 없으므로 더 많이 처리 가능
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || '주문 데이터를 가져오는데 실패했습니다.');
    }

    setOrders(data.orders || []);
    setResponseData(data);
    setSuccess(true);
  } catch (err: any) {
    setError(err.message);
    setSuccess(false);
  } finally {
    setIsLoading(false);
  }
};
```

---

## ✅ 체크리스트

- [ ] Edge Function 코드를 Next.js API Route로 변환
- [ ] 프론트엔드에서 Edge Function 호출 → API Route 호출로 변경
- [ ] Railway 프로젝트 생성 및 GitHub 연결
- [ ] Railway 환경 변수 설정
- [ ] Railway 배포 테스트
- [ ] 타임아웃 문제 해결 확인
- [ ] Vercel 배포 제거 (선택사항)

---

## 📌 주의사항

1. **Supabase 연결**: Railway에서 Supabase DB에 접근하려면 `DATABASE_URL` 또는 Supabase 연결 정보가 필요합니다.
   - 옵션 1: Supabase의 직접 PostgreSQL 연결 문자열 사용
   - 옵션 2: Supabase JS 클라이언트 사용 (현재 방식 유지)

2. **환경 변수**: Railway Dashboard에서 모든 환경 변수 설정 필요

3. **타임아웃**: Railway는 타임아웃 제한이 없으므로 `maxOrdersToProcess`를 크게 설정 가능

4. **배포 URL**: Railway 배포 후 새로운 URL이 제공됩니다. 필요시 커스텀 도메인 설정 가능

---

## 🚀 다음 단계

1. 옵션 선택 (옵션 1 권장)
2. Edge Function → API Route 변환 시작
3. Railway 배포 설정

