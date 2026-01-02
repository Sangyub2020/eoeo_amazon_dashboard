'use client';

import { SalesData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface SKUTableProps {
  data: SalesData[];
  title?: string;
}

export function SKUTable({ data, title = 'SKU별 상세 데이터' }: SKUTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ko-KR');
  };

  const getMarketplaceName = (marketplace: string) => {
    const names: Record<string, string> = {
      amazon_us: 'Amazon US',
      tiktok_shop: 'TikTok Shop',
    };
    return names[marketplace] || marketplace;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">날짜</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">마켓플레이스</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">SKU</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">상품명</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">수량</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">매출</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">비용</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">이익</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                data.map((row, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4">{formatDate(row.date)}</td>
                    <td className="py-3 px-4">{getMarketplaceName(row.marketplace)}</td>
                    <td className="py-3 px-4 font-mono text-xs">{row.sku}</td>
                    <td className="py-3 px-4">{row.product_name || '-'}</td>
                    <td className="py-3 px-4 text-right">
                      {row.quantity ? row.quantity.toLocaleString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {formatCurrency(Number(row.revenue))}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {formatCurrency(Number(row.cost))}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-semibold ${
                        Number(row.profit) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(Number(row.profit))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}




