
'use client';

import { useRouter, usePathname } from 'next/navigation';
import {
  Gem,
  LayoutDashboard,
  Users,
  Store,
  type LucideIcon,
  User,
  BookLock,
  Megaphone,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavItem } from './bottom-nav';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { SheetClose } from './ui/sheet';


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
  isDesktop: boolean;
};

export function SuperAdminNav({ navItems, isDesktop }: SuperAdminNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  const handleNavigate = (href: string) => {
    router.push(href);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('superAdminAuthenticated');
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
      });
      router.push('/super-admin/login');
    } catch (error) {
      toast({
        title: 'Logout Failed',
        variant: 'destructive',
      });
    }
  };

  const NavContent = () => (
     <>
        <div className="flex h-16 items-center border-b px-6 shrink-0">
            <button
            onClick={() => handleNavigate('/super-admin')}
            className="flex items-center gap-2 font-semibold"
            >
            <Gem className="h-8 w-8 text-primary" />
            <span className="font-bold text-2xl text-primary tracking-wider">Attendry</span>
            </button>
        </div>
        <div className="flex-1 overflow-y-auto">
            <nav className="grid items-start p-4 text-sm font-medium">
            {navItems.map((item) => {
                const Icon = item.iconName ? iconMap[item.iconName] : null;
                const isActive =
                (item.href === '/super-admin' && pathname === item.href) ||
                (item.href !== '/super-admin' && pathname.startsWith(item.href));
                
                const NavButton = (
                     <button
                        key={item.href}
                        onClick={() => handleNavigate(item.href)}
                        className={cn(
                        'flex items-center gap-3 rounded-lg px-4 py-3 text-muted-foreground transition-all hover:text-primary text-base',
                        isActive && 'bg-primary text-primary-foreground hover:text-primary-foreground font-semibold'
                        )}
                    >
                        {Icon && <Icon className="h-5 w-5" />}
                        {item.label}
                    </button>
                );

                return isDesktop ? NavButton : <SheetClose asChild key={item.href}>{NavButton}</SheetClose>;
            })}
            </nav>
        </div>
        <div className="mt-auto p-4 space-y-4 border-t">
            <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border">
                <AvatarFallback>SA</AvatarFallback>
            </Avatar>
            <div>
                <p className="font-bold text-sm">Super Admin</p>
                <p className="text-xs text-muted-foreground">Platform Control</p>
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
    <div className="hidden md:flex fixed left-0 top-0 h-screen w-60 border-r bg-background flex-col">
        <NavContent />
    </div>
  );
}
