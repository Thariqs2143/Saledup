
"use client";

import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, QrCode, Users, Settings, ScanLine, History, User, Trophy, CalendarOff, BarChart3, type LucideIcon, Crown, Store, Gem, BookLock, Megaphone, Bell, Tag } from 'lucide-react';


const iconMap: { [key: string]: LucideIcon } = {
  LayoutDashboard,
  QrCode,
  Users,
  Settings,
  ScanLine,
  History,
  User,
  Trophy,
  CalendarOff,
  BarChart3,
  Crown,
  Store,
  Gem,
  BookLock,
  Megaphone,
  Bell,
  Tag,
};


export type NavItem = {
  href: string;
  label: string;
  icon?: LucideIcon;
  iconName?: string;
};

type BottomNavProps = {
  navItems: NavItem[];
};

export function BottomNav({ navItems }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleNavigate = (href: string) => {
    router.push(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm md:hidden">
      <div className="flex h-16 justify-evenly">
        {navItems.map((item) => {
          const Icon = item.iconName ? iconMap[item.iconName] : item.icon;
          const isHomePage = item.href === '/admin' || item.href === '/employee' || item.href === '/super-admin';
          const isActive = isHomePage
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <button
              key={item.href}
              onClick={() => handleNavigate(item.href)}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
              )}
            >
              {Icon && <Icon className="h-6 w-6" />}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
