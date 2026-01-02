# Edge Function 배포 가이드

## ⚠️ 현재 문제

Edge Function이 배포되지 않아서 UI에서 호출 시 에러가 발생합니다:
```
Failed to send a request to the Edge Function
```

## 🚀 해결 방법

### 방법 1: Supabase CLI로 배포 (권장)

1. **Supabase CLI 로그인**
   ```bash
   npx supabase login
   ```
   - 브라우저가 열리면 Supabase 계정으로 로그인
   - Access Token이 자동으로 저장됩니다

2. **Edge Function 배포**
   ```bash
   npx supabase functions deploy fetch-amazon-orders --project-ref yjxrrczopfpymwlbhzjy
   ```

3. **배포 확인**
   - Supabase Dashboard → Edge Functions에서 `fetch-amazon-orders` 함수가 보이는지 확인

### 방법 2: Supabase Dashboard에서 직접 배포

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard/project/yjxrrczopfpymwlbhzjy

2. **Edge Functions 메뉴로 이동**
   - 좌측 메뉴에서 "Edge Functions" 클릭

3. **함수 생성/업데이트**
   - "Create a new function" 또는 기존 함수 선택
   - 함수 이름: `fetch-amazon-orders`
   - 코드 복사:
     - `supabase/functions/fetch-amazon-orders/index.ts` 파일 내용을 복사하여 붙여넣기

4. **환경 변수 설정**
   - Edge Functions → Settings → Secrets
   - 다음 변수들을 추가:
     - `AMAZON_CLIENT_ID`
     - `AMAZON_CLIENT_SECRET`
     - `AMAZON_REFRESH_TOKEN`
     - `AMAZON_SP_API_BASE_URL` (선택사항)

5. **Deploy 클릭**

## ✅ 배포 확인

배포가 완료되면:
1. Supabase Dashboard → Edge Functions에서 함수 목록 확인
2. UI에서 다시 테스트:
   - "Amazon 주문 데이터 가져오기" 페이지
   - "FBA 재고 정보 가져오기" 체크
   - "주문 데이터 가져오기" 클릭

## 🔍 문제 해결

### 에러: "Access token not provided"
- **해결**: `npx supabase login` 실행

### 에러: "Function not found"
- **해결**: 함수 이름이 정확한지 확인 (`fetch-amazon-orders`)

### 에러: "Failed to send a request"
- **원인**: Edge Function이 배포되지 않았거나 환경 변수가 설정되지 않음
- **해결**: 
  1. Edge Function 배포 확인
  2. 환경 변수 설정 확인
  3. Supabase Dashboard → Edge Functions → Logs에서 에러 확인

## 📝 다음 단계

배포 완료 후:
1. UI에서 FBA 재고 API 테스트
2. Supabase Dashboard → Edge Functions → Logs에서 로그 확인
3. 재고 정보가 올바르게 가져와지는지 확인





