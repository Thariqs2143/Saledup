
import Link from 'next/link';
import { User, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function RoleSelectionPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary mb-2">Welcome to Attendry</h1>
        <p className="text-muted-foreground mb-8 sm:mb-12 text-base sm:text-lg">Please select your role to get started.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <Link href="/admin/login" className="group">
            <Card className="transform-gpu transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl hover:shadow-primary/10 border-2 border-foreground/20 hover:border-primary">
              <CardContent className="flex flex-col items-center justify-center p-6 sm:p-8 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-primary/10 rounded-full border-2 border-foreground/50 group-hover:border-primary/50 transition-colors">
                    <Shield className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
                </div>
                <span className="text-xl sm:text-2xl font-semibold text-primary">I'm a Shop Owner</span>
                 <p className="text-sm text-muted-foreground">Manage employees and attendance.</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/employee/login" className="group">
            <Card className="transform-gpu transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl hover:shadow-primary/10 border-2 border-foreground/20 hover:border-primary">
               <CardContent className="flex flex-col items-center justify-center p-6 sm:p-8 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-primary/10 rounded-full border-2 border-foreground/50 group-hover:border-primary/50 transition-colors">
                    <User className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
                </div>
                <span className="text-xl sm:text-2xl font-semibold text-primary">I'm an Employee</span>
                <p className="text-sm text-muted-foreground">Mark attendance and view history.</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </main>
  );
}
