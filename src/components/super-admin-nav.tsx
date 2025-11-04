
'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Gem, LayoutDashboard, Users, Store, type LucideIcon, User, BookLock, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavItem } from './bottom-nav';

const iconMap: { [key: string]: LucideIcon } = {
  LayoutDashboard,
  Users,
  Store,
  Gem,
  User,
  BookLock,
  Megaphone,
};

type SuperAdminNavProps = {
  navItems: NavItem[];
};

export function SuperAdminNav({ navItems }: SuperAdminNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleNavigate = (href: string) => {
    router.push(href);
  };

  return (
    <div className="hidden border-r bg-muted/40 md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <button onClick={() => handleNavigate('/super-admin')} className="flex items-center gap-2 font-semibold">
            <Gem className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg text-primary">Super Admin</span>
          </button>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {navItems.map((item) => {
              const Icon = item.iconName ? iconMap[item.iconName] : null;
              const isActive = (item.href === '/super-admin' && pathname === item.href) || (item.href !== '/super-admin' && pathname.startsWith(item.href));
              return (
                <button
                  key={item.href}
                  onClick={() => handleNavigate(item.href)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary text-left',
                    isActive && 'bg-muted text-primary font-semibold'
                  )}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}

