
'use client';
import { useRouter, usePathname } from 'next/navigation';
import {
  Shield,
  LayoutDashboard,
  QrCode,
  Users,
  Settings,
  type LucideIcon,
  BarChart3,
  Crown,
  User,
  Bell,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavItem } from './bottom-nav';
import { Button } from './ui/button';
import Link from 'next/link';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const iconMap: { [key: string]: LucideIcon } = {
  LayoutDashboard,
  QrCode,
  Users,
  Settings,
  BarChart3,
  Crown,
  User,
  Bell,
};

type AdminNavProps = {
  navItems: NavItem[];
};

export function AdminNav({ navItems }: AdminNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  const handleNavigate = (href: string) => {
    router.push(href);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Logged Out' });
      router.push('/login');
    } catch (error) {
      toast({ title: 'Logout Failed', variant: 'destructive' });
    }
  };

  return (
    <div className="hidden border-r bg-background md:flex md:flex-col">
      <div className="flex h-16 items-center border-b px-6 shrink-0">
        <button
          onClick={() => handleNavigate('/admin')}
          className="flex items-center gap-2 font-semibold"
        >
          <Shield className="h-8 w-8 text-primary" />
          <span className="font-bold text-2xl text-primary tracking-wider">
            Attendry
          </span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <nav className="grid items-start p-4 text-sm font-medium">
          {navItems.map((item) => {
            const Icon = item.iconName ? iconMap[item.iconName] : null;
            const isActive =
              (item.href === '/admin' && pathname === item.href) ||
              (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <button
                key={item.href}
                onClick={() => handleNavigate(item.href)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-4 py-3 text-muted-foreground transition-all hover:text-primary text-base',
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
      </div>
      <div className="mt-auto p-4 space-y-4 border-t">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border">
            <AvatarFallback>SO</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-bold text-sm">Shop Owner</p>
            <p className="text-xs text-muted-foreground">My Business</p>
          </div>
        </div>
        <Button
          variant="destructive"
          onClick={handleLogout}
          className="w-full bg-red-100 text-red-600 hover:bg-red-200"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
