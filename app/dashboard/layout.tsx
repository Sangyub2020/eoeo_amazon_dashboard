import { DashboardSidebar } from '@/components/dashboard-sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#121212] overflow-x-hidden custom-scrollbar">
      <DashboardSidebar />
      <main className="flex-1 p-8 min-w-0 overflow-x-hidden">
        <div className="w-full min-w-0 overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}

