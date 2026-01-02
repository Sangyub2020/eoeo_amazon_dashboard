import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { SyncButton } from '@/app/api/sync/button';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardSidebar />
      <main className="flex-1 p-8">
        <div className="mb-6 flex justify-end">
          <SyncButton />
        </div>
        {children}
      </main>
    </div>
  );
}

