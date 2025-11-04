
"use client";
import { useRouter, usePathname } from 'next/navigation';
import { User as UserIcon, ScanLine, History, Trophy, CalendarOff, type LucideIcon, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavItem } from './bottom-nav';
import { Button } from './ui/button';
import Link from 'next/link';


const iconMap: { [key: string]: LucideIcon } = {
    ScanLine,
    History,
    User: UserIcon,
    Trophy,
    CalendarOff,
    Bell,
};


type EmployeeNavProps = {
  navItems: NavItem[];
};

export function EmployeeNav({ navItems }: EmployeeNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleNavigate = (href: string) => {
    router.push(href);
  };

  return (
    <div className="hidden border-r bg-muted/40 md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <button onClick={() => handleNavigate('/employee')} className="flex items-center gap-2 font-semibold">
            <UserIcon className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg text-primary">Attendry</span>
          </button>
          <div className="ml-auto">
             <Link href="/employee/notifications">
                <Button variant="ghost" size="icon">
                    <Bell className="h-5 w-5" />
                    <span className="sr-only">Notifications</span>
                </Button>
            </Link>
           </div>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {navItems.map((item) => {
                const Icon = item.iconName ? iconMap[item.iconName] : null;
                const isActive = (item.href === '/employee' && pathname === item.href) || (item.href !== '/employee' && pathname.startsWith(item.href));

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
