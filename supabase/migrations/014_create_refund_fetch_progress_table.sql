-- 환불 정보 조회 진행 상황 저장 테이블
-- 셧다운 시 재시작을 위한 체크포인트 저장

CREATE TABLE IF NOT EXISTS refund_fetch_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT, -- SKU (NULL이면 전체)
  posted_after TIMESTAMP WITH TIME ZONE NOT NULL, -- 조회 시작일
  posted_before TIMESTAMP WITH TIME ZONE NOT NULL, -- 조회 종료일
  last_next_token TEXT, -- 마지막 처리한 NextToken (재시작용)
  last_page_count INTEGER DEFAULT 0, -- 마지막 처리한 페이지 수
  total_refunds DECIMAL(12, 2) DEFAULT 0, -- 현재까지 누적 환불 금액
  status TEXT DEFAULT 'IN_PROGRESS', -- 상태: IN_PROGRESS, COMPLETED, FAILED
  error_message TEXT, -- 에러 메시지 (있는 경우)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE, -- 완료 시간
  
  -- 고유 제약: 같은 기간, 같은 SKU는 하나의 진행 상황만
  CONSTRAINT unique_progress UNIQUE (sku, posted_after, posted_before)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_refund_fetch_progress_status ON refund_fetch_progress(status);
CREATE INDEX IF NOT EXISTS idx_refund_fetch_progress_sku ON refund_fetch_progress(sku);
CREATE INDEX IF NOT EXISTS idx_refund_fetch_progress_created_at ON refund_fetch_progress(created_at);

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_refund_fetch_progress_updated_at
  BEFORE UPDATE ON refund_fetch_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 활성화
ALTER TABLE refund_fetch_progress ENABLE ROW LEVEL SECURITY;

-- 정책 생성 (모든 사용자가 읽기 가능, 서버만 쓰기 가능)
CREATE POLICY "Allow public read access" ON refund_fetch_progress
  FOR SELECT
  USING (true);

COMMENT ON TABLE refund_fetch_progress IS '환불 정보 조회 진행 상황 저장 (재시작용 체크포인트)';
COMMENT ON COLUMN refund_fetch_progress.last_next_token IS '마지막 처리한 NextToken (재시작 시 이 토큰부터 계속)';
COMMENT ON COLUMN refund_fetch_progress.total_refunds IS '현재까지 누적 환불 금액';





