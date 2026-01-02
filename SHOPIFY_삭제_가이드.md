# Shopify 관련 데이터베이스 삭제 가이드

## 📋 삭제 대상

1. ✅ `shopify_monthly_data` 테이블
2. ✅ 뷰에서 Shopify 관련 부분 제거
   - `monthly_summary_by_channel` 뷰 재생성
   - `sku_summary_view` 뷰 재생성
3. ✅ 제약조건 수정
   - `sku_master.channel` 체크 제약조건 (shopify 제거)
   - `sales_data.marketplace` 체크 제약조건 (shopify 제거)

## 🚀 실행 방법

### 방법 1: Supabase Dashboard에서 실행 (권장)

1. Supabase Dashboard 접속
2. SQL Editor로 이동
3. `supabase/migrations/006_remove_shopify.sql` 파일 내용 복사
4. SQL Editor에 붙여넣기
5. **Run** 버튼 클릭

### 방법 2: Supabase CLI 사용

```bash
# 마이그레이션 적용
supabase db push

# 또는 특정 마이그레이션만 실행
supabase migration up 006_remove_shopify
```

## ⚠️ 주의사항

### 데이터 삭제 옵션

마이그레이션 파일에는 다음 두 가지가 **주석 처리**되어 있습니다:

```sql
-- 6. Shopify 채널의 SKU 마스터 데이터 삭제 (선택사항)
-- DELETE FROM sku_master WHERE channel = 'shopify';

-- 7. Shopify 채널의 sales_data 삭제 (선택사항)
-- DELETE FROM sales_data WHERE marketplace = 'shopify';
```

**Shopify 관련 데이터도 삭제하려면:**
1. 마이그레이션 파일에서 주석 제거
2. 다시 실행

**데이터를 보존하려면:**
- 주석 그대로 두고 실행 (테이블과 뷰만 삭제/수정됨)

## ✅ 실행 후 확인

### 1. 테이블 삭제 확인

```sql
-- 이 쿼리가 에러를 반환하면 테이블이 삭제된 것입니다
SELECT * FROM shopify_monthly_data LIMIT 1;
```

### 2. 뷰 확인

```sql
-- Shopify가 포함되지 않았는지 확인
SELECT DISTINCT channel FROM monthly_summary_by_channel;
-- 결과: amazon_us, tiktok_shop만 있어야 함
```

### 3. 제약조건 확인

```sql
-- sku_master의 channel 제약조건 확인
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'sku_master_channel_check';
-- 결과: channel IN ('amazon_us', 'tiktok_shop')
```

## 🔄 롤백 방법

만약 실수로 실행했다면:

```sql
-- 1. 테이블 재생성 (필요한 경우)
-- supabase/migrations/004_separate_monthly_data_by_channel.sql의 
-- shopify_monthly_data 테이블 생성 부분 복사하여 실행

-- 2. 뷰 재생성
-- supabase/migrations/004_separate_monthly_data_by_channel.sql의 
-- 뷰 생성 부분 복사하여 실행

-- 3. 제약조건 복원
ALTER TABLE sku_master DROP CONSTRAINT IF EXISTS sku_master_channel_check;
ALTER TABLE sku_master ADD CONSTRAINT sku_master_channel_check 
  CHECK (channel IN ('amazon_us', 'tiktok_shop', 'shopify'));
```

## 📝 완료 체크리스트

- [ ] 마이그레이션 파일 실행 완료
- [ ] `shopify_monthly_data` 테이블 삭제 확인
- [ ] 뷰에서 Shopify 제거 확인
- [ ] 제약조건 수정 확인
- [ ] (선택) Shopify 데이터 삭제 여부 결정





