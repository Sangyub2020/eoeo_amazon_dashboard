'use client';

import { useState } from 'react';
import { AmazonOrder, FetchAmazonOrdersRequest } from '@/lib/types/amazon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export function AmazonOrdersFetcher() {
  // 주문 정보 (OrderMetrics) 관련 상태
  const [isLoading, setIsLoading] = useState(false);
  const [orders, setOrders] = useState<AmazonOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [responseData, setResponseData] = useState<any>(null);

  // Fee 정보 관련 상태
  const [isLoadingFees, setIsLoadingFees] = useState(false);
  const [feesError, setFeesError] = useState<string | null>(null);
  const [feesSuccess, setFeesSuccess] = useState(false);
  const [feesResponseData, setFeesResponseData] = useState<any>(null);

  // 재고 정보 관련 상태
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [inventorySuccess, setInventorySuccess] = useState(false);
  const [inventoryResponseData, setInventoryResponseData] = useState<any>(null);
  
  // 필터링 옵션
  const [targetSku, setTargetSku] = useState('');
  const [targetYear, setTargetYear] = useState<number | ''>('');
  const [targetMonth, setTargetMonth] = useState<number | ''>('');
  
  // 환불 정보 조회 관련 상태
  const [isLoadingRefunds, setIsLoadingRefunds] = useState(false);
  const [refundsData, setRefundsData] = useState<any>(null);
  const [refundsError, setRefundsError] = useState<string | null>(null);
  const [refundsYear, setRefundsYear] = useState(new Date().getFullYear());
  const [refundsMonth, setRefundsMonth] = useState(new Date().getMonth() + 1);
  const [refundsSku, setRefundsSku] = useState('');
  const [refundsMaxPages, setRefundsMaxPages] = useState(100);

  const handleFetchRefunds = async () => {
    setIsLoadingRefunds(true);
    setRefundsError(null);
    setRefundsData(null);

    try {
      // 해당 월의 시작일과 종료일을 ISO8601 형식으로 계산
      const startDate = `${refundsYear}-${String(refundsMonth).padStart(2, '0')}-01T00:00:00Z`;
      const lastDay = new Date(refundsYear, refundsMonth, 0).getDate();
      const endDate = `${refundsYear}-${String(refundsMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59Z`;

      // Next.js API Route 호출 (Financial Events API 사용)
      const response = await fetch('/api/fetch-amazon-refunds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postedAfter: startDate,
          postedBefore: endDate,
          sku: refundsSku || undefined, // 빈 문자열이면 undefined
          maxPages: refundsMaxPages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'API 호출 실패' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data || !data.success) {
        throw new Error(data?.error || '환불 정보를 가져오는데 실패했습니다.');
      }

      setRefundsData(data.data);
      console.log('환불 정보 조회 결과:', data.data);
    } catch (err: any) {
      console.error('Error fetching refunds:', err);
      setRefundsError(err.message || '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoadingRefunds(false);
    }
  };

  // 주문 정보 가져오기 (OrderMetrics)
  const handleFetchOrderMetrics = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    setOrders([]);

    try {
      const response = await fetch('/api/fetch-amazon-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          marketplaceIds: ['ATVPDKIKX0DER'],
          sku: targetSku.trim() || undefined,
          year: targetYear || undefined,
          month: targetMonth || undefined,
          saveToDatabase: true,
          fetchOrderMetrics: true, // 주문 정보만
          fetchFees: false,
          fetchInventory: false,
          fetchOrderList: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'API 호출 실패' }));
        // 더 자세한 에러 메시지 표시
        const errorMessage = errorData.note || errorData.error || `HTTP error! status: ${response.status}`;
        console.error('API 에러 상세:', errorData);
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data || !data.success) {
        throw new Error(data?.error || '주문 데이터를 가져오는데 실패했습니다.');
      }

      // 주문 데이터 추출 - API Route는 orders 배열을 직접 반환합니다
      const ordersData = data.orders || [];
      setOrders(ordersData);
      setResponseData(data); // 응답 데이터 저장
      
      // 디버깅: 응답 데이터 로그 출력
      console.log('API Route 응답 데이터:', {
        ordersCount: ordersData.length,
        savedRecordsCount: data.savedRecordsCount,
        inventoryUpdated: data.inventoryUpdated,
        inventoryData: data.inventoryData,
        fullResponse: data
      });
      
      setSuccess(true);
    } catch (err: any) {
      console.error('Error fetching Amazon orders:', err);
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
      setSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Fee 정보 가져오기 (FeesEstimate)
  const handleFetchFees = async () => {
    setIsLoadingFees(true);
    setFeesError(null);
    setFeesSuccess(false);

    try {
      const response = await fetch('/api/fetch-amazon-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          marketplaceIds: ['ATVPDKIKX0DER'],
          sku: targetSku.trim() || undefined,
          year: targetYear || undefined,
          month: targetMonth || undefined,
          saveToDatabase: true,
          fetchOrderMetrics: false,
          fetchFees: true, // Fee 정보만
          fetchInventory: false,
          fetchOrderList: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'API 호출 실패' }));
        const errorMessage = errorData.note || errorData.error || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data || !data.success) {
        throw new Error(data?.error || 'Fee 정보를 가져오는데 실패했습니다.');
      }

      setFeesResponseData(data);
      setFeesSuccess(true);
    } catch (err: any) {
      console.error('Error fetching fees:', err);
      setFeesError(err.message || '알 수 없는 오류가 발생했습니다.');
      setFeesSuccess(false);
    } finally {
      setIsLoadingFees(false);
    }
  };

  // 재고 정보 가져오기 (FBA Inventory)
  const handleFetchInventory = async () => {
    setIsLoadingInventory(true);
    setInventoryError(null);
    setInventorySuccess(false);

    try {
      const response = await fetch('/api/fetch-amazon-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          marketplaceIds: ['ATVPDKIKX0DER'],
          sku: targetSku.trim() || undefined,
          year: targetYear || undefined,
          month: targetMonth || undefined,
          saveToDatabase: true,
          fetchOrderMetrics: false,
          fetchFees: false,
          fetchInventory: true, // 재고 정보만
          fetchOrderList: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'API 호출 실패' }));
        const errorMessage = errorData.note || errorData.error || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data || !data.success) {
        throw new Error(data?.error || '재고 정보를 가져오는데 실패했습니다.');
      }

      setInventoryResponseData(data);
      setInventorySuccess(true);
    } catch (err: any) {
      console.error('Error fetching inventory:', err);
      setInventoryError(err.message || '알 수 없는 오류가 발생했습니다.');
      setInventorySuccess(false);
    } finally {
      setIsLoadingInventory(false);
    }
  };

  const formatCurrency = (amount?: string, currencyCode?: string) => {
    if (!amount) return '-';
    const numAmount = parseFloat(amount);
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: currencyCode || 'USD',
    }).format(numAmount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getOrderStatusBadgeColor = (status?: string) => {
    switch (status) {
      case 'Shipped':
        return 'bg-green-100 text-green-800';
      case 'Pending':
      case 'Unshipped':
        return 'bg-yellow-100 text-yellow-800';
      case 'Canceled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Amazon 주문 데이터 가져오기</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 필터링 옵션 */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    특정 SKU (선택사항)
                  </label>
                  <input
                    type="text"
                    value={targetSku}
                    onChange={(e) => setTargetSku(e.target.value)}
                    placeholder="SKU 코드 입력"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    비워두면 모든 SKU에 대해 업데이트
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    연도 (선택사항)
                  </label>
                  <input
                    type="number"
                    value={targetYear}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTargetYear(val === '' ? '' : parseInt(val) || '');
                    }}
                    placeholder="연도 입력 (예: 2025)"
                    min="2020"
                    max="2099"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    비워두면 모든 기간에 대해 업데이트
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    월 (선택사항)
                  </label>
                  <select
                    value={targetMonth}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTargetMonth(val === '' ? '' : parseInt(val));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={isLoading}
                  >
                    <option value="">전체</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {m}월
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    비워두면 모든 기간에 대해 업데이트
                  </p>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>참고:</strong> Marketplace ID는 US (ATVPDKIKX0DER)로 고정되어 있으며, 
                  모든 데이터는 자동으로 Supabase에 저장됩니다.
                </p>
              </div>
            </div>

            {/* 버튼들 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={handleFetchOrderMetrics}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    가져오는 중...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    주문 정보 가져오기
                  </>
                )}
              </button>

              <button
                onClick={handleFetchFees}
                disabled={isLoadingFees}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoadingFees ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    가져오는 중...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Fee 정보 가져오기
                  </>
                )}
              </button>

              <button
                onClick={handleFetchInventory}
                disabled={isLoadingInventory}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoadingInventory ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    가져오는 중...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    재고 정보 가져오기
                  </>
                )}
              </button>
            </div>

            {/* 성공/에러 메시지 */}
            {success && (
              <div className="flex items-center gap-2 p-3 bg-green-50 text-green-800 rounded-md">
                <CheckCircle2 className="w-5 h-5" />
                <div className="flex-1">
                  <p>{orders.length}개의 주문을 성공적으로 가져왔습니다.</p>
                  {responseData?.savedRecordsCount !== undefined && (
                    <p className="text-sm mt-1">
                      {responseData.savedRecordsCount}개의 월별 데이터가 Supabase에 저장되었습니다.
                    </p>
                  )}
                  {responseData?.processedOrderCount !== undefined && (
                    <p className="text-sm mt-1 text-blue-600">
                      {responseData.processedOrderCount}개의 주문을 처리했습니다.
                      {responseData.hasMoreOrders && (
                        <span className="text-orange-600 ml-1">
                          (더 많은 주문이 있습니다. 다시 실행하여 나머지를 처리하세요)
                        </span>
                      )}
                    </p>
                  )}
                  {responseData?.inventoryUpdated !== undefined && responseData.inventoryUpdated > 0 && (
                    <p className="text-sm mt-1 text-blue-600">
                      ✅ {responseData.inventoryUpdated}개의 SKU 재고 정보가 업데이트되었습니다.
                    </p>
                  )}
                  {responseData?.inventoryData && (
                    <p className="text-sm mt-1 text-blue-600">
                      ✅ 재고 데이터를 성공적으로 가져왔습니다. (상세 정보는 콘솔에서 확인하세요)
                    </p>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-800 rounded-md">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 주문 데이터 테이블 */}
      {orders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>주문 목록 ({orders.length}개)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">주문 ID</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">구매일</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">상태</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">SKU</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">주문 금액</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">수량</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">제품명</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.AmazonOrderId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-mono text-gray-900">
                        {order.AmazonOrderId}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatDate(order.PurchaseDate)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getOrderStatusBadgeColor(
                            order.OrderStatus
                          )}`}
                        >
                          {order.OrderStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {order.OrderItems?.[0]?.SellerSKU || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-gray-900">
                        {(() => {
                          // OrderTotal이 있으면 사용
                          if (order.OrderTotal?.Amount) {
                            return formatCurrency(
                              order.OrderTotal.Amount,
                              order.OrderTotal.CurrencyCode
                            );
                          }
                          // Pending 상태일 때는 OrderItems의 가격 합산 시도
                          if (order.OrderItems && order.OrderItems.length > 0) {
                            const totalAmount = order.OrderItems.reduce((sum: number, item: any) => {
                              const itemPrice = parseFloat(item.ItemPrice?.Amount || '0');
                              const shippingPrice = parseFloat(item.ShippingPrice?.Amount || '0');
                              const itemTax = parseFloat(item.ItemTax?.Amount || '0');
                              const shippingTax = parseFloat(item.ShippingTax?.Amount || '0');
                              return sum + itemPrice + shippingPrice + itemTax + shippingTax;
                            }, 0);
                            if (totalAmount > 0) {
                              return formatCurrency(
                                totalAmount.toString(),
                                order.OrderItems[0]?.ItemPrice?.CurrencyCode || 'USD'
                              );
                            }
                          }
                          return '-';
                        })()}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-gray-600">
                        {order.OrderItems?.reduce((sum, item) => sum + item.QuantityOrdered, 0) || 0}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {order.OrderItems?.[0]?.Title || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 환불 정보 조회 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle>환불 정보 조회</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  SKU (선택사항)
                </label>
                <input
                  type="text"
                  value={refundsSku}
                  onChange={(e) => setRefundsSku(e.target.value)}
                  placeholder="SKU 코드 입력"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={isLoadingRefunds}
                />
                <p className="text-xs text-gray-500 mt-1">
                  비워두면 전체 SKU
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  연도
                </label>
                <input
                  type="number"
                  value={refundsYear}
                  onChange={(e) => setRefundsYear(parseInt(e.target.value) || new Date().getFullYear())}
                  min="2020"
                  max="2099"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={isLoadingRefunds}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  월
                </label>
                <select
                  value={refundsMonth}
                  onChange={(e) => setRefundsMonth(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={isLoadingRefunds}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {m}월
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  최대 페이지 수
                </label>
                <input
                  type="number"
                  value={refundsMaxPages}
                  onChange={(e) => setRefundsMaxPages(parseInt(e.target.value) || 100)}
                  min="1"
                  max="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={isLoadingRefunds}
                />
                <p className="text-xs text-gray-500 mt-1">
                  기본값: 100 (약 200초)
                </p>
              </div>
            </div>

            <button
              onClick={handleFetchRefunds}
              disabled={isLoadingRefunds}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoadingRefunds ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  환불 정보 조회 중...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  환불 정보 조회
                </>
              )}
            </button>

            {/* 환불 정보 결과 */}
            {refundsData && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-green-50 text-green-800 rounded-md">
                  <CheckCircle2 className="w-5 h-5" />
                  <div className="flex-1">
                    <p className="font-semibold">
                      총 환불 금액: {formatCurrency(refundsData.totalRefunds.toString(), 'USD')}
                    </p>
                    <p className="text-sm mt-1">
                      처리된 페이지: {refundsData.pageCount}페이지
                      {refundsData.hasMore && (
                        <span className="text-orange-600 ml-1">
                          (더 많은 데이터가 있습니다. maxPages를 늘려서 다시 조회하세요)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* 환불 이벤트 요약 */}
                {refundsData.events && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {refundsData.events.refunds && refundsData.events.refunds.length > 0 && (
                      <div className="p-3 bg-blue-50 rounded-md">
                        <p className="text-sm font-semibold text-blue-900">
                          환불 이벤트: {refundsData.events.refunds.length}건
                        </p>
                      </div>
                    )}
                    {refundsData.events.chargebacks && refundsData.events.chargebacks.length > 0 && (
                      <div className="p-3 bg-red-50 rounded-md">
                        <p className="text-sm font-semibold text-red-900">
                          차지백 이벤트: {refundsData.events.chargebacks.length}건
                        </p>
                      </div>
                    )}
                    {refundsData.events.shipments && refundsData.events.shipments.length > 0 && (
                      <div className="p-3 bg-yellow-50 rounded-md">
                        <p className="text-sm font-semibold text-yellow-900">
                          배송 수수료 이벤트: {refundsData.events.shipments.length}건
                        </p>
                      </div>
                    )}
                    {refundsData.events.serviceFees && refundsData.events.serviceFees.length > 0 && (
                      <div className="p-3 bg-gray-50 rounded-md">
                        <p className="text-sm font-semibold text-gray-900">
                          서비스 수수료 이벤트: {refundsData.events.serviceFees.length}건
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 상세 정보는 콘솔에서 확인 가능 */}
                <p className="text-xs text-gray-500">
                  상세 정보는 브라우저 콘솔에서 확인할 수 있습니다.
                </p>
              </div>
            )}

            {refundsError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-800 rounded-md">
                <AlertCircle className="w-5 h-5" />
                <span>{refundsError}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



