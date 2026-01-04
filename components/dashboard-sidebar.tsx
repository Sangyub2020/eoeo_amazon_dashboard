'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, Music, Settings, ChevronDown, ChevronRight, DollarSign } from 'lucide-react';
import { Marketplace } from '@/lib/types';
import { useState } from 'react';

interface MenuItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  marketplace?: Marketplace;
  isAdmin?: boolean;
  children?: MenuItem[];
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
    href: '/dashboard/amazon-us/sales-profit',
    icon: <ShoppingBag className="w-5 h-5" />,
    marketplace: 'amazon_us',
    children: [
      {
        name: 'Sales 현황',
        href: '/dashboard/amazon-us/sales-profit',
        icon: <ShoppingBag className="w-4 h-4" />,
      },
      {
        name: '재고 현황',
        href: '/dashboard/amazon-us/inventory',
        icon: <ShoppingBag className="w-4 h-4" />,
      },
      {
        name: '데이터 호출',
        href: '/dashboard/amazon-us/data-fetch',
        icon: <ShoppingBag className="w-4 h-4" />,
      },
      {
        name: '계정 비용 관리',
        href: '/dashboard/amazon-us/account-costs',
        icon: <DollarSign className="w-4 h-4" />,
      },
    ],
  },
  {
    name: 'TikTok Shop',
    href: '/dashboard/tiktok-shop',
    icon: <Music className="w-5 h-5" />,
    marketplace: 'tiktok_shop',
  },
  {
    name: '서비스 매출',
    href: '/dashboard/online-commerce',
    icon: <DollarSign className="w-5 h-5" />,
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
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(
    new Set(pathname?.startsWith('/dashboard/amazon-us') ? ['amazon-us'] : [])
  );

  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(menuName)) {
        newSet.delete(menuName);
      } else {
        newSet.add(menuName);
      }
      return newSet;
    });
  };

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen p-4 flex-shrink-0" style={{ width: '16rem', minWidth: '16rem', maxWidth: '16rem' }}>
      <div className="mb-8">
        <h1 className="text-xl font-bold">이공이공</h1>
        <p className="text-sm text-gray-400">온라인사업부 대시보드</p>
      </div>

      <nav className="space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.children && item.children.some(child => pathname === child.href));
          const menuKey = item.name.toLowerCase().replace(/\s+/g, '-');
          const isExpanded = item.children ? expandedMenus.has(menuKey) : false;
          const hasChildren = item.children && item.children.length > 0;

          return (
            <div key={item.href}>
              <div className="flex items-center">
                {hasChildren ? (
                  <>
                    <button
                      onClick={() => toggleMenu(menuKey)}
                      className="p-1 hover:bg-gray-800 rounded"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    <div
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-lg transition-colors flex-1 cursor-pointer
                        ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        }
                      `}
                      onClick={() => toggleMenu(menuKey)}
                    >
                      {item.icon}
                      <span className="font-medium">{item.name}</span>
                    </div>
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg transition-colors flex-1
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
                )}
              </div>
              {hasChildren && isExpanded && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.children!.map((child) => {
                    const isChildActive = pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`
                          flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm
                          ${
                            isChildActive
                              ? 'bg-blue-700 text-white'
                              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                          }
                        `}
                      >
                        {child.icon}
                        <span>{child.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
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

