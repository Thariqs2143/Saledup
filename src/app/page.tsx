import Link from 'next/link';
import { ShieldCheck, Users, Briefcase } from 'lucide-react';

export default function RoleSelectionPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <Briefcase className="h-12 w-12 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight text-primary">
            ShopAttend
          </h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Welcome! Please select your role.
        </p>

        <div className="pt-6 space-y-4">
          <Link href="/admin/login" className="block">
            <div className="group rounded-xl bg-card p-6 text-center shadow-sm transition-all hover:shadow-lg hover:ring-2 hover:ring-primary/50">
              <ShieldCheck className="mx-auto h-12 w-12 text-primary transition-transform group-hover:scale-110" />
              <h2 className="mt-4 text-2xl font-semibold text-card-foreground">
                Admin
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Shop Manager
              </p>
            </div>
          </Link>
          <Link href="/employee/home" className="block">
            <div className="group rounded-xl bg-card p-6 text-center shadow-sm transition-all hover:shadow-lg hover:ring-2 hover:ring-primary/50">
              <Users className="mx-auto h-12 w-12 text-primary transition-transform group-hover:scale-110" />
              <h2 className="mt-4 text-2xl font-semibold text-card-foreground">
                Employee
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">Shop Staff</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
