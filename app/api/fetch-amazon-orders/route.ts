import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/serverSupabaseClient';

// Amazon SP-API 설정
const LWA_ENDPOINT = "https://api.amazon.com/auth/o2/token";
const SP_API_BASE_URL_DEFAULT = process.env.AMAZON_SP_API_BASE_URL || 
  "https://sellingpartnerapi-na.amazon.com";

// IAM 역할 사용 여부 (SP-API 앱을 만들면 자동 생성되는 역할 사용)
const USE_IAM_ROLE = process.env.AMAZON_USE_IAM_ROLE === "true";
const IAM_ROLE_ARN = process.env.AMAZON_IAM_ROLE_ARN;

// AWS Signature V4 헬퍼 함수
function sha256(data: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
}

async function hmacSha256(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const keyBuffer = key instanceof ArrayBuffer ? new Uint8Array(key).buffer : (key.buffer instanceof ArrayBuffer ? key.buffer : new Uint8Array(key).buffer);
  const importedKey = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign(
    { name: "HMAC", hash: "SHA-256" },
    importedKey,
    new TextEncoder().encode(data)
  );
}

async function arrayBufferToHex(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  return btoa(String.fromCharCode(...bytes));
}

// AWS Signature V4 생성
async function createAwsSignatureV4(
  method: string,
  url: string,
  headers: Record<string, string>,
  payload: string,
  accessKey: string,
  secretKey: string,
  region: string = "us-east-1",
  service: string = "execute-api"
): Promise<Record<string, string>> {
  const urlObj = new URL(url);
  const host = urlObj.hostname;
  const path = urlObj.pathname + urlObj.search;

  // 타임스탬프
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, "");
  const dateStamp = amzDate.substring(0, 8);

  // 정규화된 헤더
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((key) => `${key.toLowerCase()}:${headers[key].trim()}\n`)
    .join("");

  const signedHeaders = Object.keys(headers)
    .sort()
    .map((key) => key.toLowerCase())
    .join(";");

  // 페이로드 해시
  const payloadHash = await arrayBufferToHex(await sha256(payload || ""));

  // Canonical Request
  const canonicalRequest = [
    method,
    path,
    urlObj.search,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  // String to Sign
  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalRequestHash = await arrayBufferToHex(await sha256(canonicalRequest));
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    canonicalRequestHash,
  ].join("\n");

  // 서명 계산
  const kDate = await hmacSha256(
    new TextEncoder().encode(`AWS4${secretKey}`),
    dateStamp
  );
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, "aws4_request");
  const signature = await arrayBufferToHex(await hmacSha256(kSigning, stringToSign));

  // Authorization 헤더
  const authorization = `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    ...headers,
    "x-amz-date": amzDate,
    "Authorization": authorization,
  };
}

// LWA Access Token 발급
async function getLwaAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(LWA_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LWA Token 발급 실패: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// SP-API 주문 데이터 가져오기 (페이지네이션 지원)
// 참고: 2023년 10월 2일부터 SP-API는 AWS IAM과 AWS Signature Version 4를 더 이상 요구하지 않습니다
async function fetchAmazonOrders(
  accessToken: string,
  awsAccessKey?: string,
  awsSecretKey?: string,
  marketplaceIds?: string[],
  createdAfter?: string,
  createdBefore?: string,
  maxResultsPerPage: number = 100,
  nextToken?: string
): Promise<any> {
  const endpoint = `${SP_API_BASE_URL_DEFAULT}/orders/v0/orders`;
  const url = new URL(endpoint);

  // 쿼리 파라미터 추가
  if (marketplaceIds && marketplaceIds.length > 0) {
    marketplaceIds.forEach((id) => url.searchParams.append("MarketplaceIds", id));
  }
  if (createdAfter) {
    url.searchParams.append("CreatedAfter", createdAfter);
  }
  if (createdBefore) {
    url.searchParams.append("CreatedBefore", createdBefore);
  }
  if (maxResultsPerPage) {
    url.searchParams.append("MaxResultsPerPage", maxResultsPerPage.toString());
  }
  if (nextToken) {
    url.searchParams.append("NextToken", nextToken);
  }

  // 기본 헤더 (AWS Signature V4 불필요)
  const headers: Record<string, string> = {
    "x-amz-access-token": accessToken,
    "content-type": "application/json",
  };

  // AWS Signature V4는 더 이상 필요하지 않지만, 호환성을 위해 옵션으로 유지
  // awsAccessKey와 awsSecretKey가 제공되면 Signature V4 사용
  let finalHeaders = headers;
  if (awsAccessKey && awsSecretKey) {
    try {
      // AWS Signature V4 적용 (선택사항)
      finalHeaders = await createAwsSignatureV4(
        "GET",
        url.toString(),
        headers,
        "",
        awsAccessKey,
        awsSecretKey
      );
    } catch (error) {
      console.warn("AWS Signature V4 실패, 기본 헤더 사용:", error);
      // Signature V4 실패 시 기본 헤더 사용
    }
  }

  console.log(`Orders API 호출: ${url.toString()}`);

  // Rate Limit을 고려한 재시도 로직
  let retryCount = 0;
  const maxRetries = 5;
  let lastError: any = null;

  while (retryCount <= maxRetries) {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: finalHeaders,
    });

    // Rate Limit 헤더 확인
    const rateLimit = response.headers.get("x-amzn-RateLimit-Limit");
    if (rateLimit) {
      console.log(`Rate Limit: ${rateLimit} requests/second`);
    }

    if (response.status === 429) {
      // QuotaExceeded 에러 - 지연 후 재시도
      retryCount++;
      const retryAfter = response.headers.get("Retry-After");
      const waitTime = retryAfter 
        ? parseInt(retryAfter) * 1000 
        : Math.min(1000 * Math.pow(2, retryCount), 60000); // Exponential backoff, 최대 60초
      
      console.warn(`Rate Limit 초과 (429). ${waitTime/1000}초 후 재시도... (${retryCount}/${maxRetries})`);
      
      if (retryCount > maxRetries) {
        const errorText = await response.text();
        throw new Error(`SP-API Rate Limit 초과: 최대 재시도 횟수 초과. ${errorText}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      continue;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SP-API 호출 실패: ${response.status} - ${errorText}`);
      throw new Error(`SP-API 호출 실패: ${response.status} - ${errorText}`);
    }

    // 성공적으로 응답 받음
    const data = await response.json();
    console.log(`Orders API 응답:`, {
      hasPayload: !!data.payload,
      ordersCount: data.payload?.Orders?.length || 0,
      responseKeys: Object.keys(data),
    });
    
    return data;
  }
  
  // 이 코드는 실행되지 않아야 하지만, TypeScript를 위해 추가
  throw new Error("Unexpected: while loop exited without returning");
}

// SP-API 주문 상세 정보 가져오기 (OrderItems 포함)
async function fetchOrderItems(
  accessToken: string,
  orderId: string
): Promise<any> {
  const endpoint = `${SP_API_BASE_URL_DEFAULT}/orders/v0/orders/${orderId}/orderItems`;
  const url = new URL(endpoint);

  const headers: Record<string, string> = {
    "x-amz-access-token": accessToken,
    "content-type": "application/json",
  };

  console.log(`OrderItems API 호출: ${url.toString()}`);

  // Rate Limit을 고려한 재시도 로직
  let retryCount = 0;
  const maxRetries = 5;

  while (retryCount <= maxRetries) {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: headers,
    });

    if (response.status === 429) {
      // QuotaExceeded 에러 - 지연 후 재시도
      retryCount++;
      const retryAfter = response.headers.get("Retry-After");
      const waitTime = retryAfter 
        ? parseInt(retryAfter) * 1000 
        : Math.min(1000 * Math.pow(2, retryCount), 60000); // Exponential backoff, 최대 60초
      
      console.warn(`OrderItems API Rate Limit 초과 (429). ${waitTime/1000}초 후 재시도... (${retryCount}/${maxRetries})`);
      
      if (retryCount > maxRetries) {
        const errorText = await response.text();
        console.error(`주문 ${orderId}의 OrderItems 가져오기 실패: Rate Limit 초과. ${errorText}`);
        return null;
      }
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      continue;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`주문 ${orderId}의 OrderItems 가져오기 실패: ${response.status} - ${errorText}`);
      return null;
    }

    // 성공적으로 응답 받음
    const data = await response.json();
    console.log(`OrderItems API 응답 구조 (주문 ${orderId}):`, JSON.stringify(data, null, 2).substring(0, 500));
    
    return data;
  }
  
  // 이 코드는 실행되지 않아야 하지만, TypeScript를 위해 추가
  return null;
}

// SP-API 주문 메트릭스 가져오기 (집계된 매출 데이터)
// 이 API는 주문 목록을 가져오지 않고도 집계된 매출 데이터를 반환합니다
async function fetchOrderMetrics(
  accessToken: string,
  marketplaceIds: string[],
  interval: string, // ISO8601 형식: "2018-09-01T00:00:00-07:00--2018-09-04T00:00:00-07:00"
  granularity: string = "Month", // Hour, Day, Week, Month, Year, Total
  sku?: string,
  granularityTimeZone?: string,
  baseUrl?: string // 계정별 Base URL (선택사항)
): Promise<any> {
  const apiBaseUrl = baseUrl || SP_API_BASE_URL_DEFAULT;
  const endpoint = `${apiBaseUrl}/sales/v1/orderMetrics`;
  const url = new URL(endpoint);

  // 필수 파라미터
  if (marketplaceIds && marketplaceIds.length > 0) {
    marketplaceIds.forEach((id) => url.searchParams.append("marketplaceIds", id));
  }
  url.searchParams.append("interval", interval);
  url.searchParams.append("granularity", granularity);
  
  // 선택 파라미터
  if (sku) {
    url.searchParams.append("sku", sku);
  }
  if (granularityTimeZone) {
    url.searchParams.append("granularityTimeZone", granularityTimeZone);
  }

  const headers: Record<string, string> = {
    "x-amz-access-token": accessToken,
    "accept": "application/json",
  };

  console.log(`OrderMetrics API 호출: ${url.toString()}`);

  // Rate Limit을 고려한 재시도 로직
  let retryCount = 0;
  const maxRetries = 5;

  while (retryCount <= maxRetries) {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: headers,
    });

    if (response.status === 429) {
      retryCount++;
      const retryAfter = response.headers.get("Retry-After");
      const waitTime = retryAfter 
        ? parseInt(retryAfter) * 1000 
        : Math.min(1000 * Math.pow(2, retryCount), 60000);
      
      console.warn(`OrderMetrics API Rate Limit 초과 (429). ${waitTime/1000}초 후 재시도... (${retryCount}/${maxRetries})`);
      
      if (retryCount > maxRetries) {
        const errorText = await response.text();
        throw new Error(`OrderMetrics API Rate Limit 초과: 최대 재시도 횟수 초과. ${errorText}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      continue;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OrderMetrics API 호출 실패: ${response.status} - ${errorText}`);
      throw new Error(`OrderMetrics API 호출 실패: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`OrderMetrics API 응답 (전체):`, JSON.stringify(data, null, 2));
    console.log(`OrderMetrics API 응답 요약:`, {
      hasPayload: !!data.payload,
      metricsCount: data.payload?.length || 0,
      firstMetric: data.payload?.[0] ? {
        interval: data.payload[0].interval,
        unitCount: data.payload[0].unitCount,
        orderItemCount: data.payload[0].orderItemCount,
        orderCount: data.payload[0].orderCount,
        averageUnitPrice: data.payload[0].averageUnitPrice,
        totalSales: data.payload[0].totalSales,
      } : null,
    });
    
    return data;
  }
  
  throw new Error("Unexpected: while loop exited without returning");
}

// SP-API 리포트 생성 (createReport)
async function createReport(
  accessToken: string,
  reportType: string,
  marketplaceIds: string[],
  dataStartTime?: string, // ISO8601 형식
  dataEndTime?: string // ISO8601 형식
): Promise<string | null> {
  const endpoint = `${SP_API_BASE_URL_DEFAULT}/reports/2021-06-30/reports`;
  
  const requestBody: any = {
    reportType: reportType,
    marketplaceIds: marketplaceIds,
  };
  
  if (dataStartTime) {
    requestBody.dataStartTime = dataStartTime;
  }
  if (dataEndTime) {
    requestBody.dataEndTime = dataEndTime;
  }
  
  const headers: Record<string, string> = {
    "x-amz-access-token": accessToken,
    "content-type": "application/json",
  };
  
  console.log(`📊 리포트 생성 요청: ${reportType} (기간: ${dataStartTime} ~ ${dataEndTime})`);
  
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`리포트 생성 실패: ${response.status} - ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    const reportId = data.reportId;
    console.log(`✅ 리포트 생성 성공: reportId=${reportId}`);
    return reportId;
  } catch (error: any) {
    console.error(`리포트 생성 중 오류:`, error.message);
    return null;
  }
}

// SP-API 리포트 상태 조회 (getReport)
async function getReport(
  accessToken: string,
  reportId: string
): Promise<any> {
  const endpoint = `${SP_API_BASE_URL_DEFAULT}/reports/2021-06-30/reports/${reportId}`;
  
  const headers: Record<string, string> = {
    "x-amz-access-token": accessToken,
    "content-type": "application/json",
  };
  
  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: headers,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`리포트 상태 조회 실패: ${response.status} - ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error(`리포트 상태 조회 중 오류:`, error.message);
    return null;
  }
}

// SP-API 리포트 문서 다운로드 (getReportDocument)
async function getReportDocument(
  accessToken: string,
  reportDocumentId: string
): Promise<string | null> {
  const endpoint = `${SP_API_BASE_URL_DEFAULT}/reports/2021-06-30/documents/${reportDocumentId}`;
  
  const headers: Record<string, string> = {
    "x-amz-access-token": accessToken,
    "content-type": "application/json",
  };
  
  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: headers,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`리포트 문서 다운로드 실패: ${response.status} - ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    // 리포트 문서는 암호화되어 있을 수 있으므로, url을 통해 다운로드해야 합니다
    const documentUrl = data.url;
    
    if (!documentUrl) {
      console.error(`리포트 문서 URL이 없습니다`);
      return null;
    }
    
    // 리포트 문서 다운로드 (공개 URL이므로 인증 불필요)
    const documentResponse = await fetch(documentUrl);
    if (!documentResponse.ok) {
      console.error(`리포트 문서 다운로드 실패: ${documentResponse.status}`);
      return null;
    }
    
    const documentText = await documentResponse.text();
    return documentText;
  } catch (error: any) {
    console.error(`리포트 문서 다운로드 중 오류:`, error.message);
    return null;
  }
}

// SP-API 환불 정보 가져오기 (Finances API - listFinancialEvents 사용)
// listFinancialEvents API를 사용하여 환불 정보를 즉시 조회합니다
// 참고: https://developer-docs.amazon.com/sp-api/reference/listfinancialevents
async function fetchRefundsFromFinancialEvents(
  accessToken: string,
  postedAfter: string, // ISO8601 형식 (예: 2025-11-01T00:00:00Z)
  postedBefore: string, // ISO8601 형식 (예: 2025-11-30T23:59:59Z)
  sku?: string
): Promise<number> {
  const endpoint = `${SP_API_BASE_URL_DEFAULT}/finances/v0/financialEvents`;
  const url = new URL(endpoint);
  
  // 쿼리 파라미터 추가
  url.searchParams.append("PostedAfter", postedAfter);
  url.searchParams.append("PostedBefore", postedBefore);
  
  const headers: Record<string, string> = {
    "x-amz-access-token": accessToken,
    "content-type": "application/json",
  };
  
  console.log(`💰 환불 정보 조회 중... (기간: ${postedAfter} ~ ${postedBefore}, SKU: ${sku || '전체'})`);
  
  let totalRefunds = 0;
  let nextToken: string | undefined = undefined;
  let pageCount = 0;
  const maxPages = 10; // 최대 10페이지 (약 20초, 타임아웃 방지)
  
  try {
    do {
      pageCount++;
      
      // NextToken이 있으면 추가
      if (nextToken) {
        url.searchParams.set("NextToken", nextToken);
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
      
      // RefundEventList 파싱
      const financialEvents = data.payload?.FinancialEvents;
      if (financialEvents && financialEvents.RefundEventList) {
        const refundEventList = financialEvents.RefundEventList;
        
        for (const refundEvent of refundEventList) {
          // ShipmentItemAdjustmentList에서 SKU별 환불 금액 추출
          if (refundEvent.ShipmentItemAdjustmentList) {
            for (const itemAdjustment of refundEvent.ShipmentItemAdjustmentList) {
              const sellerSku = itemAdjustment.SellerSKU;
              
              // SKU 필터링 (제공된 경우)
              if (sku && sellerSku !== sku) {
                continue;
              }
              
              // ItemChargeAdjustmentList에서 환불 금액 추출
              if (itemAdjustment.ItemChargeAdjustmentList) {
                for (const chargeAdjustment of itemAdjustment.ItemChargeAdjustmentList) {
                  // ChargeType이 "Principal"인 경우만 환불 금액으로 계산
                  // (Tax, Shipping 등은 제외)
                  if (chargeAdjustment.ChargeType === "Principal" && chargeAdjustment.ChargeAmount) {
                    const refundAmount = parseFloat(chargeAdjustment.ChargeAmount.CurrencyAmount || "0");
                    totalRefunds += Math.abs(refundAmount); // 환불은 음수일 수 있으므로 절댓값 사용
                  }
                }
              }
            }
          }
        }
      }
      
      // NextToken 확인
      nextToken = data.payload?.NextToken;
      
      if (pageCount % 10 === 0 || pageCount === 1) {
        console.log(`💰 환불 정보 조회 중... (페이지 ${pageCount}, 누적 환불: ${totalRefunds} USD)`);
      }
      
      // 타임아웃 방지를 위해 최대 페이지 수 제한
      if (pageCount >= maxPages) {
        console.warn(`⚠️ 최대 페이지 수(${maxPages})에 도달했습니다. 더 많은 환불 데이터가 있을 수 있습니다.`);
        console.warn(`⚠️ 현재까지 조회된 환불 금액: ${totalRefunds} USD`);
        console.warn(`⚠️ 전체 환불 정보를 조회하려면 별도의 Edge Function 호출이 필요합니다.`);
        break;
      }
      
      // NextToken이 없으면 종료
      if (!nextToken) {
        break;
      }
      
      // Rate Limit을 고려한 지연 (0.5 requests/second)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } while (nextToken && pageCount < maxPages);
    
    console.log(`✅ 환불 정보 조회 완료: ${totalRefunds} USD (기간: ${postedAfter} ~ ${postedBefore}, SKU: ${sku || '전체'}, ${pageCount}페이지)`);
    return totalRefunds;
    
  } catch (error: any) {
    console.error(`환불 정보 조회 중 오류:`, error.message);
    return 0;
  }
}

// SP-API 수수료 예상치 가져오기 (getMyFeesEstimateForSKU)
// 특정 SKU와 가격에 대한 Amazon 수수료 예상치를 반환합니다
// 이 API는 경로 파라미터로 SellerSKU를 받고, 요청 Body는 FeesEstimateRequest 객체 하나만 필요합니다
async function fetchFeesEstimates(
  accessToken: string,
  marketplaceId: string,
  sku: string,
  listingPrice: number, // 판매 가격
  currencyCode: string = "USD",
  baseUrl?: string // 계정별 Base URL (선택사항)
): Promise<any> {
  // URL 인코딩이 필요할 수 있으므로 encodeURIComponent 사용
  const encodedSku = encodeURIComponent(sku);
  const apiBaseUrl = baseUrl || SP_API_BASE_URL_DEFAULT;
  const endpoint = `${apiBaseUrl}/products/fees/v0/listings/${encodedSku}/feesEstimate`;
  
  // getMyFeesEstimateForSKU API는 경로 파라미터로 SKU를 받으므로, 요청 Body의 FeesEstimateRequest에는 IdType과 IdValue가 필요 없습니다
  // 하지만 Identifier 필드는 required입니다 (요청을 추적하기 위한 고유 식별자)
  const requestBody = {
    FeesEstimateRequest: {
      MarketplaceId: marketplaceId,
      IsAmazonFulfilled: true, // FBA 주문인 경우
      PriceToEstimateFees: {
        ListingPrice: {
          CurrencyCode: currencyCode,
          Amount: listingPrice.toString(),
        },
        Shipping: {
          CurrencyCode: currencyCode,
          Amount: "0", // 배송비는 0 (FBA의 경우)
        },
      },
      Identifier: sku, // required: 요청을 추적하기 위한 고유 식별자
      OptionalFulfillmentProgram: "FBA_CORE", // 기본 FBA 프로그램
    },
  };

  const headers: Record<string, string> = {
    "x-amz-access-token": accessToken,
    "accept": "application/json",
    "content-type": "application/json",
  };

  console.log(`FeesEstimates API 호출: SKU ${sku}, 가격 ${listingPrice} ${currencyCode}`);
  console.log(`FeesEstimates API 엔드포인트: ${endpoint}`);
  console.log(`FeesEstimates API 요청 Body (전체):`, JSON.stringify(requestBody, null, 2));
  console.log(`FeesEstimates API 요청 Body (직렬화):`, JSON.stringify(requestBody));

  // Rate Limit을 고려한 재시도 로직
  let retryCount = 0;
  const maxRetries = 5;

  while (retryCount <= maxRetries) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(requestBody),
    });

    if (response.status === 429) {
      retryCount++;
      const retryAfter = response.headers.get("Retry-After");
      const waitTime = retryAfter 
        ? parseInt(retryAfter) * 1000 
        : Math.min(1000 * Math.pow(2, retryCount), 60000);
      
      console.warn(`FeesEstimates API Rate Limit 초과 (429). ${waitTime/1000}초 후 재시도... (${retryCount}/${maxRetries})`);
      
      if (retryCount > maxRetries) {
        const errorText = await response.text();
        throw new Error(`FeesEstimates API Rate Limit 초과: 최대 재시도 횟수 초과. ${errorText}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      continue;
    }

    if (!response.ok) {
      const errorText = await response.text();
      const responseHeaders = Object.fromEntries(response.headers.entries());
      console.error(`FeesEstimates API 호출 실패: ${response.status} - ${errorText}`);
      console.error(`요청 URL: ${endpoint}`);
      console.error(`요청 Headers: ${JSON.stringify(headers, null, 2)}`);
      console.error(`요청 Body: ${JSON.stringify(requestBody, null, 2)}`);
      console.error(`응답 Headers: ${JSON.stringify(responseHeaders, null, 2)}`);
      
      // 403 에러인 경우 더 자세한 정보 출력
      if (response.status === 403) {
        console.error(`⚠️ 403 Unauthorized 에러 상세 정보:`);
        console.error(`- 엔드포인트: ${endpoint}`);
        console.error(`- 마켓플레이스 ID: ${marketplaceId}`);
        console.error(`- SKU: ${sku}`);
        console.error(`- 가격: ${listingPrice} ${currencyCode}`);
        console.error(`- 요청 형식이 API 문서와 일치하는지 확인하세요.`);
        console.error(`- SP-API 앱에서 "Product Pricing API" 권한이 있는지 확인하세요.`);
        console.error(`- 권한 추가 후 Refresh Token을 재생성했는지 확인하세요.`);
      }
      
      throw new Error(`FeesEstimates API 호출 실패: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`FeesEstimates API 응답:`, JSON.stringify(data, null, 2));
    
    return data;
  }
  
  throw new Error("Unexpected: while loop exited without returning");
}

// SP-API FBA 재고 데이터 가져오기
// 참고: 공식 문서 확인 필요 - 실제 파라미터 형식은 테스트 후 수정 가능
async function fetchFBAInventory(
  accessToken: string,
  marketplaceIds?: string[],
  skus?: string[],
  details: boolean = false
): Promise<any> {
  const endpoint = `${SP_API_BASE_URL_DEFAULT}/fba/inventory/v1/summaries`;
  const url = new URL(endpoint);

  // 필수 파라미터: granularityType, granularityId, marketplaceIds
  if (marketplaceIds && marketplaceIds.length > 0) {
    // granularityType: required, enum "Marketplace"
    url.searchParams.append("granularityType", "Marketplace");
    
    // granularityId: required, 첫 번째 마켓플레이스 ID 사용
    const primaryMarketplace = marketplaceIds[0];
    url.searchParams.append("granularityId", primaryMarketplace);
    
    // marketplaceIds: required, array of strings, length ≤ 1 (첫 번째 것만 전달)
    url.searchParams.append("marketplaceIds", primaryMarketplace);
  } else {
    throw new Error("marketplaceIds는 필수 파라미터입니다.");
  }
  
  // sellerSkus: array of strings, 최대 50개, 반복 추가 형식
  if (skus && skus.length > 0) {
    const skusToFetch = skus.slice(0, 50); // 최대 50개 제한
    skusToFetch.forEach((sku) => url.searchParams.append("sellerSkus", sku));
  }

  // details: boolean, 기본값 false (선택사항)
  if (details) {
    url.searchParams.append("details", "true");
  }

  // 기본 헤더
  const headers: Record<string, string> = {
    "x-amz-access-token": accessToken,
    "content-type": "application/json",
  };

  console.log(`FBA Inventory API 호출: ${url.toString()}`);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`FBA Inventory API 에러 응답: ${errorText}`);
    throw new Error(`FBA Inventory API 호출 실패: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // 에러 확인
  if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
    const errorMessages = data.errors.map((e: any) => `${e.code}: ${e.message}`).join(", ");
    console.warn(`FBA Inventory API 경고: ${errorMessages}`);
  }
  
  // 응답 구조 로깅
  const summaries = data.payload?.inventorySummaries || [];
  console.log(`FBA Inventory API 응답: ${summaries.length}개 SKU의 재고 정보`);
  if (summaries.length > 0) {
    console.log(`첫 번째 SKU 예시:`, JSON.stringify(summaries[0], null, 2).substring(0, 300));
  }
  
  return data;
}

// 메인 핸들러
export async function POST(request: NextRequest) {
  try {
    // Supabase 클라이언트 생성
    const supabase = getServerSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: "Missing Supabase environment variables" },
        { status: 500 }
      );
    }

    // 요청 본문 파싱
    const requestBody = await request.json();
    
    // 환경 변수에서 기본 Amazon API 자격 증명 가져오기 (폴백용)
    const defaultClientId = process.env.AMAZON_SP_API_CLIENT_ID;
    const defaultClientSecret = process.env.AMAZON_SP_API_CLIENT_SECRET;
    const defaultRefreshToken = process.env.AMAZON_SP_API_REFRESH_TOKEN;
    const defaultBaseUrl = process.env.AMAZON_SP_API_BASE_URL || "https://sellingpartnerapi-na.amazon.com";
    const awsAccessKey = process.env.AMAZON_AWS_ACCESS_KEY_ID;
    const awsSecretKey = process.env.AMAZON_AWS_SECRET_ACCESS_KEY;

    // 계정별 API 정보를 가져오는 헬퍼 함수
    async function getAccountApiCredentials(accountName: string | null): Promise<{
      clientId: string;
      clientSecret: string;
      refreshToken: string;
      baseUrl: string;
    } | null> {
      if (!accountName || !supabase) {
        // 계정 이름이 없거나 supabase가 없으면 기본값 사용
        if (defaultClientId && defaultClientSecret && defaultRefreshToken) {
          return {
            clientId: defaultClientId,
            clientSecret: defaultClientSecret,
            refreshToken: defaultRefreshToken,
            baseUrl: defaultBaseUrl,
          };
        }
        return null;
      }

      // 계정 마스터에서 API 정보 조회
      const { data: accountData, error } = await supabase
        .from('account_master')
        .select('sp_api_client_id, sp_api_client_secret, sp_api_refresh_token, sp_api_base_url')
        .eq('account_name', accountName)
        .single();

      if (error || !accountData) {
        console.warn(`계정 "${accountName}"의 API 정보를 찾을 수 없습니다. 기본값을 사용합니다.`);
        // 계정 정보가 없으면 기본값 사용
        if (defaultClientId && defaultClientSecret && defaultRefreshToken) {
          return {
            clientId: defaultClientId,
            clientSecret: defaultClientSecret,
            refreshToken: defaultRefreshToken,
            baseUrl: defaultBaseUrl,
          };
        }
        return null;
      }

      // 계정에 API 정보가 있으면 사용
      if (accountData.sp_api_client_id && accountData.sp_api_client_secret && accountData.sp_api_refresh_token) {
        return {
          clientId: accountData.sp_api_client_id,
          clientSecret: accountData.sp_api_client_secret,
          refreshToken: accountData.sp_api_refresh_token,
          baseUrl: accountData.sp_api_base_url || defaultBaseUrl,
        };
      }

      // 계정에 API 정보가 없으면 기본값 사용
      if (defaultClientId && defaultClientSecret && defaultRefreshToken) {
        return {
          clientId: defaultClientId,
          clientSecret: defaultClientSecret,
          refreshToken: defaultRefreshToken,
          baseUrl: defaultBaseUrl,
        };
      }

      return null;
    }

    // 기본 API 자격 증명 확인 (최소한 하나는 있어야 함)
    if (!defaultClientId || !defaultClientSecret || !defaultRefreshToken) {
      console.warn("환경 변수에 기본 API 자격 증명이 없습니다. 계정별 API 정보를 사용하거나 환경 변수를 설정하세요.");
    }

    const marketplaceIds = requestBody.marketplaceIds || ["ATVPDKIKX0DER"]; // 기본값: US
    
    // 특정 브랜드/SKU/월 필터링 파라미터
    const targetSku = requestBody.sku; // 특정 SKU 필터
    const targetYear = requestBody.year; // 특정 연도
    const targetMonth = requestBody.month; // 특정 월
    const saveToDatabase = requestBody.saveToDatabase !== false; // 기본값: true
    const fetchInventory = requestBody.fetchInventory !== false; // 기본값: true (재고 정보 가져오기)
    const fetchOrderList = requestBody.fetchOrderList !== false; // 기본값: false (주문 목록은 선택사항)
    const maxPages = requestBody.maxPages || 1000; // 최대 페이지 수 (기본값: 1000페이지 = 10만개 주문)
    const maxOrdersToProcess = requestBody.maxOrdersToProcess || 3; // 한 번에 처리할 최대 주문 수 (기본값: 3개, 타임아웃 방지)
    
    // 특정 연도/월이 지정된 경우, createdAfter/createdBefore를 정확히 설정
    let createdAfter = requestBody.createdAfter;
    let createdBefore = requestBody.createdBefore;
    
    if (targetYear && targetMonth) {
      // 특정 월의 시작일과 종료일 설정
      const startDate = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0, 0);
      let endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999); // 해당 월의 마지막 날
      
      // SP-API 요구사항: CreatedBefore는 현재 시간으로부터 최소 2분 전이어야 함
      const now = new Date();
      const minCreatedBefore = new Date(now.getTime() - 2 * 60 * 1000); // 현재 시간에서 2분 전
      
      // endDate가 현재 시간보다 미래이거나 2분 이내라면 조정
      if (endDate > minCreatedBefore) {
        endDate = minCreatedBefore;
        console.log(`CreatedBefore가 현재 시간과 너무 가까워서 ${minCreatedBefore.toISOString()}로 조정했습니다.`);
      }
      
      createdAfter = createdAfter || startDate.toISOString();
      createdBefore = createdBefore || endDate.toISOString();
      
      console.log(`특정 월 필터링: ${targetYear}년 ${targetMonth}월 (${createdAfter} ~ ${createdBefore})`);
    } else if (!createdAfter) {
      // 기본값: 7일 전
      createdAfter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    }
    
    // CreatedBefore가 설정된 경우, 현재 시간으로부터 최소 2분 전인지 확인
    if (createdBefore) {
      const now = new Date();
      const createdBeforeDate = new Date(createdBefore);
      const minCreatedBefore = new Date(now.getTime() - 2 * 60 * 1000); // 현재 시간에서 2분 전
      
      if (createdBeforeDate > minCreatedBefore) {
        console.warn(`CreatedBefore(${createdBefore})가 현재 시간과 너무 가깝습니다. ${minCreatedBefore.toISOString()}로 조정합니다.`);
        createdBefore = minCreatedBefore.toISOString();
      }
    }

    // 1. 사용할 API 자격 증명 결정
    // 특정 SKU가 지정된 경우 해당 SKU의 계정 정보 사용, 아니면 기본값 사용
    let apiCredentials: { clientId: string; clientSecret: string; refreshToken: string; baseUrl: string } | null = null;
    
    if (targetSku) {
      // 특정 SKU가 지정된 경우 해당 SKU의 계정 정보 조회
      const { data: skuMasterData } = await supabase
        .from('sku_master')
        .select('amazon_account_name')
        .eq('sku', targetSku)
        .eq('channel', 'amazon_us')
        .single();
      
      if (skuMasterData && skuMasterData.amazon_account_name) {
        apiCredentials = await getAccountApiCredentials(skuMasterData.amazon_account_name);
        console.log(`SKU ${targetSku}의 계정 "${skuMasterData.amazon_account_name}"의 API 정보를 사용합니다.`);
      }
    }
    
    // 계정별 API 정보가 없으면 기본값 사용
    if (!apiCredentials) {
      if (defaultClientId && defaultClientSecret && defaultRefreshToken) {
        apiCredentials = {
          clientId: defaultClientId,
          clientSecret: defaultClientSecret,
          refreshToken: defaultRefreshToken,
          baseUrl: defaultBaseUrl,
        };
        console.log("기본 API 자격 증명을 사용합니다.");
      } else {
        return NextResponse.json({
            error: "Missing required API credentials",
            note: "환경 변수에 기본 API 자격 증명을 설정하거나, 계정 마스터에 API 정보를 등록하세요.",
          }, { status: 400 });
      }
    }

    // LWA Access Token 발급
    console.log("LWA Access Token 발급 중...");
    const accessToken = await getLwaAccessToken(
      apiCredentials.clientId,
      apiCredentials.clientSecret,
      apiCredentials.refreshToken
    );
    console.log("LWA Access Token 발급 완료");
    
    // SP_API_BASE_URL 업데이트 (계정별로 다를 수 있음)
    const SP_API_BASE_URL = apiCredentials.baseUrl;

    // 2. SP-API로 주문 데이터 가져오기 (페이지네이션 지원)
    console.log("Amazon SP-API 호출 중...");
    console.log("참고: SP-API는 더 이상 AWS IAM이나 AWS Signature Version 4를 요구하지 않습니다.");
    
    // 주문 목록이 필요한 경우에만 주문 목록을 가져오기 (타임아웃 방지)
    // 매출 집계는 별도로 수행하므로 여기서는 주문 목록만 가져옴
    let allOrders: any[] = [];
    let nextToken: string | undefined = undefined;
    let pageCount = 0;
    
    if (fetchOrderList) {
      console.log("주문 목록 가져오기 중...");
      
      do {
        pageCount++;
        if (pageCount % 10 === 0 || pageCount === 1) {
          console.log(`주문 목록 가져오기 중... (페이지 ${pageCount})`);
        }
        
        const ordersResponse = await fetchAmazonOrders(
          accessToken,
          awsAccessKey, // 선택사항
          awsSecretKey, // 선택사항
          marketplaceIds,
          createdAfter,
          createdBefore,
          100, // MaxResultsPerPage
          nextToken
        );
        
        // SP-API 응답 구조: payload.Orders 또는 직접 Orders
        const pageOrders = ordersResponse.payload?.Orders || ordersResponse.Orders || [];
        allOrders = allOrders.concat(pageOrders);
        
        nextToken = ordersResponse.payload?.NextToken || ordersResponse.NextToken;
        
        if (pageCount % 10 === 0 || pageCount === 1) {
          console.log(`페이지 ${pageCount}: ${pageOrders.length}개 주문 가져옴 (누적: ${allOrders.length}개)`);
        }
        
        // 주문 목록은 최대 1페이지만 가져오기 (타임아웃 방지)
        if (pageCount >= 1 || !nextToken) {
          break;
        }
        
        // API Rate Limit을 고려한 지연 추가
        await new Promise(resolve => setTimeout(resolve, 2000));
      } while (nextToken && pageCount < 1); // 주문 목록은 1페이지만
      
      console.log(`주문 목록 가져오기 완료: ${allOrders.length}개 주문`);
    }
    
    // 주문 목록이 필요한 경우에만 ordersData에 저장
    const ordersData = {
      Orders: allOrders,
      NextToken: nextToken, // 마지막 NextToken 저장
    };
    
    // 주문 데이터 구조 확인 (디버깅)
    if (ordersData.Orders && ordersData.Orders.length > 0) {
      const firstOrder = ordersData.Orders[0];
      console.log("첫 번째 주문 구조:", JSON.stringify({
        AmazonOrderId: firstOrder.AmazonOrderId,
        hasOrderItems: !!firstOrder.OrderItems,
        orderItemsLength: firstOrder.OrderItems?.length || 0,
        orderItemsSample: firstOrder.OrderItems?.[0] || null,
        orderKeys: Object.keys(firstOrder),
      }, null, 2).substring(0, 1000));
      
      // OrderItems가 없는 주문 개수 확인
      const ordersWithoutItems = ordersData.Orders.filter((o: any) => !o.OrderItems || o.OrderItems.length === 0);
      console.log(`OrderItems가 없는 주문: ${ordersWithoutItems.length}개 / 전체 ${ordersData.Orders.length}개`);
    }

    // 3. FBA 재고 데이터 가져오기 (요청된 경우)
    let inventoryData: any = null;
    if (fetchInventory) {
      console.log("FBA 재고 데이터 가져오기 중...");
      try {
        // 재고를 가져올 SKU 목록 준비
        let skusToFetch: string[] = [];
        if (targetSku) {
          skusToFetch = [targetSku];
        } else {
          // 특정 브랜드나 모든 SKU 가져오기
          const { data: skuList } = await supabase
            .from('sku_master')
            .select('sku')
            .eq('channel', 'amazon_us');
          
          if (skuList && skuList.length > 0) {
            skusToFetch = skuList.map((s: any) => s.sku);
          }
        }

        if (skusToFetch.length > 0) {
          // details=true로 호출하여 상세 재고 정보 가져오기
          inventoryData = await fetchFBAInventory(
            accessToken,
            marketplaceIds,
            skusToFetch,
            true // details=true로 상세 정보 요청
          );
          
          // 응답 구조 확인
          const summaries = inventoryData.payload?.inventorySummaries || 
                           inventoryData.inventorySummaries || 
                           (Array.isArray(inventoryData) ? inventoryData : []);
          console.log(`재고 데이터 가져오기 완료: ${summaries.length}개 SKU`);
        }
      } catch (error: any) {
        console.error("재고 데이터 가져오기 실패:", error.message);
        // 재고 가져오기 실패해도 계속 진행
      }
    }

    // 4. UI 표시를 위해 주문 목록이 필요한 경우에만 OrderItems 가져오기
    // getOrders API는 OrderItems를 포함하지 않으므로, UI 표시를 위해 별도로 가져와야 합니다
    const orderItemsMap = new Map<string, any[]>();
    
    // 주문 목록이 필요한 경우에만 OrderItems 가져오기 (타임아웃 방지)
    if (fetchOrderList && ordersData.Orders && ordersData.Orders.length > 0) {
      console.log(`UI 표시를 위해 총 ${ordersData.Orders.length}개 주문의 OrderItems를 가져오는 중...`);
      
      // 주문 목록이 많으면 일부만 가져오기 (타임아웃 방지)
      const maxOrdersForList = Math.min(ordersData.Orders.length, 10); // 최대 10개만
      
      for (let i = 0; i < maxOrdersForList; i++) {
        const order = ordersData.Orders[i];
        // order.OrderItems가 있는 경우는 거의 없지만, 혹시 모르니 확인
        if (order.OrderItems && Array.isArray(order.OrderItems) && order.OrderItems.length > 0) {
          orderItemsMap.set(order.AmazonOrderId, order.OrderItems);
          console.log(`주문 ${order.AmazonOrderId}는 이미 OrderItems를 포함하고 있습니다: ${order.OrderItems.length}개`);
        } else {
          // OrderItems를 별도 API로 가져오기
          try {
            const orderItemsData = await fetchOrderItems(accessToken, order.AmazonOrderId);
            if (orderItemsData && orderItemsData.payload && orderItemsData.payload.OrderItems) {
              const orderItems = orderItemsData.payload.OrderItems;
              orderItemsMap.set(order.AmazonOrderId, orderItems);
              console.log(`주문 ${order.AmazonOrderId}의 OrderItems 가져오기 완료: ${orderItems.length}개 아이템`);
            } else {
              console.warn(`주문 ${order.AmazonOrderId}의 OrderItems를 가져올 수 없습니다.`);
              orderItemsMap.set(order.AmazonOrderId, []); // 빈 배열로 설정
            }
          } catch (error: any) {
            console.error(`주문 ${order.AmazonOrderId}의 OrderItems 가져오기 실패:`, error.message);
            orderItemsMap.set(order.AmazonOrderId, []); // 빈 배열로 설정
          }
        }
      }
    }
    
    // 5. 데이터를 Supabase에 저장 (요청된 경우)
    // getOrderMetrics API를 사용하여 주문 목록을 가져오지 않고도 집계된 매출 데이터를 가져옵니다
    let savedRecords = [];
    if (saveToDatabase) {
      // 특정 연도/월이 지정된 경우 OrderMetrics API 사용 (타임아웃 방지)
      if (targetYear && targetMonth) {
        console.log("Supabase에 데이터 저장 중... (getOrderMetrics API 사용)");
        
        try {
          // 해당 월의 시작일과 종료일 계산 (미국 서부 시간대 사용)
          // America/Los_Angeles는 PDT(UTC-7) 또는 PST(UTC-8)를 자동으로 처리합니다
          const timeZone = "America/Los_Angeles";
          
          // 미국 서부 시간대의 offset 계산 (PDT: -07:00, PST: -08:00)
          // 11월~2월은 PST (UTC-8), 3월~10월은 PDT (UTC-7)
          const getPacificOffset = (month: number): string => {
            if (month >= 3 && month <= 10) {
              return "-07:00"; // PDT
            } else {
              return "-08:00"; // PST
            }
          };
          
          const offset = getPacificOffset(targetMonth);
          
          // 시작일: 해당 월 1일 00:00:00 (미국 서부 시간)
          const startDateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01T00:00:00${offset}`;
          
          // 종료일: 해당 월 마지막 날 23:59:59 (미국 서부 시간)
          const lastDay = new Date(targetYear, targetMonth, 0).getDate();
          let endDateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59${offset}`;
          
          // SP-API 요구사항: interval의 종료일은 현재 시간으로부터 최소 2분 전이어야 함
          // offset을 직접 계산
          const offsetHours = offset.startsWith('-') ? -parseInt(offset.substring(1, 3)) : parseInt(offset.substring(1, 3));
          const offsetMinutes = offset.startsWith('-') ? -parseInt(offset.substring(4, 6)) : parseInt(offset.substring(4, 6));
          
          // 종료일을 UTC로 변환하여 현재 시간과 비교
          const endDateParts = endDateStr.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})([+-]\d{2}:\d{2})/);
          if (endDateParts) {
            const [, year, month, day, hour, minute, second] = endDateParts;
            const endDateUTC = new Date(Date.UTC(
              parseInt(year),
              parseInt(month) - 1,
              parseInt(day),
              parseInt(hour) - offsetHours,
              parseInt(minute) - offsetMinutes,
              parseInt(second)
            ));
            
            const now = new Date();
            const minEndDateUTC = new Date(now.getTime() - 2 * 60 * 1000); // 현재 시간에서 2분 전
            
            // endDate가 현재 시간보다 미래이거나 2분 이내라면 조정
            if (endDateUTC > minEndDateUTC) {
              // UTC 시간을 다시 미국 서부 시간대로 변환
              const adjustedLocal = new Date(minEndDateUTC.getTime() + (offsetHours * 60 + offsetMinutes) * 60 * 1000);
              const adjustedYear = adjustedLocal.getUTCFullYear();
              const adjustedMonth = String(adjustedLocal.getUTCMonth() + 1).padStart(2, '0');
              const adjustedDay = String(adjustedLocal.getUTCDate()).padStart(2, '0');
              const adjustedHour = String(adjustedLocal.getUTCHours()).padStart(2, '0');
              const adjustedMinute = String(adjustedLocal.getUTCMinutes()).padStart(2, '0');
              const adjustedSecond = String(adjustedLocal.getUTCSeconds()).padStart(2, '0');
              endDateStr = `${adjustedYear}-${adjustedMonth}-${adjustedDay}T${adjustedHour}:${adjustedMinute}:${adjustedSecond}${offset}`;
              console.log(`OrderMetrics interval 종료일이 현재 시간과 너무 가까워서 ${endDateStr}로 조정했습니다.`);
            }
          }
          
          // 최종 interval 생성
          const interval = `${startDateStr}--${endDateStr}`;
          console.log(`OrderMetrics API 호출: ${targetYear}년 ${targetMonth}월 (${interval}, 시간대: ${timeZone})`);
          
          // SKU 목록 가져오기
          let skusToProcess: string[] = [];
          if (targetSku) {
            skusToProcess = [targetSku];
          } else {
            // 특정 브랜드나 모든 SKU 가져오기
            const { data: skuList } = await supabase
              .from('sku_master')
              .select('sku')
              .eq('channel', 'amazon_us');
            
            if (skuList && skuList.length > 0) {
              skusToProcess = skuList.map((s: any) => s.sku);
            }
          }
          
          // 각 SKU에 대해 OrderMetrics 가져오기
          for (const sku of skusToProcess) {
            try {
              // SKU별로 해당 계정의 API 정보 사용
              let skuApiCredentials = apiCredentials;
              
              // SKU의 계정 정보 조회
              const { data: skuMasterData } = await supabase
                .from('sku_master')
                .select('amazon_account_name')
                .eq('sku', sku)
                .eq('channel', 'amazon_us')
                .single();
              
              if (skuMasterData && skuMasterData.amazon_account_name) {
                const accountApiCredentials = await getAccountApiCredentials(skuMasterData.amazon_account_name);
                if (accountApiCredentials) {
                  skuApiCredentials = accountApiCredentials;
                  console.log(`SKU ${sku}의 계정 "${skuMasterData.amazon_account_name}"의 API 정보를 사용합니다.`);
                }
              }
              
              // SKU별 Access Token 발급
              const skuAccessToken = await getLwaAccessToken(
                skuApiCredentials.clientId,
                skuApiCredentials.clientSecret,
                skuApiCredentials.refreshToken
              );
              
              const metricsData = await fetchOrderMetrics(
                skuAccessToken,
                marketplaceIds,
                interval,
                "Month", // 월별 집계
                sku,
                timeZone, // 미국 서부 시간대
                skuApiCredentials.baseUrl // SKU별 Base URL 사용
              );
              
              if (metricsData && metricsData.payload && Array.isArray(metricsData.payload)) {
                console.log(`SKU ${sku}의 OrderMetrics 응답: ${metricsData.payload.length}개 메트릭스`);
                
                // payload는 배열이며, 각 요소는 해당 월의 메트릭스를 포함
                for (const metric of metricsData.payload) {
                  // interval에서 연도/월 추출
                  // 형식 예시: "2025-11-01T00:00:00-08:00--2025-11-30T23:59:59-08:00" 또는 "2025-11-01T00:00:00.000Z--2025-11-30T23:59:59.999Z"
                  const intervalStr = metric.interval || interval;
                  console.log(`SKU ${sku}의 interval: ${intervalStr}`);
                  
                  // interval의 시작 부분에서 연도/월 추출
                  const intervalStartMatch = intervalStr.match(/^(\d{4})-(\d{2})/);
                  
                  if (intervalStartMatch) {
                    const year = parseInt(intervalStartMatch[1]);
                    const month = parseInt(intervalStartMatch[2]);
                    
                    console.log(`SKU ${sku}의 추출된 연도/월: ${year}년 ${month}월 (요청: ${targetYear}년 ${targetMonth}월)`);
                    
                    // targetYear/targetMonth와 일치하는지 확인
                    if (year === targetYear && month === targetMonth) {
                      console.log(`✅ SKU ${sku}의 ${year}년 ${month}월 메트릭스 매칭 성공!`);
                      const totalSales = parseFloat(metric.totalSales?.amount || '0');
                      const orderCount = metric.orderCount || 0;
                      const unitCount = metric.unitCount || 0;
                      const orderItemCount = metric.orderItemCount || 0;
                      const averageUnitPrice = metric.averageUnitPrice || null;
                      
                      // 환불 정보 추출
                      // getOrderMetrics API는 환불 정보를 제공하지 않으므로, 별도로 조회해야 합니다
                      // 환불 정보는 별도의 Edge Function (fetch-amazon-refunds)에서 조회하도록 분리되었습니다
                      // 타임아웃 방지를 위해 여기서는 0으로 설정하고, 필요시 fetch-amazon-refunds Edge Function을 호출하세요
                      const totalRefunds = 0;
                      
                      console.log(`SKU ${sku}의 환불 정보: 별도 Edge Function (fetch-amazon-refunds)에서 조회하세요`);
                      
                      console.log(`SKU ${sku}의 ${year}년 ${month}월 메트릭스 (상세):`, {
                        interval: intervalStr,
                        totalSales: {
                          amount: totalSales,
                          currency: metric.totalSales?.currencyCode || 'USD',
                        },
                        totalRefunds: {
                          amount: totalRefunds,
                          currency: metric.totalRefunds?.currencyCode || metric.refunds?.currencyCode || 'USD',
                        },
                        orderCount: orderCount, // 주문 수
                        orderItemCount: orderItemCount, // 주문 아이템 수
                        unitCount: unitCount, // 팔린 개수 총계 (주문된 단위 수)
                        averageUnitPrice: averageUnitPrice,
                        fullMetric: JSON.stringify(metric, null, 2),
                      });
                      
                      console.log(`📊 저장할 데이터:`, {
                        gross_sales: totalSales,
                        refunds: totalRefunds,
                        total_order_quantity: unitCount, // 팔린 개수 총계
                        orderCount: orderCount,
                        orderItemCount: orderItemCount,
                      });
                      
                      // Amazon 수수료 계산
                      let fbaFeePerUnit = 0;
                      let referralFeePerUnit = 0;
                      let totalFbaFee = 0;
                      let totalReferralFee = 0;
                      
                      if (unitCount > 0 && totalSales > 0) {
                        // 평균 판매 가격 계산
                        const averagePrice = totalSales / unitCount;
                        const currencyCode = metric.totalSales?.currencyCode || "USD";
                        
                        // 1. Referral Fee: 계정 마스터의 비율로 계산
                        try {
                          // SKU로 계정 정보 조회
                          const { data: skuMasterData } = await supabase
                            .from('sku_master')
                            .select('amazon_account_name')
                            .eq('sku', sku)
                            .eq('channel', 'amazon_us')
                            .single();
                          
                          if (skuMasterData && skuMasterData.amazon_account_name) {
                            // 계정 마스터에서 Referral Fee Rate 조회
                            const { data: accountData } = await supabase
                              .from('account_master')
                              .select('referral_fee_rate')
                              .eq('account_name', skuMasterData.amazon_account_name)
                              .single();
                            
                            if (accountData && accountData.referral_fee_rate) {
                              const referralFeeRate = parseFloat(accountData.referral_fee_rate.toString());
                              
                              // 총 Referral Fee = 전체 매출 × Referral Fee Rate
                              totalReferralFee = totalSales * referralFeeRate;
                              
                              // 개당 Referral Fee = 평균 가격 × Referral Fee Rate
                              referralFeePerUnit = averagePrice * referralFeeRate;
                              
                              console.log(`✅ SKU ${sku}의 Referral Fee 계산 완료 (계정: ${skuMasterData.amazon_account_name}, 비율: ${(referralFeeRate * 100).toFixed(2)}%):`, {
                                referralFeeRate: referralFeeRate,
                                referralFeePerUnit: referralFeePerUnit,
                                totalReferralFee: totalReferralFee,
                              });
                            } else {
                              console.warn(`⚠️ SKU ${sku}의 계정 "${skuMasterData.amazon_account_name}"에 대한 Referral Fee Rate를 찾을 수 없습니다. 계정 마스터에 등록되어 있는지 확인하세요.`);
                            }
                          } else {
                            console.warn(`⚠️ SKU ${sku}의 amazon_account_name을 찾을 수 없습니다. SKU 마스터에 계정 정보가 등록되어 있는지 확인하세요.`);
                          }
                        } catch (error: any) {
                          console.error(`SKU ${sku}의 Referral Fee 계산 실패:`, error.message);
                        }
                        
                        // 2. FBA Fee: API 호출로 계산 (기존 로직 유지)
                        try {
                          console.log(`SKU ${sku}의 FBA Fee 계산 중... (평균 가격: ${averagePrice} ${currencyCode})`);
                          
                          // SKU별 API 자격 증명 사용 (이미 위에서 가져옴)
                          const feesData = await fetchFeesEstimates(
                            skuAccessToken,
                            marketplaceIds[0], // 첫 번째 마켓플레이스 ID 사용
                            sku,
                            averagePrice,
                            currencyCode,
                            skuApiCredentials.baseUrl // SKU별 Base URL 사용
                          );
                          
                          // getMyFeesEstimateForSKU API 응답 구조: { payload: { FeesEstimateResult: {...} } }
                          console.log(`SKU ${sku}의 FeesEstimate 응답 (전체):`, JSON.stringify(feesData, null, 2));
                          
                          if (feesData && feesData.payload && feesData.payload.FeesEstimateResult) {
                            const feeEstimate = feesData.payload.FeesEstimateResult;
                            
                            console.log(`SKU ${sku}의 FeesEstimateResult:`, JSON.stringify(feeEstimate, null, 2));
                            
                            if (feeEstimate.Status === "Success" && feeEstimate.FeesEstimate) {
                              const totalFeesEstimate = parseFloat(feeEstimate.FeesEstimate.TotalFeesEstimate?.Amount || '0');
                              
                              // FeeDetailList에서 FBA Fee만 추출 (Referral Fee는 이미 계산됨)
                              if (feeEstimate.FeesEstimate.FeeDetailList && Array.isArray(feeEstimate.FeesEstimate.FeeDetailList)) {
                                for (const feeDetail of feeEstimate.FeesEstimate.FeeDetailList) {
                                  const feeType = feeDetail.FeeType || '';
                                  const feeAmount = parseFloat(feeDetail.FeeAmount?.Amount || '0');
                                  
                                  if (feeType.includes('FBA') || feeType.includes('Fulfillment')) {
                                    fbaFeePerUnit = feeAmount;
                                  }
                                }
                              }
                              
                              // FBA Fee가 없으면 총 수수료에서 Referral Fee를 제외한 나머지를 FBA Fee로 간주
                              if (fbaFeePerUnit === 0 && totalFeesEstimate > 0) {
                                const estimatedFbaFeePerUnit = totalFeesEstimate - referralFeePerUnit;
                                if (estimatedFbaFeePerUnit > 0) {
                                  fbaFeePerUnit = estimatedFbaFeePerUnit;
                                }
                              }
                              
                              // 월별 총 FBA Fee 계산
                              totalFbaFee = fbaFeePerUnit * unitCount;
                              
                              console.log(`✅ SKU ${sku}의 FBA Fee 계산 완료:`, {
                                fbaFeePerUnit: fbaFeePerUnit,
                                totalFbaFee: totalFbaFee,
                                totalFeesEstimate: totalFeesEstimate,
                              });
                            } else {
                              console.warn(`SKU ${sku}의 FBA Fee 계산 실패: Status=${feeEstimate.Status}`);
                              if (feeEstimate.Error) {
                                console.warn(`SKU ${sku}의 FeesEstimate 에러 상세:`, JSON.stringify(feeEstimate.Error, null, 2));
                              }
                            }
                          }
                          
                          // Rate Limit: 1 requests/second (1초당 1회, burst 2)
                          await new Promise(resolve => setTimeout(resolve, 1000));
                        } catch (error: any) {
                          console.error(`SKU ${sku}의 FBA Fee 계산 실패:`, error.message);
                          
                          // 403 에러인 경우 권한 문제로 간주하고 경고만 출력
                          if (error.message.includes('403') || error.message.includes('Unauthorized')) {
                            console.warn(`⚠️ SKU ${sku}의 FBA Fee 계산 실패: Products API 권한이 없습니다.`);
                            console.warn(`⚠️ SP-API 앱에서 "Product Pricing API" 또는 "Products API" 권한을 추가하고, Refresh Token을 다시 생성해야 합니다.`);
                            console.warn(`⚠️ FBA Fee 정보 없이 매출 데이터만 저장합니다.`);
                          }
                          
                          // FBA Fee 계산 실패해도 계속 진행 (FBA Fee는 0으로 유지)
                        }
                      }
                      
                      // Supabase에 저장
                      const { data: existingData } = await supabase
                        .from('amazon_us_monthly_data')
                        .select('*')
                        .eq('sku', sku)
                        .eq('year', year)
                        .eq('month', month)
                        .single();
                      
                      const updateData: any = {
                        sku: sku,
                        year: year,
                        month: month,
                        gross_sales: totalSales,
                        refunds: totalRefunds, // 환불 금액
                        total_order_quantity: unitCount, // 팔린 개수 총계
                        fba_fee: fbaFeePerUnit, // 개당 FBA 수수료
                        referral_fee: referralFeePerUnit, // 개당 추천 수수료
                        total_fba_fee: totalFbaFee, // 월별 총 FBA 수수료 (개당 수수료 × 판매 수량)
                        total_referral_fee: totalReferralFee, // 월별 총 추천 수수료 (개당 수수료 × 판매 수량)
                      };
                      
                      if (existingData) {
                        // 기존 데이터 업데이트
                        const { data, error } = await supabase
                          .from('amazon_us_monthly_data')
                          .update(updateData)
                          .eq('sku', sku)
                          .eq('year', year)
                          .eq('month', month);
                        
                        if (error) {
                          console.error(`SKU ${sku}의 ${year}년 ${month}월 데이터 업데이트 실패:`, error);
                        } else {
                          savedRecords.push({ sku, year, month, ...updateData });
                          console.log(`✅ SKU ${sku}의 ${year}년 ${month}월 데이터 업데이트 완료`);
                        }
                      } else {
                        // 새 데이터 삽입
                        const { data, error } = await supabase
                          .from('amazon_us_monthly_data')
                          .insert(updateData);
                        
                        if (error) {
                          console.error(`SKU ${sku}의 ${year}년 ${month}월 데이터 삽입 실패:`, error);
                        } else {
                          savedRecords.push({ sku, year, month, ...updateData });
                          console.log(`✅ SKU ${sku}의 ${year}년 ${month}월 데이터 삽입 완료`);
                        }
                      }
                    } else {
                      console.log(`⚠️ SKU ${sku}의 ${year}년 ${month}월 메트릭스는 요청한 ${targetYear}년 ${targetMonth}월과 일치하지 않습니다.`);
                    }
                  } else {
                    console.warn(`⚠️ SKU ${sku}의 interval에서 연도/월을 추출할 수 없습니다: ${intervalStr}`);
                  }
                }
                
                if (metricsData.payload.length === 0) {
                  console.warn(`⚠️ SKU ${sku}의 OrderMetrics 응답이 비어있습니다.`);
                }
              } else {
                console.warn(`⚠️ SKU ${sku}의 OrderMetrics 응답 형식이 올바르지 않습니다:`, metricsData);
              }
              
              // Rate Limit: 0.5 requests/second (2초당 1회)
              // 안전을 위해 각 SKU마다 2.5초 대기
              if (skusToProcess.length > 1) {
                await new Promise(resolve => setTimeout(resolve, 2500));
              }
            } catch (error: any) {
              console.error(`SKU ${sku}의 OrderMetrics 가져오기 실패:`, error.message);
              console.error(`에러 상세:`, error);
              // 계속 진행
            }
          }
          
          console.log(`✅ OrderMetrics API를 사용하여 ${savedRecords.length}개 SKU의 매출 데이터를 저장했습니다.`);
        } catch (error: any) {
          console.error("OrderMetrics API 사용 실패:", error.message);
          // 기존 방식으로 폴백하지 않고 에러만 로깅
        }
      } else {
        // 기존 방식 (주문 목록을 가져와서 집계) - 특정 연도/월이 지정되지 않은 경우에만 사용
        console.log("Supabase에 데이터 저장 중... (기존 방식: 주문 목록 집계)");
        
        // 주문 데이터를 월별로 집계하여 저장
        const monthlyDataMap = new Map<string, any>();
        
        // 주문 목록을 이미 가져온 경우 재사용, 아니면 매출 집계만 수행
        const ordersToProcess = fetchOrderList && ordersData.Orders && ordersData.Orders.length > 0
          ? ordersData.Orders
          : null; // 주문 목록이 없으면 별도로 가져오기
        // 매출 집계를 위해 주문 가져오기 (주문 목록이 없는 경우에만)
        let aggregateNextToken: string | undefined = undefined;
        let aggregatePageCount = 0;
        let processedOrderCount = 0;
        
        if (!ordersToProcess) {
          console.log("매출 집계를 위해 주문 데이터를 가져오는 중...");
        } else {
          console.log(`이미 가져온 주문 목록(${ordersToProcess.length}개)을 사용하여 매출 집계 중...`);
        }
        
        do {
          let pageOrders: any[] = [];
          
          if (ordersToProcess) {
            // 이미 가져온 주문 목록 사용
            if (aggregatePageCount === 0) {
              pageOrders = ordersToProcess;
              aggregatePageCount = 1; // 한 번만 처리
            } else {
              break; // 이미 처리 완료
            }
          } else {
            // 주문 목록이 없으면 새로 가져오기
            aggregatePageCount++;
            if (aggregatePageCount % 10 === 0 || aggregatePageCount === 1) {
              console.log(`매출 집계용 주문 데이터 가져오기 중... (페이지 ${aggregatePageCount})`);
            }
            
            const aggregateOrdersResponse = await fetchAmazonOrders(
              accessToken,
              awsAccessKey,
              awsSecretKey,
              marketplaceIds,
              createdAfter,
              createdBefore,
              100,
              aggregateNextToken
            );
            
            pageOrders = aggregateOrdersResponse.payload?.Orders || aggregateOrdersResponse.Orders || [];
            aggregateNextToken = aggregateOrdersResponse.payload?.NextToken || aggregateOrdersResponse.NextToken;
          }
          
          // 각 주문에 대해 OrderItems 가져오기 및 매출 집계
          for (const order of pageOrders) {
          // 최대 처리 주문 수 제한 (타임아웃 방지)
          if (processedOrderCount >= maxOrdersToProcess) {
            console.log(`최대 처리 주문 수(${maxOrdersToProcess}개)에 도달했습니다. 나머지 주문은 다음 호출에서 처리하세요.`);
            break;
          }
          
          processedOrderCount++;
          const orderDate = new Date(order.PurchaseDate);
          const year = orderDate.getFullYear();
          const month = orderDate.getMonth() + 1;
          
          // 특정 연도/월 필터링 (이미 createdAfter/createdBefore로 필터링했지만 이중 체크)
          if (targetYear && year !== targetYear) continue;
          if (targetMonth && month !== targetMonth) continue;
          
          // OrderItems 가져오기 (매출 집계용)
          let orderItems: any[] = [];
          
          // 이미 가져온 OrderItems가 있으면 사용 (주문 목록을 가져온 경우)
          if (fetchOrderList && orderItemsMap.has(order.AmazonOrderId)) {
            orderItems = orderItemsMap.get(order.AmazonOrderId) || [];
          } else {
            // OrderItems를 별도 API로 가져오기
            try {
              const orderItemsData = await fetchOrderItems(accessToken, order.AmazonOrderId);
              if (orderItemsData && orderItemsData.payload && orderItemsData.payload.OrderItems) {
                orderItems = orderItemsData.payload.OrderItems;
              } else {
                continue; // OrderItems가 없으면 이 주문은 건너뛰기
              }
            } catch (error: any) {
              console.error(`주문 ${order.AmazonOrderId}의 OrderItems 가져오기 실패:`, error.message);
              continue; // 에러 발생 시 이 주문은 건너뛰기
            }
            
            // OrderItems API Rate Limit: 0.5 requests/second (2초당 1회)
            // Rate Limit을 준수하면서도 타임아웃을 방지하기 위해 2초 대기
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          if (orderItems.length === 0) {
            continue; // OrderItems가 없으면 이 주문은 건너뛰기
          }
          
          // 주문 아이템별로 처리
          for (const item of orderItems) {
            const sku = item.SellerSKU;
            
            if (!sku) {
              continue;
            }
            
            // 특정 SKU 필터링
            if (targetSku && sku !== targetSku) continue;
            
            // SKU가 sku_master에 존재하는지 확인
            const { data: skuMaster } = await supabase
              .from('sku_master')
              .select('sku, channel')
              .eq('sku', sku)
              .eq('channel', 'amazon_us')
              .single();
            
            if (!skuMaster) {
              console.warn(`SKU ${sku}가 sku_master에 없습니다. 건너뜁니다.`);
              continue;
            }
            
            const key = `${sku}-${year}-${month}`;
            
            if (!monthlyDataMap.has(key)) {
              monthlyDataMap.set(key, {
                sku: sku,
                year: year,
                month: month,
                total_order_quantity: 0,
                gross_sales: 0, // 매출 합계
                fba_inventory: 0, // 재고는 아래에서 업데이트
                inbound_working: 0,
                inbound_shipped: 0,
                inbound_receiving: 0,
                reserved_orders: 0,
                reserved_fc_transfer: 0,
                reserved_fc_processing: 0,
                researching_total: 0,
                researching_short_term: 0,
                researching_mid_term: 0,
                researching_long_term: 0,
                unfulfillable_total: 0,
                unfulfillable_customer_damaged: 0,
                unfulfillable_warehouse_damaged: 0,
                unfulfillable_distributor_damaged: 0,
                unfulfillable_carrier_damaged: 0,
                unfulfillable_defective: 0,
                unfulfillable_expired: 0,
              });
            }
            
            const monthlyData = monthlyDataMap.get(key);
            monthlyData.total_order_quantity += item.QuantityOrdered || 0;
            
            // 매출 정보 집계
            // ItemPrice: 상품 가격
            // ShippingPrice: 배송비 (선택사항)
            const itemPrice = parseFloat(item.ItemPrice?.Amount || '0');
            const shippingPrice = parseFloat(item.ShippingPrice?.Amount || '0');
            const itemTax = parseFloat(item.ItemTax?.Amount || '0');
            const shippingTax = parseFloat(item.ShippingTax?.Amount || '0');
            
            // 총 매출 = 상품 가격 + 배송비 + 세금
            const totalItemRevenue = itemPrice + shippingPrice + itemTax + shippingTax;
            monthlyData.gross_sales = (monthlyData.gross_sales || 0) + totalItemRevenue;
            
            console.log(`주문 아이템 처리: ${sku}`, {
              quantity: item.QuantityOrdered,
              itemPrice: itemPrice,
              shippingPrice: shippingPrice,
              totalRevenue: totalItemRevenue,
            });
          }
        } // for (const order of aggregatePageOrders) 종료
        
          // 최대 처리 주문 수에 도달했거나, NextToken이 없거나, 최대 페이지 수에 도달하면 종료
          if (processedOrderCount >= maxOrdersToProcess || !aggregateNextToken || aggregatePageCount >= maxPages) {
            if (processedOrderCount >= maxOrdersToProcess) {
              console.log(`최대 처리 주문 수(${maxOrdersToProcess}개)에 도달했습니다.`);
            }
            break;
          }
          
          // API Rate Limit을 고려한 지연 추가
          // Orders API: 0.0167 requests/second (약 60초당 1회)
          // 안전을 위해 페이지당 2초 대기
          await new Promise(resolve => setTimeout(resolve, 2000));
        } while (aggregateNextToken && aggregatePageCount < maxPages);
        
        console.log(`매출 집계 완료: ${aggregatePageCount}페이지 처리`);

        // 재고 정보를 월별 데이터에 추가 (상세 정보 포함)
      if (inventoryData) {
        // 응답 구조: payload.inventorySummaries
        const summaries = inventoryData.payload?.inventorySummaries || [];
        
        if (summaries && Array.isArray(summaries)) {
          // 재고 상세 정보를 Map에 저장 (SKU별)
          const inventoryDetailsMap = new Map<string, {
            fba_inventory: number;
            inbound_working: number;
            inbound_shipped: number;
            inbound_receiving: number;
            reserved_orders: number;
            reserved_fc_transfer: number;
            reserved_fc_processing: number;
            researching_total: number;
            researching_short_term: number;
            researching_mid_term: number;
            researching_long_term: number;
            unfulfillable_total: number;
            unfulfillable_customer_damaged: number;
            unfulfillable_warehouse_damaged: number;
            unfulfillable_distributor_damaged: number;
            unfulfillable_carrier_damaged: number;
            unfulfillable_defective: number;
            unfulfillable_expired: number;
          }>();
          
          for (const summary of summaries) {
            // SKU 필드명: sellerSku
            const sku = summary.sellerSku;
            if (!sku) {
              console.warn("재고 요약에 sellerSku가 없습니다:", summary);
              continue;
            }
            
            // 재고 상태별 상세 정보 추출
            let fbaInventory = 0;
            let inboundWorking = 0;
            let inboundShipped = 0;
            let inboundReceiving = 0;
            let reservedOrders = 0;
            let reservedFcTransfer = 0;
            let reservedFcProcessing = 0;
            
            // Researching 재고 정보
            let researchingTotal = 0;
            let researchingShortTerm = 0;
            let researchingMidTerm = 0;
            let researchingLongTerm = 0;
            
            // Unfulfillable 재고 정보
            let unfulfillableTotal = 0;
            let unfulfillableCustomerDamaged = 0;
            let unfulfillableWarehouseDamaged = 0;
            let unfulfillableDistributorDamaged = 0;
            let unfulfillableCarrierDamaged = 0;
            let unfulfillableDefective = 0;
            let unfulfillableExpired = 0;
            
            if (summary.inventoryDetails) {
              // details=true인 경우 상세 정보 사용
              const details = summary.inventoryDetails;
              
              fbaInventory = details.fulfillableQuantity || 0;
              inboundWorking = details.inboundWorkingQuantity || 0;
              inboundShipped = details.inboundShippedQuantity || 0;
              inboundReceiving = details.inboundReceivingQuantity || 0;
              
              if (details.reservedQuantity) {
                reservedOrders = details.reservedQuantity.pendingCustomerOrderQuantity || 0;
                reservedFcTransfer = details.reservedQuantity.pendingTransshipmentQuantity || 0;
                reservedFcProcessing = details.reservedQuantity.fcProcessingQuantity || 0;
              }
              
              // Researching 재고 정보 추출
              if (details.researchingQuantity) {
                researchingTotal = details.researchingQuantity.totalResearchingQuantity || 0;
                
                // researchingQuantityBreakdown에서 각 기간별 수량 추출
                if (details.researchingQuantity.researchingQuantityBreakdown) {
                  for (const breakdown of details.researchingQuantity.researchingQuantityBreakdown) {
                    const name = breakdown.name?.toLowerCase() || '';
                    const quantity = breakdown.quantity || 0;
                    
                    if (name.includes('short')) {
                      researchingShortTerm = quantity;
                    } else if (name.includes('mid')) {
                      researchingMidTerm = quantity;
                    } else if (name.includes('long')) {
                      researchingLongTerm = quantity;
                    }
                  }
                }
              }
              
              // Unfulfillable 재고 정보 추출
              if (details.unfulfillableQuantity) {
                unfulfillableTotal = details.unfulfillableQuantity.totalUnfulfillableQuantity || 0;
                unfulfillableCustomerDamaged = details.unfulfillableQuantity.customerDamagedQuantity || 0;
                unfulfillableWarehouseDamaged = details.unfulfillableQuantity.warehouseDamagedQuantity || 0;
                unfulfillableDistributorDamaged = details.unfulfillableQuantity.distributorDamagedQuantity || 0;
                unfulfillableCarrierDamaged = details.unfulfillableQuantity.carrierDamagedQuantity || 0;
                unfulfillableDefective = details.unfulfillableQuantity.defectiveQuantity || 0;
                unfulfillableExpired = details.unfulfillableQuantity.expiredQuantity || 0;
              }
            } else if (summary.totalQuantity !== undefined) {
              // details=false인 경우: totalQuantity만 사용
              fbaInventory = summary.totalQuantity;
            }
            
            inventoryDetailsMap.set(sku, {
              fba_inventory: fbaInventory,
              inbound_working: inboundWorking,
              inbound_shipped: inboundShipped,
              inbound_receiving: inboundReceiving,
              reserved_orders: reservedOrders,
              reserved_fc_transfer: reservedFcTransfer,
              reserved_fc_processing: reservedFcProcessing,
              researching_total: researchingTotal,
              researching_short_term: researchingShortTerm,
              researching_mid_term: researchingMidTerm,
              researching_long_term: researchingLongTerm,
              unfulfillable_total: unfulfillableTotal,
              unfulfillable_customer_damaged: unfulfillableCustomerDamaged,
              unfulfillable_warehouse_damaged: unfulfillableWarehouseDamaged,
              unfulfillable_distributor_damaged: unfulfillableDistributorDamaged,
              unfulfillable_carrier_damaged: unfulfillableCarrierDamaged,
              unfulfillable_defective: unfulfillableDefective,
              unfulfillable_expired: unfulfillableExpired,
            });
            
            console.log(`재고 정보: ${sku}`, {
              fba_inventory: fbaInventory,
              inbound_working: inboundWorking,
              inbound_shipped: inboundShipped,
              inbound_receiving: inboundReceiving,
              reserved_orders: reservedOrders,
              reserved_fc_transfer: reservedFcTransfer,
              reserved_fc_processing: reservedFcProcessing,
              researching_total: researchingTotal,
              researching_short_term: researchingShortTerm,
              researching_mid_term: researchingMidTerm,
              researching_long_term: researchingLongTerm,
              unfulfillable_total: unfulfillableTotal,
              unfulfillable_customer_damaged: unfulfillableCustomerDamaged,
              unfulfillable_warehouse_damaged: unfulfillableWarehouseDamaged,
              unfulfillable_distributor_damaged: unfulfillableDistributorDamaged,
              unfulfillable_carrier_damaged: unfulfillableCarrierDamaged,
              unfulfillable_defective: unfulfillableDefective,
              unfulfillable_expired: unfulfillableExpired,
            });
          }

          // 월별 데이터에 재고 상세 정보 추가
          for (const [key, data] of monthlyDataMap.entries()) {
            const inventoryDetails = inventoryDetailsMap.get(data.sku);
            if (inventoryDetails) {
              data.fba_inventory = inventoryDetails.fba_inventory;
              data.inbound_working = inventoryDetails.inbound_working;
              data.inbound_shipped = inventoryDetails.inbound_shipped;
              data.inbound_receiving = inventoryDetails.inbound_receiving;
              data.reserved_orders = inventoryDetails.reserved_orders;
              data.reserved_fc_transfer = inventoryDetails.reserved_fc_transfer;
              data.reserved_fc_processing = inventoryDetails.reserved_fc_processing;
              data.researching_total = inventoryDetails.researching_total;
              data.researching_short_term = inventoryDetails.researching_short_term;
              data.researching_mid_term = inventoryDetails.researching_mid_term;
              data.researching_long_term = inventoryDetails.researching_long_term;
              data.unfulfillable_total = inventoryDetails.unfulfillable_total;
              data.unfulfillable_customer_damaged = inventoryDetails.unfulfillable_customer_damaged;
              data.unfulfillable_warehouse_damaged = inventoryDetails.unfulfillable_warehouse_damaged;
              data.unfulfillable_distributor_damaged = inventoryDetails.unfulfillable_distributor_damaged;
              data.unfulfillable_carrier_damaged = inventoryDetails.unfulfillable_carrier_damaged;
              data.unfulfillable_defective = inventoryDetails.unfulfillable_defective;
              data.unfulfillable_expired = inventoryDetails.unfulfillable_expired;
            }
          }
        }
      }
      
        // Supabase에 저장
        for (const [key, data] of monthlyDataMap.entries()) {
          const { data: savedData, error } = await supabase
            .from('amazon_us_monthly_data')
            .upsert(data, {
              onConflict: 'sku,year,month',
            })
            .select();
          
          if (error) {
            console.error(`데이터 저장 실패 (${key}):`, error);
          } else {
            savedRecords.push(savedData);
            console.log(`데이터 저장 완료: ${key}`);
          }
        }
      }
      
      console.log(`총 ${savedRecords.length}개의 월별 데이터 저장 완료`);
    }

    // 5. 재고 정보 업데이트 (주문 데이터와 관계없이 항상 실행)
    let inventoryUpdated = 0;
    if (fetchInventory && inventoryData) {
      console.log("재고 정보 업데이트 중...");
      
      // 응답 구조: payload.inventorySummaries
      const summaries = inventoryData.payload?.inventorySummaries || [];
      
      if (summaries && Array.isArray(summaries) && summaries.length > 0) {
        const currentDate = new Date();
        const currentYear = targetYear || currentDate.getFullYear();
        const currentMonth = targetMonth || (currentDate.getMonth() + 1);

        for (const summary of summaries) {
          const sku = summary.sellerSku;
          if (!sku) {
            console.warn("재고 요약에 sellerSku가 없습니다:", summary);
            continue;
          }
          
          // 특정 SKU 필터링
          if (targetSku && sku !== targetSku) continue;
          
          // SKU가 sku_master에 존재하는지 확인
          const { data: skuMaster } = await supabase
            .from('sku_master')
            .select('sku, channel')
            .eq('sku', sku)
            .eq('channel', 'amazon_us')
            .single();
          
          if (!skuMaster) {
            console.warn(`SKU ${sku}가 sku_master에 없습니다. 건너뜁니다.`);
            continue;
          }

          // 재고 상태별 상세 정보 추출
          let fbaInventory = 0; // 판매 가능 재고 (fulfillableQuantity)
          let inboundWorking = 0;
          let inboundShipped = 0;
          let inboundReceiving = 0;
          let reservedOrders = 0;
          let reservedFcTransfer = 0;
          let reservedFcProcessing = 0;
          
          // Researching 재고 정보
          let researchingTotal = 0;
          let researchingShortTerm = 0;
          let researchingMidTerm = 0;
          let researchingLongTerm = 0;
          
          // Unfulfillable 재고 정보
          let unfulfillableTotal = 0;
          let unfulfillableCustomerDamaged = 0;
          let unfulfillableWarehouseDamaged = 0;
          let unfulfillableDistributorDamaged = 0;
          let unfulfillableCarrierDamaged = 0;
          let unfulfillableDefective = 0;
          let unfulfillableExpired = 0;
          
          if (summary.inventoryDetails) {
            // details=true인 경우 상세 정보 사용
            const details = summary.inventoryDetails;
            
            // 판매 가능 재고
            fbaInventory = details.fulfillableQuantity || 0;
            
            // 입고 중 재고
            inboundWorking = details.inboundWorkingQuantity || 0;
            inboundShipped = details.inboundShippedQuantity || 0;
            inboundReceiving = details.inboundReceivingQuantity || 0;
            
            // 예약된 재고
            if (details.reservedQuantity) {
              reservedOrders = details.reservedQuantity.pendingCustomerOrderQuantity || 0;
              reservedFcTransfer = details.reservedQuantity.pendingTransshipmentQuantity || 0;
              reservedFcProcessing = details.reservedQuantity.fcProcessingQuantity || 0;
            }
            
            // Researching 재고 정보 추출
            if (details.researchingQuantity) {
              researchingTotal = details.researchingQuantity.totalResearchingQuantity || 0;
              
              // researchingQuantityBreakdown에서 각 기간별 수량 추출
              if (details.researchingQuantity.researchingQuantityBreakdown) {
                for (const breakdown of details.researchingQuantity.researchingQuantityBreakdown) {
                  const name = breakdown.name?.toLowerCase() || '';
                  const quantity = breakdown.quantity || 0;
                  
                  if (name.includes('short')) {
                    researchingShortTerm = quantity;
                  } else if (name.includes('mid')) {
                    researchingMidTerm = quantity;
                  } else if (name.includes('long')) {
                    researchingLongTerm = quantity;
                  }
                }
              }
            }
            
            // Unfulfillable 재고 정보 추출
            if (details.unfulfillableQuantity) {
              unfulfillableTotal = details.unfulfillableQuantity.totalUnfulfillableQuantity || 0;
              unfulfillableCustomerDamaged = details.unfulfillableQuantity.customerDamagedQuantity || 0;
              unfulfillableWarehouseDamaged = details.unfulfillableQuantity.warehouseDamagedQuantity || 0;
              unfulfillableDistributorDamaged = details.unfulfillableQuantity.distributorDamagedQuantity || 0;
              unfulfillableCarrierDamaged = details.unfulfillableQuantity.carrierDamagedQuantity || 0;
              unfulfillableDefective = details.unfulfillableQuantity.defectiveQuantity || 0;
              unfulfillableExpired = details.unfulfillableQuantity.expiredQuantity || 0;
            }
          } else if (summary.totalQuantity !== undefined) {
            // details=false인 경우: totalQuantity만 사용 (판매 가능 재고로 간주)
            fbaInventory = summary.totalQuantity;
          }

          // 재고 정보 업데이트 (상세 정보 포함)
          const { error: updateError } = await supabase
            .from('amazon_us_monthly_data')
            .upsert({
              sku: sku,
              year: currentYear,
              month: currentMonth,
              fba_inventory: fbaInventory,
              inbound_working: inboundWorking,
              inbound_shipped: inboundShipped,
              inbound_receiving: inboundReceiving,
              reserved_orders: reservedOrders,
              reserved_fc_transfer: reservedFcTransfer,
              reserved_fc_processing: reservedFcProcessing,
              researching_total: researchingTotal,
              researching_short_term: researchingShortTerm,
              researching_mid_term: researchingMidTerm,
              researching_long_term: researchingLongTerm,
              unfulfillable_total: unfulfillableTotal,
              unfulfillable_customer_damaged: unfulfillableCustomerDamaged,
              unfulfillable_warehouse_damaged: unfulfillableWarehouseDamaged,
              unfulfillable_distributor_damaged: unfulfillableDistributorDamaged,
              unfulfillable_carrier_damaged: unfulfillableCarrierDamaged,
              unfulfillable_defective: unfulfillableDefective,
              unfulfillable_expired: unfulfillableExpired,
            }, {
              onConflict: 'sku,year,month',
            });

          if (!updateError) {
            inventoryUpdated++;
            console.log(`재고 정보 업데이트 완료: ${sku}`, {
              fba_inventory: fbaInventory,
              inbound_working: inboundWorking,
              inbound_shipped: inboundShipped,
              inbound_receiving: inboundReceiving,
              reserved_orders: reservedOrders,
              reserved_fc_transfer: reservedFcTransfer,
              reserved_fc_processing: reservedFcProcessing,
              researching_total: researchingTotal,
              researching_short_term: researchingShortTerm,
              researching_mid_term: researchingMidTerm,
              researching_long_term: researchingLongTerm,
              unfulfillable_total: unfulfillableTotal,
              unfulfillable_customer_damaged: unfulfillableCustomerDamaged,
              unfulfillable_warehouse_damaged: unfulfillableWarehouseDamaged,
              unfulfillable_distributor_damaged: unfulfillableDistributorDamaged,
              unfulfillable_carrier_damaged: unfulfillableCarrierDamaged,
              unfulfillable_defective: unfulfillableDefective,
              unfulfillable_expired: unfulfillableExpired,
            });
          } else {
            console.error(`재고 정보 업데이트 실패 (${sku}):`, updateError);
          }
        }
        
        console.log(`총 ${inventoryUpdated}개의 SKU 재고 정보 업데이트 완료`);
      } else {
        console.warn("재고 데이터가 없거나 빈 배열입니다.");
      }
    }

    // UI 표시를 위해 각 주문에 OrderItems 추가
    const ordersWithItems = (ordersData.Orders || []).map((order: any) => ({
      ...order,
      OrderItems: orderItemsMap.get(order.AmazonOrderId) || [],
    }));
    
    return NextResponse.json({
      success: true,
      orders: ordersWithItems,
      ordersCount: ordersWithItems.length,
      savedRecordsCount: savedRecords.length,
      savedRecords: savedRecords,
      inventoryData: inventoryData,
      inventoryUpdated: inventoryUpdated,
      timestamp: new Date().toISOString(),
    }, { status: 200 });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}