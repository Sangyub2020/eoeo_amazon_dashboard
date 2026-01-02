# Product Master 데이터 추가 가이드

## 🎯 가장 간편한 방법들 (순서대로)

### 1️⃣ Supabase 대시보드에서 직접 추가 (가장 간단) ⭐

**장점**: 별도 설정 없이 바로 사용 가능

**방법**:
1. [Supabase 대시보드](https://supabase.com) 접속
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **Table Editor** 클릭
4. `product_master` 테이블 선택
5. **Insert row** 버튼 클릭
6. 필수 필드 입력:
   - `internal_code`: 제품 코드 (예: PROD-001)
   - `product_name`: 제품명 (예: 비타민C 1000mg)
7. 선택 필드 입력:
   - `barcode`: 바코드
   - `company_name`: 회사명
   - `brand_name`: 브랜드명
8. **Save** 클릭

**단점**: 한 번에 하나씩만 추가 가능

---

### 2️⃣ 관리자 페이지 사용 (웹 인터페이스) ⭐⭐

**장점**: 
- 직관적인 웹 인터페이스
- 제품 목록도 함께 확인 가능
- 여러 제품을 빠르게 추가 가능

**방법**:
1. 브라우저에서 `http://localhost:3001/admin/product-master` 접속
2. 왼쪽 폼에 제품 정보 입력
3. **제품 추가** 버튼 클릭
4. 오른쪽에서 추가된 제품 목록 확인

**사용 예시**:
```
Internal Code: PROD-001
Barcode: 1234567890123
제품명: 비타민C 1000mg
회사명: 이공이공
브랜드명: 브랜드A
```

---

### 3️⃣ API 직접 호출 (curl 또는 Postman)

**장점**: 자동화 가능, 스크립트로 일괄 추가 가능

**방법**:
```bash
curl -X POST http://localhost:3001/api/product-master \
  -H "Content-Type: application/json" \
  -d '{
    "internal_code": "PROD-001",
    "barcode": "1234567890123",
    "product_name": "비타민C 1000mg",
    "company_name": "이공이공",
    "brand_name": "브랜드A"
  }'
```

**여러 개 일괄 추가**:
```bash
curl -X POST http://localhost:3001/api/product-master \
  -H "Content-Type: application/json" \
  -d '[
    {
      "internal_code": "PROD-001",
      "product_name": "비타민C 1000mg"
    },
    {
      "internal_code": "PROD-002",
      "product_name": "오메가3"
    }
  ]'
```

---

### 4️⃣ SQL 직접 실행 (Supabase SQL Editor)

**장점**: 빠른 일괄 추가, 복사/붙여넣기로 여러 개 추가 가능

**방법**:
1. Supabase 대시보드 → **SQL Editor**
2. 다음 SQL 실행:

```sql
-- 단일 제품 추가
INSERT INTO product_master (internal_code, barcode, product_name, company_name, brand_name)
VALUES ('PROD-001', '1234567890123', '비타민C 1000mg', '이공이공', '브랜드A');

-- 여러 제품 일괄 추가
INSERT INTO product_master (internal_code, product_name, company_name, brand_name) VALUES
  ('PROD-001', '비타민C 1000mg', '이공이공', '브랜드A'),
  ('PROD-002', '오메가3', '이공이공', '브랜드A'),
  ('PROD-003', '프로틴', '이공이공', '브랜드B');
```

---

## 📊 비교표

| 방법 | 난이도 | 속도 | 일괄 추가 | 추천 상황 |
|------|--------|------|-----------|----------|
| Supabase 대시보드 | ⭐ 매우 쉬움 | 느림 | ❌ | 가끔 추가할 때 |
| 관리자 페이지 | ⭐⭐ 쉬움 | 보통 | ✅ | 자주 추가할 때 |
| API 호출 | ⭐⭐⭐ 보통 | 빠름 | ✅ | 자동화/스크립트 |
| SQL 직접 실행 | ⭐⭐⭐⭐ 어려움 | 매우 빠름 | ✅ | 대량 일괄 추가 |

---

## 💡 추천

- **가끔 추가**: Supabase 대시보드 (방법 1)
- **자주 추가**: 관리자 페이지 (방법 2) ⭐ **가장 추천**
- **대량 일괄 추가**: SQL 직접 실행 (방법 4)

---

## 🔍 제품 조회

### 관리자 페이지에서
- `http://localhost:3001/admin/product-master` 접속하면 자동으로 목록 표시

### API로 조회
```bash
# 모든 제품 조회
curl http://localhost:3001/api/product-master

# 특정 제품 조회
curl http://localhost:3001/api/product-master?internal_code=PROD-001
```

---

## ⚠️ 주의사항

1. **Internal Code는 고유값**: 같은 Internal Code로 다시 추가하면 업데이트됩니다 (upsert)
2. **필수 필드**: `internal_code`, `product_name`은 반드시 입력해야 합니다
3. **Barcode**: 선택사항이지만, 있으면 나중에 검색이 편합니다

---

## 🚀 다음 단계

제품 마스터를 추가한 후, 각 채널별 SKU를 추가하세요:
- `/admin/sku-master` (만들 예정)
- 또는 `/api/sku-master` API 사용




