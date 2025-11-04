
'use client';
import { useRouter, usePathname } from 'next/navigation';
import {
  Shield,
  LayoutDashboard,
  QrCode,
  Users,
  Settings,
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
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useMemo } from 'react';
import type { User as AppUser } from '@/app/admin/employees/page';
import { SheetClose } from '@/components/ui/sheet';

const iconMap: { [key: string]: any } = {
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
  profile: Partial<AppUser & { shopName?: string }>;
  isDesktop: boolean;
};

export function AdminNav({ navItems, profile, isDesktop }: AdminNavProps) {
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

  const activePath = useMemo(() => {
    const matches = navItems.filter((item) => pathname.startsWith(item.href));
    if (matches.length === 0) return null;
    return matches.reduce((longest, current) =>
      current.href.length > longest.href.length ? current : longest
    ).href;
  }, [pathname, navItems]);

  const NavContent = () => (
    <>
        {/* Header / Logo */}
        <div className="flex h-[60px] items-center px-6 border-b">
            <button
            onClick={() => handleNavigate('/admin')}
            className="flex items-center gap-2 font-semibold"
            >
            <span className="font-bold text-2xl text-primary tracking-wider">
                Attendry
            </span>
            </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-4 pt-4">
            <nav className="grid items-start gap-1 text-sm font-medium">
            {navItems.map((item) => {
                const Icon = item.iconName ? iconMap[item.iconName] : null;
                const isActive = item.href === activePath;
                const NavButton = (
                    <button
                        key={item.href}
                        onClick={() => handleNavigate(item.href)}
                        className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-all hover:bg-muted/50 hover:text-primary',
                        isActive &&
                            'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                        )}
                        >
                        {Icon && <Icon className="h-5 w-5" />}
                        <span className="text-base font-medium">{item.label}</span>
                    </button>
                );

                return isDesktop ? NavButton : <SheetClose asChild key={item.href}>{NavButton}</SheetClose>;
            })}
            </nav>
        </div>

        {/* Profile + Logout */}
        <div className="mt-auto p-4 space-y-2 border-t">
            <Link href="/admin/settings">
            <div className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-muted">
                <Avatar className="h-10 w-10 border-2 border-primary">
                <AvatarImage src={profile?.imageUrl} />
                <AvatarFallback>{profile?.fallback || 'SO'}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold text-foreground truncate">
                    {profile?.name || 'Shop Owner'}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                    {profile?.shopName || 'My Business'}
                </span>
                </div>
            </div>
            </Link>
            <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start h-auto p-2 border bg-red-100 text-red-700 hover:bg-red-600 hover:text-white active:bg-red-800 active:text-white dark:bg-red-900/50 dark:text-red-400 dark:hover:bg-red-800 dark:hover:text-white"
            >
            <LogOut className="h-5 w-5 mr-3" />
            <span className="font-semibold">Logout</span>
            </Button>
        </div>
    </>
  );

  if (!isDesktop) {
      return (
          <div className="flex flex-col h-full bg-background">
              <NavContent />
          </div>
      );
  }

  return (
    <div
      className="
        hidden md:flex fixed left-0 top-0 h-screen w-64 
        border-r bg-background 
        flex-col
      "
    >
      <NavContent />
    </div>
  );
}
