'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, Music, Settings } from 'lucide-react';
import { Marketplace } from '@/lib/types';

interface MenuItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  marketplace?: Marketplace;
  isAdmin?: boolean;
}

const menuItems: MenuItem[] = [
  {
    name: 'Home',
    href: '/dashboard',
    icon: <Home className="w-5 h-5" />,
    marketplace: 'all',
  },
  {
    name: 'Amazon US',
    href: '/dashboard/amazon-us',
    icon: <ShoppingBag className="w-5 h-5" />,
    marketplace: 'amazon_us',
  },
  {
    name: 'TikTok Shop',
    href: '/dashboard/tiktok-shop',
    icon: <Music className="w-5 h-5" />,
    marketplace: 'tiktok_shop',
  },
];

const adminMenuItems: MenuItem[] = [
  {
    name: '계정 마스터',
    href: '/admin/account-master',
    icon: <Settings className="w-5 h-5" />,
    isAdmin: true,
  },
  {
    name: '제품 마스터',
    href: '/admin/product-master',
    icon: <Settings className="w-5 h-5" />,
    isAdmin: true,
  },
  {
    name: 'SKU 마스터',
    href: '/admin/sku-master',
    icon: <Settings className="w-5 h-5" />,
    isAdmin: true,
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold">이공이공</h1>
        <p className="text-sm text-gray-400">온라인사업부 대시보드</p>
      </div>

      <nav className="space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }
              `}
            >
              {item.icon}
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}

        {/* 관리자 메뉴 구분선 */}
        <div className="pt-4 mt-4 border-t border-gray-700">
          <p className="px-4 text-xs font-semibold text-gray-400 uppercase mb-2">
            관리자
          </p>
          {adminMenuItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                  ${
                    isActive
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }
                `}
              >
                {item.icon}
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

