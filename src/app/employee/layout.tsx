
'use client';

import type { PropsWithChildren } from 'react';
import { usePathname } from 'next/navigation';
import { BottomNav, type NavItem } from '@/components/bottom-nav';
import Link from 'next/link';
import { EmployeeNav } from '@/components/employee-nav';
import { User, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

const employeeNavItems: NavItem[] = [
  { href: '/employee', label: 'Scan', iconName: 'ScanLine' },
  { href: '/employee/history', label: 'History', iconName: 'History' },
  { href: '/employee/leave', label: 'Leave', iconName: 'CalendarOff' },
  { href: '/employee/rewards', label: 'Rewards', iconName: 'Trophy' },
  { href: '/employee/profile', label: 'Profile', iconName: 'User' },
];

export default function EmployeeLayout({ children }: PropsWithChildren) {
  const pathname = usePathname();
  if (pathname === '/employee/login' || pathname === '/employee/complete-profile') {
    return <>{children}</>
  }
  
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr]">
      <EmployeeNav navItems={employeeNavItems} />
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden sticky top-0 z-40">
          <h1 className="font-bold text-xl text-primary">Attendry Staffs</h1>
           <div className="ml-auto flex items-center gap-2">
             <Link href="/employee/notifications">
                <Button variant="ghost" size="icon">
                    <Bell className="h-5 w-5" />
                    <span className="sr-only">Notifications</span>
                </Button>
            </Link>
           </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
      <BottomNav navItems={employeeNavItems} />
    </div>
  );
}
