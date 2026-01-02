import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/serverSupabaseClient';

// Amazon SP-API 설정
const LWA_ENDPOINT = "https://api.amazon.com/auth/o2/token";
const SP_API_BASE_URL_DEFAULT = process.env.AMAZON_SP_API_BASE_URL || 
  "https://sellingpartnerapi-na.amazon.com";

// LWA Access Token 발급
async function getLwaAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> {
  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", refreshToken);
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);

  const response = await fetch(LWA_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LWA 토큰 발급 실패: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// 기간을 작은 단위로 나누기 (병렬 처리용)
function splitDateRange(
  startDate: string,
  endDate: string,
  daysPerChunk: number = 7
): Array<{ start: string; end: string }> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const ranges: Array<{ start: string; end: string }> = [];
  
  let currentStart = new Date(start);
  
  while (currentStart < end) {
    const currentEnd = new Date(currentStart);
    currentEnd.setDate(currentEnd.getDate() + daysPerChunk - 1);
    
    if (currentEnd > end) {
      currentEnd.setTime(end.getTime());
    }
    
    ranges.push({
      start: currentStart.toISOString(),
      end: currentEnd.toISOString(),
    });
    
    currentStart = new Date(currentEnd);
    currentStart.setDate(currentStart.getDate() + 1);
  }
  
  return ranges;
}

// SP-API 재무 이벤트 가져오기 (Refund 이벤트만 추출, 체크포인트 지원 버전)
async function fetchFinancialEventsSingleRange(
  accessToken: string,
  postedAfter: string, // ISO8601 형식 (예: 2025-11-01T00:00:00Z)
  postedBefore: string, // ISO8601 형식 (예: 2025-11-30T23:59:59Z)
  sku: string | undefined,
  maxPages: number = 50, // 작은 기간이므로 페이지 수 제한
  supabase?: any // Supabase 클라이언트 (체크포인트 저장용)
): Promise<number> {
  const endpoint = `${SP_API_BASE_URL_DEFAULT}/finances/v0/financialEvents`;
  const url = new URL(endpoint);
  
  // 날짜 검증: postedBefore가 현재 시간보다 최소 2분 이전이어야 함
  const now = new Date();
  const postedBeforeDate = new Date(postedBefore);
  const minTimeDiff = 2 * 60 * 1000; // 2분 (밀리초)
  
  let adjustedPostedBefore = postedBefore;
  if (postedBeforeDate.getTime() > now.getTime() - minTimeDiff) {
    // postedBefore가 현재 시간보다 2분 이내인 경우, 2분 전으로 조정
    const adjustedDate = new Date(now.getTime() - minTimeDiff);
    adjustedPostedBefore = adjustedDate.toISOString();
    console.log(`⚠️ postedBefore 조정: ${postedBeforeDate.toISOString()} → ${adjustedDate.toISOString()}`);
  }
  
  // 쿼리 파라미터 추가
  url.searchParams.append("PostedAfter", postedAfter);
  url.searchParams.append("PostedBefore", adjustedPostedBefore);
  
  const headers: Record<string, string> = {
    "x-amz-access-token": accessToken,
    "content-type": "application/json",
  };
  
  console.log(`💰 환불 이벤트 조회 중... (기간: ${postedAfter.substring(0, 10)} ~ ${adjustedPostedBefore.substring(0, 10)}, SKU: ${sku || '전체'})`);
  
  // 기존 진행 상황 확인 (재시작용)
  let totalRefunds = 0;
  let nextToken: string | undefined = undefined;
  let pageCount = 0;
  
  if (supabase) {
    try {
      // NULL 값 처리를 위해 쿼리 조건 수정
      let query = supabase
        .from("refund_fetch_progress")
        .select("*");
      
      if (sku) {
        query = query.eq("sku", sku);
      } else {
        query = query.is("sku", null);
      }
      
      const { data: progress, error: progressError } = await query
        .eq("posted_after", postedAfter)
        .eq("posted_before", adjustedPostedBefore)
        .single();
      
      if (progressError && progressError.code !== 'PGRST116') { // PGRST116 = not found
        console.warn(`⚠️ 진행 상황 조회 에러:`, progressError);
      }
      
      if (progress && progress.status === "IN_PROGRESS") {
        // 재시작: 마지막 진행 상황부터 이어서
        totalRefunds = parseFloat(progress.total_refunds || "0");
        nextToken = progress.last_next_token || undefined;
        pageCount = progress.last_page_count || 0;
        console.log(`🔄 재시작: 페이지 ${pageCount}부터 이어서 처리 (누적 환불: ${totalRefunds.toFixed(2)} USD, NextToken: ${nextToken ? '있음' : '없음'})`);
      } else if (!progress) {
        // 새로 시작: 진행 상황 레코드 생성
        const { error: insertError } = await supabase
          .from("refund_fetch_progress")
          .insert({
            sku: sku || null,
            posted_after: postedAfter,
            posted_before: adjustedPostedBefore,
            status: "IN_PROGRESS",
            total_refunds: 0,
            last_page_count: 0,
          });
        
        if (insertError) {
          console.warn(`⚠️ 진행 상황 레코드 생성 실패:`, insertError);
        } else {
          console.log(`📝 새 진행 상황 레코드 생성 완료`);
        }
      }
    } catch (error: any) {
      console.warn(`⚠️ 진행 상황 조회 실패, 새로 시작합니다:`, error.message);
    }
  }
  
  try {
    do {
      pageCount++;
      
      // NextToken이 있으면 추가
      if (nextToken) {
        url.searchParams.set("NextToken", nextToken);
      } else {
        // 첫 호출이면 파라미터 설정
        url.searchParams.set("PostedAfter", postedAfter);
        url.searchParams.set("PostedBefore", adjustedPostedBefore);
      }
      
      // Rate Limit을 고려한 재시도 로직
      let retryCount = 0;
      const maxRetries = 5;
      let response: Response | null = null;
      
      while (retryCount <= maxRetries) {
        // Rate Limit: 0.5 requests/second이므로 최소 2초 간격
        if (retryCount > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        response = await fetch(url.toString(), {
          method: "GET",
          headers: headers,
        });
        
        if (response.status === 429) {
          retryCount++;
          const retryAfter = response.headers.get("Retry-After");
          const waitTime = retryAfter 
            ? parseInt(retryAfter) * 1000 
            : Math.min(2000 * Math.pow(2, retryCount), 60000);
          
          console.warn(`Rate Limit 초과 (429). ${waitTime/1000}초 후 재시도... (${retryCount}/${maxRetries})`);
          
          if (retryCount > maxRetries) {
            console.error(`Rate Limit 초과: 최대 재시도 횟수 초과`);
            break;
          }
          
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`FinancialEvents API 호출 실패: ${response.status} - ${errorText}`);
          break;
        }
        
        // 성공적으로 응답 받음
        break;
      }
      
      if (!response || !response.ok) {
        console.warn(`⚠️ FinancialEvents API 호출 실패 (페이지 ${pageCount})`);
        break;
      }
      
      const data = await response.json();
      const financialEvents = data.payload?.FinancialEvents;
      
      if (!financialEvents) {
        console.warn(`⚠️ FinancialEvents 데이터가 없습니다 (페이지 ${pageCount})`);
        break;
      }
      
      // RefundEventList만 처리 (최적화: 다른 이벤트 타입은 무시)
      if (financialEvents.RefundEventList) {
        for (const refundEvent of financialEvents.RefundEventList) {
          if (refundEvent.ShipmentItemAdjustmentList) {
            for (const itemAdjustment of refundEvent.ShipmentItemAdjustmentList) {
              const sellerSku = itemAdjustment.SellerSKU;
              
              // SKU 필터링 (제공된 경우)
              if (sku && sellerSku !== sku) {
                continue;
              }
              
              // ItemChargeAdjustmentList에서 Principal만 추출
              if (itemAdjustment.ItemChargeAdjustmentList) {
                for (const chargeAdjustment of itemAdjustment.ItemChargeAdjustmentList) {
                  const chargeType = chargeAdjustment.ChargeType;
                  
                  // Principal만 환불 금액으로 계산
                  if (chargeType === "Principal") {
                    const amount = parseFloat(chargeAdjustment.ChargeAmount?.CurrencyAmount || "0");
                    totalRefunds += Math.abs(amount);
                  }
                }
              }
            }
          }
        }
      }
      
      // NextToken 확인
      nextToken = data.payload?.NextToken;
      
      // 진행 상황 저장 (매 3페이지마다 또는 첫 페이지) - 더 자주 저장하여 셧다운 대비
      const shouldSave = pageCount % 3 === 0 || pageCount === 1;
      if (shouldSave) {
        if (!supabase) {
          console.warn(`⚠️ Supabase 클라이언트가 없어서 진행 상황을 저장할 수 없습니다.`);
        } else {
          try {
            console.log(`💾 진행 상황 저장 시도: 페이지 ${pageCount}, 누적 환불 ${totalRefunds.toFixed(2)} USD`);
            
            // NULL 값 처리를 위해 쿼리 조건 수정
            const { data: upsertData, error: upsertError } = await supabase
              .from("refund_fetch_progress")
              .upsert({
                sku: sku || null,
                posted_after: postedAfter,
                posted_before: adjustedPostedBefore,
                last_next_token: nextToken || null,
                last_page_count: pageCount,
                total_refunds: totalRefunds,
                status: "IN_PROGRESS",
                updated_at: new Date().toISOString(),
              }, {
                onConflict: "sku,posted_after,posted_before",
              });
            
            if (upsertError) {
              console.error(`❌ 진행 상황 저장 실패:`, upsertError);
              console.error(`   - SKU: ${sku || 'null'}`);
              console.error(`   - PostedAfter: ${postedAfter}`);
              console.error(`   - PostedBefore: ${adjustedPostedBefore}`);
            } else {
              console.log(`✅ 진행 상황 저장 성공: 페이지 ${pageCount}, 누적 환불 ${totalRefunds.toFixed(2)} USD, NextToken: ${nextToken ? '있음' : '없음'}`);
            }
          } catch (error: any) {
            console.error(`❌ 진행 상황 저장 중 예외 발생:`, error.message);
            console.error(`   - 스택:`, error.stack);
          }
        }
      }
      
      if (pageCount % 10 === 0 || pageCount === 1) {
        console.log(`💰 환불 이벤트 조회 중... (페이지 ${pageCount}, 누적 환불: ${totalRefunds.toFixed(2)} USD)`);
      }
      
      // 타임아웃 방지를 위해 최대 페이지 수 제한
      if (pageCount >= maxPages) {
        console.warn(`⚠️ 최대 페이지 수(${maxPages})에 도달했습니다. 더 많은 데이터가 있을 수 있습니다.`);
        break;
      }
      
      // NextToken이 없으면 종료
      if (!nextToken) {
        break;
      }
      
      // Rate Limit을 고려한 지연 (0.5 requests/second)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } while (nextToken && pageCount < maxPages);
    
    console.log(`✅ 환불 이벤트 조회 완료: 총 환불 ${totalRefunds.toFixed(2)} USD (기간: ${postedAfter.substring(0, 10)} ~ ${adjustedPostedBefore.substring(0, 10)}, SKU: ${sku || '전체'}, ${pageCount}페이지)`);
    
    // 완료 상태로 업데이트
    if (supabase) {
      try {
        let updateQuery = supabase
          .from("refund_fetch_progress")
          .update({
            status: "COMPLETED",
            completed_at: new Date().toISOString(),
            last_next_token: null,
            total_refunds: totalRefunds,
            last_page_count: pageCount,
          });
        
        if (sku) {
          updateQuery = updateQuery.eq("sku", sku);
        } else {
          updateQuery = updateQuery.is("sku", null);
        }
        
        const { error: updateError } = await updateQuery
          .eq("posted_after", postedAfter)
          .eq("posted_before", adjustedPostedBefore);
        
        if (updateError) {
          console.warn(`⚠️ 완료 상태 업데이트 실패:`, updateError);
        } else {
          console.log(`✅ 완료 상태로 업데이트 완료`);
        }
      } catch (error: any) {
        console.warn(`⚠️ 완료 상태 업데이트 중 오류:`, error.message);
      }
    }
    
    return totalRefunds;
    
  } catch (error: any) {
    console.error(`환불 이벤트 조회 중 오류:`, error.message);
    
    // 에러 상태로 업데이트 (셧다운 시 재시작을 위해 IN_PROGRESS 유지)
    if (supabase) {
      try {
        let updateQuery = supabase
          .from("refund_fetch_progress")
          .update({
            // 셧다운은 에러가 아니므로 IN_PROGRESS 유지 (재시작 가능하도록)
            status: "IN_PROGRESS",
            error_message: error.message,
            total_refunds: totalRefunds,
            last_page_count: pageCount,
            last_next_token: nextToken || null,
          });
        
        if (sku) {
          updateQuery = updateQuery.eq("sku", sku);
        } else {
          updateQuery = updateQuery.is("sku", null);
        }
        
        const { error: updateError } = await updateQuery
          .eq("posted_after", postedAfter)
          .eq("posted_before", adjustedPostedBefore);
        
        if (updateError) {
          console.warn(`⚠️ 진행 상황 업데이트 실패:`, updateError);
        } else {
          console.log(`💾 셧다운 전 진행 상황 저장 완료: 페이지 ${pageCount}, 누적 환불 ${totalRefunds.toFixed(2)} USD`);
        }
      } catch (updateError: any) {
        console.warn(`⚠️ 진행 상황 업데이트 중 오류:`, updateError.message);
      }
    }
    
    throw error;
  }
}

// SP-API 재무 이벤트 가져오기 (순차 처리, 체크포인트 지원)
// 병렬 처리를 제거하고 순차적으로 처리하여 supabase 클라이언트 전달 문제 해결
async function fetchFinancialEvents(
  accessToken: string,
  postedAfter: string, // ISO8601 형식 (예: 2025-11-01T00:00:00Z)
  postedBefore: string, // ISO8601 형식 (예: 2025-11-30T23:59:59Z)
  sku: string | undefined,
  maxPages: number = 100,
  supabase?: any // Supabase 클라이언트 (체크포인트 저장용)
): Promise<any> {
  // 순차 처리: 전체 기간을 한 번에 처리
  console.log(`💰 환불 이벤트 조회 중... (기간: ${postedAfter.substring(0, 10)} ~ ${postedBefore.substring(0, 10)}, SKU: ${sku || '전체'})`);
  
  const totalRefunds = await fetchFinancialEventsSingleRange(
    accessToken,
    postedAfter,
    postedBefore,
    sku,
    maxPages,
    supabase
  );
  
  return {
    totalRefunds: totalRefunds,
    pageCount: 1,
    hasMore: false,
  };
}

// 메인 핸들러
export async function POST(request: NextRequest) {
  try {
    // 요청 본문 파싱
    const body = await request.json();
    let {
      postedAfter, // ISO8601 형식 (예: "2025-11-01T00:00:00Z")
      postedBefore, // ISO8601 형식 (예: "2025-11-30T23:59:59Z")
      sku, // 선택사항: 특정 SKU 필터링
      maxPages = 100, // 최대 페이지 수 (기본값: 100)
    } = body;

    // 필수 파라미터 검증
    if (!postedAfter || !postedBefore) {
      return NextResponse.json(
        {
          success: false,
          error: "postedAfter와 postedBefore는 필수입니다.",
        },
        { status: 400 }
      );
    }

    // Supabase 클라이언트 초기화
    const supabase = getServerSupabase();
    if (!supabase) {
      return NextResponse.json(
        {
          success: false,
          error: "Supabase 클라이언트 초기화 실패",
        },
        { status: 500 }
      );
    }

    // 환경 변수에서 SP-API 자격 증명 가져오기
    const clientId = process.env.AMAZON_SP_API_CLIENT_ID;
    const clientSecret = process.env.AMAZON_SP_API_CLIENT_SECRET;
    const refreshToken = process.env.AMAZON_SP_API_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      return NextResponse.json(
        {
          success: false,
          error: "SP-API 자격 증명이 설정되지 않았습니다.",
        },
        { status: 500 }
      );
    }

    // 1. LWA Access Token 발급
    console.log("LWA Access Token 발급 중...");
    const accessToken = await getLwaAccessToken(clientId, clientSecret, refreshToken);
    console.log("LWA Access Token 발급 완료");

    // 2. 날짜 검증 및 조정
    // SP-API는 postedBefore가 현재 시간보다 최소 2분 이전이어야 함
    const now = new Date();
    const postedBeforeDate = new Date(postedBefore);
    const minTimeDiff = 2 * 60 * 1000; // 2분 (밀리초)
    
    if (postedBeforeDate.getTime() > now.getTime() - minTimeDiff) {
      // postedBefore가 현재 시간보다 2분 이내인 경우, 2분 전으로 조정
      const adjustedDate = new Date(now.getTime() - minTimeDiff);
      postedBefore = adjustedDate.toISOString();
      console.log(`⚠️ postedBefore가 현재 시간보다 너무 가까워서 ${adjustedDate.toISOString()}로 조정했습니다.`);
    }

    // 3. 환불 정보 조회 (Financial Events API 사용)
    console.log("💰 Financial Events API를 사용하여 환불 정보 조회 중...");
    const result = await fetchFinancialEvents(
      accessToken,
      postedAfter,
      postedBefore,
      sku,
      maxPages,
      supabase // Supabase 클라이언트 전달 (체크포인트 저장용)
    );

    // 4. Supabase에 저장 (선택사항)
    // 환불 정보를 amazon_us_monthly_data 테이블에 업데이트
    if (sku && result.totalRefunds > 0) {
      // postedAfter에서 연도/월 추출
      const dateMatch = postedAfter.match(/^(\d{4})-(\d{2})/);
      if (dateMatch) {
        const year = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]);
        
        const { error: updateError } = await supabase
          .from("amazon_us_monthly_data")
          .upsert({
            sku: sku,
            year: year,
            month: month,
            refunds: result.totalRefunds,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "sku,year,month",
          });
        
        if (updateError) {
          console.error(`Supabase 업데이트 실패:`, updateError);
        } else {
          console.log(`✅ Supabase에 환불 정보 저장 완료: ${result.totalRefunds.toFixed(2)} USD`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalRefunds: result.totalRefunds,
        pageCount: result.pageCount,
        hasMore: result.hasMore,
        method: "Financial Events API (Refund 이벤트만 추출)",
      },
    }, { status: 200 });
  } catch (error: any) {
    console.error("에러:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
