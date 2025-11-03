import { BottomNav, type NavItem } from '@/components/bottom-nav';
import { Home, History, User } from 'lucide-react';

const employeeNavItems: NavItem[] = [
  { href: '/employee/home', label: 'Home', icon: Home },
  { href: '/employee/history', label: 'History', icon: History },
  { href: '/employee/profile', label: 'Profile', icon: User },
];

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md bg-card pb-20">
        <div className="min-h-screen">{children}</div>
      </div>
      <BottomNav navItems={employeeNavItems} />
    </div>
  );
}
