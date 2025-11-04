
'use client';

import { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { BottomNav, type NavItem } from '@/components/bottom-nav';
import Link from 'next/link';
import { Gem, Loader2 } from 'lucide-react';
import { SuperAdminNav } from '@/components/super-admin-nav';

const superAdminNavItems: NavItem[] = [
  { href: '/super-admin', label: 'Home', iconName: 'LayoutDashboard' },
  { href: '/super-admin/shops', label: 'Shops', iconName: 'Store' },
  { href: '/super-admin/employees', label: 'Staffs', iconName: 'Users' },
  { href: '/super-admin/subscriptions', label: 'Pricing', iconName: 'Gem' },
  { href: '/super-admin/announcements', label: 'Broadcast', iconName: 'Megaphone' },
  { href: '/super-admin/audit-log', label: 'Security', iconName: 'BookLock' },
  { href: '/super-admin/profile', label: 'Profile', iconName: 'User' },
];

export default function SuperAdminLayout({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    const isAuthenticated = localStorage.getItem('superAdminAuthenticated');
    if (pathname !== '/super-admin/login' && isAuthenticated !== 'true') {
      router.replace('/super-admin/login');
    }
  }, [pathname, router, hydrated]);


  if (pathname === '/super-admin/login') {
    return <>{children}</>;
  }

  if (!hydrated) {
      return (
        <div className="flex items-center justify-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr]">
      <SuperAdminNav navItems={superAdminNavItems} />
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden sticky top-0 z-40">
          <Link href="/super-admin">
            <Gem className="h-8 w-8 text-primary" />
            <span className="sr-only">Super Admin</span>
          </Link>
          <h1 className="font-semibold text-lg">Super Admin Panel</h1>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
      <BottomNav navItems={superAdminNavItems} />
    </div>
  );
}
