
'use client';

import { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { BottomNav, type NavItem } from '@/components/bottom-nav';
import Link from 'next/link';
import { Gem, Loader2, PanelLeft } from 'lucide-react';
import { SuperAdminNav } from '@/components/super-admin-nav';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

const fullSuperAdminNavItems: NavItem[] = [
  { href: '/super-admin', label: 'Home', iconName: 'LayoutDashboard' },
  { href: '/super-admin/shops', label: 'Shops', iconName: 'Store' },
  { href: '/super-admin/employees', label: 'Staffs', iconName: 'Users' },
  { href: '/super-admin/subscriptions', label: 'Pricing', iconName: 'Gem' },
  { href: '/super-admin/announcements', label: 'Broadcast', iconName: 'Megaphone' },
  { href: '/super-admin/audit-log', label: 'Security', iconName: 'BookLock' },
  { href: '/super-admin/profile', label: 'Profile', iconName: 'User' },
];

const mobileBottomNavItems: NavItem[] = [
  { href: '/super-admin', label: 'Home', iconName: 'LayoutDashboard' },
  { href: '/super-admin/shops', label: 'Shops', iconName: 'Store' },
  { href: '/super-admin/subscriptions', label: 'Pricing', iconName: 'Gem' },
  { href: '/super-admin/employees', label: 'Staffs', iconName: 'Users' },
  { href: '/super-admin/profile', label: 'Profile', iconName: 'User' },
];

export default function SuperAdminLayout({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const authStatus = localStorage.getItem('superAdminAuthenticated') === 'true';
    setIsAuthenticated(authStatus);
  }, []);

  useEffect(() => {
    if (hydrated && pathname !== '/super-admin/login' && !isAuthenticated) {
      router.replace('/super-admin/login');
    }
  }, [pathname, router, hydrated, isAuthenticated]);


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

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen w-full">
      <SuperAdminNav navItems={fullSuperAdminNavItems} isDesktop={true} />

      <div className="flex flex-col flex-1 md:ml-60">
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden sticky top-0 z-40">
          <Sheet>
            <SheetTrigger asChild>
                <Button size="icon" variant="outline" className="sm:hidden">
                    <PanelLeft className="h-5 w-5" />
                    <span className="sr-only">Toggle Menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs p-0">
                <SheetTitle className="sr-only">Super Admin Menu</SheetTitle>
                <SuperAdminNav navItems={fullSuperAdminNavItems} isDesktop={false} />
            </SheetContent>
          </Sheet>
          <Link href="/super-admin" className="flex items-center gap-2">
            <Gem className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Super Admin</span>
          </Link>
        </header>

        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
      <BottomNav navItems={mobileBottomNavItems} />
    </div>
  );
}
