
'use client';

import { useRouter, usePathname } from 'next/navigation';
import {
  User as UserIcon,
  ScanLine,
  History,
  Trophy,
  CalendarOff,
  Bell,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavItem } from './bottom-nav';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { User } from '@/app/admin/employees/page';
import Link from 'next/link';

const iconMap: Record<string, LucideIcon> = {
  ScanLine,
  History,
  User: UserIcon,
  Trophy,
  CalendarOff,
  Bell,
};

type EmployeeNavProps = {
  navItems: NavItem[];
  profile: User | null;
};

export function EmployeeNav({ navItems, profile }: EmployeeNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const handleNavigate = (href: string) => router.push(href);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Logged Out' });
      router.push('/login');
    } catch {
      toast({ title: 'Logout Failed', variant: 'destructive' });
    }
  };

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col border-r bg-background z-40">
      {/* Logo Section */}
      <div className="flex h-16 items-center border-b px-6 shrink-0">
        <button
          onClick={() => handleNavigate('/employee')}
          className="flex items-center gap-2 font-semibold"
        >
          <UserIcon className="h-8 w-8 text-primary" />
          <span className="font-bold text-2xl text-primary tracking-wider">
            Attendry
          </span>
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.iconName ? iconMap[item.iconName] : null;
          const isActive =
            (item.href === '/employee' && pathname === item.href) ||
            (item.href !== '/employee' && pathname.startsWith(item.href));

          return (
            <button
              key={item.href}
              onClick={() => handleNavigate(item.href)}
              className={cn(
                'w-full flex items-center gap-3 rounded-lg px-4 py-3 text-muted-foreground transition-all hover:text-primary text-base',
                isActive &&
                  'bg-primary text-primary-foreground hover:text-primary-foreground font-semibold'
              )}
            >
              {Icon && <Icon className="h-5 w-5" />}
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer Section */}
      <div className="mt-auto p-4 space-y-2 border-t">
         <Link href="/employee/profile">
            <div className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-muted">
              <Avatar className="h-10 w-10 border-2 border-primary">
                <AvatarImage src={profile?.imageUrl} />
                <AvatarFallback>{profile?.fallback || 'EM'}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold text-foreground truncate">
                  {profile?.name || 'Employee'}
                </span>
                <span className="text-xs text-muted-foreground truncate">{profile?.shopName || 'My Shop'}</span>
              </div>
            </div>
          </Link>
          <Button variant="ghost" className="w-full justify-start h-auto p-2 border bg-red-100 text-red-700 hover:bg-red-600 hover:text-white active:bg-red-800 active:text-white dark:bg-red-900/50 dark:text-red-400 dark:hover:bg-red-800 dark:hover:text-white dark:active:bg-red-900 dark:active:text-white" onClick={handleLogout}>
            <LogOut className="h-5 w-5 mr-3" />
            <span className="font-semibold">Logout</span>
          </Button>
      </div>
    </aside>
  );
}
