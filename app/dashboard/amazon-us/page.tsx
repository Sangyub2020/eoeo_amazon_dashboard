import { redirect } from 'next/navigation';

export default async function AmazonUSPage() {
  // 기본 페이지는 매출 이익 현황으로 리다이렉트
  redirect('/dashboard/amazon-us/sales-profit');
}



