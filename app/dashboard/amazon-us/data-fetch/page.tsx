import { AmazonUSTabs } from '@/components/amazon-us-tabs';

export default async function AmazonUSDataFetchPage() {
  return (
    <div className="min-h-screen bg-[#121212] p-6">
      <div className="space-y-6">
        <AmazonUSTabs activeTab="data-fetch" dashboardContent={null} />
      </div>
    </div>
  );
}


