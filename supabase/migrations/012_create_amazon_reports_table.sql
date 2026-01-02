-- Amazon Reports 정보 저장 테이블
-- Reports API로 생성한 리포트의 상태와 정보를 저장

CREATE TABLE IF NOT EXISTS amazon_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id TEXT NOT NULL UNIQUE, -- SP-API 리포트 ID
  report_type TEXT NOT NULL, -- 리포트 타입 (예: GET_FLAT_FILE_RETURNS_DATA_BY_RETURN_DATE)
  marketplace_ids TEXT[] NOT NULL, -- 마켓플레이스 ID 배열
  data_start_time TIMESTAMP WITH TIME ZONE, -- 리포트 데이터 시작 시간
  data_end_time TIMESTAMP WITH TIME ZONE, -- 리포트 데이터 종료 시간
  processing_status TEXT DEFAULT 'IN_QUEUE', -- 리포트 처리 상태 (IN_QUEUE, IN_PROGRESS, DONE, FATAL, CANCELLED)
  report_document_id TEXT, -- 리포트 문서 ID (다운로드용)
  report_document_url TEXT, -- 리포트 문서 URL
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE, -- 리포트 완료 시간
  error_message TEXT, -- 에러 메시지 (있는 경우)
  
  -- 인덱스
  CONSTRAINT valid_status CHECK (processing_status IN ('IN_QUEUE', 'IN_PROGRESS', 'DONE', 'FATAL', 'CANCELLED'))
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_amazon_reports_status ON amazon_reports(processing_status);
CREATE INDEX IF NOT EXISTS idx_amazon_reports_created_at ON amazon_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_amazon_reports_report_type ON amazon_reports(report_type);

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_amazon_reports_updated_at
  BEFORE UPDATE ON amazon_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 활성화
ALTER TABLE amazon_reports ENABLE ROW LEVEL SECURITY;

-- 정책 생성 (모든 사용자가 읽기 가능, 서버만 쓰기 가능)
CREATE POLICY "Allow public read access" ON amazon_reports
  FOR SELECT
  USING (true);

COMMENT ON TABLE amazon_reports IS 'Amazon SP-API Reports 정보 저장 테이블';
COMMENT ON COLUMN amazon_reports.report_id IS 'SP-API 리포트 ID (고유값)';
COMMENT ON COLUMN amazon_reports.processing_status IS '리포트 처리 상태: IN_QUEUE(대기중), IN_PROGRESS(처리중), DONE(완료), FATAL(실패), CANCELLED(취소됨)';





