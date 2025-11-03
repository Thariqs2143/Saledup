import { BottomNav, type NavItem } from '@/components/bottom-nav';
import { LayoutDashboard, Users, Settings } from 'lucide-react';

const adminNavItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/employees', label: 'Employees', icon: Users },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md bg-card pb-20">
        <div className="min-h-screen">{children}</div>
      </div>
      <BottomNav navItems={adminNavItems} />
    </div>
  );
}
