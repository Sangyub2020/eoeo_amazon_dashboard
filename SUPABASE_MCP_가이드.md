# Supabase MCP 사용 가이드

## ✅ 현재 상태

Supabase MCP가 이미 설정되어 있어서 제가 직접 Supabase에 접근할 수 있습니다!

현재 확인된 프로젝트:
1. **EOEO SNS project Dashboard** (ID: `fmoohqclwalldjjdderg`)
2. **Marketing Dashaboard** (ID: `yjxrrczopfpymwlbhzjy`)

## 🎯 사용 가능한 작업

제가 다음 작업들을 직접 수행할 수 있습니다:

### 1. 프로젝트 관리
- ✅ 프로젝트 목록 조회
- ✅ 새 프로젝트 생성
- ✅ 프로젝트 정보 조회
- ✅ 프로젝트 일시 중지/복원

### 2. 데이터베이스 작업
- ✅ 테이블 목록 조회
- ✅ 마이그레이션 실행 (DDL 작업)
- ✅ SQL 쿼리 실행 (데이터 조회/수정)
- ✅ 확장 프로그램 목록 조회

### 3. 마이그레이션 관리
- ✅ 마이그레이션 목록 조회
- ✅ 마이그레이션 적용

### 4. 로그 및 모니터링
- ✅ 프로젝트 로그 조회
- ✅ 보안/성능 어드바이저 확인

### 5. Edge Functions
- ✅ Edge Function 목록 조회
- ✅ Edge Function 배포

## 📝 다음 단계

어떤 프로젝트에 마이그레이션을 적용할지 알려주세요:

1. **기존 프로젝트 사용**: 프로젝트 ID를 알려주시면 해당 프로젝트에 마이그레이션을 적용합니다.
2. **새 프로젝트 생성**: 프로젝트 이름과 리전을 알려주시면 새 프로젝트를 만들고 마이그레이션을 적용합니다.

예시:
- "Marketing Dashaboard 프로젝트 사용해줘"
- "새 프로젝트 만들어줘, 이름은 'Amazon Sales Dashboard', 리전은 ap-south-1"

## 🔧 마이그레이션 파일

다음 마이그레이션 파일이 준비되어 있습니다:
- `supabase/migrations/002_comprehensive_schema.sql` - 새로운 상세한 스키마

이 파일을 Supabase에 적용하면 모든 테이블과 뷰가 생성됩니다.












