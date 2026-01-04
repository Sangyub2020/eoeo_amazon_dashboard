'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { OnlineCommerceMonthlyChart } from '@/components/online-commerce/online-commerce-monthly-chart';
import { OnlineCommerceListView } from '@/components/online-commerce/online-commerce-list-view';
import { OnlineCommerceOutstanding } from '@/components/online-commerce/online-commerce-outstanding';
import { OnlineCommerceAdvanceBalanceList } from '@/components/online-commerce/online-commerce-advance-balance-list';

export default function OnlineCommercePage() {
  return (
    <div className="p-8 min-h-screen bg-[#121212]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
          서비스 매출 관리
        </h1>
        <p className="text-gray-400 mt-2">서비스 매출 정보를 조회합니다</p>
        <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
          <p className="text-sm text-yellow-400">
            <strong>참고:</strong> EOEO All income Dashboard의 데이터를 그대로 가져온다. 수정, 추가는 해당 앱에서 진행.
          </p>
        </div>
      </div>
      <Tabs defaultValue="monthly" className="w-full">
        <TabsList>
          <TabsTrigger value="monthly">월별 현황</TabsTrigger>
          <TabsTrigger value="list">목록</TabsTrigger>
          <TabsTrigger value="outstanding">미수금 현황</TabsTrigger>
          <TabsTrigger value="advance-balance">선/잔금 관리</TabsTrigger>
        </TabsList>
        <TabsContent value="monthly">
          <OnlineCommerceMonthlyChart />
        </TabsContent>
        <TabsContent value="list">
          <OnlineCommerceListView />
        </TabsContent>
        <TabsContent value="outstanding">
          <OnlineCommerceOutstanding />
        </TabsContent>
        <TabsContent value="advance-balance">
          <OnlineCommerceAdvanceBalanceList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

