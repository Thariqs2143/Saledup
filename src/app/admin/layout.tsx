
'use client';

import type { PropsWithChildren } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BottomNav, type NavItem } from '@/components/bottom-nav';
import Link from 'next/link';
import { AdminNav } from '@/components/admin-nav';
import { Bell, Loader2, PanelLeft } from 'lucide-react';
import { InstallPWA } from '@/components/install-pwa';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User as AppUser } from './employees/page';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const adminNavItems: NavItem[] = [
  { href: '/admin', label: 'Home', iconName: 'LayoutDashboard' },
  { href: '/admin/generate-qr', label: 'QR Entry', iconName: 'QrCode' },
  { href: '/admin/employees', label: 'Staffs', iconName: 'Users' },
  { href: '/admin/report', label: 'Report', iconName: 'BarChart3' },
  { href: '/admin/settings', label: 'Profile', iconName: 'User' },
];

type ShopProfile = {
  shopName?: string;
  fallback?: string;
}

type FullProfile = AppUser & ShopProfile;


export default function AdminLayout({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<Partial<FullProfile>>({});
  const [loading, setLoading] = useState(true);

  const isAuthPage =
    pathname === '/login' ||
    pathname.startsWith('/admin/login') ||
    pathname.startsWith('/admin/signup') ||
    pathname === '/admin/complete-profile' ||
    pathname === '/admin/add-branch';

  useEffect(() => {
    if (isAuthPage) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const shopDocRef = doc(db, 'shops', user.uid);

          const [userSnap, shopSnap] = await Promise.all([
            getDoc(userDocRef),
            getDoc(shopDocRef)
          ]);

          const userData = userSnap.exists() ? userSnap.data() : {};
          const shopData = shopSnap.exists() ? shopSnap.data() : {};
          
          setProfile({ ...userData, ...shopData });

        } catch (error) {
          console.error("Failed to fetch admin profile", error);
        }
      } else {
        router.replace('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router, isAuthPage]);
  
  if (isAuthPage) {
    return <>{children}</>;
  }

  if(loading){
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar (fixed) */}
      <AdminNav navItems={adminNavItems} profile={profile} isDesktop={true} />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 md:ml-64">
        {/* Mobile Header */}
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden sticky top-0 z-40">
           <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs p-0">
               <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
               <AdminNav navItems={adminNavItems} profile={profile} isDesktop={false} />
            </SheetContent>
          </Sheet>
          <h1 className="font-bold text-xl text-primary">Attendry</h1>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/admin/notifications">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
                <span className="sr-only">Notifications</span>
              </Button>
            </Link>
          </div>
        </header>

        {/* Main Page */}
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav + PWA */}
      <BottomNav navItems={adminNavItems} />
      <InstallPWA />
    </div>
  );
}
