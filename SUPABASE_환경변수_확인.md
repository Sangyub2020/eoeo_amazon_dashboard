# Supabase 환경 변수 확인 및 수정 가이드

## 🔍 현재 문제

Supabase MCP를 통한 직접 접근은 성공하지만, 클라이언트를 통한 접근에서 Cloudflare 500 에러가 발생합니다.

이는 **환경 변수에 설정된 Supabase URL이나 키가 잘못되었을 가능성**이 높습니다.

## ✅ 올바른 Supabase 정보

프로젝트: **Marketing Dashaboard** (ID: `yjxrrczopfpymwlbhzjy`)

### 올바른 Supabase URL
```
https://yjxrrczopfpymwlbhzjy.supabase.co
```

### 올바른 Anon Key (참고용)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqeHJyY3pvcGZweW13bGJoemp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MDI3NDksImV4cCI6MjA4MDQ3ODc0OX0.SM-UY8W9YmIyF324bzPPoWZyD6t0pujbbC0WC27L6Qw
```

## 🔧 .env.local 파일 수정 방법

1. 프로젝트 루트의 `.env.local` 파일 열기
2. 다음 값들을 확인하고 수정:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://yjxrrczopfpymwlbhzjy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqeHJyY3pvcGZweW13bGJoemp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MDI3NDksImV4cCI6MjA4MDQ3ODc0OX0.SM-UY8W9YmIyF324bzPPoWZyD6t0pujbbC0WC27L6Qw
SUPABASE_SERVICE_ROLE_KEY=여기에_Service_Role_Key_입력
```

## 🔑 Service Role Key 가져오기

1. [Supabase 대시보드](https://supabase.com) 접속
2. 프로젝트 선택: **Marketing Dashaboard**
3. 왼쪽 메뉴 → **Settings** (톱니바퀴 아이콘)
4. **API** 메뉴 클릭
5. **Project API keys** 섹션에서
   - **service_role secret** 키 복사
   - ⚠️ **주의**: 이 키는 절대 공개하지 마세요!

## ✅ 수정 후 확인

1. `.env.local` 파일 저장
2. **개발 서버 재시작** (중요!)
   - 터미널에서 `Ctrl + C`로 중지
   - `npm run dev` 다시 실행
3. 테스트 API 확인:
   ```
   http://localhost:3001/api/test-supabase
   ```

이 API에서 `connected: true`가 나오면 정상입니다!

## 🚨 주의사항

- Service Role Key는 **절대 공개하지 마세요**
- 환경 변수 변경 후 **반드시 서버 재시작** 필요
- URL 끝에 슬래시(`/`)가 있으면 제거하세요












